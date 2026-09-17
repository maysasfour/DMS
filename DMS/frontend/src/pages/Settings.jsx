/**
 * Settings.jsx — DMS User Preferences Panel
 *
 * Provides the system configuration interface for all DMS portal users (officers,
 * admins, and team members). Allows users to personalise the application's:
 *   - Theme (light / dark) — important for field use in varying lighting conditions
 *   - Language — supports 5 languages (English, Arabic, French, Spanish, Turkish)
 *     for the multinational disaster-response audience, including RTL support for Arabic
 *   - Accent color — 5 pre-defined palette options tied to DMS operational semantics
 *     (emergency red, navy, fire orange, safe green, official purple)
 *   - Notification channels — email, push, and SMS alerts for incident updates
 *
 * All preferences are persisted via the global UIStore (Zustand) and immediately
 * applied to the DMS UI so operators experience changes without a page reload.
 * A NotificationHub toast confirms every change to the user.
 */

// React core — required for JSX rendering and hooks
import React from 'react';
// useTranslation hook — provides the t() function for i18n string lookup across all 5 DMS locales
import { useTranslation } from 'react-i18next';
// motion — Framer Motion component used for entrance animations on each settings card
import { motion } from 'framer-motion';
// useUIStore — Zustand global store that holds theme, language, and accent color state for the DMS UI
import { useUIStore } from '../store';
// showNotification — triggers a toast banner in the NotificationHub to confirm setting changes to the user
import { showNotification } from '../components/NotificationHub';
// useEffect — React hook used to re-sync the accent color on initial mount
import { useEffect } from 'react';

/**
 * LANGUAGES — ordered list of locale options available in the DMS portal.
 * Each entry carries an i18n value code (val), display label, country flag emoji,
 * native-script name, and an optional rtl flag for Arabic right-to-left layout support.
 */
const LANGUAGES = [
  { val: 'en', label: 'English',  flag: '🇺🇸', native: 'English' },
  { val: 'ar', label: 'Arabic',   flag: '🇸🇦', native: 'العربية', rtl: true }, // rtl: true triggers direction notice and RTL layout
  { val: 'fr', label: 'French',   flag: '🇫🇷', native: 'Français' },
  { val: 'es', label: 'Spanish',  flag: '🇪🇸', native: 'Español' },
  { val: 'tr', label: 'Turkish',  flag: '🇹🇷', native: 'Türkçe' },
];

/**
 * ACCENT_COLORS — curated palette of DMS-domain-meaningful accent colors.
 * Each color is paired with an i18n key so the label is translated.
 * Colors are chosen to reflect operational severity and role semantics:
 *   Emergency Red  — critical alert / incident severity
 *   Navy           — official authority / command
 *   Fire Orange    — active fire or warning-level incidents
 *   Safe Green     — all-clear / resolved status
 *   Official Purple — administrative / system-level actions
 */
const ACCENT_COLORS = [
  { color: '#E63946', key: 'color_emergency_red' },   // Critical incident severity color
  { color: '#0E2A47', key: 'color_navy' },             // Command authority / official use
  { color: '#FF7A00', key: 'color_fire_orange' },      // Fire and active-warning incidents
  { color: '#22c55e', key: 'color_safe_green' },       // Resolved / safe status indicator
  { color: '#7c3aed', key: 'color_official_purple' },  // Administrative and system-level actions
];

/**
 * Settings — default export React component.
 * Renders the full user preferences page for the DMS portal.
 * Organized into four animated cards: Theme, Language, Notifications, Accent Color.
 */
