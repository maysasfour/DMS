/**
 * satelliteService.js
 *
 * Satellite and external disaster intelligence service for the DMS (Disaster Management System).
 * Fetches real-world disaster events from two authoritative public APIs:
 *   - NASA EONET (Earth Observatory Natural Event Tracker): Provides open natural disaster events
 *     such as wildfires, floods, storms, and volcanic activity detected via satellite observation.
 *   - USGS Earthquake Hazards Program: Provides near-real-time earthquake data filtered by
 *     minimum magnitude to surface only significant seismic events.
 *
 * These feeds supplement locally-reported incidents on the DMS map with verified global events,
 * enabling situational awareness and cross-referencing against reported incidents.
 * No API keys are required — both endpoints are publicly accessible.
 */

// Base URL for NASA EONET API v3 — requests all currently open (active) natural events, capped at 100
const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';

// Base URL for USGS Earthquake feed — GeoJSON format, minimum magnitude 4.0, 50 most recent by time
const USGS_URL  = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.0&limit=50&orderby=time';

// Maps NASA EONET category IDs to DMS-internal incident type labels, display icons, and severity colors
// This normalization lets satellite events integrate seamlessly with the DMS incident type system
const EONET_CATEGORY_MAP = {
  // Active wildfires mapped to DMS FIRE incident type — red to signal high danger
  wildfires:      { label: 'FIRE',       icon: '🔥', color: '#dc2626' },
  // Volcanic activity mapped to EARTHQUAKE type as closest DMS category — dark red for extreme risk
  volcanoes:      { label: 'EARTHQUAKE', icon: '🌋', color: '#7f1d1d' },
  // Severe storms (hurricanes, typhoons) mapped to STORM — purple for hazardous atmospheric events
  severeStorms:   { label: 'STORM',      icon: '⛈️',  color: '#7c3aed' },
  // Flood events mapped to FLOOD type — blue to represent water-related disasters
  floods:         { label: 'FLOOD',      icon: '🌊', color: '#2563eb' },
  // Seismic events from EONET also mapped to EARTHQUAKE — brown for geological hazards
  earthquakes:    { label: 'EARTHQUAKE', icon: '🌍', color: '#92400e' },
  // Drought conditions classified as OTHER — amber to indicate environmental stress
  drought:        { label: 'OTHER',      icon: '🏜️', color: '#d97706' },
  // Dust and haze events classified as OTHER — grey to represent reduced visibility hazards
  dustHaze:       { label: 'OTHER',      icon: '🌫️', color: '#9ca3af' },
  // Human-caused or industrial hazard events mapped to HAZMAT — orange for chemical/industrial risk
  manmade:        { label: 'HAZMAT',     icon: '⚠️', color: '#ea580c' },
  // Sea and lake ice events classified as OTHER — light blue for cold-water environmental hazards
  seaLakeIce:     { label: 'OTHER',      icon: '🧊', color: '#93c5fd' },
  // Snow and ice storms mapped to STORM — pale blue for winter weather events
  snowIce:        { label: 'STORM',      icon: '❄️', color: '#bfdbfe' },
  // Temperature extremes (heat waves, cold snaps) classified as OTHER — yellow for climate risk
  tempExtremes:   { label: 'OTHER',      icon: '🌡️', color: '#fbbf24' },
  // Landslides and mudslides classified as OTHER — dark brown for terrain instability
  landslides:     { label: 'OTHER',      icon: '⛰️', color: '#78350f' },
};

/**
 * Derives a DMS severity level from a NASA EONET category ID.
 * Used to pre-populate the severity field on satellite-sourced incidents so they
 * integrate with the DMS triage and alerting system.
 * @param {string} category - EONET category ID (e.g. 'wildfires', 'floods')
 * @returns {'HIGH'|'MEDIUM'|'LOW'} - DMS-standard severity string
 */
