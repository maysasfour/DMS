/**
 * ShelterMap.jsx
 *
 * Renders an interactive Leaflet map displaying designated shelter and safe zone locations
 * within the Disaster Management System (DMS). Used during active disaster events to visually
 * communicate to operators and citizens where evacuation centers, gathering points, and safe
 * zones are located. Each shelter is rendered as a dashed circle (coverage radius) with a
 * centered emoji marker and a popup showing shelter details. Falls back to mock/seed shelter
 * data when no real shelter records are provided by the parent component.
 */

// React core — required for JSX rendering and Fragment grouping of map elements
import React from 'react';

// Leaflet React bindings: MapContainer wraps the map, TileLayer provides the base map tiles,
// Circle draws the shelter coverage radius, Popup shows shelter info on click, Marker pins the center
import { MapContainer, TileLayer, Circle, Popup, Marker } from 'react-leaflet';

// Leaflet base CSS — required for correct tile rendering, zoom controls, and popup styling
import 'leaflet/dist/leaflet.css';

// Shared map configuration and utilities from DMS mapUtils:
// DEFAULT_CENTER / DEFAULT_ZOOM — initial map viewport for the deployment region
// TILE_URL / TILE_ATTRIBUTION — OpenStreetMap tile source and required attribution text
// createEmojiIcon — factory that builds a Leaflet DivIcon from an emoji for shelter markers
// MOCK_SHELTERS — seed shelter data used as fallback when no real shelters are available
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  createEmojiIcon, MOCK_SHELTERS
} from './mapUtils';

/**
 * ShelterMap component — displays a Leaflet map with all known shelter/safe-zone locations.
 *
 * @param {Array}  shelters         - Array of shelter objects from the DMS backend (optional).
 *                                    Each object is expected to have: id, name, center [lat, lng],
 *                                    radius (meters), and color (CSS color string).
 * @param {string} height           - CSS height for the map canvas; defaults to '450px'.
 *                                    Allows the parent layout to control vertical space.
 */
export default function ShelterMap({ shelters: externalShelters, height = '450px' }) {
  // Use real shelter data from the DMS backend if available and non-empty;
  // otherwise fall back to MOCK_SHELTERS so the map is never rendered empty during development
  // or when the backend has not yet seeded shelter records for the current disaster event.
  const shelters = externalShelters && externalShelters.length > 0 ? externalShelters : MOCK_SHELTERS;

  return (
    // Outer card wrapper — rounded corners and themed border/shadow from the DMS design system
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>

      {/* Card header: displays the map title and a badge showing the total number of shelter zones */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        {/* Section title — tent emoji reinforces that this panel covers physical shelter locations */}
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🏕️ Shelters & Safe Zones</span>

        {/* Dynamic badge showing how many shelter/safe-zone polygons are currently loaded */}
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
          {shelters.length} zones
        </span>
      </div>

      {/* Leaflet MapContainer — establishes the interactive map with default region center and zoom */}
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height, width: '100%' }} scrollWheelZoom={true}>

        {/* Base tile layer from OpenStreetMap — provides street/terrain context for shelter locations */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {/* Iterate over each shelter record and render its coverage circle + center marker */}
        {shelters.map((shelter) => (
          // Fragment groups the Circle and Marker for the same shelter under a single React key,
          // avoiding unnecessary DOM wrapper elements inside the Leaflet SVG layer
          <React.Fragment key={shelter.id}>

            {/* Safe zone circle — visualises the effective coverage radius of this shelter.
                Dashed border (dashArray) distinguishes it from incident-alert circles used
                elsewhere in the DMS (e.g. HeatmapView), low fillOpacity keeps base map readable. */}
            <Circle
              center={shelter.center}      // [lat, lng] geographic center of the shelter
              radius={shelter.radius}      // radius in meters defining the shelter's safe coverage area
              pathOptions={{
                color: shelter.color,      // stroke color — varies by shelter type (green = safe zone, blue = evac center, amber = gathering point)
                fillColor: shelter.color,  // fill uses same color for visual consistency
                fillOpacity: 0.15,         // very low opacity so base map tiles remain legible beneath the zone
                weight: 2,                 // thin stroke so multiple overlapping zones don't obscure each other
                dashArray: '6 4',          // dashed pattern visually distinguishes safe zones from solid incident-risk areas
              }}
            >
              {/* Popup displayed when the operator or citizen clicks the shelter circle —
                  shows the shelter name, radius, and zone classification for quick identification */}
              <Popup>
                <div style={{ minWidth: 160 }}>
                  {/* Shelter name — sourced from the DMS shelter record (real or mock) */}
                  <strong style={{ fontSize: 13 }}>🏕️ {shelter.name}</strong>

                  {/* Coverage radius in metres — helps field teams understand shelter zone size */}
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                    Radius: {shelter.radius}m
                  </p>

                  {/* Zone type label — generic classification shown until per-shelter type field is implemented */}
                  <p style={{ fontSize: 11, margin: '2px 0 0', color: 'var(--text-tertiary)' }}>
                    Safe zone / Evacuation area
                  </p>
                </div>
              </Popup>
            </Circle>

            {/* Center marker — pins the shelter's exact geographic center with an emoji icon,
                making the shelter immediately visible even when the circle is zoomed out */}
            <Marker
              position={shelter.center}                          // same lat/lng as the Circle center
              icon={createEmojiIcon('🏕️', shelter.color, 30)}  // 30px emoji icon tinted to match the shelter's zone color
            />
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Legend bar — explains the color-coded dashed circles rendered on the map so that
          operators, field teams, and citizens can quickly interpret zone types at a glance */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {/* Legend label */}
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Legend:</span>

        {/* Safe Zone legend entry — green matches shelter circles for fully safe areas */}
        <div className="flex items-center gap-1.5">
          {/* Color swatch mimicking the dashed circle style used on the map */}
          <div style={{ width: 16, height: 10, borderRadius: 4, background: 'rgba(34,197,94,0.2)', border: '1px dashed #22c55e' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Safe Zone</span>
        </div>

        {/* Evacuation Center legend entry — blue distinguishes organised evac facilities from general safe zones */}
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 10, borderRadius: 4, background: 'rgba(59,130,246,0.2)', border: '1px dashed #3b82f6' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Evacuation Center</span>
        </div>

        {/* Gathering Point legend entry — amber marks temporary assembly points used before full evacuation */}
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 10, borderRadius: 4, background: 'rgba(245,158,11,0.2)', border: '1px dashed #f59e0b' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gathering Point</span>
        </div>
      </div>
    </div>
  );
}