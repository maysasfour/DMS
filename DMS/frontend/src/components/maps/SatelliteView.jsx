import group, every component, every hook, every state variable, every JSX block, and every logic branch explaining the WHY and WHAT in DMS domain terms.

/**
 * SatelliteView.jsx
 *
 * Renders a full-featured satellite-backed map view for the Disaster Management System (DMS).
 * Combines real-world disaster events fetched from external satellite data sources (NASA EONET,
 * USGS Earthquake Feed) with locally reported DMS incidents on an interactive Leaflet map.
 *
 * Responsibilities:
 * - Fetches live satellite/seismic events via satelliteService on mount
 * - Merges live satellite events with locally reported incidents from the DMS backend
 * - Supports filtering by incident type (Fire, Earthquake, Flood, Storm, Hazmat, Other)
 * - Allows toggling between live satellite events and local DMS incident reports
 * - Displays each event as a color-coded, emoji-labelled marker sized by severity
 * - Shows rich popup details including magnitude, depth, source URL, and data origin (NASA/USGS)
 * - Provides a footer statistics bar breaking down visible events by incident category
 * - Supports multiple tile layer modes: Satellite, Street, Terrain, Dark
 */

// React core and hooks for state management and memoization
import React, { useState, useEffect, useMemo } from 'react';

// Leaflet React components: map container, tile layers, markers, popups, and layer switching
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';

// Leaflet default CSS — required for correct map rendering and marker display
import 'leaflet/dist/leaflet.css';

// DMS map utility constants: tile layer URLs, emoji icon factory, incident type icons, and severity color palette
import { TILE_LAYERS, createEmojiIcon, INCIDENT_TYPE_ICONS, SEVERITY_COLORS } from './mapUtils';

// Service function that aggregates real-world disaster events from NASA EONET and USGS APIs
import { fetchAllSatelliteEvents } from '../../services/satelliteService';

// Destructure BaseLayer from LayersControl for cleaner JSX usage in the tile layer switcher
const { BaseLayer } = LayersControl;

/**
 * FitAll — internal Leaflet utility component
 *
 * Automatically adjusts the map viewport to fit all currently visible incident markers.
 * Uses the useMap hook to access the Leaflet map instance imperatively.
 * Runs whenever the set of filtered event coordinates changes, ensuring all markers
 * remain visible without requiring manual pan/zoom by the operator.
 *
 * @param {Array} points - Array of [latitude, longitude] pairs for all visible events
 */
function FitAll({ points }) {
  // Access the parent Leaflet map instance via React-Leaflet context
  const map = useMap();

  // Re-fit the map bounds whenever the visible point set changes
  useEffect(() => {
    // Only attempt fitBounds when there is at least one visible event to frame
    if (points.length > 0) {
      try {
        // Fit map to all event coordinates with padding; cap zoom to prevent over-zooming on clustered events
        map.fitBounds(points, { padding: [40, 40], maxZoom: 6 });
      } catch {}
      // Silently swallow Leaflet bounds errors that can occur during rapid re-renders
    }
  }, [points, map]);

  // This component renders nothing — it is purely a map side-effect controller
  return null;
}

/**
 * TYPE_FILTER_OPTIONS
 *
 * Dropdown options for filtering visible events by DMS incident category.
 * Maps each disaster type (aligned with backend IncidentType enum) to a human-readable
 * label with an emoji for quick visual identification in the toolbar.
 */
const TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Types' },         // Show all incident types simultaneously
  { value: 'FIRE', label: '🔥 Fire / Wildfire' }, // Wildfires detected via NASA EONET or locally reported
  { value: 'EARTHQUAKE', label: '🌍 Earthquake' }, // Seismic events from USGS Earthquake Feed
  { value: 'FLOOD', label: '🌊 Flood' },         // Flood events from satellite or local reports
  { value: 'STORM', label: '⛈️ Storm' },          // Severe storm events
  { value: 'HAZMAT', label: '☣️ Hazmat' },        // Hazardous material incidents
  { value: 'OTHER', label: '⚠️ Other' },          // Unclassified or miscellaneous disaster events
];

/**
 * SatelliteView — main exported component
 *
 * Displays a multi-layer interactive map overlaying DMS local incident reports
 * with live satellite-sourced global disaster events. Operators can filter by type,
 * toggle data source layers, and inspect individual events through rich popups.
 *
 * @param {Array}  localIncidents - DMS incidents fetched from the backend (default: empty array)
 * @param {string} height         - CSS height of the map container (default: '500px')
 */
