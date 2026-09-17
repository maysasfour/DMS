/**
 * LocationPicker.jsx
 *
 * Interactive map component used in the DMS incident reporting form to allow
 * responders and civilians to pinpoint the exact geographic location of a disaster
 * or emergency event. Supports three input methods:
 *   1. Click directly on the Leaflet map to drop a marker
 *   2. Use the browser's Geolocation API to auto-detect current position (GPS)
 *   3. Type a place name and geocode it via Nominatim (OpenStreetMap free service)
 *
 * The selected coordinates are passed up to the parent form via onLocationChange,
 * which then stores them as incident latitude/longitude before submission.
 *
 * Design follows the DMS neon cyberpunk theme using CSS variables for theming.
 */

// React core imports: useState for local UI state, useCallback for memoizing handlers,
// useEffect for lifecycle side effects such as geolocation on mount and prop sync
import React, { useState, useCallback, useEffect } from 'react';

// Leaflet/React-Leaflet imports for rendering the interactive map.
// MapContainer: root map wrapper; TileLayer: base map tiles; Marker: incident pin;
// Circle: could be used for radius display; useMapEvents: attaches click listeners;
// useMap: accesses the underlying Leaflet map instance for programmatic control
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';

// i18n hook for rendering all user-facing strings in the active language
// (Arabic, English, French, Spanish, Turkish — matching DMS locale files)
import { useTranslation } from 'react-i18next';

// Required Leaflet CSS — without this, the map tiles and controls render incorrectly
import 'leaflet/dist/leaflet.css';

// Shared map constants and helpers used across DMS map components:
// DEFAULT_CENTER: fallback map center when no incident location is pre-set
// DEFAULT_ZOOM: initial zoom level for general area view
// TILE_URL / TILE_ATTRIBUTION: OpenStreetMap tile endpoint and required attribution
// createColoredIcon: factory for custom-colored Leaflet marker icons (red for incidents)
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  createColoredIcon
} from './mapUtils';

/**
 * ClickHandler — Internal helper component that captures map click events.
 * Registered inside MapContainer so it has access to the Leaflet event system.
 * When a user clicks on the map to mark an incident location, this component
 * extracts the latitude/longitude from the click event and forwards it upward.
 *
 * @param {function} onLocationSelect — Callback receiving (lat, lng) on each map click
 */
