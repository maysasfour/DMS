// ============================================================
// MapView.jsx — DMS Geospatial Command Center Page
//
// This page is the primary map interface for the Disaster Management
// System (DMS). It aggregates live incident and resource data from
// the backend API and presents six switchable map views:
//   - Incidents: pin-based map of all reported disaster incidents
//   - Satellite: live NASA EONET / USGS satellite overlay feed
//   - ML Heatmap: machine-learning-driven density heatmap of incidents
//   - Responders: geographic positions of active response teams
//   - Resources: locations of available DMS resources (equipment, etc.)
//   - Shelters: registered shelter facilities for displaced persons
//
// The component also supports browser Geolocation to center maps on
// the current user's position, useful for field responders.
// ============================================================

// React core: useState for local UI state, useEffect for data fetching on mount
import React, { useState, useEffect } from 'react';
// Internationalization hook — all user-visible strings are translated via i18next
import { useTranslation } from 'react-i18next';
// Global UI store (Zustand) — provides the current theme (dark/light) for styling
import { useUIStore } from '../store';
// DMS API service modules: incidentAPI fetches disaster incidents, resourceAPI fetches deployable resources
import { incidentAPI, resourceAPI } from '../services/api';

// Lazy-load the heavy IncidentMap component to defer its Leaflet/map bundle until the tab is first shown
const IncidentMap = React.lazy(() => import('../components/maps/IncidentMap'));
// Eagerly loaded maps — these are lighter or needed immediately on a potential first render
import ResponderMap from '../components/maps/ResponderMap';
import ResourceMap from '../components/maps/ResourceMap';
import ShelterMap from '../components/maps/ShelterMap';
// ML-powered incident density heatmap component
import HeatmapView from '../components/maps/HeatmapView';
// Satellite imagery overlay sourced from NASA EONET and USGS feeds
import SatelliteView from '../components/maps/SatelliteView';
// Framer Motion for smooth page-entry and tab-switch animations
import { motion } from 'framer-motion';

// Shared map height: fills the viewport minus the top nav, page header, and tab bar (~290px)
const MAP_HEIGHT = 'calc(100vh - 290px)';

/**
 * MapView — top-level page component for the DMS geospatial dashboard.
 * Loads all incident and resource data once on mount, then renders the
 * currently selected map view inside an animated container.
 */
