import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TILE_URL, TILE_ATTRIBUTION,
  createColoredIcon
} from './mapUtils';

// Component that handles map click to set location
function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Fly to position when it changes
function FlyToPosition({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

/**
 * LocationPicker — Used in the incident report form.
 * Supports: click on map, geolocation, and manual coordinate entry.
 */
export default function LocationPicker({ latitude, longitude, onLocationChange, height = '350px' }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState(
    latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : null
  );
  const [mapCenter, setMapCenter] = useState(
    latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : DEFAULT_CENTER
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  // Auto-detect user location on mount if no position set
  useEffect(() => {
    if (!latitude && !longitude && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  // Sync external changes
  useEffect(() => {
    if (latitude && longitude) {
      setPosition([parseFloat(latitude), parseFloat(longitude)]);
    }
  }, [latitude, longitude]);

  const handleLocationSelect = useCallback((lat, lng) => {
    setPosition([lat, lng]);
    if (onLocationChange) {
      onLocationChange(lat.toFixed(7), lng.toFixed(7));
    }
  }, [onLocationChange]);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setGeolocating(false);
      },
      (err) => {
        alert('Location access denied: ' + err.message);
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Simple address search using Nominatim (OpenStreetMap's free geocoder)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const results = await response.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        handleLocationSelect(parseFloat(lat), parseFloat(lon));
      } else {
        alert('Location not found. Try a different search term.');
      }
    } catch {
      alert('Search failed. Please try again.');
    }
    setSearching(false);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Search bar */}
      <div className="p-3 flex flex-wrap gap-2" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            placeholder="Search location (e.g., Amman, Jordan)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}
          >
            {searching ? '...' : `🔍 ${t('common.search', 'Search')}`}
          </button>
        </div>
        <button
          onClick={handleGeolocation}
          disabled={geolocating}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
        >
          {geolocating ? '📡 ...' : `📡 ${t('map.locate_me', 'My Location')}`}
        </button>
      </div>

      {/* Map */}
      <MapContainer
        center={position || mapCenter}
        zoom={position ? 16 : 13}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickHandler onLocationSelect={handleLocationSelect} />
        {position && <FlyToPosition position={position} />}
        {position && (
          <Marker
            position={position}
            icon={createColoredIcon('#dc2626', 28)}
          />
        )}
      </MapContainer>

      {/* Selected coordinates display */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {position ? (
          <>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              📍 Selected: <strong>{position[0].toFixed(5)}, {position[1].toFixed(5)}</strong>
            </span>
            <button
              onClick={() => { setPosition(null); onLocationChange && onLocationChange('', ''); }}
              className="text-xs text-red-500 hover:underline font-medium"
            >
              ✕ Clear
            </button>
          </>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {t('incidents.pick_on_map', 'Click on the map or use GPS to select location')}
          </span>
        )}
      </div>
    </div>
  );
}
