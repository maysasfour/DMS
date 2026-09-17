/**
 * ResponderMap.jsx
 *
 * Interactive live map component for the Disaster Management System (DMS) that
 * displays the real-time positions of emergency responders and field resources
 * (e.g., fire trucks, ambulances, rescue teams) on a Leaflet map.
 *
 * This component is intended for use by dispatchers and administrators who need
 * a geographic overview of all active units during an incident. Each resource
 * is rendered as an emoji marker color-coded by operational status (e.g.,
 * AVAILABLE, DEPLOYED, OFFLINE). Clicking a marker reveals a popup with the
 * resource's name, type, status, and last known location name.
 *
 * When no live resource data is provided via props, the component falls back to
 * MOCK_RESOURCES so the map remains functional during development or when the
 * backend is unavailable.
 */

// React core — required for JSX rendering
import React from 'react';

// React-Leaflet components: MapContainer wraps the map, TileLayer provides the
// base map tiles, Marker places a pin at a lat/lng, and Popup shows info on click
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Leaflet's default CSS — required for correct map rendering, controls, and popups
import 'leaflet/dist/leaflet.css';

// Shared map constants and helpers from the DMS map utilities module:
// DEFAULT_CENTER / DEFAULT_ZOOM — initial viewport for the region of interest
// TILE_URL / TILE_ATTRIBUTION — OpenStreetMap tile source and required credit string
// RESOURCE_STATUS_COLORS — maps status strings (AVAILABLE, DEPLOYED…) to hex colors
// RESOURCE_TYPE_ICONS — maps resource type strings (FIRE_TRUCK, AMBULANCE…) to emoji
// createEmojiIcon — factory that builds a custom Leaflet DivIcon from an emoji + color
// MOCK_RESOURCES — sample resource records used as a fallback when no live data exists
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  RESOURCE_STATUS_COLORS, RESOURCE_TYPE_ICONS,
  createEmojiIcon, MOCK_RESOURCES
} from './mapUtils';

/**
 * ResponderMap — renders an interactive map showing all DMS field resources.
 *
 * @param {Array}  resources        — live resource objects fetched from the backend;
 *                                    each must have id, latitude, longitude, name,
 *                                    type, status, and optionally locationName
 * @param {string} height           — CSS height of the Leaflet map canvas (default '500px')
 */
export default function ResponderMap({ resources: externalResources, height = '500px' }) {
  // Use externally provided resources if available; fall back to mock data during
  // development or when the resource API has not yet returned results
  const resources = externalResources && externalResources.length > 0 ? externalResources : MOCK_RESOURCES;

  // Filter out any resource records that lack valid geographic coordinates,
  // preventing Leaflet from throwing errors when rendering markers
  const validResources = resources.filter(r => r.latitude && r.longitude);

  return (
    // Outer card container styled with DMS design-system CSS variables for
    // consistent theming across light and dark modes
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>

      {/* Card header bar — shows the panel title and a live unit count badge */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        {/* Panel title indicating this map tracks live responders and vehicles */}
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🚒 Live Responders & Resources</span>

        {/* Badge displaying the count of mappable (coordinate-valid) resource units */}
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
          {validResources.length} units
        </span>
      </div>

      {/* Leaflet map canvas — centered on the default DMS region with scroll-zoom enabled */}
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height, width: '100%' }} scrollWheelZoom={true}>

        {/* Base tile layer sourced from OpenStreetMap; attribution is legally required */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {/* Iterate over each valid resource and render a positioned marker */}
        {validResources.map((res) => {
          // Resolve the emoji for this resource's type; fall back to a generic icon
          // if the type is unknown (e.g., a newly added category not yet in the map)
          const emoji = RESOURCE_TYPE_ICONS[res.type] || RESOURCE_TYPE_ICONS.DEFAULT;

          // Resolve the status badge color; grey is used for unknown/offline status
          // so dispatchers can immediately spot units with unrecognized states
          const statusColor = RESOURCE_STATUS_COLORS[res.status] || '#6b7280';

          return (
            // Marker placed at the resource's GPS coordinates; the custom emoji icon
            // visually encodes both resource type (emoji) and status (border color)
            <Marker key={res.id} position={[res.latitude, res.longitude]} icon={createEmojiIcon(emoji, statusColor, 34)}>

              {/* Popup that appears when a dispatcher clicks a resource marker */}
              <Popup>
                <div style={{ minWidth: 180 }}>

                  {/* Popup header row: emoji icon + resource name for quick identification */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <strong style={{ fontSize: 13 }}>{res.name}</strong>
                  </div>

                  {/* Status and type pill row — color-coded status helps dispatchers
                      quickly assess whether a unit is available for new assignments */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {/* Operational status pill (e.g., AVAILABLE, DEPLOYED, OFFLINE) */}
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColor }}>
                      {res.status}
                    </span>

                    {/* Resource type pill with underscores replaced by spaces for readability
                        (e.g., FIRE_TRUCK becomes "FIRE TRUCK") */}
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {res.type?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Optional human-readable location name (e.g., "Station 4 – Downtown");
                      rendered only when the backend provides this field */}
                  {res.locationName && (
                    <p style={{ fontSize: 12, margin: '4px 0', color: 'var(--text-secondary)' }}>📍 {res.locationName}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend strip below the map — maps status color dots to their labels so
          dispatchers can interpret marker colors without prior training */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {/* Legend section label */}
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Status:</span>

        {/* Render the first four status entries from RESOURCE_STATUS_COLORS to keep
            the legend compact; less common statuses are omitted to save space */}
        {Object.entries(RESOURCE_STATUS_COLORS).slice(0, 4).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            {/* Color swatch circle matching the marker border color for this status */}
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            {/* Human-readable status label (e.g., AVAILABLE, DEPLOYED) */}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}