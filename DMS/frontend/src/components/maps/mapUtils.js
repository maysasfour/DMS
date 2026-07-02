// Shared constants and utilities for all map components
import L from 'leaflet';

// Fix default Leaflet marker icons (broken in webpack/vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Default map center — user's location (falls back to Saudi Arabia if denied)
export const DEFAULT_CENTER = [24.7136, 46.6753];
export const DEFAULT_ZOOM = 13;

// ── Tile Layer Definitions ────────────────────────────────────────────────────
export const TILE_LAYERS = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  terrain: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  humanitarian: {
    label: 'Humanitarian',
    url: 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, HOT',
    maxZoom: 19,
  },
};

// Default tile (used by existing maps)
export const TILE_URL = TILE_LAYERS.street.url;
export const TILE_ATTRIBUTION = TILE_LAYERS.street.attribution;

// ── Color Maps ────────────────────────────────────────────────────────────────
export const SEVERITY_COLORS = {
  CRITICAL: '#7f1d1d',
  HIGH: '#dc2626',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

export const STATUS_COLORS = {
  OPEN: '#dc2626',
  REPORTED: '#dc2626',
  IN_PROGRESS: '#ea580c',
  RESOLVED: '#059669',
  CLOSED: '#6b7280',
};

export const RESOURCE_STATUS_COLORS = {
  AVAILABLE: '#3b82f6',
  ASSIGNED: '#f59e0b',
  BUSY: '#dc2626',
  OFFLINE: '#6b7280',
  DEPLOYED: '#ea580c',
  OUT_OF_SERVICE: '#6b7280',
};

export const INCIDENT_TYPE_ICONS = {
  FIRE: '🔥', Fire: '🔥',
  FLOOD: '🌊', Flood: '🌊',
  EARTHQUAKE: '🌍', Earthquake: '🌍',
  STORM: '⛈️', Storm: '⛈️',
  ACCIDENT: '🚗', Accident: '🚗',
  MEDICAL: '🏥', Medical: '🏥',
  HAZMAT: '☣️', Hazmat: '☣️',
  OTHER: '⚠️', Other: '⚠️',
  // NASA EONET categories
  wildfires: '🔥',
  volcanoes: '🌋',
  severeStorms: '⛈️',
  floods: '🌊',
  earthquakes: '🌍',
  drought: '🏜️',
  dustHaze: '🌫️',
  manmade: '⚠️',
  seaLakeIce: '🧊',
  snowIce: '❄️',
  tempExtremes: '🌡️',
  waterColor: '💧',
  landslides: '⛰️',
};

export const RESOURCE_TYPE_ICONS = {
  AMBULANCE: '🚑', FIRE_TRUCK: '🚒', POLICE: '🚓',
  HELICOPTER: '🚁', RESCUE_TEAM: '👷', MEDICAL_TEAM: '⚕️',
  HOSPITAL: '🏥', FIRE_STATION: '🚒', POLICE_STATION: '🚓',
  SHELTER: '🏕️', SUPPLY_CENTER: '📦', DEFAULT: '📍',
};

// ── Icon Factories ────────────────────────────────────────────────────────────
export function createColoredIcon(color, size = 24) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};border:3px solid #fff;border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;">
        <div style="position:absolute;inset:-4px;border:2px solid ${color};
          border-radius:50%;opacity:0.3;animation:pulse-ring 2s ease-out infinite;"></div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function createEmojiIcon(emoji, bgColor = '#3b82f6', size = 32) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
        width:${size}px;height:${size}px;background:${bgColor};
        border:2px solid #fff;border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:${size * 0.5}px;">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function createSatelliteMarker(type, severity) {
  const emoji = INCIDENT_TYPE_ICONS[type] || '⚠️';
  const color = SEVERITY_COLORS[severity] || '#ef4444';
  return createEmojiIcon(emoji, color, 34);
}

// ── Heatmap Weight Calculation (ML-style scoring) ────────────────────────────
// Uses multi-factor scoring: severity, status recency, type risk
const SEVERITY_WEIGHT = { CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.45, LOW: 0.2 };
const TYPE_RISK = {
  FIRE: 0.9, EARTHQUAKE: 1.0, FLOOD: 0.85, HAZMAT: 0.95,
  ACCIDENT: 0.6, MEDICAL: 0.5, STORM: 0.7, OTHER: 0.3,
  wildfires: 0.9, volcanoes: 1.0, severeStorms: 0.8, floods: 0.85,
  earthquakes: 1.0, drought: 0.4, manmade: 0.7,
};

