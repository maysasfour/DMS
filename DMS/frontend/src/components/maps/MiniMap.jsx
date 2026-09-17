/**
 * MiniMap.jsx — Compact, read-only map preview component for the DMS incident detail page.
 *
 * Purpose: Renders a small interactive map pinpointing the exact geographic location
 * of a reported disaster incident. Uses severity-coded marker colors so responders
 * can instantly assess urgency at a glance. Displays incident title, type icon,
 * human-readable location name, and precise coordinates inside a popup.
 *
 * Used by: IncidentDetail page to give officers/admins a spatial context for each incident
 * without navigating away to the full IncidentMap view.
 */

// React core — required for JSX transformation
import React from 'react';

// react-leaflet components: MapContainer wraps the Leaflet map instance,
// TileLayer renders the base map tiles, Marker places a pin on the map,
// and Popup shows incident details when the marker is clicked
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Leaflet's built-in CSS — required for correct map rendering, tile layout, and controls
import 'leaflet/dist/leaflet.css';

// DMS shared map utilities:
// TILE_URL / TILE_ATTRIBUTION — base map tile source (e.g. OpenStreetMap)
// SEVERITY_COLORS — maps incident severity levels (low/medium/high/critical) to hex colors
// INCIDENT_TYPE_ICONS — maps incident category strings to emoji icons (fire, flood, etc.)
// createColoredIcon — factory that builds a custom Leaflet DivIcon with a given color and size
import {
  TILE_URL, TILE_ATTRIBUTION,
  SEVERITY_COLORS, INCIDENT_TYPE_ICONS,
  createColoredIcon
} from './mapUtils';

/**
 * MiniMap — A small read-only map preview shown on the incident detail page.
 * Shows exact incident location marker with nearby resource info.
 *
 * @param {number}  latitude     - WGS-84 latitude of the incident location
 * @param {number}  longitude    - WGS-84 longitude of the incident location
 * @param {string}  title        - Human-readable incident title displayed in the popup
 * @param {string}  severity     - Severity level key ('low' | 'medium' | 'high' | 'critical') used to color the marker
 * @param {string}  type         - Incident category key used to select the appropriate emoji icon
 * @param {string}  locationName - Optional human-readable address or area name shown below the title
 * @param {string}  height       - CSS height of the map container; defaults to '250px'
 */
export default function MiniMap({ latitude, longitude, title, severity, type, locationName, height = '250px' }) {

  // Guard: if coordinates are missing (e.g. incident was submitted without GPS fix),
  // render a styled placeholder instead of a broken map to avoid Leaflet errors
  if (!latitude || !longitude) {
    return (
      // Fallback container styled to match the DMS design system's card appearance
      <div
        className="rounded-xl flex items-center justify-center"
        style={{
          height,                                    // match the expected map height for layout consistency
          background: 'var(--bg-tertiary)',          // use DMS CSS variable for tertiary background (dark/light aware)
          border: '1px solid var(--border-primary)', // subtle border consistent with other DMS card components
          color: 'var(--text-tertiary)',             // muted text color to signal non-critical placeholder state
          fontSize: 14,
        }}
      >
        {/* Centered message informing the user that no geographic data was captured for this incident */}
        <div className="text-center">
          {/* Pin emoji serves as a visual affordance indicating the map/location context */}
          <span className="text-3xl block mb-2">📍</span>
          <span>No location data available</span>
        </div>
      </div>
    );
  }

  // Main render: coordinates are valid, render the full interactive map
  return (
    // Outer wrapper applies DMS card styling — rounded corners, clipped overflow so
    // the map tiles don't bleed outside the border radius
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>

      {/* MapContainer: initializes the Leaflet map centered on the incident's coordinates */}
      <MapContainer
        center={[latitude, longitude]} // center the viewport directly on the incident location
        zoom={15}                       // street-level zoom so responders can see nearby roads and landmarks
        style={{ height, width: '100%' }} // fill the parent container width; height controlled by prop
        scrollWheelZoom={true}          // allow zoom via mouse wheel for quick inspection on desktop
        dragging={true}                 // allow panning so users can explore the surrounding area
        zoomControl={true}              // show +/- zoom buttons for accessibility
        doubleClickZoom={true}          // allow double-click zoom for fast magnification
        attributionControl={false}      // hide Leaflet attribution to keep the mini-map UI clean
      >

        {/* TileLayer: loads the base map imagery from the DMS-configured tile provider (e.g. OpenStreetMap) */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {/* Marker: places a severity-coded pin at the exact incident coordinates */}
        <Marker
          position={[latitude, longitude]} // pin position matches the incident's reported GPS location
          // Use a custom colored icon: color derived from severity level (e.g. red for critical),
          // falling back to red (#dc2626) if the severity key is unrecognized; size fixed at 26px
          icon={createColoredIcon(SEVERITY_COLORS[severity] || '#dc2626', 26)}
        >
          {/* Popup: shown when the marker is clicked, providing incident context at a glance */}
          <Popup>
            <div>
              {/* Incident type icon (emoji) followed by the incident title for quick identification */}
              <strong>{INCIDENT_TYPE_ICONS[type] || '⚠️'} {title}</strong>

              {/* Conditionally render the human-readable location name (e.g. neighborhood, landmark)
                  only when provided — not all incidents will have a named location */}
              {locationName && <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--text-secondary)' }}>📍 {locationName}</p>}

              {/* Raw coordinates formatted to 5 decimal places (~1m precision) for
                  field teams who need exact GPS values for navigation */}
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