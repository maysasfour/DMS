// ─────────────────────────────────────────────────────────────────────────────
/**
 * @file mapUtils.js
 * @description Shared constants, color maps, icon factories, weight calculators, and mock data
 * for all map components in the Disaster Management System (DMS).
 *
 * This module centralizes map configuration to ensure visual consistency across
 * the IncidentMap, HeatmapView, and LocationPicker components. It defines:
 *  - Leaflet marker icon fixes for Vite/Webpack bundler compatibility
 *  - Default map center and zoom level (Riyadh, Saudi Arabia)
 *  - Multiple tile layer options (street, satellite, terrain, dark, humanitarian)
 *  - Color coding for incident severity, status, and resource availability
 *  - Emoji icon mappings for DMS incident types and emergency resource types
 *  - Leaflet divIcon factory functions for colored and emoji markers
 *  - ML-style heatmap weight computation based on severity, type risk, recency, and status
 *  - Mock fallback data for incidents, resources, facilities, and shelters used during development
 */

// Import the Leaflet mapping library used for all interactive DMS maps
import L from 'leaflet';

// Fix default Leaflet marker icons (broken in webpack/vite)
// Vite/Webpack asset bundling breaks Leaflet's internal icon URL resolution;
// deleting the prototype method and supplying CDN URLs restores marker display.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  // High-DPI (retina) version of the default blue pin marker
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  // Standard-resolution version of the default blue pin marker
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  // Drop shadow rendered beneath the marker pin for depth
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Default map center — user's location (falls back to Saudi Arabia if denied)
// Coordinates [lat, lng] for central Riyadh; used when geolocation is unavailable
export const DEFAULT_CENTER = [24.7136, 46.6753];
// Default zoom level that shows a neighborhood-scale view of incident areas
export const DEFAULT_ZOOM = 13;

// ── Tile Layer Definitions ────────────────────────────────────────────────────
// Available base map styles that operators can switch between on the DMS map view
export const TILE_LAYERS = {
  // Standard OpenStreetMap street-level view — good for urban incident navigation
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // Maximum zoom level supported by this tile provider
    maxZoom: 19,
  },
  // Esri satellite imagery — useful for assessing terrain around disaster zones
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  // Topographic contour map — helps responders understand elevation and flood risk
  terrain: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    // OpenTopoMap tiles are only available up to zoom 17
    maxZoom: 17,
  },
  // Dark CartoDB base map — aligns with the DMS neon cyberpunk theme
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  // HOT (Humanitarian OpenStreetMap Team) tiles — optimized for crisis response contexts
  humanitarian: {
    label: 'Humanitarian',
    url: 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, HOT',
    maxZoom: 19,
  },
};

// Default tile layer URL used by existing map components that haven't migrated to TILE_LAYERS
export const TILE_URL = TILE_LAYERS.street.url;
// Default attribution string to display in the map corner for the street tile layer
export const TILE_ATTRIBUTION = TILE_LAYERS.street.attribution;

// ── Color Maps ────────────────────────────────────────────────────────────────
// Maps each incident severity level to a hex color for marker and UI rendering
// Colors follow traffic-light convention: deep red → yellow → green for urgency
export const SEVERITY_COLORS = {
  CRITICAL: '#7f1d1d', // Dark crimson — life-threatening, immediate response required
  HIGH: '#dc2626',     // Bright red — serious danger, high resource deployment needed
  MEDIUM: '#f59e0b',   // Amber — moderate risk, monitor and dispatch as available
  LOW: '#22c55e',      // Green — minor incident, low priority for dispatch teams
};

// Maps each incident lifecycle status to a color for marker and badge rendering
export const STATUS_COLORS = {
  OPEN: '#dc2626',        // Red — incident open but not yet actioned
  REPORTED: '#dc2626',    // Red — newly reported, awaiting dispatch
  IN_PROGRESS: '#ea580c', // Orange — responders are actively on scene
  RESOLVED: '#059669',    // Green — incident contained and resolved
  CLOSED: '#6b7280',      // Gray — archived/closed incident, no further action
};