function parseSeverity(category) {
  // Wildfires, volcanic activity, and earthquakes are treated as HIGH severity by default
  if (['wildfires', 'volcanoes', 'earthquakes'].includes(category)) return 'HIGH';
  // Severe storms, floods, and man-made hazards are MEDIUM severity
  if (['severeStorms', 'floods', 'manmade'].includes(category))     return 'MEDIUM';
  // All other categories (drought, dust, ice, temperature, landslides) default to LOW
  return 'LOW';
}

/**
 * Fetches currently open natural disaster events from the NASA EONET API.
 * Normalizes each event into DMS incident format so it can be displayed on the
 * incident map alongside locally-reported incidents.
 * Events with missing or incomplete coordinates are filtered out to avoid map rendering errors.
 * @returns {Promise<Array>} Array of DMS-formatted incident objects sourced from NASA EONET,
 *                           or empty array if the API is unreachable.
 */
export async function fetchNasaEonetEvents() {
  try {
    // Request all open natural events from NASA's satellite-based EONET feed
    const res = await fetch(EONET_URL);
    // Throw immediately if the HTTP response indicates a server or network error
    if (!res.ok) throw new Error('EONET fetch failed');
    // Parse the JSON response body containing the events array
    const data = await res.json();

    // flatMap is used because each EONET event may have multiple geometry track points
    return (data.events || []).flatMap(event => {
      // Extract the primary category ID for this event (e.g. 'wildfires', 'floods')
      const categoryId = event.categories?.[0]?.id;
      // Look up DMS display metadata for this category; fall back to generic OTHER if unknown
      const meta = EONET_CATEGORY_MAP[categoryId] || { label: 'OTHER', icon: '⚠️', color: '#6b7280' };

      // Each event can have multiple geometry points (track)
      // representing the event's path or progression over time
      return (event.geometry || [])
        // Discard geometry entries that lack valid coordinate pairs to prevent map errors
        .filter(g => g.coordinates && g.coordinates.length >= 2)
        // Use only the most recent (first) coordinate point to avoid duplicate map markers per event
        .slice(0, 1)
        // Transform each geometry point into a DMS-standard incident object
        .map(g => ({
          // Prefix with 'eonet-' to distinguish satellite events from local DMS incidents
          id: `eonet-${event.id}`,
          // Human-readable event title as provided by NASA (e.g. "California Wildfire")
          title: event.title,
          // Normalized DMS incident type derived from EONET category mapping
          incidentType: meta.label,
          // Raw EONET category ID retained for filtering and debugging purposes
          category: categoryId,
          // Emoji icon for map marker and list display in the DMS UI
          icon: meta.icon,
          // Hex color for map marker and severity badge styling
          color: meta.color,
          // DMS severity level derived from EONET category (HIGH/MEDIUM/LOW)
          severity: parseSeverity(categoryId),
          // All satellite-sourced events enter the DMS as REPORTED — pending human verification
          status: 'REPORTED',
          // EONET uses [longitude, latitude] order; extract latitude from index 1
          latitude: g.coordinates[1],
          // EONET uses [longitude, latitude] order; extract longitude from index 0
          longitude: g.coordinates[0],
          // Use the event title as a human-readable location label for the incident detail view
          locationName: event.title,
          // Prefer geometry-level date (most precise); fall back to first geometry date if missing
          reportedAt: g.date || event.geometry?.[0]?.date,
          // Label this incident as coming from NASA EONET for provenance and UI display
          source: 'NASA EONET',
          // Direct link to the original NASA source page or article for responder reference
          sourceUrl: event.sources?.[0]?.url,
          // Flag to distinguish real-world satellite events from user-submitted DMS incidents
          isRealWorldEvent: true,
        }));
    });
  } catch (err) {
    // Log a non-fatal warning if EONET is unreachable — the DMS map continues with local incidents
    console.warn('NASA EONET unavailable:', err.message);
    // Return empty array so callers receive a consistent type regardless of API availability
    return [];
  }
}

/**
 * Fetches recent significant earthquakes from the USGS Earthquake Hazards Program API.
 * Only earthquakes with magnitude >= 4.0 are included to reduce noise.
 * Magnitude determines both color and severity so DMS responders can prioritize critical events.
 * @returns {Promise<Array>} Array of DMS-formatted earthquake incident objects,
 *                           or empty array if the USGS API is unreachable.
 */
