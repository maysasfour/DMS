/**
 * HeatmapView.jsx
 *
 * Renders an interactive ML-weighted incident density heatmap for the DMS dashboard.
 * Combines locally reported incidents with real-time satellite data (NASA EONET + USGS)
 * to visually communicate geographic disaster hotspots and risk concentration.
 *
 * Key responsibilities:
 *  - Fetches live satellite/natural-event feeds and merges them with DMS incidents
 *  - Aggregates geo-points into a spatial grid and renders color-coded circle markers
 *  - Supports tile layer switching (Dark, Satellite, Street) for situational awareness
 *  - Provides a toggleable satellite-event overlay and a live event count badge
 *
 * Used in: Dashboard / analytics views where administrators monitor incident density.
 */

// React core hooks: useEffect for side-effects (map layer management), useState for UI state
import React, { useEffect, useState } from 'react';

// react-leaflet components: MapContainer wraps the Leaflet map, TileLayer provides base map tiles,
// useMap gives access to the underlying Leaflet map instance inside child components
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

// Leaflet core library — used directly for creating layerGroups and circleMarkers on the map
import L from 'leaflet';

// Required Leaflet stylesheet for correct map rendering (controls, popups, tiles)
import 'leaflet/dist/leaflet.css';

// DMS map utilities: shared map center/zoom defaults, available tile layer configs,
// fallback mock incidents for development, and the heatmap weight scoring function
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS, MOCK_INCIDENTS, computeHeatmapWeight
} from './mapUtils';

// Service that fetches all live satellite events (NASA EONET natural disasters + USGS earthquakes)
// to supplement DMS-reported incidents with real-time geospatial hazard data
import { fetchAllSatelliteEvents } from '../../services/satelliteService';

/**
 * HeatLayer — internal Leaflet rendering component.
 *
 * Accepts an array of [lat, lng, weight] tuples representing weighted incident locations,
 * aggregates them into a spatial grid to reduce visual clutter, and draws color-coded
 * circle markers whose size and color reflect local incident density and severity.
 *
 * This component renders nothing to the React tree (returns null); it operates entirely
 * through Leaflet's imperative API via side-effects.
 *
 * @param {Array} points - Array of [latitude, longitude, weight] tuples for all incidents
 */
function HeatLayer({ points }) {
  // Retrieve the Leaflet map instance from the nearest MapContainer ancestor
  const map = useMap();

  // Build and draw the heatmap layer whenever the map instance or data points change;
  // cleanup removes the previous layer group to prevent stale overlays on re-render
  useEffect(() => {
    // Guard: skip rendering if there are no incident points to display
    if (!points || points.length === 0) return;

    // Spatial grid cell size in decimal degrees (~8 km at equator);
    // smaller values increase granularity but may produce visual noise
    const cellSize = 0.08;

    // Grid accumulator: keys are quantized lat_lng strings, values hold running totals
    // for averaging position and summing weights within each cell
    const grid = {};

    // Accumulate each incident point into its nearest grid cell
    points.forEach(([lat, lng, weight]) => {
      // Snap lat/lng to the nearest grid cell center to cluster nearby incidents
      const key = `${Math.round(lat / cellSize) * cellSize}_${Math.round(lng / cellSize) * cellSize}`;

      // Initialize cell if this is the first incident to fall within it
      if (!grid[key]) grid[key] = { lat: 0, lng: 0, total: 0, count: 0 };

      // Accumulate positional values for later averaging to find cell centroid
      grid[key].lat   += lat;
      grid[key].lng   += lng;

      // Sum the ML-computed weights to reflect cumulative density/severity in this cell
      grid[key].total += weight;

      // Track point count for centroid averaging
      grid[key].count += 1;
    });

    // Normalize weights: find the maximum total weight across all cells for ratio calculation
    const maxW = Math.max(...Object.values(grid).map(g => g.total), 1);

    // Create a Leaflet layer group to batch-add all circle markers and allow single-call removal
    const group = L.layerGroup();

    // Render one circle marker per grid cell, scaled and colored by relative incident density
    Object.values(grid).forEach(cell => {
      // Compute the geographic centroid of the cell from accumulated incident positions
      const lat   = cell.lat / cell.count;
      const lng   = cell.lng / cell.count;

      // Normalize this cell's total weight to a 0–1 ratio relative to the busiest cell
      const ratio = cell.total / maxW;

      // Scale circle radius between 20px (sparse) and 80px (dense) based on incident concentration
      const radius = 20 + ratio * 60;

      // Scale fill opacity between 0.18 (low risk) and 0.73 (critical) for visual depth
      const opacity = 0.18 + ratio * 0.55;

      // Map density ratio to a color scale from amber (low) through orange to deep red (critical),
      // following emergency severity conventions used in disaster management dashboards
      const color = ratio > 0.75 ? '#7f1d1d'  // Critical — darkest red
                  : ratio > 0.5  ? '#dc2626'   // High — bright red
                  : ratio > 0.25 ? '#ea580c'   // Medium — orange
                  : '#f59e0b';                  // Low — amber

      // Draw a non-interactive filled circle marker at the cell centroid on the Leaflet map
      L.circleMarker([lat, lng], {
        radius,           // Pixel radius reflecting incident density
        fillColor: color, // Severity-coded fill color
        fillOpacity: opacity, // Density-proportional transparency
        color: 'none',    // No stroke border — keeps the overlay visually clean
        weight: 0,        // Stroke width zero (reinforces no border)
        interactive: false, // Disable click/hover events so underlying map remains usable
      }).addTo(group);
    });

    // Add all rendered density circles to the live Leaflet map in a single operation
    group.addTo(map);

    // Cleanup function: remove the entire layer group when points change or component unmounts
    // to prevent ghost layers accumulating on repeated re-renders
    return () => { map.removeLayer(group); };
  }, [map, points]); // Re-run whenever the map instance or incident point data changes

  // HeatLayer is a side-effect-only component — it renders nothing into the React tree
  return null;
}

