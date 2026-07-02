import React from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  createEmojiIcon, MOCK_SHELTERS
} from './mapUtils';

export default function ShelterMap({ shelters: externalShelters, height = '450px' }) {
  const shelters = externalShelters && externalShelters.length > 0 ? externalShelters : MOCK_SHELTERS;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🏕️ Shelters & Safe Zones</span>
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
          {shelters.length} zones
        </span>
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height, width: '100%' }} scrollWheelZoom={true}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {shelters.map((shelter) => (
          <React.Fragment key={shelter.id}>
            {/* Safe zone circle */}
            <Circle
              center={shelter.center}
              radius={shelter.radius}
              pathOptions={{
                color: shelter.color,
                fillColor: shelter.color,
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '6 4',
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong style={{ fontSize: 13 }}>🏕️ {shelter.name}</strong>
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                    Radius: {shelter.radius}m
                  </p>
                  <p style={{ fontSize: 11, margin: '2px 0 0', color: 'var(--text-tertiary)' }}>
                    Safe zone / Evacuation area
                  </p>
                </div>
              </Popup>
            </Circle>
            {/* Center marker */}
            <Marker
              position={shelter.center}
              icon={createEmojiIcon('🏕️', shelter.color, 30)}
            />
          </React.Fragment>
        ))}
      </MapContainer>

      <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Legend:</span>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 10, borderRadius: 4, background: 'rgba(34,197,94,0.2)', border: '1px dashed #22c55e' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Safe Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 10, borderRadius: 4, background: 'rgba(59,130,246,0.2)', border: '1px dashed #3b82f6' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Evacuation Center</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 10, borderRadius: 4, background: 'rgba(245,158,11,0.2)', border: '1px dashed #f59e0b' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gathering Point</span>
        </div>
      </div>
    </div>
  );
}