// Maps resource availability status to a color for resource markers and dashboards
export const RESOURCE_STATUS_COLORS = {
  AVAILABLE: '#3b82f6',    // Blue — unit is idle and ready for immediate dispatch
  ASSIGNED: '#f59e0b',     // Amber — unit has been assigned to an incident
  BUSY: '#dc2626',         // Red — unit is fully occupied and cannot be reassigned
  OFFLINE: '#6b7280',      // Gray — unit is not operational (maintenance/off-shift)
  DEPLOYED: '#ea580c',     // Orange — unit is en route or on scene
  OUT_OF_SERVICE: '#6b7280', // Gray — unit is taken out of service (same visual as OFFLINE)
};

// Maps DMS incident type enum values and NASA EONET event categories to display emoji
// Supporting both PascalCase (DMS API) and camelCase (EONET API) keys for broad compatibility
export const INCIDENT_TYPE_ICONS = {
  FIRE: '🔥', Fire: '🔥',           // Structure or wildland fire incidents
  FLOOD: '🌊', Flood: '🌊',         // Flash flood or rising water events
  EARTHQUAKE: '🌍', Earthquake: '🌍', // Seismic activity or tremor reports
  STORM: '⛈️', Storm: '⛈️',         // Severe weather: thunderstorm, sandstorm, cyclone
  ACCIDENT: '🚗', Accident: '🚗',   // Road traffic accidents or vehicular collisions
  MEDICAL: '🏥', Medical: '🏥',     // Mass casualty or medical emergency events
  HAZMAT: '☣️', Hazmat: '☣️',       // Hazardous material spill or chemical incident
  OTHER: '⚠️', Other: '⚠️',         // Catch-all for unclassified DMS incidents
  // NASA EONET natural event categories used when displaying satellite-sourced incidents
  wildfires: '🔥',      // NASA EONET wildfire category
  volcanoes: '🌋',      // NASA EONET volcanic activity
  severeStorms: '⛈️',  // NASA EONET severe storm systems
  floods: '🌊',         // NASA EONET flood events
  earthquakes: '🌍',   // NASA EONET seismic events
  drought: '🏜️',       // NASA EONET drought conditions
  dustHaze: '🌫️',      // NASA EONET dust storms or haze events
  manmade: '⚠️',        // NASA EONET human-caused disasters
  seaLakeIce: '🧊',    // NASA EONET sea or lake ice events
  snowIce: '❄️',        // NASA EONET snow and ice accumulation
  tempExtremes: '🌡️',  // NASA EONET extreme heat or cold events
  waterColor: '💧',     // NASA EONET water discoloration (algal blooms, pollution)
  landslides: '⛰️',    // NASA EONET landslide or mudslide events
};

// Maps emergency resource type codes to display emoji for resource markers on the DMS map
export const RESOURCE_TYPE_ICONS = {
  AMBULANCE: '🚑',       // Mobile medical unit for patient transport
  FIRE_TRUCK: '🚒',      // Fire suppression and rescue vehicle
  POLICE: '🚓',          // Law enforcement patrol unit
  HELICOPTER: '🚁',      // Aerial rescue or medevac helicopter
  RESCUE_TEAM: '👷',     // Ground search-and-rescue personnel team
  MEDICAL_TEAM: '⚕️',    // Medical personnel deployed at the incident site
  HOSPITAL: '🏥',        // Fixed hospital facility accepting casualties
  FIRE_STATION: '🚒',    // Fire station base (facility marker)
  POLICE_STATION: '🚓',  // Police station base (facility marker)
  SHELTER: '🏕️',         // Emergency shelter for displaced civilians
  SUPPLY_CENTER: '📦',   // Logistics hub distributing relief supplies
  DEFAULT: '📍',          // Generic pin used when resource type is unrecognized
};

// ── Icon Factories ────────────────────────────────────────────────────────────

