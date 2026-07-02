import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYERS, createEmojiIcon, INCIDENT_TYPE_ICONS, SEVERITY_COLORS } from './mapUtils';
import { fetchAllSatelliteEvents } from '../../services/satelliteService';

const { BaseLayer } = LayersControl;

function FitAll({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      try { map.fitBounds(points, { padding: [40, 40], maxZoom: 6 }); } catch {}
    }
  }, [points, map]);
  return null;
}

const TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'FIRE', label: '🔥 Fire / Wildfire' },
  { value: 'EARTHQUAKE', label: '🌍 Earthquake' },
  { value: 'FLOOD', label: '🌊 Flood' },
  { value: 'STORM', label: '⛈️ Storm' },
  { value: 'HAZMAT', label: '☣️ Hazmat' },
  { value: 'OTHER', label: '⚠️ Other' },
];

export default function SatelliteView({ localIncidents = [], height = '500px' }) {
  const [satelliteEvents, setSatelliteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showLocal, setShowLocal] = useState(true);
  const [showLive, setShowLive] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAllSatelliteEvents()
      .then(events => { setSatelliteEvents(events); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const allEvents = useMemo(() => {
    const items = [];
    if (showLive) items.push(...satelliteEvents);
    if (showLocal) items.push(...localIncidents.map(i => ({ ...i, incidentType: i.incidentType || i.type })));
    return items.filter(e => e.latitude && e.longitude);
  }, [satelliteEvents, localIncidents, showLive, showLocal]);

  const filtered = useMemo(() => {
    if (typeFilter === 'ALL') return allEvents;
    return allEvents.filter(e => e.incidentType === typeFilter);
  }, [allEvents, typeFilter]);

  const bounds = filtered.map(e => [e.latitude, e.longitude]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
      {/* Toolbar */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          🛰️ Satellite Real-World Events
        </span>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}>
          {TYPE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showLive} onChange={e => setShowLive(e.target.checked)} />
          🛰️ NASA/USGS Live
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showLocal} onChange={e => setShowLocal(e.target.checked)} />
          📍 Local Reports
        </label>

        <div className="ml-auto flex items-center gap-2 text-xs">
          {loading && <span className="animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Fetching satellite data…</span>}
          {!loading && !error && (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              <span style={{ color: 'var(--text-tertiary)' }}>{satelliteEvents.length} live events</span>
            </>
          )}
          {error && <span style={{ color: '#dc2626' }}>⚠ Live data unavailable</span>}
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {filtered.length} shown
          </span>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[20, 0]} zoom={2} style={{ height, width: '100%' }} scrollWheelZoom>
        <LayersControl position="topright">
          <BaseLayer checked name="Satellite">
            <TileLayer url={TILE_LAYERS.satellite.url} attribution={TILE_LAYERS.satellite.attribution} maxZoom={19} />
          </BaseLayer>
          <BaseLayer name="Street">
            <TileLayer url={TILE_LAYERS.street.url} attribution={TILE_LAYERS.street.attribution} />
          </BaseLayer>
          <BaseLayer name="Terrain">
            <TileLayer url={TILE_LAYERS.terrain.url} attribution={TILE_LAYERS.terrain.attribution} maxZoom={17} />
          </BaseLayer>
          <BaseLayer name="Dark">
            <TileLayer url={TILE_LAYERS.dark.url} attribution={TILE_LAYERS.dark.attribution} />
          </BaseLayer>
        </LayersControl>

        <FitAll points={bounds} />

        {filtered.map(event => {
          const emoji = INCIDENT_TYPE_ICONS[event.incidentType] || INCIDENT_TYPE_ICONS[event.category] || '⚠️';
          const color = event.color || SEVERITY_COLORS[event.severity] || '#ef4444';
          const size = event.severity === 'CRITICAL' ? 38 : event.severity === 'HIGH' ? 32 : 26;

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={createEmojiIcon(emoji, color, size)}
              eventHandlers={{ click: () => setSelected(event) }}
            >
              <Popup maxWidth={260}>
                <div style={{ minWidth: 220 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <strong style={{ fontSize: 13, lineHeight: 1.3 }}>{event.title}</strong>
                  </div>

                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#fff', background: color }}>
                      {event.severity}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: '#6b7280' }}>
                      {event.incidentType}
                    </span>
                    {event.isRealWorldEvent && (
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: '#0284c7' }}>
                        🛰️ {event.source}
                      </span>
                    )}
                  </div>

                  {event.locationName && (
                    <p style={{ fontSize: 12, margin: '3px 0', color: '#64748b' }}>📍 {event.locationName}</p>
                  )}
                  {event.magnitude && (
                    <p style={{ fontSize: 12, margin: '3px 0', color: '#64748b' }}>Magnitude: <strong>{event.magnitude}</strong> | Depth: {event.depth?.toFixed(1)}km</p>
                  )}
                  {event.reportedAt && (
                    <p style={{ fontSize: 11, margin: '3px 0', color: '#94a3b8' }}>
                      {new Date(event.reportedAt).toLocaleString()}
                    </p>
                  )}
                  {event.sourceUrl && (
                    <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#3b82f6', display: 'block', marginTop: 6 }}>
                      View source →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Footer stats */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center text-xs" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {['FIRE','EARTHQUAKE','FLOOD','STORM','HAZMAT','OTHER'].map(type => {
          const count = filtered.filter(e => e.incidentType === type).length;
          if (!count) return null;
          return (
            <span key={type} style={{ color: 'var(--text-secondary)' }}>
              {INCIDENT_TYPE_ICONS[type]} {type.charAt(0) + type.slice(1).toLowerCase()}: <strong>{count}</strong>
            </span>
          );
        })}
        <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          Sources: NASA EONET · USGS Earthquake
        </span>
      </div>
    </div>
  );
}
