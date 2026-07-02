import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useUIStore, useAlertStore } from '../store';
import { notificationAPI } from '../services/api';

const BREADCRUMB_MAP = {
  '/layout/dashboard':        'Dashboard',
  '/layout/incidents':        'Incidents',
  '/layout/incidents/create': 'Report Incident',
  '/layout/map':              'Map View',
  '/layout/alerts':           'Alerts',
  '/layout/resources':        'Resources',
  '/layout/reports':          'Reports',
  '/layout/users':            'Users',
  '/layout/settings':         'Settings',
  '/layout/profile':          'Profile',
  '/layout/my-reports':       'My Reports',
};

const LANGS = ['en','ar','fr','es','tr'];
const LANG_LABELS = { en:'EN', ar:'AR', fr:'FR', es:'ES', tr:'TR' };
const LANG_NAMES = { en:'English', ar:'عربي', fr:'Français', es:'Español', tr:'Türkçe' };

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/>
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

export default function Navbar() {
  const { user } = useAuthStore();
  const { toggleSidebar, toggleTheme, theme, language, setLanguage } = useUIStore();
  const { unreadCount, setUnreadCount } = useAlertStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const dark = theme === 'dark';
  const pageTitle = BREADCRUMB_MAP[location.pathname] || '';

  useEffect(() => {
    if (user) {
      notificationAPI.getUnreadCount()
        .then(({ data }) => {
          const count = data?.data ?? data?.count ?? 0;
          setUnreadCount(count);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const close = () => { setShowUserMenu(false); setShowLangMenu(false); };
    if (showUserMenu || showLangMenu) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showUserMenu, showLangMenu]);

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <header
      className="px-4 py-3 flex items-center justify-between z-10 sticky top-0 border-b theme-transition"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg transition flex-shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <h2 className="font-black text-sm tracking-wide flex-shrink-0" style={{ color: 'var(--text-primary)' }}>DMS</h2>
          <AnimatePresence mode="wait">
            {pageTitle && (
              <motion.div key={pageTitle} className="flex items-center gap-2 min-w-0"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <span style={{ color: 'var(--border-primary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
                  {pageTitle}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">

        {/* Language picker */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); setShowUserMenu(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Change language"
          >
            <GlobeIcon />
            <span>{LANG_LABELS[language]}</span>
          </button>
          {showLangMenu && (
            <div
              className="absolute end-0 top-full mt-1 w-40 rounded-xl py-1 z-50"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {LANGS.map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm transition flex items-center justify-between"
                  style={{
                    color: language === lang ? '#E63946' : 'var(--text-secondary)',
                    background: language === lang ? 'rgba(230,57,70,0.06)' : 'transparent',
                    fontWeight: language === lang ? 700 : 400,
                  }}
                  onMouseEnter={(e) => { if (language !== lang) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (language !== lang) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{LANG_NAMES[lang]}</span>
                  {language === lang && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-500">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          aria-label="Toggle theme"
          title={dark ? t('settings.light_mode') : t('settings.dark_mode')}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Notifications bell */}
        <button
          onClick={() => navigate('/layout/alerts')}
          className="relative p-2 rounded-lg transition"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          aria-label={t('nav.alerts')}
          data-tooltip={t('nav.alerts')}
        >
          <BellIcon />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-1 right-1 w-4 h-4 text-white rounded-full flex items-center justify-center font-bold"
                style={{ background: '#E63946', fontSize: 9,
                  boxShadow: '0 0 8px rgba(230,57,70,0.6)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); setShowLangMenu(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition"
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              {user?.firstName?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName}
            </span>
            <span className="hidden sm:block" style={{ color: 'var(--text-tertiary)' }}><ChevronIcon /></span>
          </button>

          {showUserMenu && (
            <div
              className="absolute end-0 top-full mt-1 w-52 rounded-xl py-1 z-50"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{user?.role}</p>
              </div>
              {[
                { label: t('nav.profile'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>, path: '/layout/profile' },
                { label: t('nav.settings'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, path: '/layout/settings' },
              ].map(({ label, icon, path }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setShowUserMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2.5"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
                  {label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border-primary)', margin: '4px 0' }} />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2.5"
                style={{ color: '#E63946' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(230,57,70,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