/**
 * Creates a circular Leaflet divIcon filled with the given color for incident or resource markers.
 * A pulsing ring animation is applied to draw attention to active alerts on the map.
 *
 * @param {string} color - CSS hex or rgba color string matching SEVERITY_COLORS or STATUS_COLORS
 * @param {number} [size=24] - Diameter in pixels of the circular marker
 * @returns {L.DivIcon} Leaflet icon instance ready to assign to a map marker
 */
export function createColoredIcon(color, size = 24) {
  return L.divIcon({
    // Avoid default Leaflet styling so our custom CSS fully controls appearance
    className: 'custom-marker',
    // Inline HTML for the circular marker body with an animated outer ring for active incidents
    html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};border:3px solid #fff;border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;">
        <div style="position:absolute;inset:-4px;border:2px solid ${color};
          border-radius:50%;opacity:0.3;animation:pulse-ring 2s ease-out infinite;"></div>
      </div>`,
    // iconSize must match the rendered div dimensions for correct click-target alignment
    iconSize: [size, size],
    // Anchor centers the icon over the coordinate point rather than top-left corner
    iconAnchor: [size / 2, size / 2],
    // Popup opens above the marker center so it does not obscure the pin
    popupAnchor: [0, -size / 2],
  });
}

/**
 * Creates a circular Leaflet divIcon displaying an emoji centered on a colored background.
 * Used for incident type markers (e.g., fire emoji on red circle) on the DMS incident map.
 *
 * @param {string} emoji - Unicode emoji character representing the incident or resource type
 * @param {string} [bgColor='#3b82f6'] - Background fill color; typically from SEVERITY_COLORS
 * @param {number} [size=32] - Diameter in pixels; slightly larger than colored-only icons for readability
 * @returns {L.DivIcon} Leaflet icon instance ready to assign to a map marker
 */
export function createEmojiIcon(emoji, bgColor = '#3b82f6', size = 32) {
  return L.divIcon({
    // Avoid default Leaflet styling so our custom CSS fully controls appearance
    className: 'custom-marker',
    // Emoji is vertically and horizontally centered within the colored circle
    html: `<div style="
        width:${size}px;height:${size}px;background:${bgColor};
        border:2px solid #fff;border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:${size * 0.5}px;">${emoji}</div>`,
    // Explicit size ensures Leaflet's click region matches the visual icon bounds
    iconSize: [size, size],
    // Center the anchor so the icon sits precisely over the incident coordinate
    iconAnchor: [size / 2, size / 2],
    // Open the incident popup above the marker to avoid overlap with the icon
    popupAnchor: [0, -size / 2],
  });
}

/**
 * Creates an emoji marker for a satellite-sourced or DMS incident using its type and severity.
 * Combines INCIDENT_TYPE_ICONS and SEVERITY_COLORS to produce a semantically color-coded pin.
 *
 * @param {string} type - Incident type key (e.g., 'FIRE', 'FLOOD', 'wildfires')
 * @param {string} severity - Severity level key (e.g., 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
 * @returns {L.DivIcon} Colored emoji marker for use on the DMS incident map
 */
export function createSatelliteMarker(type, severity) {
  // Resolve emoji for this incident type; fallback to generic warning if type is unknown
  const emoji = INCIDENT_TYPE_ICONS[type] || '⚠️';
  // Resolve background color from severity; fallback to standard red for unknown severities
  const color = SEVERITY_COLORS[severity] || '#ef4444';
  // Use a slightly larger size (34px) so satellite event markers stand out from local incidents
  return createEmojiIcon(emoji, color, 34);
}

// ── Heatmap Weight Calculation (ML-style scoring) ────────────────────────────
// Uses multi-factor scoring: severity, status recency, type risk
// These weights drive the intensity values fed into the Leaflet heatmap layer,
// so critical/recent incidents produce hotter regions on the HeatmapView component.

// Normalized severity multipliers used in the heatmap weight formula
const SEVERITY_WEIGHT = { CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.45, LOW: 0.2 };

