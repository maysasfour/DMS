import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  TILE_URL, TILE_ATTRIBUTION, SEVERITY_COLORS, INCIDENT_TYPE_ICONS,
  createColoredIcon, createEmojiIcon,
} from './mapUtils';

/* ── Fit both points in view ─────────────────────────────────────────────── */
function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length >= 2) {
      map.fitBounds(points, { padding: [60, 60], maxZoom: 16 });
    } else if (points && points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [points, map]);
  return null;
}

/* ── Fetch route from OSRM (free, no key) ────────────────────────────────── */
async function fetchRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) return null;
  const route = json.routes[0];
  const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const distKm = (route.distance / 1000).toFixed(1);
  const durMin = Math.round(route.duration / 60);
  return { coords, distKm, durMin };
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function RouteMap({
  latitude, longitude, title, severity, type, locationName, height = '300px',
  interactive = true,
}) {
  const [userPos, setUserPos] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const hasTarget = latitude && longitude;
  const target = hasTarget ? [parseFloat(latitude), parseFloat(longitude)] : null;

  /* Get user location */
  const getMyLocation = () => {
    if (!navigator.geolocation) { setRouteError('Geolocation not supported'); return; }
    setLoadingGeo(true);
    setRouteError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pos2 = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(pos2);
        setLoadingGeo(false);
      },
      (err) => { setRouteError('Location access denied'); setLoadingGeo(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* Draw route when both positions are known */
  useEffect(() => {
    if (!userPos || !target) return;
    setLoadingRoute(true);
    setRouteError('');
    fetchRoute(userPos, target)
      .then((r) => { if (r) setRoute(r); else setRouteError('No route found'); })
      .catch(() => setRouteError('Routing service unavailable'))
      .finally(() => setLoadingRoute(false));
  }, [userPos]);

  /* Open Google Maps turn-by-turn navigation */
  const openGoogleMaps = () => {
    if (!target) return;
    const dest = `${target[0]},${target[1]}`;
    const origin = userPos ? `${userPos[0]},${userPos[1]}` : '';
    const url = origin
      ? `https://www.google.com/maps/dir/${origin}/${dest}`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    window.open(url, '_blank');
  };

  /* Open Apple Maps (works on iOS) */
  const openAppleMaps = () => {
    if (!target) return;
    const url = `maps://?daddr=${target[0]},${target[1]}&dirflg=d`;
    window.open(url, '_blank');
  };

  if (!hasTarget) {
    return (
      <div
        className="rounded-xl flex items-center justify-center"
        style={{ height, background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)', fontSize: 14 }}
      >
        <div className="text-center">
          <span className="text-3xl block mb-2">📍</span>
          <span>No location data available</span>
        </div>
      </div>
    );
  }

  const fitPoints = route ? route.coords : userPos ? [userPos, target] : [target];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>

      {/* ── Navigation toolbar ─────────────────────────────────────────── */}
      <div
        className="px-3 py-2 flex flex-wrap gap-2 items-center"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}
      >
        <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
          <span>📍</span>
          {locationName || title || 'Incident Location'}
        </span>

        <div className="flex gap-2 ms-auto flex-wrap">
          {/* Get my location → draw route */}
          <button
            onClick={getMyLocation}
            disabled={loadingGeo || loadingRoute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          >
            {loadingGeo ? (
              <><span className="animate-spin inline-block">⟳</span> Locating...</>
            ) : loadingRoute ? (
              <><span className="animate-spin inline-block">⟳</span> Routing...</>
            ) : (
              <><span>📡</span> Show Route</>
            )}
          </button>

          {/* Google Maps */}
          <button
            onClick={openGoogleMaps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg, #4285F4, #0F9D58)' }}
          >
            <span>🗺️</span> Google Maps
          </button>

          {/* Apple Maps (shown on all but useful on iPhone) */}
          <button
            onClick={openAppleMaps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg, #555, #000)' }}
          >
            <span>🍎</span> Apple Maps
          </button>
        </div>
      </div>

      {/* ── Route info strip ───────────────────────────────────────────── */}
      {route && (
        <div
          className="px-3 py-2 flex items-center gap-4 text-xs font-semibold"
          style={{ background: 'rgba(5,150,105,0.08)', borderBottom: '1px solid rgba(5,150,105,0.2)', color: '#059669' }}
        >
          <span>✅ Route found</span>
          <span>🚗 {route.distKm} km</span>
          <span>⏱ ~{route.durMin} min</span>
          <button
            onClick={() => { setRoute(null); setUserPos(null); }}
            className="ms-auto text-xs underline"
            style={{ color: '#6b7280' }}
          >
            Clear
          </button>
        </div>
      )}

      {routeError && (
        <div
          className="px-3 py-1.5 text-xs font-medium"
          style={{ background: 'rgba(230,57,70,0.08)', color: '#E63946', borderBottom: '1px solid rgba(230,57,70,0.2)' }}
        >
          ⚠️ {routeError}
        </div>
      )}

      {/* ── Map ───────────────────────────────────────────────────────── */}
      <MapContainer
        center={target}
        zoom={14}
        style={{ height, width: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        attributionControl={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitRoute points={fitPoints} />

        {/* Incident marker */}
        <Marker
          position={target}
          icon={createColoredIcon(SEVERITY_COLORS[severity] || '#dc2626', 30)}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong style={{ fontSize: 13 }}>{INCIDENT_TYPE_ICONS[type] || '⚠️'} {title}</strong>
              {locationName && <p style={{ fontSize: 11, margin: '4px 0 0', color: '#666' }}>📍 {locationName}</p>}
              <p style={{ fontSize: 11, margin: '2px 0 0', color: '#999' }}>
                {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* User position marker */}
        {userPos && (
          <Marker
            position={userPos}
            icon={createEmojiIcon('🧑', '#3b82f6', 30)}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>Your location</strong>
                <p style={{ margin: '4px 0 0', color: '#999', fontSize: 11 }}>
                  {userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {route && (
          <Polyline
            positions={route.coords}
            pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.85, dashArray: null }}
          />
        )}
      </MapContainer>

      {/* ── Coordinates footer ─────────────────────────────────────────── */}
      <div
        className="px-3 py-1.5 text-xs"
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}
      >
        GPS: {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
      </div>
    </div>
  );
}
