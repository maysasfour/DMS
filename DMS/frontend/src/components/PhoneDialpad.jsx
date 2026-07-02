import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/* Country codes derived from lat/lng bounding boxes */
const COUNTRY_CODES = [
  { code: '+962', country: 'JO', name: 'Jordan',       lat: [29, 33.4], lng: [34.9, 39.3] },
  { code: '+966', country: 'SA', name: 'Saudi Arabia', lat: [16, 32],   lng: [36, 56] },
  { code: '+20',  country: 'EG', name: 'Egypt',        lat: [22, 31.7], lng: [25, 37] },
  { code: '+971', country: 'AE', name: 'UAE',          lat: [22.6, 26.1], lng: [51, 56.5] },
  { code: '+965', country: 'KW', name: 'Kuwait',       lat: [28.5, 30.1], lng: [46.5, 48.5] },
  { code: '+974', country: 'QA', name: 'Qatar',        lat: [24.5, 26.2], lng: [50.7, 51.7] },
  { code: '+973', country: 'BH', name: 'Bahrain',      lat: [25.8, 26.4], lng: [50.3, 50.9] },
  { code: '+968', country: 'OM', name: 'Oman',         lat: [16.7, 26.4], lng: [51.8, 59.9] },
  { code: '+964', country: 'IQ', name: 'Iraq',         lat: [29.1, 37.4], lng: [38.8, 48.6] },
  { code: '+963', country: 'SY', name: 'Syria',        lat: [32.3, 37.4], lng: [35.6, 42.4] },
  { code: '+961', country: 'LB', name: 'Lebanon',      lat: [33, 34.7],  lng: [35.1, 36.6] },
  { code: '+972', country: 'IL', name: 'Israel',       lat: [29.5, 33.3], lng: [34.2, 35.9] },
  { code: '+90',  country: 'TR', name: 'Turkey',       lat: [35.8, 42.1], lng: [25.7, 44.8] },
  { code: '+33',  country: 'FR', name: 'France',       lat: [41.3, 51.1], lng: [-5.2, 9.6] },
  { code: '+34',  country: 'ES', name: 'Spain',        lat: [35.9, 43.8], lng: [-9.3, 4.3] },
  { code: '+1',   country: 'US', name: 'USA',          lat: [24.5, 49.4], lng: [-125, -66.9] },
  { code: '+44',  country: 'GB', name: 'UK',           lat: [49.9, 60.9], lng: [-8.2, 1.8] },
  { code: '+49',  country: 'DE', name: 'Germany',      lat: [47.3, 55.1], lng: [5.9, 15.1] },
];

const DIALPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

const SUB = { '2':'ABC','3':'DEF','4':'GHI','5':'JKL','6':'MNO','7':'PQRS','8':'TUV','9':'WXYZ','0':'+','1':'','*':'','#':'' };

function detectCountry(lat, lng) {
  if (lat == null || lng == null) return COUNTRY_CODES[0]; // default Jordan
  for (const c of COUNTRY_CODES) {
    if (lat >= c.lat[0] && lat <= c.lat[1] && lng >= c.lng[0] && lng <= c.lng[1]) return c;
  }
  return null;
}

const PHONE_MSGS = {
  checking:  { en:'Checking number…',ar:'جارٍ التحقق من الرقم…',fr:'Vérification du numéro…',es:'Verificando número…',tr:'Numara kontrol ediliyor…' },
  valid:     { en:'Valid number ✓',ar:'رقم صحيح ✓',fr:'Numéro valide ✓',es:'Número válido ✓',tr:'Geçerli numara ✓' },
  invalid:   { en:'Invalid number — please check',ar:'رقم غير صحيح — يرجى المراجعة',fr:'Numéro invalide — veuillez vérifier',es:'Número inválido — por favor verifique',tr:'Geçersiz numara — lütfen kontrol edin' },
  fake:      { en:'Suspicious / unregistered number',ar:'رقم مشبوه أو غير مسجّل',fr:'Numéro suspect / non enregistré',es:'Número sospechoso / no registrado',tr:'Şüpheli / kayıtsız numara' },
  short:     { en:'Number too short',ar:'الرقم قصير جدًا',fr:'Numéro trop court',es:'Número muy corto',tr:'Numara çok kısa' },
  nocode:    { en:'Could not detect country — select manually',ar:'تعذّر تحديد البلد — اختر يدويًا',fr:'Impossible de détecter le pays — sélectionnez manuellement',es:'No se pudo detectar el país — seleccione manualmente',tr:'Ülke algılanamadı — manuel seçin' },
};

