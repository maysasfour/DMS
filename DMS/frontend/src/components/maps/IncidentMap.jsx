import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  SEVERITY_COLORS, STATUS_COLORS, INCIDENT_TYPE_ICONS,
  createColoredIcon, MOCK_INCIDENTS
} from './mapUtils';

function FlyToUser({ userLocation }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.5 });
    }
  }, [userLocation, map]);
  return null;
}

function FitBounds({ incidents, userLocation }) {
  const map = useMap();
  React.useEffect(() => {
    if (userLocation) return; // user location takes priority
    if (incidents.length > 0) {
      const bounds = incidents
        .filter(i => i.latitude && i.longitude)
        .map(i => [i.latitude, i.longitude]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [incidents, map, userLocation]);
  return null;
}

export default function IncidentMap({ incidents: externalIncidents, height = '500px', showFilters = true, showLegend = true, userLocation }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Use provided incidents or fall back to mock data
  const rawIncidents = externalIncidents && externalIncidents.length > 0 ? externalIncidents : MOCK_INCIDENTS;

  const incidents = useMemo(() => {
    return rawIncidents.filter(inc => {
      if (!inc.latitude || !inc.longitude) return false;
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && inc.type !== typeFilter && inc.category !== typeFilter) return false;
      return true;
    });
  }, [rawIncidents, severityFilter, statusFilter, typeFilter]);

  const types = [...new Set(rawIncidents.map(i => i.type || i.category).filter(Boolean))];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
      {/* Filters bar */}
      {showFilters && (
        <div className="px-4 py-3 flex flex-wrap gap-3 items-center" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('map.incidents_tab', 'Incident Map')}</span>
          <div className="flex-1" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          >
            <option value="ALL">{t('incidents.all_severity', 'All Severity')}</option>
            <option value="CRITICAL">{t('severity.CRITICAL')}</option>
            <option value="HIGH">{t('severity.HIGH')}</option>
            <option value="MEDIUM">{t('severity.MEDIUM')}</option>
            <option value="LOW">{t('severity.LOW')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          >
            <option value="ALL">{t('incidents.all_status', 'All Status')}</option>
            <option value="OPEN">{t('status.OPEN')}</option>
            <option value="IN_PROGRESS">{t('status.IN_PROGRESS')}</option>
            <option value="RESOLVED">{t('status.RESOLVED')}</option>
            <option value="CLOSED">{t('status.CLOSED')}</option>
          </select>
          {types.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
            >
              <option value="ALL">All Types</option>
              {types.map(t => (
                <option key={t} value={t}>{INCIDENT_TYPE_ICONS[t] || '⚠️'} {t}</option>
              ))}
            </select>
          )}
          <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FlyToUser userLocation={userLocation} />
        <FitBounds incidents={incidents} userLocation={userLocation} />
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={2000}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }}
            />
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createColoredIcon('#10b981', 20)}
            >
              <Popup><strong style={{ color: '#10b981' }}>📍 {t('map.your_location', 'Your Location')}</strong></Popup>
            </Marker>
          </>
        )}

        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            icon={createColoredIcon(SEVERITY_COLORS[inc.severity] || '#6b7280', inc.severity === 'CRITICAL' ? 28 : 22)}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLORS[inc.severity] || '#6b7280', flexShrink: 0 }} />
                  <strong style={{ fontSize: 14 }}>{inc.title}</strong>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    color: '#fff', background: SEVERITY_COLORS[inc.severity] || '#6b7280'
                  }}>
                    {inc.severity}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    color: '#fff', background: STATUS_COLORS[inc.status] || '#6b7280'
                  }}>
                    {inc.status?.replace('_', ' ')}
                  </span>
                </div>
                {inc.locationName && (
                  <p style={{ fontSize: 12, margin: '4px 0', color: 'var(--text-secondary)' }}>
                    {inc.locationName || inc.address || inc.city}
                  </p>
                )}
                {inc.createdAt && (
                  <p style={{ fontSize: 11, margin: '4px 0', color: 'var(--text-tertiary)' }}>
                    {new Date(inc.createdAt).toLocaleString()}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    onClick={() => navigate(`/layout/incidents/${inc.id}`)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8,
                      background: 'linear-gradient(135deg, #dc2626, #ea580c)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    View Details →
                  </button>
                  <button
                    onClick={() => {
                      const dest = `${inc.latitude},${inc.longitude}`;
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                    }}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8,
                      background: 'linear-gradient(135deg, #4285F4, #0F9D58)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    🗺️ Navigate
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      {showLegend && (
        <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Severity:</span>
          {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