export default function Settings() {
  // t — translation function; resolves keys from the active locale's JSON file
  const { t } = useTranslation();

  // Destructure UI state and setters from the global Zustand store:
  //   theme        — 'light' | 'dark', controls DMS UI color scheme
  //   setTheme     — updates theme in store and applies CSS class to document root
  //   language     — active i18n locale code (e.g. 'en', 'ar')
  //   setLanguage  — switches i18next language and persists to store
  //   accentColor  — hex string of the currently active accent color
  //   setAccentColor — updates CSS variable --accent-color across the entire DMS UI
  const { theme, setTheme, language, setLanguage, accentColor, setAccentColor } = useUIStore();

  // On component mount, re-apply the persisted accent color to ensure CSS variables
  // are in sync if the store was rehydrated from localStorage (e.g. after a page reload).
  // The empty dependency array means this runs once on mount only.
  useEffect(() => {
    if (accentColor) setAccentColor(accentColor); // Re-trigger CSS variable update on mount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * handleTheme — switches the DMS portal between light and dark display modes.
   * Calls setTheme from UIStore and shows a toast notification confirming the change.
   * Dark mode is especially useful for night-shift emergency operations center staff.
   * @param {string} val - 'light' or 'dark'
   */
  const handleTheme = (val) => {
    setTheme(val); // Persist and apply the new theme via UIStore
    // Show a contextual emoji notification so the user knows the theme changed
    showNotification(val === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', 'success');
  };

  /**
   * handleAccent — updates the DMS UI accent color and notifies the user.
   * The accent color is applied globally via a CSS variable, affecting buttons,
   * borders, active states, and neon glow effects throughout the portal.
   * @param {string} color - hex color string (e.g. '#E63946')
   * @param {string} key   - i18n translation key suffix for the color's display name
   */
  const handleAccent = (color, key) => {
    setAccentColor(color); // Apply new accent color CSS variable across the DMS UI
    // Notify the user with the translated color name (e.g. "Emergency Red applied")
    showNotification(`${t(`settings.${key}`)} applied`, 'success');
  };

  /**
   * handleLanguage — switches the active portal language and notifies the user.
   * Supports 5 languages matching the DMS's multinational deployment context.
   * Arabic selection will also cause RTL direction notice to display.
   * @param {string} val - locale code (e.g. 'en', 'ar', 'fr', 'es', 'tr')
   */
  const handleLanguage = (val) => {
    setLanguage(val); // Update i18next locale and persist to UIStore
    // Lookup the selected language metadata to display its native name in the toast
    const lang = LANGUAGES.find(l => l.val === val);
    // Show native-script language name in the confirmation toast (e.g. "🇸🇦 Language changed to العربية")
    showNotification(`${lang?.flag} Language changed to ${lang?.native}`, 'success');
  };

  // --- JSX Render ---
  return (
    // Outer container: centered, max width 2xl, vertical spacing, bottom padding for scroll clearance
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* ===== HERO HEADER CARD =====
          Animated neon-cyberpunk header identifying this as the DMS "SYSTEM CONFIG" panel.
          Uses the current accent color for the gradient, border, hex grid, and glow effects.
          Entrance animation slides down from y=-16 with fade-in. */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        // Accent-tinted glassmorphism background and border matching current DMS theme color
        style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}06)`, border: `1px solid ${accentColor}30` }}>

        {/* Decorative hexagonal grid SVG overlay — reinforces DMS command-center aesthetic at 4% opacity */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
          <defs>
            {/* Hex tile pattern — 40x35 user-space units, stroked with accent color */}
            <pattern id="hex-settings" x="0" y="0" width="40" height="35" patternUnits="userSpaceOnUse">
              <polygon points="20,2 37,10 37,26 20,34 3,26 3,10" fill="none" stroke={accentColor} strokeWidth="0.8"/>
            </pattern>
          </defs>
          {/* Fill the entire header with the hex pattern */}
          <rect width="100%" height="100%" fill="url(#hex-settings)"/>
        </svg>

        {/* Corner bracket decorations — four absolute-positioned divs forming a tactical HUD frame */}
        {[
          // Top-left corner bracket
          { top: 10, left: 10, borderTop: `1.5px solid ${accentColor}60`, borderLeft: `1.5px solid ${accentColor}60` },
          // Top-right corner bracket
          { top: 10, right: 10, borderTop: `1.5px solid ${accentColor}60`, borderRight: `1.5px solid ${accentColor}60` },
          // Bottom-left corner bracket
          { bottom: 10, left: 10, borderBottom: `1.5px solid ${accentColor}60`, borderLeft: `1.5px solid ${accentColor}60` },
          // Bottom-right corner bracket
          { bottom: 10, right: 10, borderBottom: `1.5px solid ${accentColor}60`, borderRight: `1.5px solid ${accentColor}60` },
        ].map((s, i) => (
          // Each bracket is a 16x16 transparent div with two border sides to form an "L" shape
          <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
        ))}

        {/* Header content row: animated gear icon + text labels */}
        <div className="relative flex items-center gap-4">

          {/* Gear icon badge — animated pulsing glow to draw attention to the settings identifier */}
          <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            // Gradient fill and initial glow using current accent color
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`, boxShadow: `0 0 24px ${accentColor}50` }}
            // Continuous breathing glow animation — cycles box-shadow intensity every 2.5s
            animate={{ boxShadow: [`0 0 16px ${accentColor}40`, `0 0 32px ${accentColor}70`, `0 0 16px ${accentColor}40`] }}
            transition={{ duration: 2.5, repeat: Infinity }}>
            {/* Heroicons cog/gear SVG — represents system configuration */}
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              {/* Outer gear teeth path */}
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              {/* Inner gear circle — 3-unit radius center hole */}
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </motion.div>

          {/* Text section: system config label, page title, and subtitle */}
          <div>
            {/* "SYSTEM CONFIG" — monospace uppercase label reinforces command-center UI style */}
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: accentColor, fontFamily: 'monospace', letterSpacing: '0.3em' }}>
              SYSTEM CONFIG
            </p>
            {/* Translated page title — uses Rajdhani font matching DMS design system */}
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.04em' }}>
              {t('settings.title')} {/* i18n: "Settings" or locale equivalent */}
            </h1>
            {/* Subtitle — describes the section purpose for screen readers and first-time users */}
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {t('settings.preferences')} {/* i18n: "Manage your preferences" or locale equivalent */}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ===== THEME CARD =====
          Allows DMS users to toggle between light and dark portal themes.
          Dark mode is critical for night operations center use; light mode aids outdoor tablet use.
          Entrance animation slides up from y=16, delayed 50ms after header. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-disaster p-6" // card-disaster — DMS design system card class with themed border/background
      >
        {/* Section heading with sun icon indicating display brightness/theme control */}
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {/* Sun icon — fire orange to visually associate with light/brightness theme */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: '#FF7A00' }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          {t('settings.theme')} {/* i18n: "Theme" */}
        </h2>

        {/* Theme toggle buttons — two equal-width flex buttons for Light and Dark */}
        <div className="flex gap-3">
          {/* Map over the two theme options: light (sun icon) and dark (moon icon) */}
          {[
            { val: 'light', label: t('settings.light_mode'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
            { val: 'dark',  label: t('settings.dark_mode'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
          ].map(({ val, label, icon }) => (
            // Each button fills half the row; active state uses accent gradient with shadow glow
            <button
              key={val}
              onClick={() => handleTheme(val)} // Switch DMS theme and show toast notification
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                // Active: gradient fill with accent color; inactive: neutral background
                background: theme === val
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                  : 'var(--bg-tertiary)',
                // Active: white text for contrast on colored background; inactive: muted text
                color: theme === val ? '#fff' : 'var(--text-secondary)',
                // Active: no border (gradient fills edge); inactive: subtle input border
                border: theme === val ? 'none' : '1px solid var(--border-input)',
                // Active: neon glow shadow using accent color at 27% opacity
                boxShadow: theme === val ? `0 4px 14px ${accentColor}44` : 'none',
              }}
            >
              <span>{icon}</span> {label} {/* Icon + translated mode label */}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ===== LANGUAGE CARD =====
          Enables DMS users to switch the portal language across 5 locales.
          Critical for multinational disaster-response teams coordinating across language barriers.
          Entrance animation delayed 100ms for staggered card reveal. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-disaster p-6"
      >
        {/* Section heading with globe icon representing multilingual support */}
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {/* Globe SVG — uses accent color to reinforce DMS brand consistency */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: accentColor }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          {t('settings.language')} {/* i18n: "Language" */}
        </h2>

        {/* Language grid — 2 columns on mobile, 3 on small, 5 on medium+ (one per language) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:grid-cols-5">
          {/* Render one button per language option from the LANGUAGES constant */}
          {LANGUAGES.map(({ val, flag, native }) => (
            // Button highlights with accent gradient and border when this locale is active
            <button
              key={val}
              onClick={() => handleLanguage(val)} // Switch locale and confirm with toast
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs transition-all duration-200"
              style={{
                // Active locale: accent-gradient background; inactive: neutral card background
                background: language === val
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                  : 'var(--bg-tertiary)',
                // Active: white text; inactive: muted secondary text
                color: language === val ? '#fff' : 'var(--text-secondary)',
                // Active: 2px accent border with glow; inactive: 1px subtle border
                border: language === val
                  ? `2px solid ${accentColor}`
                  : '1px solid var(--border-input)',
                boxShadow: language === val ? `0 4px 14px ${accentColor}44` : 'none',
              }}
            >
              {/* Country flag emoji for visual language identification */}
              <span className="text-2xl leading-none">{flag}</span>
              {/* Native-script language name — always LTR direction to prevent layout shift */}
              <span style={{ direction: 'ltr' }}>{native}</span>
            </button>
          ))}
        </div>

        {/* RTL notice — only shown when Arabic is the active language.
            Informs the user that the DMS portal layout will switch to right-to-left direction. */}
        {language === 'ar' && (
          <p className="text-xs mt-3 text-right" style={{ color: 'var(--text-tertiary)' }}>
            {t('settings.rtl_notice')} {/* i18n: RTL layout change advisory message */}
          </p>
        )}
      </motion.div>

      {/* ===== NOTIFICATIONS CARD =====
          Controls which channels the DMS user receives alerts through.
          Notifications cover incident creation, status updates, and emergency resource dispatches.
          Each toggle is managed via uncontrolled DOM state (data-on attribute) for lightweight local toggle behavior.
          Entrance animation delayed 150ms. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card-disaster p-6"
      >
        {/* Section heading with bell icon colored emergency red to signal alert importance */}
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {/* Bell SVG — emergency red to reflect severity of missed DMS alerts */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: '#E63946' }}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/></svg>
          {t('settings.notifications')} {/* i18n: "Notifications" */}
        </h2>

        {/* Notification channel toggles — one row per channel */}
        <div className="space-y-3">
          {/* Define three notification channels with their icons and default states:
              - Email:  on by default — primary channel for incident reports and updates
              - Push:   on by default — real-time browser/device alerts for active incidents
              - SMS:    off by default — optional for field responders without internet access */}
          {[
            { key: 'email_notif', label: t('settings.email_notif'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, def: true },
            { key: 'push_notif',  label: t('settings.push_notif'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>, def: true },
            { key: 'sms_notif',   label: t('settings.sms_notif'),   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, def: false },
          ].map(({ key, label, icon, def }) => (
            // Each notification row: icon + label on left, toggle switch on right
            <div key={key} className="flex items-center justify-between">
              {/* Left: channel icon and translated label */}
              <div className="flex items-center gap-3">
                {/* Channel icon in muted tertiary color — not accent-colored to avoid alarm fatigue */}
                <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
                {/* Channel label — translated to the active DMS locale */}
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
              </div>

              {/* Toggle switch — uncontrolled via data-on attribute to avoid re-render overhead.
                  Uses inline DOM manipulation so toggling one switch doesn't re-render the entire list.
                  NOTE: This state is local/ephemeral and not persisted to the UIStore or backend. */}
              <button
                onClick={(e) => {
                  const btn = e.currentTarget; // Reference the button DOM element directly
                  const isOn = btn.dataset.on === 'true'; // Read current state from data attribute
                  const newOn = !isOn; // Flip the toggle state
                  btn.dataset.on = String(newOn); // Persist new state back to data attribute
                  // Visually update background: active = accent gradient, inactive = neutral border color
                  btn.style.background = newOn ? `linear-gradient(135deg,${accentColor},${accentColor}bb)` : 'var(--border-input)';
                  // Animate the knob position: active = slide right, inactive = slide left
                  const knob = btn.querySelector('span'); // Find the knob child element
                  if (knob) knob.style.left = newOn ? 'calc(100% - 1.375rem)' : '0.125rem';
                }}
                // Initialize toggle from the def (default) value for this channel
                data-on={String(def)}
                className="w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0"
                // Initial background matches default on/off state
                style={{ background: def ? `linear-gradient(135deg,${accentColor},${accentColor}bb)` : 'var(--border-input)' }}
              >
                {/* Toggle knob — white circular pill that slides left/right on toggle.
                    Positioned absolutely; transition-all animates its horizontal movement. */}
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                  // Initial knob position: right edge if default-on, left edge if default-off
                  style={{ left: def ? 'calc(100% - 1.375rem)' : '0.125rem' }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== ACCENT COLOR PICKER CARD =====
          Lets DMS users personalise the portal's accent color from 5 domain-meaningful options.
          The chosen color propagates through the entire DMS UI via CSS variables.
          Entrance animation delayed 200ms — last card in the stagger sequence. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="card-disaster p-6"
      >
        {/* Section heading with palette icon in official purple — signals customisation */}
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {/* Color palette SVG icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: '#7c3aed' }}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
          {t('settings.color_preview')} {/* i18n: "Accent Color" or locale equivalent */}
        </h2>
        {/* Hint text — explains that the chosen color affects the entire DMS portal appearance */}
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          {t('settings.color_hint')} {/* i18n: descriptive hint about color scope */}
        </p>

        {/* Color swatch grid — wraps on smaller screens */}
        <div className="flex gap-3 flex-wrap">
          {/* Render one swatch button per ACCENT_COLORS entry */}
          {ACCENT_COLORS.map(({ color, key }) => {
            // Determine whether this swatch matches the current store accent color
            const isActive = accentColor === color;
            return (
              // Swatch button: colored circle + translated label; active state shows border/glow/checkmark
              <button
                key={color}
                onClick={() => handleAccent(color, key)} // Apply new accent color to DMS UI
                title={t(`settings.${key}`)} // Tooltip with translated color name for accessibility
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200"
                style={{
                  // Active: tinted card background; inactive: neutral card background
                  background: isActive ? `${color}18` : 'var(--bg-tertiary)',
                  // Active: 2px solid accent border; inactive: neutral 2px border
                  border: isActive ? `2px solid ${color}` : '2px solid var(--border-input)',
                  // Active: colored drop shadow glow; inactive: no shadow
                  boxShadow: isActive ? `0 4px 14px ${color}40` : 'none',
                  minWidth: 72, // Ensures consistent swatch button width across all colors
                }}
              >
                {/* Color circle — filled with the swatch's hex color.
                    Shows a white checkmark SVG overlay when this color is active. */}
                <div className="relative w-8 h-8 rounded-full shadow-md" style={{ background: color }}>
                  {/* Checkmark appears only on the currently active accent color */}
                  {isActive && (
                    <svg className="absolute inset-0 m-auto w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      {/* Checkmark polyline — confirms selection visually */}
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {/* Color name label — uses accent color text when active, muted text otherwise */}
                <span className="text-xs font-semibold text-center leading-tight" style={{ color: isActive ? color : 'var(--text-secondary)', maxWidth: 64 }}>
                  {t(`settings.${key}`)} {/* i18n: e.g. "Emergency Red", "Fire Orange", etc. */}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}