function ClickHandler({ onLocationSelect }) {
  // useMapEvents attaches Leaflet event listeners to the parent MapContainer instance
  useMapEvents({
    // Fires whenever the user clicks anywhere on the map canvas
    click(e) {
      // Extract geographic coordinates from the click event and notify parent
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  // This component renders nothing — it only wires up side-effect event listeners
  return null;
}

/**
 * FlyToPosition — Internal helper component that animates the map camera
 * to smoothly pan and zoom to a newly selected incident location.
 * Triggered whenever the selected position changes (click, GPS, or search result).
 *
 * @param {Array} position — [lat, lng] array representing the target map center
 */
function FlyToPosition({ position }) {
  // Gain imperative access to the Leaflet map instance for programmatic navigation
  const map = useMap();

  // Re-run whenever the selected position or map instance changes
  useEffect(() => {
    if (position) {
      // Animate camera to incident location at zoom 16 (street level) over 1 second
      map.flyTo(position, 16, { duration: 1 });
    }
  }, [position, map]);

  // Pure side-effect component — renders nothing to the DOM
  return null;
}

/**
 * LocationPicker — Primary exported component for geographic location selection
 * within the DMS incident creation and editing workflow.
 *
 * Renders a full-featured map panel with:
 * - A Nominatim-powered place-name search bar for finding locations by address
 * - A "My Location" GPS button for field responders reporting from the scene
 * - A clickable Leaflet map where users drop a red marker at the incident site
 * - A coordinate display footer showing selected lat/lng for confirmation
 * - A clear button to reset the location selection if the user made an error
 *
 * @param {number|string} latitude       — Pre-filled latitude (e.g., from an existing incident)
 * @param {number|string} longitude      — Pre-filled longitude (e.g., from an existing incident)
 * @param {function}      onLocationChange — Parent callback invoked with (lat, lng) strings on selection
 * @param {string}        height         — CSS height of the map canvas, defaults to '350px'
 */
export default function LocationPicker({ latitude, longitude, onLocationChange, height = '350px' }) {
  // t() provides translated strings for all UI labels based on active DMS locale
  const { t } = useTranslation();

  // position: [lat, lng] array for the currently selected incident location,
  // or null when no location has been chosen yet
  const [position, setPosition] = useState(
    // Seed from props if the parent already has coordinates (edit mode or form prefill)
    latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : null
  );

  // mapCenter: where the map viewport is initially focused.
  // Uses existing coordinates if available; falls back to the system default center
  const [mapCenter, setMapCenter] = useState(
    latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : DEFAULT_CENTER
  );

  // searchQuery: current text in the place-name search input field
  const [searchQuery, setSearchQuery] = useState('');

  // searching: true while waiting for Nominatim geocoding API response,
  // used to disable the search button and show a loading indicator
  const [searching, setSearching] = useState(false);

  // geolocating: true while the browser is acquiring GPS coordinates,
  // used to disable the "My Location" button and show a loading indicator
  const [geolocating, setGeolocating] = useState(false);

  // On initial mount, if no incident location is pre-set, silently request the user's
  // current position to center the map near them — improves UX for field responders
  useEffect(() => {
    if (!latitude && !longitude && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // On success, pan the map to the user's detected position (no marker placed yet)
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        // On denial or error, silently do nothing — DEFAULT_CENTER remains as fallback
        () => {}
      );
    }
  }, []); // Empty dependency array — runs once on mount only

  // Keep internal position state in sync if the parent component changes the
  // latitude/longitude props externally (e.g., form reset or pre-population)
  useEffect(() => {
    if (latitude && longitude) {
      setPosition([parseFloat(latitude), parseFloat(longitude)]);
    }
  }, [latitude, longitude]); // Re-runs whenever parent prop values change

  /**
   * handleLocationSelect — Central handler called by all three location input methods
   * (map click, GPS, and search). Updates local marker state and notifies the parent
   * form with the new incident coordinates formatted to 7 decimal places.
   *
   * @param {number} lat — Latitude of the selected incident location
   * @param {number} lng — Longitude of the selected incident location
   */
  const handleLocationSelect = useCallback((lat, lng) => {
    // Update the map marker to the newly selected position
    setPosition([lat, lng]);
    if (onLocationChange) {
      // Pass coordinates to parent as strings with 7 decimal places for precision
      // 7 decimals ≈ 1 cm precision — appropriate for pinpointing an incident scene
      onLocationChange(lat.toFixed(7), lng.toFixed(7));
    }
  }, [onLocationChange]); // Re-memoize only if the parent callback reference changes

  /**
   * handleGeolocation — Triggers the browser's Geolocation API to detect the
   * responder's current GPS coordinates and use them as the incident location.
   * Useful for field personnel reporting an incident from the scene in real time.
   */
  const handleGeolocation = () => {
    // Guard: inform the user if their browser doesn't support geolocation
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    // Show loading state on the GPS button while position is being acquired
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      // Success: use the GPS-detected coordinates as the incident location
      (pos) => {
        handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setGeolocating(false); // Re-enable the GPS button
      },
      // Failure: inform the user (common cause: user denied location permission)
      (err) => {
        alert('Location access denied: ' + err.message);
        setGeolocating(false); // Re-enable the GPS button even on error
      },
      // High-accuracy mode maximizes GPS precision; 10 s timeout prevents indefinite wait
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /**
   * handleSearch — Geocodes the user's free-text place query using the Nominatim API
   * (OpenStreetMap's free, no-key-required geocoding service). On success, moves the
   * incident marker to the first matching result. Useful when the exact GPS pin is
   * unknown but the neighborhood or landmark name is known.
   */
  const handleSearch = async () => {
    // Do nothing if the search field is blank or only whitespace
    if (!searchQuery.trim()) return;

    // Show loading indicator on the Search button
    setSearching(true);
    try {
      // Query Nominatim for the top matching location; URL-encode the query for safety
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      // Parse the JSON array of matching place results
      const results = await response.json();

      if (results.length > 0) {
        // Extract lat/lon strings from the first result and set as incident location
        const { lat, lon } = results[0];
        handleLocationSelect(parseFloat(lat), parseFloat(lon));
      } else {
        // Nominatim returned no matches — prompt the user to try a different query
        alert('Location not found. Try a different search term.');
      }
    } catch {
      // Network failure or JSON parse error — inform the user to retry
      alert('Search failed. Please try again.');
    }
    // Always restore the search button regardless of success or failure
    setSearching(false);
  };

  // --- JSX Render ---
  return (
    // Outer wrapper: rounded card with a themed border matching the DMS design system
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>

      {/* Toolbar row containing the place-name search bar and GPS button */}
      <div className="p-3 flex flex-wrap gap-2" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>

        {/* Left section: text input + Search button for Nominatim geocoding */}
        <div className="flex-1 min-w-[200px] flex gap-2">
          {/* Place-name text field — supports Enter key to trigger search */}
          <input
            type="text"
            // Placeholder is localized (e.g., shows Arabic prompt in Arabic locale)
            placeholder={t('map.search_placeholder', 'Search location (e.g., Amman, Jordan)...')}
            value={searchQuery}
            // Update controlled state as user types
            onChange={(e) => setSearchQuery(e.target.value)}
            // Allow submitting the search by pressing Enter for keyboard efficiency
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            // Themed with DMS CSS variables so it adapts to dark/light mode
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          />

          {/* Search submit button — red gradient matches DMS emergency color palette */}
          <button
            onClick={handleSearch}
            // Disabled while a search is in progress to prevent duplicate requests
            disabled={searching}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}
          >
            {/* Show ellipsis as a minimal loading indicator during geocoding */}
            {searching ? '...' : `🔍 ${t('common.search', 'Search')}`}
          </button>
        </div>

        {/* GPS "My Location" button — lets field responders instantly pin their position */}
        <button
          onClick={handleGeolocation}
          // Disabled while GPS acquisition is in progress
          disabled={geolocating}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
        >
          {/* Satellite emoji reinforces the GPS/location concept; '...' shows loading */}
          {geolocating ? '📡 ...' : `📡 ${t('map.locate_me', 'My Location')}`}
        </button>
      </div>

      {/* Leaflet map canvas where the user can click to drop an incident location marker */}
      <MapContainer
        // Center on existing position if known, otherwise use auto-detected or default center
        center={position || mapCenter}
        // Zoom to street level when a position is set; broader view when no pin exists yet
        zoom={position ? 16 : 13}
        style={{ height, width: '100%' }}
        // Allow zooming with the mouse scroll wheel for fine-grained navigation
        scrollWheelZoom={true}
      >
        {/* Base map tiles from OpenStreetMap — free, no API key required */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {/* Wire up map click events to the location selection handler */}
        <ClickHandler onLocationSelect={handleLocationSelect} />

        {/* Smoothly animate the map viewport to the incident location when position changes */}
        {position && <FlyToPosition position={position} />}

        {/* Red incident marker placed at the selected coordinates */}
        {position && (
          <Marker
            position={position}
            // Red (#dc2626) icon at 28px — matches DMS emergency/danger color convention
            icon={createColoredIcon('#dc2626', 28)}
          />
        )}
      </MapContainer>

      {/* Footer bar: shows selected coordinates or a hint when no location is chosen */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {position ? (
          <>
            {/* Display the confirmed incident coordinates rounded to 5 decimal places (~1 m) */}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              📍 Selected: <strong>{position[0].toFixed(5)}, {position[1].toFixed(5)}</strong>
            </span>

            {/* Clear button lets the user remove the selected location and start over */}
            <button
              onClick={() => {
                // Reset local marker state
                setPosition(null);
                // Notify parent form that coordinates have been cleared
                onLocationChange && onLocationChange('', '');
              }}
              className="text-xs text-red-500 hover:underline font-medium"
            >
              ✕ Clear
            </button>
          </>
        ) : (
          // Instructional hint shown when no incident location has been selected yet
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {t('incidents.pick_on_map', 'Click on the map or use GPS to select location')}
          </span>
        )}
      </div>
    </div>
  );
}