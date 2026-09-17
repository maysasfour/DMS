/**
 * @file Navbar.jsx
 * @description Top navigation bar component for the Disaster Management System (DMS).
 *
 * Renders a sticky header that provides global navigation controls including:
 *  - Sidebar toggle (hamburger menu) for collapsing/expanding the left nav panel
 *  - Breadcrumb trail showing the current DMS section (e.g. Incidents, Alerts, Resources)
 *  - Language selector supporting English, Arabic, French, Spanish, and Turkish
 *  - Light/dark theme toggle aligned with the neon cyberpunk design system
 *  - Notification bell badge showing unread DMS alert counts fetched from the backend
 *  - User avatar dropdown with links to Profile, Settings, and Logout
 *
 * Consumes auth state (logged-in user), UI state (theme/language/sidebar), and alert
 * state (unread notification count) from Zustand stores. Uses react-i18next for all
 * user-visible strings and Framer Motion for animated transitions.
 */

// React core — useEffect for side-effects (fetching unread count, registering click listeners),
// useState for local dropdown open/close state
import React, { useEffect, useState } from 'react';

// useNavigate: programmatic navigation (e.g. redirect to /login on logout)
// useLocation: read current URL pathname to derive the breadcrumb label
import { useNavigate, useLocation } from 'react-router-dom';

// motion: animated wrapper for breadcrumb transitions and badge pop-in
// AnimatePresence: enables exit animations when elements are removed from the DOM
import { motion, AnimatePresence } from 'framer-motion';

// useTranslation: provides the t() function for all localised navbar strings
import { useTranslation } from 'react-i18next';

// useAuthStore: supplies the authenticated user object (name, role, etc.)
// useUIStore: supplies sidebar toggle, theme toggle, current theme, language, setLanguage
// useAlertStore: supplies unreadCount of DMS notifications and its setter
import { useAuthStore, useUIStore, useAlertStore } from '../store';

// notificationAPI: REST client methods for the DMS notifications endpoint
// getUnreadCount() returns the number of unread system alerts for the logged-in user
import { notificationAPI } from '../services/api';

// Maps DMS route paths to human-readable breadcrumb labels shown in the header.
// Covers all major sections: incident management, map view, alerts, resources, reports,
// user administration, settings, profile, and personal report history.
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

// Ordered list of language codes supported by the DMS multilingual interface
const LANGS = ['en','ar','fr','es','tr'];

// Short display codes shown on the language picker button (e.g. "AR", "FR")
const LANG_LABELS = { en:'EN', ar:'AR', fr:'FR', es:'ES', tr:'TR' };

// Full native-language names shown inside the language dropdown menu
const LANG_NAMES = { en:'English', ar:'عربي', fr:'Français', es:'Español', tr:'Türkçe' };

// SVG icon representing light/day mode — used as the toggle button when currently in dark mode
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {/* Central sun circle */}
    <circle cx="12" cy="12" r="5"/>
    {/* Eight radial lines representing sun rays */}
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

// SVG icon representing night/dark mode — used as the toggle button when currently in light mode
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {/* Crescent moon path */}
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

// SVG bell icon used for the DMS notification/alerts button in the navbar action row
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {/* Bell body and clapper path */}
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/>
  </svg>
);

// Hamburger (three-line) SVG icon used for the sidebar toggle button on the left of the navbar
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {/* Three horizontal lines representing a collapsed menu */}
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

// Downward chevron SVG icon used to indicate the user menu dropdown is expandable
const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    {/* Downward-pointing chevron arrow */}
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Globe SVG icon used on the language picker button to signal internationalisation
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    {/* Outer circle representing the world */}
    <circle cx="12" cy="12" r="10"/>
    {/* Horizontal equator line */}
    <line x1="2" y1="12" x2="22" y2="12"/>
    {/* Meridian path suggesting a globe shape */}
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

/**
 * Navbar — sticky top navigation bar for the DMS authenticated layout.
 *
 * Responsibilities:
 *  1. Show sidebar toggle and breadcrumb for current DMS section
 *  2. Allow operators/admins to switch the UI language (EN/AR/FR/ES/TR)
 *  3. Toggle between dark and light themes
 *  4. Display real-time unread notification count from the DMS alerts backend
 *  5. Provide a user dropdown with profile, settings, and secure logout
 */
