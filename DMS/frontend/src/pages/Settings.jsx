import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useUIStore } from '../store';
import { showNotification } from '../components/NotificationHub';
import { useEffect } from 'react';

const LANGUAGES = [
  { val: 'en', label: 'English',  flag: '🇺🇸', native: 'English' },
  { val: 'ar', label: 'Arabic',   flag: '🇸🇦', native: 'العربية', rtl: true },
  { val: 'fr', label: 'French',   flag: '🇫🇷', native: 'Français' },
  { val: 'es', label: 'Spanish',  flag: '🇪🇸', native: 'Español' },
  { val: 'tr', label: 'Turkish',  flag: '🇹🇷', native: 'Türkçe' },
];

const ACCENT_COLORS = [
  { color: '#E63946', key: 'color_emergency_red' },
  { color: '#0E2A47', key: 'color_navy' },
  { color: '#FF7A00', key: 'color_fire_orange' },
  { color: '#22c55e', key: 'color_safe_green' },
  { color: '#7c3aed', key: 'color_official_purple' },
];

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme, language, setLanguage, accentColor, setAccentColor } = useUIStore();

  // Apply saved accent on every change (store already handles it, this ensures mount sync)
  useEffect(() => {
    if (accentColor) setAccentColor(accentColor);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTheme = (val) => {
    setTheme(val);
    showNotification(val === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', 'success');
  };

  const handleAccent = (color, key) => {
    setAccentColor(color);
    showNotification(`${t(`settings.${key}`)} applied`, 'success');
  };

  const handleLanguage = (val) => {
    setLanguage(val);
    const lang = LANGUAGES.find(l => l.val === val);
    showNotification(`${lang?.flag} Language changed to ${lang?.native}`, 'success');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Neon hero header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}06)`, border: `1px solid ${accentColor}30` }}>
        {/* Hex grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
          <defs>
            <pattern id="hex-settings" x="0" y="0" width="40" height="35" patternUnits="userSpaceOnUse">
              <polygon points="20,2 37,10 37,26 20,34 3,26 3,10" fill="none" stroke={accentColor} strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-settings)"/>
        </svg>
        {/* Corner brackets */}
        {[
          { top: 10, left: 10, borderTop: `1.5px solid ${accentColor}60`, borderLeft: `1.5px solid ${accentColor}60` },
          { top: 10, right: 10, borderTop: `1.5px solid ${accentColor}60`, borderRight: `1.5px solid ${accentColor}60` },
          { bottom: 10, left: 10, borderBottom: `1.5px solid ${accentColor}60`, borderLeft: `1.5px solid ${accentColor}60` },
          { bottom: 10, right: 10, borderBottom: `1.5px solid ${accentColor}60`, borderRight: `1.5px solid ${accentColor}60` },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
        ))}
        <div className="relative flex items-center gap-4">
          <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`, boxShadow: `0 0 24px ${accentColor}50` }}
            animate={{ boxShadow: [`0 0 16px ${accentColor}40`, `0 0 32px ${accentColor}70`, `0 0 16px ${accentColor}40`] }}
            transition={{ duration: 2.5, repeat: Infinity }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </motion.div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: accentColor, fontFamily: 'monospace', letterSpacing: '0.3em' }}>
              SYSTEM CONFIG
            </p>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.04em' }}>
              {t('settings.title')}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {t('settings.preferences')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Theme */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-disaster p-6"
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: '#FF7A00' }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          {t('settings.theme')}
        </h2>
        <div className="flex gap-3">
          {[
            { val: 'light', label: t('settings.light_mode'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
            { val: 'dark',  label: t('settings.dark_mode'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
          ].map(({ val, label, icon }) => (
            <button
              key={val}
              onClick={() => handleTheme(val)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: theme === val
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                  : 'var(--bg-tertiary)',
                color: theme === val ? '#fff' : 'var(--text-secondary)',
                border: theme === val ? 'none' : '1px solid var(--border-input)',
                boxShadow: theme === val ? `0 4px 14px ${accentColor}44` : 'none',
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Language — 5 languages */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-disaster p-6"
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: accentColor }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          {t('settings.language')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:grid-cols-5">
          {LANGUAGES.map(({ val, flag, native }) => (
            <button
              key={val}
              onClick={() => handleLanguage(val)}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs transition-all duration-200"
              style={{
                background: language === val
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                  : 'var(--bg-tertiary)',
                color: language === val ? '#fff' : 'var(--text-secondary)',
                border: language === val
                  ? `2px solid ${accentColor}`
                  : '1px solid var(--border-input)',
                boxShadow: language === val ? `0 4px 14px ${accentColor}44` : 'none',
              }}
            >
              <span className="text-2xl leading-none">{flag}</span>
              <span style={{ direction: 'ltr' }}>{native}</span>
            </button>
          ))}
        </div>
        {language === 'ar' && (
          <p className="text-xs mt-3 text-right" style={{ color: 'var(--text-tertiary)' }}>
            {t('settings.rtl_notice')}
          </p>
        )}
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card-disaster p-6"
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: '#E63946' }}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/></svg>
          {t('settings.notifications')}
        </h2>
        <div className="space-y-3">
          {[
            { key: 'email_notif', label: t('settings.email_notif'), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, def: true },
            { key: 'push_notif',  label: t('settings.push_notif'),  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>, def: true },
            { key: 'sms_notif',   label: t('settings.sms_notif'),   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, def: false },
          ].map(({ key, label, icon, def }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
              </div>
              <button
                onClick={(e) => {
                  const btn = e.currentTarget;
                  const isOn = btn.dataset.on === 'true';
                  const newOn = !isOn;
                  btn.dataset.on = String(newOn);
                  btn.style.background = newOn ? `linear-gradient(135deg,${accentColor},${accentColor}bb)` : 'var(--border-input)';
                  const knob = btn.querySelector('span');
                  if (knob) knob.style.left = newOn ? 'calc(100% - 1.375rem)' : '0.125rem';
                }}
                data-on={String(def)}
                className="w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0"
                style={{ background: def ? `linear-gradient(135deg,${accentColor},${accentColor}bb)` : 'var(--border-input)' }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                  style={{ left: def ? 'calc(100% - 1.375rem)' : '0.125rem' }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Accent color picker */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="card-disaster p-6"
      >
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: '#7c3aed' }}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
          {t('settings.color_preview')}
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          {t('settings.color_hint')}
        </p>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map(({ color, key }) => {
            const isActive = accentColor === color;
            return (
              <button
                key={color}
                onClick={() => handleAccent(color, key)}
                title={t(`settings.${key}`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? `${color}18` : 'var(--bg-tertiary)',
                  border: isActive ? `2px solid ${color}` : '2px solid var(--border-input)',
                  boxShadow: isActive ? `0 4px 14px ${color}40` : 'none',
                  minWidth: 72,
                }}
              >
                <div className="relative w-8 h-8 rounded-full shadow-md" style={{ background: color }}>
                  {isActive && (
                    <svg className="absolute inset-0 m-auto w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-semibold text-center leading-tight" style={{ color: isActive ? color : 'var(--text-secondary)', maxWidth: 64 }}>
                  {t(`settings.${key}`)}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