export default function MapView() {
  // Current DMS UI theme ('dark' | 'light'), used for dynamic inline styles
  const { theme } = useUIStore();
  // Translation function — wraps all display strings for multilingual support
  const { t } = useTranslation();
  // Which of the six map tabs is currently visible; defaults to incident pins
  const [activeTab, setActiveTab] = useState('incidents');
  // Full list of disaster incidents fetched from the DMS backend (up to 200)
  const [incidents, setIncidents] = useState([]);
  // Full list of DMS resources (equipment, vehicles, personnel) from the backend
  const [resources, setResources] = useState([]);
  // True while the initial parallel API fetch is in progress — shows a spinner
  const [loading, setLoading] = useState(true);
  // GPS coordinates of the browser user — passed to maps as a "you are here" pin
  const [userLocation, setUserLocation] = useState(null);
  // True while the browser is actively resolving the user's geolocation
  const [locating, setLocating] = useState(false);

  // Tab definitions: each entry drives both the tab bar button and the map switcher.
  // Inline SVG icons avoid an external icon library dependency.
  const TABS = [
    // Incident pins map — plots all active and historical disaster incidents
    { key: 'incidents',  label: t('map.incidents_tab'),  desc: t('map.incidents_tab'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
    // Satellite view — live NASA EONET / USGS satellite imagery with incident overlays; badged "LIVE"
    { key: 'satellite',  label: 'Satellite', desc: t('map.subtitle'), badge: 'LIVE', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M6.343 6.343a8 8 0 000 11.314M17.657 6.343a8 8 0 010 11.314M3.515 3.515a13 13 0 000 16.97M20.485 3.515a13 13 0 010 16.97"/></svg> },
    // ML Heatmap — machine-learning density analysis of incident clusters; badged "ML"
    { key: 'heatmap',    label: 'ML Heatmap', desc: t('map.subtitle'), badge: 'ML', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg> },
    // Responders map — shows positions of field response teams on the ground
    { key: 'responders', label: t('map.responders_tab'), desc: t('map.responders_tab'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    // Resources map — spatial view of equipment, vehicles, and supply depots
    { key: 'resources',  label: t('map.resources_tab'),  desc: t('map.resources_tab'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
    // Shelters map — registered emergency shelters available for displaced persons
    { key: 'shelters',   label: t('map.shelters_tab'),   desc: t('map.shelters_tab'),   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  ];

  // On mount: fetch incidents and resources in parallel, then attempt a silent geolocation
  useEffect(() => {
    // Run both API calls simultaneously to minimize load time on the map page
    Promise.all([
      // Fetch up to 200 incidents so all pins appear on the map without pagination
      incidentAPI.getIncidents({ size: 200 }).catch(() => ({ data: { content: [] } })),
      // Fetch all available resources regardless of pagination
      resourceAPI.getResources().catch(() => ({ data: [] })),
    ]).then(([incRes, resRes]) => {
      // Normalize the incident response — the API may wrap data in data.content or content directly
      const incData = incRes.data?.data?.content ?? incRes.data?.content ?? [];
      setIncidents(incData);
      // Normalize the resource response — may be a top-level array or nested under data
      const resData = Array.isArray(resRes.data) ? resRes.data : resRes.data?.data ?? [];
      setResources(resData);
    }).finally(() => setLoading(false)); // Hide the loading spinner once both fetches settle

    // Auto-locate on mount: silently request user GPS so maps can show "you are here"
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success: store lat/lng for propagation to all map children
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        // Failure (permission denied, timeout, etc.): silently ignore — location is optional
        () => {}
      );
    }
  }, []); // Empty dependency array — runs exactly once when the page mounts

  /**
   * handleLocateMe — triggered by the "Locate Me" button.
   * Re-requests the browser's current GPS position and updates userLocation,
   * showing a spinner while the browser resolves the coordinates.
   * Useful for field responders who have moved since the page loaded.
   */
  const handleLocateMe = () => {
    // Bail early if the browser doesn't support Geolocation API
    if (!navigator.geolocation) return;
    // Show the spinning indicator on the button while we wait for GPS
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Update the shared location state so all map children re-center
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      // On error (denied / unavailable) simply stop the spinner — maps remain usable without location
      () => setLocating(false)
    );
  };

  // Derive the currently active tab's metadata to display its description in the subtitle
  const activeTabData = TABS.find(t => t.key === activeTab);

  /**
   * renderMap — returns the appropriate map component for the active tab.
   * All map children receive userLocation so they can render a "you are here" pin.
   * Incidents and resources are only passed where relevant to avoid unnecessary re-renders.
   */
  const renderMap = () => {
    // Common props shared by every map variant
    const props = { userLocation };
    switch (activeTab) {
      // Pin-based incident map — receives all fetched disaster incidents
      case 'incidents':  return <IncidentMap incidents={incidents} height={MAP_HEIGHT} {...props} />;
      // Satellite overlay — also receives local incidents so it can draw pins over the imagery
      case 'satellite':  return <SatelliteView localIncidents={incidents} height={MAP_HEIGHT} {...props} />;
      // ML heatmap — uses incident coordinates to compute density gradients
      case 'heatmap':    return <HeatmapView incidents={incidents} height={MAP_HEIGHT} {...props} />;
      // Responder positions — uses resource records that represent response teams
      case 'responders': return <ResponderMap resources={resources} height={MAP_HEIGHT} {...props} />;
      // Resource/facility map — displays equipment depots and supply caches
      case 'resources':  return <ResourceMap facilities={resources} height={MAP_HEIGHT} {...props} />;
      // Shelter map — ShelterMap fetches its own shelter data internally
      case 'shelters':   return <ShelterMap height={MAP_HEIGHT} {...props} />;
      // Fallback: default to the incident pins map if the key is unrecognized
      default:           return <IncidentMap incidents={incidents} height={MAP_HEIGHT} {...props} />;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    // Page fade-in animation on initial mount using Framer Motion
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {/* Page title with a gradient map-icon badge — styled with DMS brand colors */}
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            {/* Map icon badge: orange-to-red gradient matches the DMS neon cyberpunk theme */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              {/* Map/grid SVG icon representing geospatial data */}
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </div>
            {/* Translated page title (e.g. "Geospatial Map" / "خريطة جغرافية") */}
            {t('map.title')}
          </h1>
          {/* Dynamic subtitle: shows the active tab description or falls back to the generic map subtitle */}
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {activeTabData?.desc || t('map.subtitle')}
          </p>
        </div>

        {/* ── Header Action Row ── */}
        <div className="flex items-center gap-2">
          {/* "Locate Me" button — triggers GPS lookup and centers maps on the user's position */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLocateMe}
            disabled={locating} // Prevent double-clicks while GPS is resolving
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            // Green tint when location is known; neutral otherwise — gives instant visual feedback
            style={{ background: userLocation ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)', color: userLocation ? '#10b981' : 'var(--text-secondary)', border: `1px solid ${userLocation ? 'rgba(16,185,129,0.4)' : 'var(--border-primary)'}` }}
          >
            {locating ? (
              // Spinner shown while the browser is resolving GPS coordinates
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              // Crosshair / GPS targeting icon
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" opacity="0.3"/>
              </svg>
            )}
            {/* Button label — translated for multilingual users */}
            {t('map.locate_me', 'Locate Me')}
            {/* Pulsing green dot confirms that a GPS fix has been acquired */}
            {userLocation && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </motion.button>

          {/* Live data source badge — hidden on small screens to save space */}
          <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}>
            {/* Pulsing dot indicates the satellite/USGS data streams are live */}
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
            Live · NASA EONET · USGS
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── renders one button per map type; active tab gets the DMS brand gradient */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
        {TABS.map(tab => (
          // Each tab is an animated button; clicking it switches the visible map
          <motion.button
            key={tab.key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.key)} // Switch active map view on click
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative"
            style={{
              // Active tab: DMS brand gradient (red→orange); inactive: transparent
              background: activeTab === tab.key ? 'linear-gradient(135deg, #E63946, #FF7A00)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              // Drop shadow on active tab to lift it visually above the bar
              boxShadow: activeTab === tab.key ? '0 4px 12px rgba(230,57,70,0.3)' : 'none',
            }}
          >
            {/* Tab icon (inline SVG) */}
            <span>{tab.icon}</span>
            {/* Tab label text — translated */}
            {tab.label}
            {/* Optional feature badge (e.g. "LIVE", "ML") shown for satellite and heatmap tabs */}
            {tab.badge && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 6,
                // Badge background adapts to active/inactive state for legibility
                background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : 'rgba(230,57,70,0.15)',
                color: activeTab === tab.key ? '#fff' : '#E63946',
              }}>
                {tab.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* ── Map Container ── animates in whenever the active tab changes */}
      <motion.div
        key={activeTab} // Changing the key forces Framer Motion to re-run the entry animation
        initial={{ opacity: 0, y: 8 }}  // Slide up slightly while fading in for a polished feel
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Show a centered spinner while incidents/resources are loading for data-dependent tabs */}
        {loading && activeTab !== 'satellite' && activeTab !== 'heatmap' ? (
          // Loading state: satellite and heatmap load their own data, so skip the spinner for them
          <div className="rounded-2xl flex items-center justify-center"
            style={{ height: MAP_HEIGHT, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="text-center">
              {/* Spinner using the DMS brand red color */}
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              {/* Translated loading message (e.g. "Loading map data…") */}
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('map.loading')}</p>
            </div>
          </div>
        ) : (
          // Data is ready — render the map component for the currently selected tab
          renderMap()
        )}
      </motion.div>
    </motion.div>
  );
}