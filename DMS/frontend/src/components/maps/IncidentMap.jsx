/**
 * IncidentMap.jsx
 *
 * Interactive map component for the Disaster Management System (DMS).
 * Renders geo-located disaster incidents as colored markers on a Leaflet map,
 * with real-time filtering by severity, status, and incident type.
 *
 * Key responsibilities:
 *  - Display incident pins color-coded by severity (CRITICAL, HIGH, MEDIUM, LOW)
 *  - Allow responders to filter visible incidents without leaving the map view
 *  - Show the reporting user's current location with a proximity radius circle
 *  - Provide popup details per incident with navigation and detail-view shortcuts
 *  - Auto-fit map bounds to the set of visible incidents for quick spatial awareness
 *
 * Used by dashboard views, incident list pages, and any DMS screen requiring
 * a spatial overview of active or historical disaster events.
 */

// React core and hooks used for state management and side effects
import React, { useState, useMemo, useEffect } from 'react';

// Leaflet React components: MapContainer is the root map, TileLayer provides the base map tiles,
// Marker places incident pins, Popup shows incident details, useMap gives access to the Leaflet
// map instance inside child components, Circle draws the user proximity radius
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';

// Router hook used to programmatically navigate to the incident detail page when a responder
// clicks "View Details" inside a marker popup
import { useNavigate } from 'react-router-dom';

// i18n hook that provides the translation function t() so all labels are multilingual,
// supporting Arabic, English, French, Spanish, and Turkish as configured in the DMS
import { useTranslation } from 'react-i18next';

// Required Leaflet stylesheet — must be imported for map tiles and marker icons to render correctly
import 'leaflet/dist/leaflet.css';

// DMS map configuration constants and utilities:
//   DEFAULT_CENTER / DEFAULT_ZOOM — initial map viewport (set to the deployment region)
//   TILE_URL / TILE_ATTRIBUTION — OpenStreetMap tile endpoint and required attribution text
//   SEVERITY_COLORS — mapping of CRITICAL/HIGH/MEDIUM/LOW to hex colors for marker and legend
//   STATUS_COLORS — mapping of OPEN/IN_PROGRESS/RESOLVED/CLOSED to badge colors
//   INCIDENT_TYPE_ICONS — emoji icons keyed by disaster category (FLOOD, FIRE, EARTHQUAKE, etc.)
//   createColoredIcon — factory that returns a custom Leaflet DivIcon with the specified color and size
//   MOCK_INCIDENTS — fallback dataset shown when no real incidents are passed in (dev/demo mode)
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  SEVERITY_COLORS, STATUS_COLORS, INCIDENT_TYPE_ICONS,
  createColoredIcon, MOCK_INCIDENTS
} from './mapUtils';

/**
 * FlyToUser — inner map utility component
 *
 * When a user's geolocation becomes available (e.g., after clicking "Locate Me"),
 * smoothly animates the map viewport to center on their coordinates at street level.
 * This must be rendered inside <MapContainer> so it can access the Leaflet map instance
 * via the useMap() hook.
 *
 * @param {Object} userLocation - { lat, lng } of the current user's device position
 */
function FlyToUser({ userLocation }) {
  // Access the underlying Leaflet map instance — only works when rendered inside MapContainer
  const map = useMap();

  // Trigger a smooth fly animation whenever userLocation changes (e.g., GPS fix acquired)
  useEffect(() => {
    if (userLocation) {
      // Zoom to level 13 (neighborhood level) with a 1.5-second animation for user experience
      map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.5 });
    }
  }, [userLocation, map]);

  // Renders nothing visually — pure behavior component
  return null;
}

/**
 * FitBounds — inner map utility component
 *
 * Automatically adjusts the map viewport to contain all currently visible incidents
 * so that responders see the full spatial spread at a glance after loading or filtering.
 * Skips re-fitting when the user has already navigated to their own location.
 *
 * @param {Array}  incidents    - filtered list of incident objects with latitude/longitude
 * @param {Object} userLocation - if set, suppresses auto-fit so user location view is preserved
 */
