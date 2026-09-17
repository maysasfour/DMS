/**
 * ResourceMap.jsx
 *
 * Displays an interactive map of disaster management resources and emergency facilities
 * within the DMS (Disaster Management System). This component renders geo-located
 * markers for hospitals, fire stations, police stations, shelters, and supply centers,
 * allowing responders and administrators to visually assess resource distribution
 * and navigate to any facility via Google Maps directions.
 *
 * Accepts an optional list of facilities from parent components (e.g. admin dashboards
 * or incident detail pages); falls back to built-in mock data for development/demo use.
 */

// React core — required for JSX rendering
import React from 'react';

// React-Leaflet components: MapContainer wraps the map, TileLayer provides the base map tiles,
// Marker places a pin at a geo-coordinate, and Popup shows an info card when a marker is clicked
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Leaflet default stylesheet — must be imported for map controls and tiles to render correctly
import 'leaflet/dist/leaflet.css';

// Shared map configuration and utilities:
//   DEFAULT_CENTER / DEFAULT_ZOOM — initial map viewport for the DMS region
//   TILE_URL / TILE_ATTRIBUTION — OpenStreetMap tile endpoint and required attribution text
//   RESOURCE_TYPE_ICONS — maps resource/facility type keys (e.g. "HOSPITAL") to emoji icons
//   createEmojiIcon — factory that builds a custom Leaflet DivIcon from an emoji + color
//   MOCK_FACILITIES — hardcoded sample facilities used when no real data is provided
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  RESOURCE_TYPE_ICONS, createEmojiIcon, MOCK_FACILITIES
} from './mapUtils';

// Color palette keyed by facility type — each color is used for both the marker icon ring
// and the type badge inside the popup, giving responders instant visual category recognition
const FACILITY_COLORS = {
  HOSPITAL: '#dc2626',       // Red — medical emergency priority
  FIRE_STATION: '#ea580c',   // Orange — fire response services
  POLICE_STATION: '#3b82f6', // Blue — law enforcement
  SHELTER: '#22c55e',        // Green — safe evacuation destinations
  SUPPLY_CENTER: '#8b5cf6',  // Purple — logistics and supply distribution
};

/**
 * ResourceMap component
 *
 * @param {Array}  facilities        - Optional array of facility objects fetched from the DMS backend;
 *                                     each must have { id, latitude, longitude, type, name, locationName }
 * @param {string} height            - CSS height of the map canvas; defaults to '450px'
 *
 * Falls back to MOCK_FACILITIES when no external data is provided, ensuring the map always
 * renders something useful during development or when the backend is unavailable.
 */
export default function ResourceMap({ facilities: externalFacilities, height = '450px' }) {
  // Use real facilities if provided and non-empty; otherwise fall back to mock data for demo/dev
  const facilities = externalFacilities && externalFacilities.length > 0 ? externalFacilities : MOCK_FACILITIES;

  // Filter out any facility records that are missing coordinates — invalid entries would
  // cause Leaflet to throw an error or place markers at (0,0) in the ocean
  const validFacilities = facilities.filter(f => f.latitude && f.longitude);

  return (
    // Outer container: rounded card with DMS theme border and shadow via CSS variables
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>

      {/* Card header bar showing the map title and a live count of plotted facilities */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        {/* Section label — hospital emoji reinforces this map's resource-focused purpose */}
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🏥 Resource & Facility Locations</span>

        {/* Facility count badge — green pill gives quick situational awareness of coverage */}
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
          {validFacilities.length} facilities
        </span>
      </div>

      {/* Leaflet map canvas — center and zoom are pulled from shared DMS map configuration */}
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height, width: '100%' }} scrollWheelZoom={true}>

        {/* Base tile layer using OpenStreetMap tiles — TILE_URL and TILE_ATTRIBUTION are
            defined centrally in mapUtils so all maps in the DMS use the same provider */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {/* Render one Marker per valid facility; each marker uses a type-specific emoji and color */}
        {validFacilities.map((fac) => {
          // Resolve the emoji icon for this facility type (e.g. 🏥 for HOSPITAL);
          // fall back to a generic pin if the type is unrecognized
          const emoji = RESOURCE_TYPE_ICONS[fac.type] || '📍';

          // Resolve the brand color for this facility type; grey fallback for unknown types
          const color = FACILITY_COLORS[fac.type] || '#6b7280';

          return (
            // Marker positioned at the facility's GPS coordinates; key prevents React reconciliation issues
            // createEmojiIcon builds a custom Leaflet icon sized at 36px with the resolved emoji and color ring
            <Marker key={fac.id} position={[fac.latitude, fac.longitude]} icon={createEmojiIcon(emoji, color, 36)}>

              {/* Popup card shown on marker click — gives responders key facility info at a glance */}
              <Popup>
                <div style={{ minWidth: 180 }}>

                  {/* Header row: large emoji icon + facility name for fast recognition */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{emoji}</span>
                    <strong style={{ fontSize: 13 }}>{fac.name}</strong>
                  </div>

                  {/* Type badge — colored pill matches the marker color for visual consistency;
                      underscores in type keys (e.g. FIRE_STATION) are replaced with spaces for readability */}
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: color }}>
                    {fac.type?.replace(/_/g, ' ')}
                  </span>

                  {/* Human-readable location name (neighborhood, district, etc.) shown only when available */}
                  {fac.locationName && (
                    <p style={{ fontSize: 12, margin: '6px 0 0', color: 'var(--text-secondary)' }}>📍 {fac.locationName}</p>
                  )}

                  {/* Navigate button — opens Google Maps driving directions to this facility in a new tab,
                      enabling field responders to get turn-by-turn navigation instantly */}
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

      {/* Legend bar below the map — renders a color swatch + label for each facility type
          so users can decode the marker colors without opening a popup */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {/* Static label introducing the legend items */}
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Facilities:</span>

        {/* Iterate over FACILITY_COLORS to auto-generate one legend entry per known type;
            underscores are replaced with spaces for legible labels (e.g. "FIRE STATION") */}
        {Object.entries(FACILITY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            {/* Colored circle swatch matching the corresponding map marker ring color */}
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {/* Facility type label in secondary text color for visual hierarchy */}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}