import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store';
import { incidentAPI, resourceAPI } from '../services/api';
const IncidentMap = React.lazy(() => import('../components/maps/IncidentMap'));
import ResponderMap from '../components/maps/ResponderMap';
import ResourceMap from '../components/maps/ResourceMap';
import ShelterMap from '../components/maps/ShelterMap';
import HeatmapView from '../components/maps/HeatmapView';
import SatelliteView from '../components/maps/SatelliteView';
import { motion } from 'framer-motion';

const MAP_HEIGHT = 'calc(100vh - 290px)';

export default function MapView() {
  const { theme } = useUIStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const TABS = [
    { key: 'incidents',  label: t('map.incidents_tab'),  desc: t('map.incidents_tab'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
    { key: 'satellite',  label: 'Satellite', desc: t('map.subtitle'), badge: 'LIVE', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M6.343 6.343a8 8 0 000 11.314M17.657 6.343a8 8 0 010 11.314M3.515 3.515a13 13 0 000 16.97M20.485 3.515a13 13 0 010 16.97"/></svg> },
    { key: 'heatmap',    label: 'ML Heatmap', desc: t('map.subtitle'), badge: 'ML', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg> },
    { key: 'responders', label: t('map.responders_tab'), desc: t('map.responders_tab'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { key: 'resources',  label: t('map.resources_tab'),  desc: t('map.resources_tab'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
    { key: 'shelters',   label: t('map.shelters_tab'),   desc: t('map.shelters_tab'),   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  ];

  useEffect(() => {
    Promise.all([
      incidentAPI.getIncidents({ size: 200 }).catch(() => ({ data: { content: [] } })),
      resourceAPI.getResources().catch(() => ({ data: [] })),
    ]).then(([incRes, resRes]) => {
      const incData = incRes.data?.data?.content ?? incRes.data?.content ?? [];
      setIncidents(incData);
      const resData = Array.isArray(resRes.data) ? resRes.data : resRes.data?.data ?? [];
      setResources(resData);
    }).finally(() => setLoading(false));

    // Auto-locate on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const activeTabData = TABS.find(t => t.key === activeTab);

  const renderMap = () => {
    const props = { userLocation };
    switch (activeTab) {
      case 'incidents':  return <IncidentMap incidents={incidents} height={MAP_HEIGHT} {...props} />;
      case 'satellite':  return <SatelliteView localIncidents={incidents} height={MAP_HEIGHT} {...props} />;
      case 'heatmap':    return <HeatmapView incidents={incidents} height={MAP_HEIGHT} {...props} />;
      case 'responders': return <ResponderMap resources={resources} height={MAP_HEIGHT} {...props} />;
      case 'resources':  return <ResourceMap facilities={resources} height={MAP_HEIGHT} {...props} />;
      case 'shelters':   return <ShelterMap height={MAP_HEIGHT} {...props} />;
      default:           return <IncidentMap incidents={incidents} height={MAP_HEIGHT} {...props} />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </div>
            {t('map.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {activeTabData?.desc || t('map.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Locate me button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLocateMe}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: userLocation ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)', color: userLocation ? '#10b981' : 'var(--text-secondary)', border: `1px solid ${userLocation ? 'rgba(16,185,129,0.4)' : 'var(--border-primary)'}` }}
          >
            {locating ? (
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" opacity="0.3"/>
              </svg>
            )}
            {t('map.locate_me', 'Locate Me')}
            {userLocation && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </motion.button>

          <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
            Live · NASA EONET · USGS
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
        {TABS.map(tab => (
          <motion.button
            key={tab.key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative"
            style={{
              background: activeTab === tab.key ? 'linear-gradient(135deg, #E63946, #FF7A00)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.key ? '0 4px 12px rgba(230,57,70,0.3)' : 'none',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.badge && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 6,
                background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : 'rgba(230,57,70,0.15)',
                color: activeTab === tab.key ? '#fff' : '#E63946',
              }}>
                {tab.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Map */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {loading && activeTab !== 'satellite' && activeTab !== 'heatmap' ? (
          <div className="rounded-2xl flex items-center justify-center"
            style={{ height: MAP_HEIGHT, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('map.loading')}</p>
            </div>
          </div>
        ) : (
          renderMap()
        )}
      </motion.div>
    </motion.div>
  );
}