// Per-type risk multipliers reflecting the inherent danger level of each incident category
// Earthquakes and HAZMAT rank highest due to mass-casualty and contamination potential
const TYPE_RISK = {
  FIRE: 0.9, EARTHQUAKE: 1.0, FLOOD: 0.85, HAZMAT: 0.95,
  ACCIDENT: 0.6, MEDICAL: 0.5, STORM: 0.7, OTHER: 0.3,
  // NASA EONET natural event risk scores
  wildfires: 0.9, volcanoes: 1.0, severeStorms: 0.8, floods: 0.85,
  earthquakes: 1.0, drought: 0.4, manmade: 0.7,
};

/**
 * Computes a normalized heatmap intensity weight [0.0–1.0] for a given DMS incident.
 * Combines severity, incident type risk, temporal recency, and operational status
 * so that active, recent, high-severity incidents produce the brightest heatmap spots.
 *
 * Weight formula (weighted sum, capped at 1.0):
 *   severity × 0.4 + type_risk × 0.3 + recency × 0.2 + status_multiplier × 0.1
 *
 * @param {Object} incident - DMS or EONET incident object with optional fields:
 *   severity, type/incidentType/category, reportedAt/createdAt, status
 * @returns {number} Heatmap intensity in range [0.0, 1.0]
 */
export function computeHeatmapWeight(incident) {
  // Look up the normalized severity score; default to 0.4 (medium) if severity is absent
  const severity = SEVERITY_WEIGHT[incident.severity] ?? 0.4;
  // Resolve type risk across all supported field names (DMS vs EONET schema differences)
  const type = TYPE_RISK[incident.type || incident.incidentType || incident.category] ?? 0.4;

  // Recency bonus: incidents in last 24h get higher weight
  // Newer incidents represent ongoing threats and should dominate the heatmap
  let recency = 0.5; // Default recency for incidents with no timestamp
  if (incident.reportedAt || incident.createdAt) {
    // Calculate how many hours ago the incident was reported or created
    const hoursAgo = (Date.now() - new Date(incident.reportedAt || incident.createdAt).getTime()) / 3600000;
    // Apply time-decay scoring: highest weight within 6 hours, lowest beyond 72 hours
    recency = hoursAgo < 6 ? 1.0 : hoursAgo < 24 ? 0.8 : hoursAgo < 72 ? 0.5 : 0.3;
  }

  // Status: active incidents get higher weight on the heatmap than resolved ones
  const statusMult = incident.status === 'REPORTED' || incident.status === 'OPEN' ? 1.0
    : incident.status === 'IN_PROGRESS' ? 0.8  // Responders engaged but not resolved
    : 0.3; // RESOLVED or CLOSED incidents contribute minimal heatmap intensity

  // Combine all factors with their respective weights; cap at 1.0 to stay in valid range
  return Math.min(1.0, (severity * 0.4 + type * 0.3 + recency * 0.2 + statusMult * 0.1));
}

// ── Mock / Fallback Data ──────────────────────────────────────────────────────
// These datasets are used during development and testing when the DMS backend is unavailable.
// They represent realistic Saudi Arabia incident scenarios for UI testing and demo purposes.

