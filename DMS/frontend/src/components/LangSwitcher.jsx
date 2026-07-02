import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store';

const LANGUAGES = [
  { val: 'en', flag: '🇺🇸', native: 'EN', label: 'English' },
  { val: 'ar', flag: '🇸🇦', native: 'ع',  label: 'العربية' },
  { val: 'fr', flag: '🇫🇷', native: 'FR', label: 'Français' },
  { val: 'es', flag: '🇪🇸', native: 'ES', label: 'Español' },
  { val: 'tr', flag: '🇹🇷', native: 'TR', label: 'Türkçe' },
];

export default function LangSwitcher({ dark = false }) {
  const { language, setLanguage } = useUIStore();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.val === language) || LANGUAGES[0];

  const bg      = dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-secondary)';
  const border  = dark ? 'rgba(255,255,255,0.15)' : 'var(--border-input)';
  const textCol = dark ? '#fff' : 'var(--text-primary)';
  const menuBg  = dark ? '#111' : 'var(--bg-secondary)';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
        style={{ background: bg, color: textCol, border: `1px solid ${border}` }}
      >
        <span>{current.flag}</span>
        <span>{current.native}</span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} text-xs opacity-60`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 rounded-xl overflow-hidden shadow-2xl z-50"
              dir="ltr"
              style={{ background: menuBg, border: `1px solid ${border}`, minWidth: 140 }}
            >
              {LANGUAGES.map(({ val, flag, label }) => (
                <button
                  key={val}
                  onClick={() => { setLanguage(val); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: language === val ? '#E6394618' : 'transparent',
                    color: language === val ? '#E63946' : textCol,
                    textAlign: 'start',
                    direction: 'ltr',
                  }}
                  onMouseEnter={(e) => { if (language !== val) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { if (language !== val) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="text-base leading-none">{flag}</span>
                  <span>{label}</span>
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