function msg(key, lang) {
  return (PHONE_MSGS[key] || {})[lang] || PHONE_MSGS[key]?.en || '';
}

/* Validates phone length/format for a country code */
function validateLength(digits, countryCode) {
  const len = digits.length;
  if (!countryCode) return len >= 7;
  // Jordan: 8 local digits starting with 7 (+962 7X XXX XXX)
  if (countryCode === '+962') return len === 8 && digits.startsWith('7');
  // Saudi: 9 local digits starting with 5
  if (countryCode === '+966') return len === 9 && digits.startsWith('5');
  // Egypt: 10 local digits starting with 1
  if (countryCode === '+20') return len === 10 && digits.startsWith('1');
  // UAE: 9 local digits starting with 5
  if (countryCode === '+971') return len === 9 && digits.startsWith('5');
  // Turkey: 10 local digits starting with 5
  if (countryCode === '+90') return len === 10 && digits.startsWith('5');
  // UK: 10 local digits
  if (countryCode === '+44') return len === 10;
  // Default 7-12
  return len >= 7 && len <= 12;
}

export default function PhoneDialpad({ value, onChange, latitude, longitude }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'en';

  const [country, setCountry] = useState(null);
  const [localDigits, setLocalDigits] = useState('');
  const [status, setStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid' | 'fake' | 'short'
  const [open, setOpen] = useState(false);
  const checkTimer = useRef(null);

  /* detect country from GPS */
  useEffect(() => {
    const c = detectCountry(latitude, longitude);
    setCountry(c);
  }, [latitude, longitude]);

  /* sync external value → local */
  useEffect(() => {
    if (!value) { setLocalDigits(''); return; }
    const prefix = country?.code;
    if (prefix && value.startsWith(prefix)) {
      setLocalDigits(value.slice(prefix.length).replace(/\D/g, ''));
    } else {
      setLocalDigits(value.replace(/[^\d]/g, ''));
    }
  }, [value, country]);

  const pushDigit = (d) => {
    if (localDigits.length >= 12) return;
    const next = localDigits + d;
    setLocalDigits(next);
    setStatus(null);
    const full = (country?.code || '') + next;
    onChange(full);
    scheduleCheck(next);
  };

  const backspace = () => {
    const next = localDigits.slice(0, -1);
    setLocalDigits(next);
    setStatus(null);
    onChange((country?.code || '') + next);
    if (next.length >= 7) scheduleCheck(next);
  };

  const clear = () => { setLocalDigits(''); setStatus(null); onChange(''); };

  const scheduleCheck = (digits) => {
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => checkNumber(digits), 800);
  };

  const checkNumber = async (digits) => {
    if (!digits || digits.length < 6) { setStatus('short'); return; }
    setStatus('checking');
    try {
      const full = (country?.code || '') + digits;
      const res = await fetch(`http://localhost:3002/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: full, countryCode: country?.code, countryName: country?.name, lang }),
      });
      if (!res.ok) throw new Error('agent error');
      const data = await res.json();
      setStatus(data.valid ? 'valid' : data.suspicious ? 'fake' : 'invalid');
    } catch {
      /* fallback: local format check */
      const ok = validateLength(digits, country?.code);
      setStatus(ok ? 'valid' : 'invalid');
    }
  };

  const displayNumber = country ? `${country.code} ${localDigits}` : localDigits;

  const statusColor = {
    checking: '#00d4ff', valid: '#00ff88', invalid: '#E63946', fake: '#FF7A00', short: '#a855f7',
  }[status] || 'transparent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Country selector */}
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 0.875rem',
            background: 'var(--bg-input)', border: '1.5px solid var(--border-input)',
            borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.875rem',
          }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, opacity: 0.6, fontFamily: 'monospace' }}>COUNTRY</span>
            <span style={{ fontWeight: 600 }}>
              {country ? `${country.name} (${country.code})` : 'Select country…'}
            </span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
                background: 'var(--bg-secondary)', border: '1.5px solid var(--border-input)',
                borderRadius: 10, maxHeight: 220, overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}>
              {COUNTRY_CODES.map(c => (
                <button key={c.code} type="button"
                  onClick={() => { setCountry(c); setOpen(false); setLocalDigits(''); onChange(''); setStatus(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '0.5rem 0.875rem',
                    background: country?.code === c.code ? 'var(--accent-soft)' : 'transparent',
                    border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem',
                    textAlign: 'left',
                  }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--neon-red)', minWidth: 36 }}>{c.code}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phone display */}
      <div className="phone-display" style={{
        borderColor: status ? statusColor : undefined,
        boxShadow: status ? `0 0 12px ${statusColor}44` : undefined,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        {displayNumber || <span style={{ opacity: 0.3, fontSize: '1rem' }}>
          {country ? `${country.code} …` : 'Enter phone'}
        </span>}
      </div>

      {/* Status badge */}
      <AnimatePresence mode="wait">
        {status && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.35rem 0.75rem', borderRadius: 20,
              background: `${statusColor}18`, border: `1px solid ${statusColor}44`,
              fontSize: 12, fontWeight: 600, color: statusColor,
              textShadow: `0 0 8px ${statusColor}66`,
            }}>
            {status === 'checking' && (
              <motion.div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }}/>
            )}
            {status === 'valid' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>}
            {(status === 'invalid' || status === 'fake') && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            {msg(status, lang)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dial pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {DIALPAD.flat().map(d => (
          <motion.button key={d} type="button"
            className="dialpad-btn"
            whileTap={{ scale: 0.9 }}
            onClick={() => d !== '*' && d !== '#' ? pushDigit(d) : undefined}
            style={{ opacity: (d === '*' || d === '#') ? 0.4 : 1, cursor: (d === '*' || d === '#') ? 'default' : 'pointer' }}
          >
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{d}</span>
            {SUB[d] && <span style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.5, marginTop: 1 }}>{SUB[d]}</span>}
          </motion.button>
        ))}
      </div>

      {/* Action row: backspace + call + clear */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 2 }}>
        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={clear}
          style={{
            padding: '0.6rem', borderRadius: 10, border: '1.5px solid var(--border-input)',
            background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11,
            fontWeight: 600, letterSpacing: '0.05em',
          }}>
          CLR
        </motion.button>

        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={() => checkNumber(localDigits)}
          style={{
            padding: '0.6rem', borderRadius: 10, border: '1.5px solid rgba(230,57,70,0.4)',
            background: 'linear-gradient(135deg, #E63946, #c0202d)',
            color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 0 12px rgba(230,57,70,0.35)',
          }}>
          CHECK
        </motion.button>

        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={backspace}
          style={{
            padding: '0.6rem', borderRadius: 10, border: '1.5px solid var(--border-input)',
            background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12H9M9 12l4-4M9 12l4 4"/><path d="M3 6l3-3h15v18H6l-3-3V6z" opacity="0.3"/>
          </svg>
        </motion.button>
      </div>

      {!country && latitude == null && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
          {msg('nocode', lang)}
        </div>
      )}
    </div>
  );
}