export default function Navbar() {
  // Retrieve the authenticated DMS user (firstName, lastName, role) from auth store
  const { user } = useAuthStore();

  // toggleSidebar: collapses/expands the left navigation panel
  // toggleTheme: switches between dark (neon cyberpunk) and light theme
  // theme: current theme string ('dark' | 'light') used to pick icon and aria label
  // language: ISO language code currently active in the DMS UI
  // setLanguage: dispatcher to update the active language in the UI store
  const { toggleSidebar, toggleTheme, theme, language, setLanguage } = useUIStore();

  // unreadCount: number of unread DMS system alerts/notifications for this user
  // setUnreadCount: used to store the count returned from the backend API
  const { unreadCount, setUnreadCount } = useAlertStore();

  // navigate: programmatic router navigation — used for logout redirect and menu links
  const navigate = useNavigate();

  // location: current URL location object — pathname drives the breadcrumb label lookup
  const location = useLocation();

  // t: i18n translation function for all user-visible navbar strings
  const { t } = useTranslation();

  // showUserMenu: controls visibility of the user account dropdown (profile/settings/logout)
  const [showUserMenu, setShowUserMenu] = useState(false);

  // showLangMenu: controls visibility of the language selection dropdown
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Convenience boolean — true when the DMS UI is in dark (neon cyberpunk) mode
  const dark = theme === 'dark';

  // Resolve breadcrumb label from the current URL path; falls back to empty string
  // if the route is not in the BREADCRUMB_MAP (e.g. dynamic incident detail pages)
  const pageTitle = BREADCRUMB_MAP[location.pathname] || '';

  // Fetch the unread notification count from the DMS backend on component mount
  // and whenever the authenticated user changes (e.g. after login).
  // Silently ignores errors so a failed request does not break the navbar UI.
  useEffect(() => {
    if (user) {
      notificationAPI.getUnreadCount()
        .then(({ data }) => {
          // Normalise the response — API may return data.data or data.count depending on version
          const count = data?.data ?? data?.count ?? 0;
          setUnreadCount(count);
        })
        .catch(() => {}); // Non-critical: badge simply stays at 0 on network error
    }
  }, [user]);

  // Register a document-level click listener to close any open dropdown menus
  // when the user clicks anywhere outside the navbar.
  // The listener is attached only while a menu is open to avoid unnecessary overhead,
  // and cleaned up via the effect's return function to prevent memory leaks.
  useEffect(() => {
    const close = () => { setShowUserMenu(false); setShowLangMenu(false); };
    if (showUserMenu || showLangMenu) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showUserMenu, showLangMenu]);

  /**
   * handleLogout — clears the DMS authentication session and redirects to the login page.
   * Calls the Zustand auth store logout action (which wipes tokens/user state) then
   * navigates to /login so the user must re-authenticate.
   */
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    // Sticky header bar: stays visible while the operator scrolls through incident lists
    // or resource tables; z-index 10 keeps it above content but below modals
    <header
      className="px-4 py-3 flex items-center justify-between z-10 sticky top-0 border-b theme-transition"
      style={{
        background: 'var(--bg-secondary)',   // Adapts to dark/light theme via CSS variable
        borderColor: 'var(--border-primary)', // Subtle separator line below the navbar
        boxShadow: 'var(--shadow-sm)',        // Lifts navbar visually above the page content
      }}
    >
      {/* ── Left section: sidebar toggle + DMS brand + breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Hamburger button — toggles the sidebar so operators can maximise map/incident views */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg transition flex-shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          // Hover: subtle background tint for visual affordance
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          aria-label="Toggle sidebar"
        >
          {/* Three-line hamburger icon */}
          <MenuIcon />
        </button>

        {/* Brand + breadcrumb row — hidden on very small screens to save space */}
        <div className="hidden sm:flex items-center gap-2 min-w-0">

          {/* DMS brand icon: red-to-orange gradient warning triangle — matches DMS identity */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
            {/* Warning/alert triangle SVG — symbolises disaster/emergency context */}
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>

          {/* System name abbreviation */}
          <h2 className="font-black text-sm tracking-wide flex-shrink-0" style={{ color: 'var(--text-primary)' }}>DMS</h2>

          {/* Animated breadcrumb — fades and slides in when the current page title changes.
              AnimatePresence + mode="wait" ensures the old label exits before the new one enters,
              preventing overlap when navigating between incident, map, or resource sections. */}
          <AnimatePresence mode="wait">
            {pageTitle && (
              <motion.div key={pageTitle} className="flex items-center gap-2 min-w-0"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>

                {/* Right-pointing chevron separator between "DMS" and the section name */}
                <span style={{ color: 'var(--border-primary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>

                {/* Current section label, e.g. "Incidents", "Alerts", "Resources" */}
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
                  {pageTitle}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right section: action controls ── */}
      <div className="flex items-center gap-1">

        {/* ── Language picker dropdown ── */}
        {/* Allows DMS operators and citizens to switch between supported UI languages */}
        <div className="relative">

          {/* Language trigger button — shows globe icon + current language code (e.g. "AR") */}
          <button
            // stopPropagation prevents the document click listener from immediately closing
            // the menu that was just opened by this same click event
            onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); setShowUserMenu(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Change language"
          >
            {/* Globe icon indicating language/internationalisation */}
            <GlobeIcon />
            {/* Short code of the currently active language (EN, AR, FR, ES, TR) */}
            <span>{LANG_LABELS[language]}</span>
          </button>

          {/* Language dropdown menu — shown only when showLangMenu is true */}
          {showLangMenu && (
            <div
              className="absolute end-0 top-full mt-1 w-40 rounded-xl py-1 z-50"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)' }}
              // Prevent clicks inside the menu from bubbling to the document close listener
              onClick={(e) => e.stopPropagation()}
            >
              {/* Render one button per supported DMS language */}
              {LANGS.map(lang => (
                <button
                  key={lang}
                  // Switch active language and close the dropdown on selection
                  onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm transition flex items-center justify-between"
                  style={{
                    // Highlight currently active language in DMS brand red
                    color: language === lang ? '#E63946' : 'var(--text-secondary)',
                    background: language === lang ? 'rgba(230,57,70,0.06)' : 'transparent',
                    fontWeight: language === lang ? 700 : 400,
                  }}
                  onMouseEnter={(e) => { if (language !== lang) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (language !== lang) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Full native language name (e.g. "عربي", "Français") */}
                  <span>{LANG_NAMES[lang]}</span>

                  {/* Checkmark icon shown next to the currently active language */}
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

        {/* ── Theme toggle button ── */}
        {/* Switches the DMS UI between dark (neon cyberpunk) and light mode.
            Icon shown is the opposite of the current mode (click to switch to that mode). */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          aria-label="Toggle theme"
          // Tooltip text comes from i18n to support multilingual operators
          title={dark ? t('settings.light_mode') : t('settings.dark_mode')}
        >
          {/* Show sun icon in dark mode (click = switch to light), moon in light mode */}
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* ── Notifications / Alerts bell button ── */}
        {/* Navigates to the DMS Alerts page; badge shows count of unread system notifications */}
        <button
          onClick={() => navigate('/layout/alerts')}
          className="relative p-2 rounded-lg transition"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          aria-label={t('nav.alerts')}
          data-tooltip={t('nav.alerts')}
        >
          {/* Bell icon */}
          <BellIcon />

          {/* Animated unread count badge — appears/disappears with spring animation.
              Shows numeric count for 1-9 unread alerts; "9+" when more than 9 are pending.
              The glowing red badge (DMS danger colour) draws operator attention to new alerts. */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                // Remount animation fires when the count number itself changes
                key={unreadCount}
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-1 right-1 w-4 h-4 text-white rounded-full flex items-center justify-center font-bold"
                style={{ background: '#E63946', fontSize: 9,
                  // Neon glow effect matches the DMS cyberpunk design system
                  boxShadow: '0 0 8px rgba(230,57,70,0.6)' }}
              >
                {/* Cap displayed count at "9+" to avoid badge overflow */}
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* ── User account dropdown ── */}
        {/* Shows the logged-in DMS user's avatar initial, first name, and a chevron.
            Clicking opens a menu with links to Profile, Settings, and Logout. */}
        <div className="relative">

          {/* User trigger button — avatar + name + chevron */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); setShowLangMenu(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition"
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {/* Avatar circle: red-to-orange gradient with the user's first initial.
                Gradient matches the DMS brand palette; no image needed. */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              {/* First letter of the user's first name, uppercased for the avatar */}
              {user?.firstName?.[0]?.toUpperCase()}
            </div>

            {/* Display the user's first name next to the avatar on small+ screens */}
            <span className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName}
            </span>

            {/* Downward chevron — signals the dropdown is available */}
            <span className="hidden sm:block" style={{ color: 'var(--text-tertiary)' }}><ChevronIcon /></span>
          </button>

          {/* User dropdown panel — shown only when showUserMenu is true */}
          {showUserMenu && (
            <div
              className="absolute end-0 top-full mt-1 w-52 rounded-xl py-1 z-50"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-lg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User identity header: full name and role (e.g. ADMIN, OFFICER, TEAM) */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.firstName} {user?.lastName}
                </p>
                {/* Display the DMS role so the user can confirm their permission level */}
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{user?.role}</p>
              </div>

              {/* Navigation items array: Profile and Settings.
                  Defined inline to keep icon SVGs co-located with their labels. */}
              {[
                // Profile page — view/edit personal information and contact details
                { label: t('nav.profile'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>, path: '/layout/profile' },
                // Settings page — manage notifications, preferences, and account options
                { label: t('nav.settings'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, path: '/layout/settings' },
              ].map(({ label, icon, path }) => (
                // Render each menu item as a full-width button that navigates and closes the dropdown
                <button
                  key={path}
                  onClick={() => { navigate(path); setShowUserMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2.5"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Icon displayed in muted tertiary colour to the left of the label */}
                  <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
                  {label}
                </button>
              ))}

              {/* Divider separating navigation links from the destructive logout action */}
              <div style={{ borderTop: '1px solid var(--border-primary)', margin: '4px 0' }} />

              {/* Logout button — styled in DMS danger red to signal a destructive/session-ending action */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2.5"
                style={{ color: '#E63946' }}
                // Subtle red tint on hover reinforces the danger colour cue
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(230,57,70,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {/* Sign-out arrow icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                {/* Localised "Logout" label */}
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}