export async function fetchUsgsEarthquakes() {
  try {
    // Request recent significant earthquake events in GeoJSON format from USGS
    const res = await fetch(USGS_URL);
    // Throw if the HTTP response signals a failure — prevents processing malformed data
    if (!res.ok) throw new Error('USGS fetch failed');
    // Parse the GeoJSON FeatureCollection response body
    const data = await res.json();

    // Transform each GeoJSON Feature into a DMS-standard incident object
    return (data.features || []).map(f => {
      // Extract Richter magnitude; default to 0 if missing to allow safe comparisons
      const mag = f.properties.mag || 0;
      return {
        // Prefix with 'usgs-' to distinguish USGS events from EONET and local DMS incidents
        id: `usgs-${f.id}`,
        // Full descriptive title from USGS (e.g. "M 5.4 - 10km NW of Anchorage, Alaska")
        title: f.properties.title,
        // All USGS events are earthquakes by definition
        incidentType: 'EARTHQUAKE',
        // Standard EONET-compatible category ID for consistency with EONET mapping
        category: 'earthquakes',
        // Globe icon used for earthquake markers on the DMS incident map
        icon: '🌍',
        // Color scales with magnitude: dark red for major (>=6), red for strong (>=5), amber for moderate
        color: mag >= 6 ? '#7f1d1d' : mag >= 5 ? '#dc2626' : '#f59e0b',
        // Severity escalates with magnitude: CRITICAL for major quakes, HIGH for strong, MEDIUM for moderate
        severity: mag >= 6 ? 'CRITICAL' : mag >= 5 ? 'HIGH' : 'MEDIUM',
        // Retain raw magnitude value for display in incident detail view and filtering
        magnitude: mag,
        // All satellite-sourced incidents enter DMS as REPORTED pending local authority review
        status: 'REPORTED',
        // GeoJSON coordinates are [longitude, latitude, depth]; extract latitude from index 1
        latitude: f.geometry.coordinates[1],
        // GeoJSON coordinates are [longitude, latitude, depth]; extract longitude from index 0
        longitude: f.geometry.coordinates[0],
        // Focal depth in kilometers — relevant for assessing surface damage potential
        depth: f.geometry.coordinates[2],
        // Human-readable place description from USGS (e.g. "10km NW of Anchorage, Alaska")
        locationName: f.properties.place,
        // Convert USGS Unix millisecond timestamp to ISO 8601 for consistent DMS date handling
        reportedAt: new Date(f.properties.time).toISOString(),
        // Label for provenance display in the DMS incident list and detail views
        source: 'USGS',
        // Link to USGS event detail page so responders can access authoritative seismic data
        sourceUrl: f.properties.url,
        // Flag to differentiate real-world USGS events from user-submitted DMS incidents
        isRealWorldEvent: true,
      };
    });
  } catch (err) {
    // Log a non-fatal warning if USGS is unreachable — DMS map degrades gracefully
    console.warn('USGS unavailable:', err.message);
    // Return empty array to maintain consistent return type for callers
    return [];
  }
}

/**
 * Aggregates disaster events from all satellite sources (NASA EONET + USGS) in parallel.
 * This is the primary entry point used by the DMS incident map to load real-world events.
 * Parallel fetching minimises latency so the map populates quickly even if one source is slow.
 * If either source fails, it returns an empty array (handled internally) so the other still loads.
 * @returns {Promise<Array>} Combined array of DMS-formatted incident objects from all satellite feeds.
 */
export async function fetchAllSatelliteEvents() {
  // Fetch from NASA EONET and USGS concurrently to reduce total wait time
  const [eonet, usgs] = await Promise.all([
    fetchNasaEonetEvents(),
    fetchUsgsEarthquakes(),
  ]);
  // Merge both event arrays into a single flat list for the DMS map layer
  return [...eonet, ...usgs];
}