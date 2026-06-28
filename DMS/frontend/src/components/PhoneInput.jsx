import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const COUNTRIES = [
  { code: '+962', flag: '🇯🇴', name: 'Jordan',        local: 9,  prefix: '7',  example: '79 123 4567' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia',  local: 9,  prefix: '5',  example: '51 234 5678' },
  { code: '+971', flag: '🇦🇪', name: 'UAE',           local: 9,  prefix: '5',  example: '50 123 4567' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt',         local: 10, prefix: '1',  example: '100 123 4567' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait',        local: 8,  prefix: '',   example: '5000 1234' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar',         local: 8,  prefix: '',   example: '3312 3456' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain',       local: 8,  prefix: '',   example: '3600 1234' },
  { code: '+968', flag: '🇴🇲', name: 'Oman',          local: 8,  prefix: '',   example: '9212 3456' },
  { code: '+964', flag: '🇮🇶', name: 'Iraq',          local: 10, prefix: '7',  example: '770 123 4567' },
  { code: '+963', flag: '🇸🇾', name: 'Syria',         local: 9,  prefix: '9',  example: '944 123 456' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon',       local: 8,  prefix: '',   example: '71 123 456' },
  { code: '+90',  flag: '🇹🇷', name: 'Turkey',        local: 10, prefix: '5',  example: '531 234 5678' },
  { code: '+33',  flag: '🇫🇷', name: 'France',        local: 9,  prefix: '',   example: '6 12 34 56 78' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain',         local: 9,  prefix: '',   example: '612 345 678' },
  { code: '+44',  flag: '🇬🇧', name: 'UK',            local: 10, prefix: '',   example: '7700 900123' },
  { code: '+1',   flag: '🇺🇸', name: 'USA',           local: 10, prefix: '',   example: '202 555 0100' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany',       local: 11, prefix: '',   example: '1512 3456789' },
];

/* detect country from GPS */
const BOUNDS = [
  { code: '+962', lat:[29,33.4],  lng:[34.9,39.3] },
  { code: '+966', lat:[16,32],    lng:[36,56] },
  { code: '+971', lat:[22.6,26.1],lng:[51,56.5] },
  { code: '+20',  lat:[22,31.7],  lng:[25,37] },
  { code: '+965', lat:[28.5,30.1],lng:[46.5,48.5] },
  { code: '+974', lat:[24.5,26.2],lng:[50.7,51.7] },
  { code: '+968', lat:[16.7,26.4],lng:[51.8,59.9] },
  { code: '+964', lat:[29.1,37.4],lng:[38.8,48.6] },
  { code: '+963', lat:[32.3,37.4],lng:[35.6,42.4] },
  { code: '+961', lat:[33,34.7],  lng:[35.1,36.6] },
  { code: '+90',  lat:[35.8,42.1],lng:[25.7,44.8] },
  { code: '+33',  lat:[41.3,51.1],lng:[-5.2,9.6] },
  { code: '+34',  lat:[35.9,43.8],lng:[-9.3,4.3] },
  { code: '+44',  lat:[49.9,60.9],lng:[-8.2,1.8] },
  { code: '+1',   lat:[24.5,49.4],lng:[-125,-66.9] },
];

function detectCode(lat, lng) {
  if (lat == null || lng == null) return '+962';
  for (const b of BOUNDS) {
    if (lat >= b.lat[0] && lat <= b.lat[1] && lng >= b.lng[0] && lng <= b.lng[1]) return b.code;
  }
  return '+962';
}

const MSGS = {
  valid:   { en:'✓ Valid',       ar:'✓ صحيح',       fr:'✓ Valide',    es:'✓ Válido',   tr:'✓ Geçerli' },
  invalid: { en:'✗ Invalid',     ar:'✗ غير صحيح',   fr:'✗ Invalide',  es:'✗ Inválido', tr:'✗ Geçersiz' },
  short:   { en:'Too short',     ar:'قصير جداً',     fr:'Trop court',  es:'Muy corto',  tr:'Çok kısa' },
  fake:    { en:'Suspicious',    ar:'مشبوه',         fr:'Suspect',     es:'Sospechoso', tr:'Şüpheli' },
  checking:{ en:'Checking…',    ar:'جارٍ التحقق…', fr:'Vérification…',es:'Verificando…',tr:'Kontrol ediliyor…' },
};

export default function PhoneInput({ value, onChange, latitude, longitude }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'en';

  const [countryCode, setCountryCode] = useState('+962');
  const [local, setLocal] = useState('');
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const timer = useRef(null);
  const dropRef = useRef(null);

  // Auto-detect country from GPS
  useEffect(() => {
    const detected = detectCode(latitude, longitude);
    setCountryCode(detected);
  }, [latitude, longitude]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync external value
  useEffect(() => {
    if (!value) { setLocal(''); return; }
    const c = COUNTRIES.find(c => value.startsWith(c.code));
    if (c) { setCountryCode(c.code); setLocal(value.slice(c.code.length).replace(/\D/g, '')); }
    else setLocal(value.replace(/\D/g, ''));
  }, []);

  const country = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  const handleLocal = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    setLocal(digits);
    setStatus(null);
    const full = countryCode + digits;
    onChange(full);
    clearTimeout(timer.current);
    if (digits.length >= 5) {
      timer.current = setTimeout(() => verify(digits, countryCode), 900);
    }
  };

  const verify = async (digits, code) => {
    setStatus('checking');
    try {
      const res = await fetch('http://localhost:3002/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: code + digits, countryCode: code, countryName: country.name, lang }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) { const d = await res.json(); setStatus(d.valid ? 'valid' : d.suspicious ? 'fake' : 'invalid'); return; }
    } catch {}
    // local fallback
    const ok = digits.length >= country.local - 1 && digits.length <= country.local + 1 &&
               (!country.prefix || digits.startsWith(country.prefix));
    setStatus(ok ? 'valid' : digits.length < 5 ? 'short' : 'invalid');
  };

  const statusColor = { valid:'#00c853', invalid:'#E63946', fake:'#FF7A00', short:'#a855f7', checking:'#00d4ff' }[status];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
        {/* Country picker button */}
        <div ref={dropRef} style={{ position:'relative', flexShrink:0 }}>
          <button type="button" onClick={() => setOpen(o => !o)}
            style={{
              height:'100%', minHeight:42, padding:'0 12px',
              background:'var(--bg-input)', border:'1.5px solid var(--border-input)',
              borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              color:'var(--text-primary)', fontSize:'0.875rem', fontWeight:600,
              whiteSpace:'nowrap',
              transition:'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#E63946'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-input)'}
          >
            <span style={{ fontSize:'1.1rem' }}>{country.flag}</span>
            <span style={{ fontFamily:'monospace', color:'#E63946', fontWeight:700 }}>{countryCode}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity:0, y:-6, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:-6, scale:0.97 }} transition={{ duration:0.15 }}
                style={{
                  position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:100,
                  background:'var(--bg-secondary)', border:'1.5px solid var(--border-input)',
                  borderRadius:12, width:220, maxHeight:240, overflowY:'auto',
                  boxShadow:'0 12px 40px rgba(0,0,0,0.25)',
                }}>
                {COUNTRIES.map(c => (
                  <button key={c.code} type="button"
                    onClick={() => { setCountryCode(c.code); setLocal(''); onChange(c.code); setOpen(false); setStatus(null); }}
                    style={{
                      width:'100%', padding:'8px 12px',
                      background: c.code === countryCode ? 'rgba(230,57,70,0.08)' : 'transparent',
                      border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                      color:'var(--text-primary)', fontSize:'0.8rem', textAlign:'left',
                    }}>
                    <span style={{ fontSize:'1rem' }}>{c.flag}</span>
                    <span style={{ flex:1 }}>{c.name}</span>
                    <span style={{ fontFamily:'monospace', fontSize:'0.75rem', color:'#E63946' }}>{c.code}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Number input */}
        <input
          type="tel" inputMode="numeric"
          value={local}
          onChange={handleLocal}
          placeholder={country.example}
          style={{
            flex:1, padding:'10px 14px',
            background:'var(--bg-input)', color:'var(--text-primary)',
            border: `1.5px solid ${statusColor || 'var(--border-input)'}`,
            borderRadius:10, fontSize:'0.95rem', fontWeight:600,
            fontFamily:"'Rajdhani','Inter',monospace", letterSpacing:'0.05em',
            outline:'none', transition:'border-color 0.2s, box-shadow 0.2s',
            boxShadow: statusColor ? `0 0 8px ${statusColor}33` : 'none',
          }}
        />
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {status && (
          <motion.div key={status} initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            transition={{ duration:0.18 }}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'4px 10px', borderRadius:20, width:'fit-content',
              background:`${statusColor}15`, border:`1px solid ${statusColor}44`,
              fontSize:11, fontWeight:700, color:statusColor,
            }}>
            {status === 'checking' && (
              <motion.div style={{ width:6, height:6, borderRadius:'50%', background:statusColor }}
                animate={{ opacity:[1,0.3,1] }} transition={{ duration:0.5, repeat:Infinity }} />
            )}
            {(MSGS[status] || {})[lang] || (MSGS[status] || {}).en}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