// Mock DMS incidents covering major Saudi cities and a range of incident types and severities
export const MOCK_INCIDENTS = [
  // Urban fire incident in Riyadh's commercial district — HIGH severity, actively being managed
  { id: 1, title: 'Building Fire - Al Olaya', incidentType: 'FIRE', severity: 'HIGH', status: 'IN_PROGRESS', latitude: 24.6877, longitude: 46.7219, locationName: 'Al Olaya, Riyadh', reportedAt: new Date().toISOString() },
  // Flash flood along Jeddah's coastal road — CRITICAL severity, not yet actioned
  { id: 2, title: 'Flash Flood - Jeddah Corniche', incidentType: 'FLOOD', severity: 'CRITICAL', status: 'REPORTED', latitude: 21.5169, longitude: 39.2192, locationName: 'Corniche, Jeddah', reportedAt: new Date().toISOString() },
  // Multi-vehicle road accident on a major inter-city highway — MEDIUM severity
  { id: 3, title: 'Road Accident - Highway 40', incidentType: 'ACCIDENT', severity: 'MEDIUM', status: 'IN_PROGRESS', latitude: 24.7500, longitude: 46.8000, locationName: 'Highway 40, Riyadh', reportedAt: new Date().toISOString() },
  // Seismic tremor in the Eastern Province — HIGH severity, awaiting assessment
  { id: 4, title: 'Tremor - Dammam Region', incidentType: 'EARTHQUAKE', severity: 'HIGH', status: 'REPORTED', latitude: 26.4200, longitude: 49.9800, locationName: 'Dammam', reportedAt: new Date().toISOString() },
  // Mass casualty event at a major sports venue in Riyadh — CRITICAL severity
  { id: 5, title: 'Mass Casualty - Sports Event', incidentType: 'MEDICAL', severity: 'CRITICAL', status: 'IN_PROGRESS', latitude: 24.7136, longitude: 46.6753, locationName: 'King Fahd Stadium', reportedAt: new Date().toISOString() },
];

// Mock emergency response units with varied statuses across Riyadh, Jeddah, and Dammam
export const MOCK_RESOURCES = [
  // Ambulance near the Riyadh city center — available for immediate dispatch
  { id: 1, name: 'Ambulance Unit 01', type: 'AMBULANCE', status: 'AVAILABLE', latitude: 24.7136, longitude: 46.6753 },
  // Fire truck assigned to the Al Olaya building fire — already engaged
  { id: 2, name: 'Fire Engine 01', type: 'FIRE_TRUCK', status: 'ASSIGNED', latitude: 24.6877, longitude: 46.7219 },
  // Search-and-rescue team deployed near Jeddah Corniche flood zone
  { id: 3, name: 'Rescue Team Alpha', type: 'RESCUE_TEAM', status: 'BUSY', latitude: 21.4858, longitude: 39.1925 },
  // Medical team in Dammam available to respond to the tremor aftermath
  { id: 4, name: 'Medical Team Beta', type: 'MEDICAL_TEAM', status: 'AVAILABLE', latitude: 26.3927, longitude: 49.9777 },
];

// Mock fixed emergency facilities (hospitals, fire stations, shelters) used for facility layer
export const MOCK_FACILITIES = [
  // Major hospital in central Riyadh — primary receiving facility for mass casualty events
  { id: 1, name: 'King Fahd Hospital', type: 'HOSPITAL', latitude: 24.7136, longitude: 46.6753, status: 'AVAILABLE' },
  // Fire station in Al Olaya district — closest unit to the building fire incident
  { id: 2, name: 'Riyadh Fire Station', type: 'FIRE_STATION', latitude: 24.6877, longitude: 46.7219, status: 'AVAILABLE' },
  // Emergency evacuation shelter east of central Riyadh for displaced residents
  { id: 3, name: 'Emergency Shelter A', type: 'SHELTER', latitude: 24.7500, longitude: 46.8000, status: 'AVAILABLE' },
];

// Mock shelter zones rendered as circles on the map showing evacuation coverage areas
export const MOCK_SHELTERS = [
  // King Fahd Stadium converted to shelter — 500 m radius covering surrounding neighborhoods
  { id: 1, name: 'King Fahd Stadium Shelter', center: [24.7136, 46.6753], radius: 500, color: '#22c55e' },
  // Jeddah Sports City shelter — 300 m radius near the Corniche flood zone
  { id: 2, name: 'Jeddah Sports City Shelter', center: [21.4858, 39.1925], radius: 300, color: '#3b82f6' },
  // Dammam Expo Centre shelter — 400 m radius for earthquake-affected residents
  { id: 3, name: 'Dammam Expo Shelter', center: [26.3927, 49.9777], radius: 400, color: '#f59e0b' },
];