/**
 * HeatmapView — public-facing heatmap dashboard component for the DMS admin interface.
 *
 * Merges externally supplied DMS incidents with live satellite hazard events and renders
 * them as a density heatmap using color-coded Leaflet circle markers. Provides controls
 * for switching base tile layers and toggling the satellite event overlay.
 *
 * @param {Array}  incidents - DMS-reported incidents from the backend (optional);
 *                             falls back to MOCK_INCIDENTS during development if empty
 * @param {string} height    - CSS height for the map container (default: '500px')
 */
export default function HeatmapView({ incidents: externalIncidents, height = '500px' }) {
  // Live satellite/natural-hazard events fetched from NASA EONET and USGS feeds
  const [satelliteEvents, setSatelliteEvents] = useState([]);

  // Loading flag for the satellite data fetch — drives the animated "loading…" indicator
  const [loadingLive, setLoadingLive] = useState(true);

  // Currently active base tile layer key ('dark' | 'satellite' | 'street')
  const [activeLayer, setActiveLayer] = useState('dark');

  // Whether to overlay live satellite/natural-event data on top of DMS incidents
  const [showSatellite, setShowSatellite] = useState(true);

  // On mount, fetch all live satellite events (NASA EONET + USGS) once;
  // no dependency array values needed because this runs only at component initialization
  useEffect(() => {
    fetchAllSatelliteEvents().then(events => {
      // Store fetched satellite events for inclusion in the heatmap data
      setSatelliteEvents(events);
      // Mark loading complete so the UI badge switches from "loading…" to event count
      setLoadingLive(false);
    });
  }, []); // Empty deps array: run once on mount, not on every render

  // Resolve the incident dataset: prefer externally provided DMS incidents;
  // fall back to MOCK_INCIDENTS when the parent passes no data (e.g., during development)
  const localIncidents = externalIncidents?.length > 0 ? externalIncidents : MOCK_INCIDENTS;

  // Combine DMS incidents with optionally toggled satellite events into one unified dataset
  // for heatmap rendering — satellite events are suppressed when the toggle is off
  const allIncidents = [
    ...localIncidents,                              // Reported DMS incidents (verified or pending)
    ...(showSatellite ? satelliteEvents : []),       // Live NASA/USGS events when overlay is active
  ];

  // Build the [lat, lng, weight] tuples that HeatLayer consumes;
  // filter out incidents with missing coordinates to avoid rendering errors on the map
  const heatPoints = allIncidents
    .filter(i => i.latitude && i.longitude)           // Only include geo-located incidents
    .map(i => [i.latitude, i.longitude, computeHeatmapWeight(i)]); // Apply ML-style severity weighting

  // Resolve the active tile layer configuration object (url, attribution, maxZoom)
  const tile = TILE_LAYERS[activeLayer];

  // Configuration for the tile layer switcher buttons rendered in the map header
  const LAYER_BUTTONS = [
    { key: 'dark',      label: 'Dark'      }, // High-contrast dark basemap — default for DMS dashboards
    { key: 'satellite', label: 'Satellite' }, // Satellite imagery for terrain awareness
    { key: 'street',    label: 'Street'    }, // Street-level detail for urban incident navigation
  ];

  return (
    // Outer container: rounded card with DMS theme border and shadow from CSS design tokens
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>

      {/* Header bar: title, tile layer switcher, satellite toggle, and total incident count */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>

        {/* Map section title — identifies this as an ML-driven density heatmap to operators */}
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          ML Incident Density Heatmap
        </span>

        {/* Tile layer switcher: buttons for Dark / Satellite / Street base maps */}
        <div className="flex gap-1 ml-2">
          {LAYER_BUTTONS.map(b => (
            // Each button activates a different base tile layer; active state uses DMS accent gradient
            <button key={b.key} onClick={() => setActiveLayer(b.key)}
              className="px-3 py-1 rounded text-xs font-semibold transition-all"
              style={{
                // Active layer gets the DMS brand gradient; inactive layers use subtle background
                background: activeLayer === b.key ? 'linear-gradient(135deg,#E63946,#FF7A00)' : 'var(--bg-tertiary)',
                color: activeLayer === b.key ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}>
              {b.label}
            </button>
          ))}
        </div>

        {/* Satellite event toggle: enables/disables live NASA EONET + USGS event overlay */}
        <label className="flex items-center gap-2 ml-auto cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
          {/* Checkbox controls the showSatellite state to include/exclude live satellite data */}
          <input type="checkbox" checked={showSatellite} onChange={e => setShowSatellite(e.target.checked)} />
          Live NASA / USGS events

          {/* Animated pulse shown while satellite events are being fetched from external APIs */}
          {loadingLive && <span className="ml-1 animate-pulse">loading...</span>}

          {/* Green badge showing count of live satellite events once the fetch completes */}
          {!loadingLive && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              {satelliteEvents.length} live
            </span>
          )}
        </label>

        {/* Total incident count badge: DMS incidents + live satellite events combined */}
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {allIncidents.length} total
        </span>
      </div>

      {/* Leaflet map: renders the base tile layer and the density heatmap overlay */}
      {/* DEFAULT_CENTER centers the initial view; zoom=4 shows continental-scale coverage */}
      <MapContainer center={DEFAULT_CENTER} zoom={4} style={{ height, width: '100%' }} scrollWheelZoom>
        {/* Base tile layer — swaps between dark/satellite/street based on activeLayer state */}
        <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} />

        {/* Heatmap overlay — draws color-coded density circles for all merged incident points */}
        <HeatLayer points={heatPoints} />
      </MapContainer>

      {/* Legend bar: explains color scale, weighting method, and live data source */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center text-xs" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>

        {/* Legend label identifying what the color gradient represents */}
        <span className="font-semibold" style={{ color: 'var(--text-tertiary)' }}>ML Density Score:</span>

        {/* Gradient swatch visualizing the full color range from low (amber) to critical (dark red) */}
        <div className="flex items-center gap-1.5">
          <div style={{ width: 60, height: 10, borderRadius: 4, background: 'linear-gradient(90deg,#f59e0b,#ea580c,#dc2626,#7f1d1d)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Low to Critical</span>
        </div>

        {/* Explanation of the ML weighting factors used to score each incident's heatmap contribution */}
        <span style={{ color: 'var(--text-tertiary)' }}>Weighted by severity, type risk, and recency</span>

        {/* Live data source attribution — assures operators the satellite feed is real-time */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Pulsing green dot signals active real-time data connection */}
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          <span style={{ color: 'var(--text-tertiary)' }}>NASA EONET + USGS real-time</span>
        </div>
      </div>
    </div>
  );
}