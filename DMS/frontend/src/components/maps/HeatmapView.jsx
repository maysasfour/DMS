import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS, MOCK_INCIDENTS, computeHeatmapWeight
} from './mapUtils';
import { fetchAllSatelliteEvents } from '../../services/satelliteService';

/** ML-weighted heatmap rendered as canvas circles */
function HeatLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const cellSize = 0.08; // ~8km grid
    const grid = {};

    points.forEach(([lat, lng, weight]) => {
      const key = `${Math.round(lat / cellSize) * cellSize}_${Math.round(lng / cellSize) * cellSize}`;
      if (!grid[key]) grid[key] = { lat: 0, lng: 0, total: 0, count: 0 };
      grid[key].lat   += lat;
      grid[key].lng   += lng;
      grid[key].total += weight;
      grid[key].count += 1;
    });

    const maxW = Math.max(...Object.values(grid).map(g => g.total), 1);
    const group = L.layerGroup();

    Object.values(grid).forEach(cell => {
      const lat   = cell.lat / cell.count;
      const lng   = cell.lng / cell.count;
      const ratio = cell.total / maxW;
      const radius = 20 + ratio * 60;
      const opacity = 0.18 + ratio * 0.55;

      const color = ratio > 0.75 ? '#7f1d1d'
                  : ratio > 0.5  ? '#dc2626'
                  : ratio > 0.25 ? '#ea580c'
                  : '#f59e0b';

      L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        fillOpacity: opacity,
        color: 'none',
        weight: 0,
        interactive: false,
      }).addTo(group);
    });

    group.addTo(map);
    return () => { map.removeLayer(group); };
  }, [map, points]);

  return null;
}

export default function HeatmapView({ incidents: externalIncidents, height = '500px' }) {
  const [satelliteEvents, setSatelliteEvents] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [activeLayer, setActiveLayer] = useState('dark');
  const [showSatellite, setShowSatellite] = useState(true);

  useEffect(() => {
    fetchAllSatelliteEvents().then(events => {
      setSatelliteEvents(events);
      setLoadingLive(false);
    });
  }, []);

  const localIncidents = externalIncidents?.length > 0 ? externalIncidents : MOCK_INCIDENTS;

  const allIncidents = [
    ...localIncidents,
    ...(showSatellite ? satelliteEvents : []),
  ];

  const heatPoints = allIncidents
    .filter(i => i.latitude && i.longitude)
    .map(i => [i.latitude, i.longitude, computeHeatmapWeight(i)]);

  const tile = TILE_LAYERS[activeLayer];

  const LAYER_BUTTONS = [
    { key: 'dark', label: 'Dark' },
    { key: 'satellite', label: 'Satellite' },
    { key: 'street', label: 'Street' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          🛰️ ML Incident Density Heatmap
        </span>

        <div className="flex gap-1 ml-2">
          {LAYER_BUTTONS.map(b => (
            <button key={b.key} onClick={() => setActiveLayer(b.key)}
              className="px-3 py-1 rounded text-xs font-semibold transition-all"
              style={{
                background: activeLayer === b.key ? 'linear-gradient(135deg,#E63946,#FF7A00)' : 'var(--bg-tertiary)',
                color: activeLayer === b.key ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}>
              {b.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 ml-auto cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showSatellite} onChange={e => setShowSatellite(e.target.checked)} />
          🛰️ Live NASA / USGS events
          {loadingLive && <span className="ml-1 animate-pulse">loading…</span>}
          {!loadingLive && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              {satelliteEvents.length} live
            </span>
          )}
        </label>

        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {allIncidents.length} total
        </span>
      </div>

      {/* Map */}
      <MapContainer center={DEFAULT_CENTER} zoom={4} style={{ height, width: '100%' }} scrollWheelZoom>
        <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} />
        <HeatLayer points={heatPoints} />
      </MapContainer>

      {/* Legend */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center text-xs" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-tertiary)' }}>ML Density Score:</span>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 60, height: 10, borderRadius: 4, background: 'linear-gradient(90deg,#f59e0b,#ea580c,#dc2626,#7f1d1d)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Low → Critical</span>
        </div>
        <span style={{ color: 'var(--text-tertiary)' }}>• Weighted by severity, type risk, and recency</span>
        <div className="flex items-center gap-1 ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          <span style={{ color: 'var(--text-tertiary)' }}>NASA EONET + USGS real-time</span>
        </div>
      </div>
    </div>
  );
}