function FitBounds({ incidents, userLocation }) {
  // Access the Leaflet map instance to call fitBounds programmatically
  const map = useMap();

  React.useEffect(() => {
    // Do not override viewport when the user has panned to their own location
    if (userLocation) return;

    if (incidents.length > 0) {
      // Build an array of [lat, lng] pairs from incidents that have valid coordinates
      const bounds = incidents
        .filter(i => i.latitude && i.longitude)
        .map(i => [i.latitude, i.longitude]);

      if (bounds.length > 0) {
        // Fit all incident markers into view with 50px padding on each side and a max zoom
        // of 14 so individual street-level incidents are still legible
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [incidents, map, userLocation]);

  // Renders nothing visually — pure behavior component
  return null;
}

/**
 * IncidentMap — primary exported component
 *
 * Renders the full interactive incident map UI including the filter bar, Leaflet map,
 * user location marker, incident markers with popups, and the severity legend.
 *
 * @param {Array}   incidents     - array of incident objects from the DMS API; falls back to
 *                                  MOCK_INCIDENTS when empty or undefined (dev/demo mode)
 * @param {string}  height        - CSS height of the map canvas (default '500px')
 * @param {boolean} showFilters   - whether to render the severity/status/type filter bar above the map
 * @param {boolean} showLegend    - whether to render the severity color legend below the map
 * @param {Object}  userLocation  - optional { lat, lng } of the reporting user's device GPS position
 */
export default function IncidentMap({ incidents: externalIncidents, height = '500px', showFilters = true, showLegend = true, userLocation }) {
  // t() provides translated strings; used for filter labels, popup text, and the map title
  const { t } = useTranslation();

  // navigate() lets responders jump directly to the full incident detail page from a popup
  const navigate = useNavigate();

  // Severity filter state — 'ALL' means no severity restriction; other values (CRITICAL, HIGH, etc.)
  // narrow the visible incidents to only those matching the selected severity level
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Status filter state — controls visibility by lifecycle stage (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Type/category filter state — restricts markers to a single disaster category (FLOOD, FIRE, etc.)
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Use real DMS incidents when provided; otherwise fall back to mock data for development/demo
  const rawIncidents = externalIncidents && externalIncidents.length > 0 ? externalIncidents : MOCK_INCIDENTS;

  // Memoized filtered incident list — recomputed only when raw data or any filter changes,
  // avoiding expensive re-renders on unrelated state updates
  const incidents = useMemo(() => {
    return rawIncidents.filter(inc => {
      // Exclude incidents without valid coordinates — they cannot be placed on the map
      if (!inc.latitude || !inc.longitude) return false;

      // Apply severity filter: skip incidents that don't match the selected severity level
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;

      // Apply status filter: skip incidents not in the selected lifecycle status
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;

      // Apply type/category filter: incidents may store their category in either .type or .category
      if (typeFilter !== 'ALL' && inc.type !== typeFilter && inc.category !== typeFilter) return false;

      // Incident passes all active filters — include it on the map
      return true;
    });
  }, [rawIncidents, severityFilter, statusFilter, typeFilter]);

  // Derive unique incident type/category values for the dynamic type dropdown;
  // supports both .type and .category fields used by different DMS API versions
  const types = [...new Set(rawIncidents.map(i => i.type || i.category).filter(Boolean))];

  return (
    // Outer container with DMS design-system border and shadow tokens applied inline
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>

      {/* Filter bar — only rendered when showFilters prop is true (hidden in embedded/widget contexts) */}
      {showFilters && (
        // Filter bar row using secondary background to visually separate it from the map canvas
        <div className="px-4 py-3 flex flex-wrap gap-3 items-center" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>

          {/* Section label — translated map/incident panel title */}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('map.incidents_tab', 'Incident Map')}</span>

          {/* Spacer pushes filter controls to the right side of the bar */}
          <div className="flex-1" />

          {/* Severity filter dropdown — responders can isolate CRITICAL incidents during mass casualty events */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          >
            {/* Default option shows all severity levels */}
            <option value="ALL">{t('incidents.all_severity', 'All Severity')}</option>
            <option value="CRITICAL">{t('severity.CRITICAL')}</option>
            <option value="HIGH">{t('severity.HIGH')}</option>
            <option value="MEDIUM">{t('severity.MEDIUM')}</option>
            <option value="LOW">{t('severity.LOW')}</option>
          </select>

          {/* Status filter dropdown — useful for dispatchers tracking unresolved incidents */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          >
            {/* Default option shows incidents at every lifecycle stage */}
            <option value="ALL">{t('incidents.all_status', 'All Status')}</option>
            <option value="OPEN">{t('status.OPEN')}</option>
            <option value="IN_PROGRESS">{t('status.IN_PROGRESS')}</option>
            <option value="RESOLVED">{t('status.RESOLVED')}</option>
            <option value="CLOSED">{t('status.CLOSED')}</option>
          </select>

          {/* Type filter dropdown — only rendered when at least one incident has a type/category value */}
          {types.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
            >
              {/* Default option shows all disaster categories */}
              <option value="ALL">All Types</option>

              {/* Dynamically generated options from unique incident categories in the dataset;
                  prefixed with the category's emoji icon from INCIDENT_TYPE_ICONS, falling back to ⚠️ */}
              {types.map(t => (
                <option key={t} value={t}>{INCIDENT_TYPE_ICONS[t] || '⚠️'} {t}</option>
              ))}
            </select>
          )}

          {/* Live incident count badge — updates as filters change so dispatchers know how many
              incidents are currently visible on the map */}
          <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Leaflet map canvas — core spatial visualization of all DMS incidents */}
      <MapContainer
        // Start at the configured regional center (set in mapUtils for the deployment area)
        center={DEFAULT_CENTER}
        // Start at default zoom level appropriate for country/region-wide incident overview
        zoom={DEFAULT_ZOOM}
        // Map fills the height prop (defaults to 500px) and stretches full width of the container
        style={{ height, width: '100%' }}
        // Allow zooming with the mouse wheel for quick focus adjustments by field responders
        scrollWheelZoom={true}
      >
        {/* Base map tiles from OpenStreetMap — provides streets, landmarks, and terrain context */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {/* Animates the map to the user's GPS location when userLocation becomes available */}
        <FlyToUser userLocation={userLocation} />

        {/* Auto-fits the viewport to contain all visible incident markers after data or filter changes */}
        <FitBounds incidents={incidents} userLocation={userLocation} />

        {/* User location overlay — only rendered when GPS coordinates are available */}
        {userLocation && (
          <>
            {/* 2 km radius circle around the user's position in green — indicates the
                approximate local area that the responder or reporter is physically within */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={2000}
              // Semi-transparent dashed green circle to not obscure nearby incident markers
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }}
            />

            {/* Green pin marker at the user's exact GPS coordinate */}
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              // Small 20px green icon distinguishes user location from incident markers
              icon={createColoredIcon('#10b981', 20)}
            >
              {/* Popup confirms to the user that this pin is their location, translated */}
              <Popup><strong style={{ color: '#10b981' }}>📍 {t('map.your_location', 'Your Location')}</strong></Popup>
            </Marker>
          </>
        )}

        {/* Render one Leaflet Marker per filtered incident on the map */}
        {incidents.map((inc) => (
          <Marker
            // Use incident ID as the React key for efficient reconciliation during filter updates
            key={inc.id}
            // Place the marker at the incident's recorded GPS coordinates
            position={[inc.latitude, inc.longitude]}
            // Color-code the pin by severity; CRITICAL pins are larger (28px) for visual urgency
            icon={createColoredIcon(SEVERITY_COLORS[inc.severity] || '#6b7280', inc.severity === 'CRITICAL' ? 28 : 22)}
          >
            {/* Popup card shown when a responder clicks the incident marker */}
            <Popup>
              {/* Popup content container with a minimum width to prevent text wrapping */}
              <div style={{ minWidth: 200 }}>

                {/* Header row: severity color dot + incident title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {/* Small colored circle matching the marker's severity color for quick visual association */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLORS[inc.severity] || '#6b7280', flexShrink: 0 }} />
                  {/* Incident title as reported by the citizen or admin */}
                  <strong style={{ fontSize: 14 }}>{inc.title}</strong>
                </div>

                {/* Badge row: severity level and current lifecycle status displayed as pill badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {/* Severity badge — background color matches the marker pin color */}
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    color: '#fff', background: SEVERITY_COLORS[inc.severity] || '#6b7280'
                  }}>
                    {inc.severity}
                  </span>

                  {/* Status badge — replaces underscore in IN_PROGRESS with a space for readability */}
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    color: '#fff', background: STATUS_COLORS[inc.status] || '#6b7280'
                  }}>
                    {inc.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Location name — shown only when the incident has a human-readable address;
                    falls back to .address or .city if locationName is empty */}
                {inc.locationName && (
                  <p style={{ fontSize: 12, margin: '4px 0', color: 'var(--text-secondary)' }}>
                    {inc.locationName || inc.address || inc.city}
                  </p>
                )}

                {/* Creation timestamp — shown in the user's locale format when available;
                    helps responders gauge how recent the incident report is */}
                {inc.createdAt && (
                  <p style={{ fontSize: 11, margin: '4px 0', color: 'var(--text-tertiary)' }}>
                    {new Date(inc.createdAt).toLocaleString()}
                  </p>
                )}

                {/* Action buttons row */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {/* "View Details" button — navigates to the full incident detail page within the DMS portal */}
                  <button
                    onClick={() => navigate(`/layout/incidents/${inc.id}`)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8,
                      // Red-orange gradient signals urgency, consistent with the DMS danger color palette
                      background: 'linear-gradient(135deg, #dc2626, #ea580c)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    View Details →
                  </button>

                  {/* "Navigate" button — opens Google Maps driving directions to the incident coordinates
                      in a new tab, enabling field responders to get turn-by-turn routing immediately */}
                  <button
                    onClick={() => {
                      // Build Google Maps directions URL with the incident's lat/lng as the destination
                      const dest = `${inc.latitude},${inc.longitude}`;
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                    }}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8,
                      // Google Maps brand colors (blue + green) signal the external navigation action
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

      {/* Severity legend — only rendered when showLegend prop is true */}
      {showLegend && (
        // Legend bar uses secondary background to visually separate from the map canvas
        <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>

          {/* Static label identifying this bar as a severity color reference */}
          <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Severity:</span>

          {/* One colored dot + label per severity level defined in SEVERITY_COLORS (CRITICAL → LOW) */}
          {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              {/* Color swatch matches the marker pin color for that severity level */}
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              {/* Severity level label (e.g., CRITICAL, HIGH, MEDIUM, LOW) */}
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}