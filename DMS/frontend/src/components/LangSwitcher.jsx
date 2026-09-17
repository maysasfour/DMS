/**
 * LangSwitcher.jsx
 *
 * Language switcher dropdown component for the DMS (Disaster Management System) UI.
 * Allows users — including incident responders, officers, and admins — to switch
 * the interface language at runtime. Supports English, Arabic, French, Spanish, and Turkish
 * to serve multilingual disaster response teams across different regions.
 *
 * Integrates with the global UI store (useUIStore) to persist the selected locale,
 * which drives i18n translations for all DMS pages such as incident reports,
 * resource forms, alerts, and user dashboards.
 */

// React core import; useState manages the open/closed state of the dropdown
import React, { useState } from 'react';

// Framer Motion imports for animated dropdown entrance/exit transitions
import { motion, AnimatePresence } from 'framer-motion';

// Global UI store that holds the current language selection and the setter to update it
import { useUIStore } from '../store';

/**
 * LANGUAGES — static list of supported locales in the DMS.
 * Each entry provides the BCP-47 language code (val), a country flag emoji,
 * a short native label shown in the trigger button, and a full native language name
 * shown inside the dropdown. Arabic (ar) is included for Middle Eastern responders;
 * Turkish (tr) for Türkiye-region deployments.
 */
const LANGUAGES = [
  { val: 'en', flag: '🇺🇸', native: 'EN', label: 'English' },   // Default DMS language
  { val: 'ar', flag: '🇸🇦', native: 'ع',  label: 'العربية' },   // Arabic — RTL locale
  { val: 'fr', flag: '🇫🇷', native: 'FR', label: 'Français' },  // French — Francophone regions
  { val: 'es', flag: '🇪🇸', native: 'ES', label: 'Español' },   // Spanish — Latin American responders
  { val: 'tr', flag: '🇹🇷', native: 'TR', label: 'Türkçe' },    // Turkish — Türkiye deployments
];

/**
 * LangSwitcher component
 *
 * Renders a compact trigger button showing the active language flag and code,
 * and an animated dropdown listing all available DMS interface languages.
 *
 * @param {boolean} dark - When true, applies a light-on-dark color scheme
 *   suitable for use on dark hero banners (e.g., login pages, alert dashboards).
 *   When false (default), adapts to the DMS CSS theme variables for light/dark mode.
 */
export default function LangSwitcher({ dark = false }) {
  // Read the currently active language code and the setter from the global UI store
  const { language, setLanguage } = useUIStore();

  // Local state controlling whether the language dropdown menu is visible
  const [open, setOpen] = useState(false);

  // Resolve the full language object for the active locale so the button can display
  // the correct flag and native label; fall back to English if the stored value is unknown
  const current = LANGUAGES.find(l => l.val === language) || LANGUAGES[0];

  // Trigger button background — semi-transparent white on dark surfaces, CSS variable on light
  const bg      = dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-secondary)';

  // Border color — subtle white stroke on dark, CSS border token on light
  const border  = dark ? 'rgba(255,255,255,0.15)' : 'var(--border-input)';

  // Text color for both the trigger button and non-selected menu items
  const textCol = dark ? '#fff' : 'var(--text-primary)';

  // Dropdown panel background — near-black on dark surfaces, CSS variable on light
  const menuBg  = dark ? '#111' : 'var(--bg-secondary)';

  return (
    // Relative wrapper establishes the positioning context for the absolute dropdown
    <div className="relative">

      {/* Trigger button — clicking toggles the dropdown open/closed */}
      <button
        onClick={() => setOpen(v => !v)}
        // Rounded pill shape consistent with the DMS neon cyberpunk design system
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
        style={{ background: bg, color: textCol, border: `1px solid ${border}` }}
      >
        {/* Country flag emoji representing the active locale */}
        <span>{current.flag}</span>

        {/* Short native language code shown inside the button (e.g., "EN", "ع") */}
        <span>{current.native}</span>

        {/* Chevron icon rotates to indicate open (up) or closed (down) state */}
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} text-xs opacity-60`} />
      </button>

      {/*
        AnimatePresence enables exit animations when the dropdown is removed from the DOM.
        Without it, the exit animation would be skipped because React unmounts immediately.
      */}
      <AnimatePresence>
        {open && (
          <>
            {/* Full-screen invisible backdrop — clicking it closes the dropdown
                without requiring the user to click the trigger button again */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Animated dropdown panel — slides in from above and fades in on open,
                reverses on close. z-50 ensures it renders above all DMS page content. */}
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}  // Start slightly above and scaled down
              animate={{ opacity: 1, y: 0, scale: 1 }}       // Settle to natural position
              exit={{ opacity: 0, y: -6, scale: 0.95 }}      // Reverse animation on close
              transition={{ duration: 0.15 }}                 // Fast transition for snappy UX
              className="absolute right-0 top-10 rounded-xl overflow-hidden shadow-2xl z-50"
              dir="ltr" // Force LTR layout for the menu even when Arabic (RTL) is active
              style={{ background: menuBg, border: `1px solid ${border}`, minWidth: 140 }}
            >
              {/* Render one button per supported DMS language */}
              {LANGUAGES.map(({ val, flag, label }) => (
                <button
                  key={val} // Stable key prevents React reconciliation issues on re-renders
                  // On click: update the global language (triggers i18n re-render across DMS)
                  // and close the dropdown
                  onClick={() => { setLanguage(val); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    // Highlight the active language with a translucent DMS accent red tint
                    background: language === val ? '#E6394618' : 'transparent',
                    // Active language label rendered in the DMS primary accent color (#E63946)
                    color: language === val ? '#E63946' : textCol,
                    textAlign: 'start',  // Align text to the start regardless of RTL/LTR
                    direction: 'ltr',    // Keep item layout left-to-right even in Arabic mode
                  }}
                  // Hover: apply a subtle highlight on non-active items for discoverability
                  onMouseEnter={(e) => { if (language !== val) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-tertiary)'; }}
                  // Mouse leave: restore transparent background for non-active items
                  onMouseLeave={(e) => { if (language !== val) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Country flag — slightly larger than the label text for visual clarity */}
                  <span className="text-base leading-none">{flag}</span>

                  {/* Full native language name (e.g., "العربية", "Français") */}
                  <span>{label}</span>

                  {/* Checkmark icon pinned to the right — confirms the currently active DMS locale */}
                  {language === val && <i className="bi bi-check2 ms-auto" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}