export function computeHeatmapWeight(incident) {
  const severity = SEVERITY_WEIGHT[incident.severity] ?? 0.4;
  const type = TYPE_RISK[incident.type || incident.incidentType || incident.category] ?? 0.4;

  // Recency bonus: incidents in last 24h get higher weight
  let recency = 0.5;
  if (incident.reportedAt || incident.createdAt) {
    const hoursAgo = (Date.now() - new Date(incident.reportedAt || incident.createdAt).getTime()) / 3600000;
    recency = hoursAgo < 6 ? 1.0 : hoursAgo < 24 ? 0.8 : hoursAgo < 72 ? 0.5 : 0.3;
  }

  // Status: active incidents get higher weight
  const statusMult = incident.status === 'REPORTED' || incident.status === 'OPEN' ? 1.0
    : incident.status === 'IN_PROGRESS' ? 0.8
    : 0.3;

  return Math.min(1.0, (severity * 0.4 + type * 0.3 + recency * 0.2 + statusMult * 0.1));
}

// ── Mock / Fallback Data ──────────────────────────────────────────────────────
export const MOCK_INCIDENTS = [
  { id: 1, title: 'Building Fire - Al Olaya', incidentType: 'FIRE', severity: 'HIGH', status: 'IN_PROGRESS', latitude: 24.6877, longitude: 46.7219, locationName: 'Al Olaya, Riyadh', reportedAt: new Date().toISOString() },
  { id: 2, title: 'Flash Flood - Jeddah Corniche', incidentType: 'FLOOD', severity: 'CRITICAL', status: 'REPORTED', latitude: 21.5169, longitude: 39.2192, locationName: 'Corniche, Jeddah', reportedAt: new Date().toISOString() },
  { id: 3, title: 'Road Accident - Highway 40', incidentType: 'ACCIDENT', severity: 'MEDIUM', status: 'IN_PROGRESS', latitude: 24.7500, longitude: 46.8000, locationName: 'Highway 40, Riyadh', reportedAt: new Date().toISOString() },
  { id: 4, title: 'Tremor - Dammam Region', incidentType: 'EARTHQUAKE', severity: 'HIGH', status: 'REPORTED', latitude: 26.4200, longitude: 49.9800, locationName: 'Dammam', reportedAt: new Date().toISOString() },
  { id: 5, title: 'Mass Casualty - Sports Event', incidentType: 'MEDICAL', severity: 'CRITICAL', status: 'IN_PROGRESS', latitude: 24.7136, longitude: 46.6753, locationName: 'King Fahd Stadium', reportedAt: new Date().toISOString() },
];

export const MOCK_RESOURCES = [
  { id: 1, name: 'Ambulance Unit 01', type: 'AMBULANCE', status: 'AVAILABLE', latitude: 24.7136, longitude: 46.6753 },
  { id: 2, name: 'Fire Engine 01', type: 'FIRE_TRUCK', status: 'ASSIGNED', latitude: 24.6877, longitude: 46.7219 },
  { id: 3, name: 'Rescue Team Alpha', type: 'RESCUE_TEAM', status: 'BUSY', latitude: 21.4858, longitude: 39.1925 },
  { id: 4, name: 'Medical Team Beta', type: 'MEDICAL_TEAM', status: 'AVAILABLE', latitude: 26.3927, longitude: 49.9777 },
];

export const MOCK_FACILITIES = [
  { id: 1, name: 'King Fahd Hospital', type: 'HOSPITAL', latitude: 24.7136, longitude: 46.6753, status: 'AVAILABLE' },
  { id: 2, name: 'Riyadh Fire Station', type: 'FIRE_STATION', latitude: 24.6877, longitude: 46.7219, status: 'AVAILABLE' },
  { id: 3, name: 'Emergency Shelter A', type: 'SHELTER', latitude: 24.7500, longitude: 46.8000, status: 'AVAILABLE' },
];

export const MOCK_SHELTERS = [
  { id: 1, name: 'King Fahd Stadium Shelter', center: [24.7136, 46.6753], radius: 500, color: '#22c55e' },
  { id: 2, name: 'Jeddah Sports City Shelter', center: [21.4858, 39.1925], radius: 300, color: '#3b82f6' },
  { id: 3, name: 'Dammam Expo Shelter', center: [26.3927, 49.9777], radius: 400, color: '#f59e0b' },
];
