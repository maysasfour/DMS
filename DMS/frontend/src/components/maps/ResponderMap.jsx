import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  RESOURCE_STATUS_COLORS, RESOURCE_TYPE_ICONS,
  createEmojiIcon, MOCK_RESOURCES
} from './mapUtils';

export default function ResponderMap({ resources: externalResources, height = '500px' }) {
  const resources = externalResources && externalResources.length > 0 ? externalResources : MOCK_RESOURCES;
  const validResources = resources.filter(r => r.latitude && r.longitude);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🚒 Live Responders & Resources</span>
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
          {validResources.length} units
        </span>
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height, width: '100%' }} scrollWheelZoom={true}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {validResources.map((res) => {
          const emoji = RESOURCE_TYPE_ICONS[res.type] || RESOURCE_TYPE_ICONS.DEFAULT;
          const statusColor = RESOURCE_STATUS_COLORS[res.status] || '#6b7280';
          return (
            <Marker key={res.id} position={[res.latitude, res.longitude]} icon={createEmojiIcon(emoji, statusColor, 34)}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <strong style={{ fontSize: 13 }}>{res.name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColor }}>
                      {res.status}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {res.type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {res.locationName && (
                    <p style={{ fontSize: 12, margin: '4px 0', color: 'var(--text-secondary)' }}>📍 {res.locationName}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Status:</span>
        {Object.entries(RESOURCE_STATUS_COLORS).slice(0, 4).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
