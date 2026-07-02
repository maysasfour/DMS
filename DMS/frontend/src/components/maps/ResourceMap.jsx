import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  RESOURCE_TYPE_ICONS, createEmojiIcon, MOCK_FACILITIES
} from './mapUtils';

const FACILITY_COLORS = {
  HOSPITAL: '#dc2626',
  FIRE_STATION: '#ea580c',
  POLICE_STATION: '#3b82f6',
  SHELTER: '#22c55e',
  SUPPLY_CENTER: '#8b5cf6',
};

export default function ResourceMap({ facilities: externalFacilities, height = '450px' }) {
  const facilities = externalFacilities && externalFacilities.length > 0 ? externalFacilities : MOCK_FACILITIES;
  const validFacilities = facilities.filter(f => f.latitude && f.longitude);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🏥 Resource & Facility Locations</span>
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
          {validFacilities.length} facilities
        </span>
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height, width: '100%' }} scrollWheelZoom={true}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {validFacilities.map((fac) => {
          const emoji = RESOURCE_TYPE_ICONS[fac.type] || '📍';
          const color = FACILITY_COLORS[fac.type] || '#6b7280';
          return (
            <Marker key={fac.id} position={[fac.latitude, fac.longitude]} icon={createEmojiIcon(emoji, color, 36)}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{emoji}</span>
                    <strong style={{ fontSize: 13 }}>{fac.name}</strong>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: color }}>
                    {fac.type?.replace(/_/g, ' ')}
                  </span>
                  {fac.locationName && (
                    <p style={{ fontSize: 12, margin: '6px 0 0', color: 'var(--text-secondary)' }}>📍 {fac.locationName}</p>
                  )}
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}&travelmode=driving`, '_blank')}
                    style={{ marginTop: 8, width: '100%', padding: '5px 0', borderRadius: 8, background: 'linear-gradient(135deg,#4285F4,#0F9D58)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    🗺️ Navigate Here
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Facilities:</span>
        {Object.entries(FACILITY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
