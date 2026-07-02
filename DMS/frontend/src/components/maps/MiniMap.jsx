import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  TILE_URL, TILE_ATTRIBUTION,
  SEVERITY_COLORS, INCIDENT_TYPE_ICONS,
  createColoredIcon
} from './mapUtils';

/**
 * MiniMap — A small read-only map preview shown on the incident detail page.
 * Shows exact incident location marker with nearby resource info.
 */
export default function MiniMap({ latitude, longitude, title, severity, type, locationName, height = '250px' }) {
  if (!latitude || !longitude) {
    return (
      <div
        className="rounded-xl flex items-center justify-center"
        style={{
          height,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-tertiary)',
          fontSize: 14,
        }}
      >
        <div className="text-center">
          <span className="text-3xl block mb-2">📍</span>
          <span>No location data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
        dragging={true}
        zoomControl={true}
        doubleClickZoom={true}
        attributionControl={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker
          position={[latitude, longitude]}
          icon={createColoredIcon(SEVERITY_COLORS[severity] || '#dc2626', 26)}
        >
          <Popup>
            <div>
              <strong>{INCIDENT_TYPE_ICONS[type] || '⚠️'} {title}</strong>
              {locationName && <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--text-secondary)' }}>📍 {locationName}</p>}
              <p style={{ fontSize: 11, margin: '2px 0 0', color: 'var(--text-tertiary)' }}>
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