export default function SatelliteView({ localIncidents = [], height = '500px' }) {
  // Live satellite/seismic events fetched from NASA EONET and USGS APIs
  const [satelliteEvents, setSatelliteEvents] = useState([]);

  // Tracks the async fetch state to show a loading indicator in the toolbar
  const [loading, setLoading] = useState(true);

  // Captures any fetch errors so the toolbar can warn operators that live data is unavailable
  const [error, setError] = useState(null);

  // Active incident type filter; 'ALL' means no filtering is applied
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Controls whether locally reported DMS incidents are rendered on the map
  const [showLocal, setShowLocal] = useState(true);

  // Controls whether live satellite events (NASA/USGS) are rendered on the map
  const [showLive, setShowLive] = useState(true);

  // Tracks the currently selected event for potential future detail panel usage
  const [selected, setSelected] = useState(null);

  /**
   * On component mount, fetch all live satellite disaster events.
   * Sets loading to false after resolution — whether successful or failed —
   * so the UI always exits the loading state and shows either data or an error banner.
   */
  useEffect(() => {
    setLoading(true);
    fetchAllSatelliteEvents()
      .then(events => {
        // Store fetched satellite events and clear loading state on success
        setSatelliteEvents(events);
        setLoading(false);
      })
      .catch(err => {
        // Record the error message for display; map continues to show local incidents
        setError(err.message);
        setLoading(false);
      });
  }, []); // Empty dependency array — fetch once when the component first mounts

  /**
   * allEvents — memoized merged event list
   *
   * Combines live satellite events and local DMS incidents into a single array
   * based on the current toggle states (showLive / showLocal).
   * Normalizes the incidentType field for local incidents (which may use 'type' instead).
   * Filters out any events that lack valid coordinates, preventing Leaflet marker errors.
   *
   * Recomputes only when satellite data, local incidents, or toggle states change.
   */
  const allEvents = useMemo(() => {
    const items = [];

    // Include live satellite events if the NASA/USGS layer is toggled on
    if (showLive) items.push(...satelliteEvents);

    // Include local DMS incidents if the local reports layer is toggled on;
    // normalize the type field to 'incidentType' for consistent downstream filtering
    if (showLocal) items.push(...localIncidents.map(i => ({ ...i, incidentType: i.incidentType || i.type })));

    // Discard events without coordinates — they cannot be placed on the map
    return items.filter(e => e.latitude && e.longitude);
  }, [satelliteEvents, localIncidents, showLive, showLocal]);

  /**
   * filtered — memoized type-filtered event list
   *
   * Applies the active typeFilter to allEvents, returning only events matching
   * the selected DMS incident category. Returns all events when filter is 'ALL'.
   * Drives both the map markers and the footer statistics bar.
   */
  const filtered = useMemo(() => {
    // No filter active — display every merged event
    if (typeFilter === 'ALL') return allEvents;
    // Narrow to events whose incidentType matches the selected filter value
    return allEvents.filter(e => e.incidentType === typeFilter);
  }, [allEvents, typeFilter]);

  // Convert filtered events to [lat, lng] pairs for the FitAll bounds helper
  const bounds = filtered.map(e => [e.latitude, e.longitude]);

  return (
    // Outer container with DMS design system border and shadow tokens
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>

      {/* Toolbar — type filter dropdown, layer toggles, and live event status indicators */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>

        {/* Section label indicating this view shows real-world satellite-sourced events */}
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          🛰️ Satellite Real-World Events
        </span>

        {/* Incident type filter — narrows visible markers to a single disaster category */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}>
          {/* Render one <option> per filter entry from TYPE_FILTER_OPTIONS */}
          {TYPE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Toggle for showing/hiding NASA EONET and USGS satellite events on the map */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showLive} onChange={e => setShowLive(e.target.checked)} />
          🛰️ NASA/USGS Live
        </label>

        {/* Toggle for showing/hiding locally reported DMS incidents on the map */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showLocal} onChange={e => setShowLocal(e.target.checked)} />
          📍 Local Reports
        </label>

        {/* Right-aligned status area: fetch progress, live event count, filtered total */}
        <div className="ml-auto flex items-center gap-2 text-xs">

          {/* Loading indicator — pulsing text shown while the satellite fetch is in-flight */}
          {loading && <span className="animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Fetching satellite data…</span>}

          {/* Success state — animated green dot and count of live satellite events received */}
          {!loading && !error && (
            <>
              {/* Pulsing green dot signals that live data is active and current */}
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              <span style={{ color: 'var(--text-tertiary)' }}>{satelliteEvents.length} live events</span>
            </>
          )}

          {/* Error state — warns operators that live satellite feeds are unavailable */}
          {error && <span style={{ color: '#dc2626' }}>⚠ Live data unavailable</span>}

          {/* Badge displaying the total number of events currently shown on the map */}
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {filtered.length} shown
          </span>
        </div>
      </div>

      {/* Map — interactive Leaflet map centered globally, starting at zoom level 2 */}
      <MapContainer center={[20, 0]} zoom={2} style={{ height, width: '100%' }} scrollWheelZoom>

        {/* LayersControl — top-right control panel for switching between tile providers */}
        <LayersControl position="topright">

          {/* Satellite tile layer — default active layer; best for visualizing terrain and event geography */}
          <BaseLayer checked name="Satellite">
            <TileLayer url={TILE_LAYERS.satellite.url} attribution={TILE_LAYERS.satellite.attribution} maxZoom={19} />
          </BaseLayer>

          {/* Street map tile layer — useful for identifying roads and urban infrastructure near incidents */}
          <BaseLayer name="Street">
            <TileLayer url={TILE_LAYERS.street.url} attribution={TILE_LAYERS.street.attribution} />
          </BaseLayer>

          {/* Terrain tile layer — highlights topography relevant to flood, earthquake, and wildfire spread */}
          <BaseLayer name="Terrain">
            <TileLayer url={TILE_LAYERS.terrain.url} attribution={TILE_LAYERS.terrain.attribution} maxZoom={17} />
          </BaseLayer>

          {/* Dark tile layer — reduces eye strain during night-shift operations or low-light environments */}
          <BaseLayer name="Dark">
            <TileLayer url={TILE_LAYERS.dark.url} attribution={TILE_LAYERS.dark.attribution} />
          </BaseLayer>
        </LayersControl>

        {/* FitAll — auto-pans and zooms the map so all filtered incident markers are visible */}
        <FitAll points={bounds} />

        {/* Render one Marker per filtered event, styled by incident type and severity */}
        {filtered.map(event => {
          // Resolve the emoji icon for this event's incident type or fallback category; default to warning sign
          const emoji = INCIDENT_TYPE_ICONS[event.incidentType] || INCIDENT_TYPE_ICONS[event.category] || '⚠️';

          // Determine marker color from the event's own color field or from the DMS severity color palette
          const color = event.color || SEVERITY_COLORS[event.severity] || '#ef4444';

          // Scale marker size by severity: CRITICAL events are largest for immediate visual prominence
          const size = event.severity === 'CRITICAL' ? 38 : event.severity === 'HIGH' ? 32 : 26;

          return (
            // Each marker is keyed by the event's unique ID to enable efficient React reconciliation
            <Marker
              key={event.id}
              // Place the marker at the event's geographic coordinates
              position={[event.latitude, event.longitude]}
              // Use the DMS emoji icon factory to produce a styled, color-coded marker
              icon={createEmojiIcon(emoji, color, size)}
              // Track the selected event in state for potential detail panel or analytics use
              eventHandlers={{ click: () => setSelected(event) }}
            >
              {/* Popup — shown on marker click; displays full incident metadata for operator assessment */}
              <Popup maxWidth={260}>
                <div style={{ minWidth: 220 }}>

                  {/* Popup header: emoji icon and incident title */}
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <strong style={{ fontSize: 13, lineHeight: 1.3 }}>{event.title}</strong>
                  </div>

                  {/* Badge row: severity level, incident type, and satellite source label if applicable */}
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {/* Severity badge — color matches DMS severity palette for quick triage */}
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#fff', background: color }}>
                      {event.severity}
                    </span>

                    {/* Incident type badge (e.g. FIRE, EARTHQUAKE) for category identification */}
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: '#6b7280' }}>
                      {event.incidentType}
                    </span>

                    {/* Satellite source badge — only rendered for events originating from NASA/USGS feeds */}
                    {event.isRealWorldEvent && (
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: '#fff', background: '#0284c7' }}>
                        🛰️ {event.source}
                      </span>
                    )}
                  </div>

                  {/* Location name — human-readable place name from the satellite data or local report */}
                  {event.locationName && (
                    <p style={{ fontSize: 12, margin: '3px 0', color: '#64748b' }}>📍 {event.locationName}</p>
                  )}

                  {/* Seismic details — magnitude and depth shown only for earthquake events from USGS */}
                  {event.magnitude && (
                    <p style={{ fontSize: 12, margin: '3px 0', color: '#64748b' }}>Magnitude: <strong>{event.magnitude}</strong> | Depth: {event.depth?.toFixed(1)}km</p>
                  )}

                  {/* Report timestamp — when the event was first detected or reported */}
                  {event.reportedAt && (
                    <p style={{ fontSize: 11, margin: '3px 0', color: '#94a3b8' }}>
                      {new Date(event.reportedAt).toLocaleString()}
                    </p>
                  )}

                  {/* External source URL — links to the originating NASA EONET or USGS event page */}
                  {event.sourceUrl && (
                    <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#3b82f6', display: 'block', marginTop: 6 }}>
                      View source →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Footer stats bar — shows per-type event counts for the currently filtered/visible events */}
      <div className="px-4 py-2 flex flex-wrap gap-4 items-center text-xs" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>

        {/* Iterate over all known incident types to display a count badge for each non-zero category */}
        {['FIRE','EARTHQUAKE','FLOOD','STORM','HAZMAT','OTHER'].map(type => {
          // Count how many currently visible events belong to this incident type
          const count = filtered.filter(e => e.incidentType === type).length;

          // Skip rendering the badge entirely if no events of this type are currently visible
          if (!count) return null;

          return (
            // Display the type emoji, title-cased type name, and bold event count
            <span key={type} style={{ color: 'var(--text-secondary)' }}>
              {INCIDENT_TYPE_ICONS[type]} {type.charAt(0) + type.slice(1).toLowerCase()}: <strong>{count}</strong>
            </span>
          );
        })}

        {/* Data attribution — credits the external satellite data sources used in this view */}
        <span className="ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          Sources: NASA EONET · USGS Earthquake
        </span>
      </div>
    </div>
  );
}