// ============================================================
// PhoneInput.jsx — DMS Disaster Management System
//
// Reusable phone number input component used during user
// registration and incident reporting flows. Provides:
//   - Country dial-code selection with flag icons
//   - GPS-based automatic country detection (using latitude/
//     longitude from incident location or browser geolocation)
//   - Real-time phone validation via the AI verification
//     service running on port 3002 (Gemini-powered agent),
//     with a local digit-count/prefix fallback
//   - Multilingual validation status messages (en/ar/fr/es/tr)
//   - Neon cyberpunk visual theme matching the DMS design system
// ============================================================

// React core hooks: useState for local UI state, useEffect for
// side effects (GPS detection, click-outside), useRef for the
// debounce timer and dropdown DOM reference
import { useState, useEffect, useRef } from 'react';

// framer-motion: used for animated dropdown appearance and
// animated status badge transitions (DMS neon feedback style)
import { motion, AnimatePresence } from 'framer-motion';

// i18next hook — reads the active locale so status messages
// are displayed in the DMS user's chosen language
import { useTranslation } from 'react-i18next';

/**
 * COUNTRIES — static registry of supported country dial codes.
 * Each entry defines:
 *   code    — ITU-T dial prefix (e.g. '+962' for Jordan)
 *   flag    — emoji flag shown in the country picker
 *   name    — human-readable country name displayed in the dropdown
 *   local   — expected length of the local subscriber number
 *             (used by the offline fallback validator)
 *   prefix  — first digit(s) that valid mobile numbers start with
 *             in that country (empty string means no fixed prefix)
 *   example — placeholder text shown in the input field to guide
 *             incident reporters on the expected number format
 *
 * Jordan (+962) is the default because DMS is primarily deployed
 * in Jordan for the Civil Defense / emergency services context.
 */
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
/**
 * BOUNDS — geographic bounding boxes (lat/lng rectangles) for
 * each country dial code. Used to auto-select the correct country
 * prefix when the user's GPS coordinates are available (e.g. when
 * filling out an incident report from the field).
 * Saudi Arabia and other large countries use wide bounding boxes;
 * small Gulf states use tight boxes to avoid false matches.
 */
const BOUNDS = [
  { code: '+962', lat:[29,33.4],  lng:[34.9,39.3] },   // Jordan
  { code: '+966', lat:[16,32],    lng:[36,56] },         // Saudi Arabia
  { code: '+971', lat:[22.6,26.1],lng:[51,56.5] },      // UAE
  { code: '+20',  lat:[22,31.7],  lng:[25,37] },         // Egypt
  { code: '+965', lat:[28.5,30.1],lng:[46.5,48.5] },    // Kuwait
  { code: '+974', lat:[24.5,26.2],lng:[50.7,51.7] },    // Qatar
  { code: '+968', lat:[16.7,26.4],lng:[51.8,59.9] },    // Oman
  { code: '+964', lat:[29.1,37.4],lng:[38.8,48.6] },    // Iraq
  { code: '+963', lat:[32.3,37.4],lng:[35.6,42.4] },    // Syria
  { code: '+961', lat:[33,34.7],  lng:[35.1,36.6] },    // Lebanon
  { code: '+90',  lat:[35.8,42.1],lng:[25.7,44.8] },    // Turkey
  { code: '+33',  lat:[41.3,51.1],lng:[-5.2,9.6] },     // France
  { code: '+34',  lat:[35.9,43.8],lng:[-9.3,4.3] },     // Spain
  { code: '+44',  lat:[49.9,60.9],lng:[-8.2,1.8] },     // UK
  { code: '+1',   lat:[24.5,49.4],lng:[-125,-66.9] },   // USA (contiguous)
];

/**
 * detectCode — pure function that maps GPS coordinates to a dial
 * code by testing each bounding box in BOUNDS order.
 * Falls back to Jordan (+962) when coordinates are unavailable
 * or outside all known boxes (Jordan is the primary DMS deployment).
 *
 * @param {number|null} lat - WGS-84 latitude from incident location
 * @param {number|null} lng - WGS-84 longitude from incident location
 * @returns {string} ITU-T dial prefix string, e.g. '+962'
 */
function detectCode(lat, lng) {
  // If coordinates are not yet available, default to Jordan
  if (lat == null || lng == null) return '+962';
  // Iterate bounding boxes; return the first match found
  for (const b of BOUNDS) {
    if (lat >= b.lat[0] && lat <= b.lat[1] && lng >= b.lng[0] && lng <= b.lng[1]) return b.code;
  }
  // No bounding box matched; fall back to Jordan
  return '+962';
}

/**
 * MSGS — multilingual status message strings displayed beneath the
 * phone input field after validation runs. Supports the five DMS
 * UI languages: English, Arabic, French, Spanish, Turkish.
 * Each key corresponds to a validation result state:
 *   valid    — number passed AI or local format validation
 *   invalid  — number failed validation (wrong length / prefix)
 *   short    — user is still typing; number is too short to validate
 *   fake     — AI agent flagged the number as suspicious/spoofed
 *   checking — async verification request is in-flight
 */
const MSGS = {
  valid:   { en:'✓ Valid',       ar:'✓ صحيح',       fr:'✓ Valide',    es:'✓ Válido',   tr:'✓ Geçerli' },
  invalid: { en:'✗ Invalid',     ar:'✗ غير صحيح',   fr:'✗ Invalide',  es:'✗ Inválido', tr:'✗ Geçersiz' },
  short:   { en:'Too short',     ar:'قصير جداً',     fr:'Trop court',  es:'Muy corto',  tr:'Çok kısa' },
  fake:    { en:'Suspicious',    ar:'مشبوه',         fr:'Suspect',     es:'Sospechoso', tr:'Şüpheli' },
  checking:{ en:'Checking…',    ar:'جارٍ التحقق…', fr:'Vérification…',es:'Verificando…',tr:'Kontrol ediliyor…' },
};

/**
 * PhoneInput — controlled input component for collecting and
 * validating a user's phone number during DMS registration or
 * incident reporting. Combines a country-code picker with a
 * digit input and live validation feedback.
 *
 * @param {string}      value     - Full E.164-style phone string
 *                                  managed by the parent form state
 * @param {Function}    onChange  - Callback invoked with the new full
 *                                  phone string (countryCode + digits)
 *                                  whenever the number changes
 * @param {number|null} latitude  - GPS latitude from the incident
 *                                  location picker; drives auto country
 * @param {number|null} longitude - GPS longitude from the incident
 *                                  location picker; drives auto country
 */
export default function PhoneInput({ value, onChange, latitude, longitude }) {
  // Access i18next instance to read the active DMS UI language
  const { i18n } = useTranslation();
  // Normalise locale tag to a two-letter code (e.g. 'en-US' → 'en')
  const lang = i18n.language?.split('-')[0] || 'en';

  // Currently selected country dial code shown on the picker button
  const [countryCode, setCountryCode] = useState('+962');
  // Local subscriber number digits only (no country prefix)
  const [local, setLocal] = useState('');
  // Controls visibility of the country dropdown list
  const [open, setOpen] = useState(false);
  // Validation result state: null | 'checking' | 'valid' | 'invalid' | 'short' | 'fake'
  const [status, setStatus] = useState(null);
  // Ref storing the debounce timer ID so it can be cleared on each keystroke
  const timer = useRef(null);
  // Ref attached to the dropdown wrapper div for click-outside detection
  const dropRef = useRef(null);

  // Auto-detect country from GPS
  // When the incident location picker updates lat/lng, re-derive the
  // most likely country dial code so the reporter doesn't need to
  // manually switch countries in the field
  useEffect(() => {
    const detected = detectCode(latitude, longitude);
    setCountryCode(detected);
  }, [latitude, longitude]);

  // Close dropdown on outside click
  // Attaches a document-level mousedown listener; if the click target
  // is outside the dropdown wrapper ref, the picker is closed
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    // Cleanup listener when component unmounts to prevent memory leaks
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync external value
  // On initial mount, parse the parent-provided value string back into
  // a country code + local digits pair so the two sub-fields are in sync
  useEffect(() => {
    // If the parent passes an empty value, clear the local digit field
    if (!value) { setLocal(''); return; }
    // Find which country prefix matches the start of the stored value
    const c = COUNTRIES.find(c => value.startsWith(c.code));
    if (c) {
      // Strip the country prefix and remove any non-digit characters
      setCountryCode(c.code);
      setLocal(value.slice(c.code.length).replace(/\D/g, ''));
    } else {
      // No known prefix found; treat entire value as raw digits
      setLocal(value.replace(/\D/g, ''));
    }
  }, []); // Run only on mount — intentionally ignores later value changes

  // Resolve the full country object for the currently selected dial code
  const country = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  /**
   * handleLocal — onChange handler for the digit input field.
   * Strips non-digit characters, enforces a 12-digit cap (the
   * longest international subscriber number), updates component
   * state, notifies the parent form, and schedules a debounced
   * call to the AI phone verification service after 900 ms of
   * inactivity (avoiding a request on every keystroke).
   */
  const handleLocal = (e) => {
    // Allow only digit characters; cap at 12 to prevent overly long numbers
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    setLocal(digits);
    // Reset any prior validation result while the user is still editing
    setStatus(null);
    // Construct the full E.164-style number to pass up to the parent form
    const full = countryCode + digits;
    onChange(full);
    // Cancel any pending verification call from the previous keystroke
    clearTimeout(timer.current);
    // Only schedule verification once at least 5 digits are present
    // to avoid noisy results for very short partial inputs
    if (digits.length >= 5) {
      timer.current = setTimeout(() => verify(digits, countryCode), 900);
    }
  };

  /**
   * verify — async function that validates the entered phone number
   * against the DMS AI verification agent (Gemini 2.5-flash on
   * port 3002). If the agent is unreachable, a local heuristic
   * (digit count + mobile prefix check) is used as a fallback so
   * the form remains usable even when the AI service is offline.
   *
   * The agent can flag numbers as 'suspicious' (fake/spoofed),
   * which is important for DMS incident integrity — bogus contact
   * numbers on incident reports degrade dispatch coordination.
   *
   * @param {string} digits - Local subscriber number digits
   * @param {string} code   - Country dial prefix (e.g. '+962')
   */
  const verify = async (digits, code) => {
    // Show the animated "checking" badge while the request is in-flight
    setStatus('checking');
    try {
      // POST to the AI agent's /verify-phone endpoint on port 3002
      const res = await fetch('http://localhost:3002/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the full number, country context, and UI language so
        // the AI agent can apply country-specific rules and respond
        // in the reporter's language if needed
        body: JSON.stringify({ phone: code + digits, countryCode: code, countryName: country.name, lang }),
        // Hard 8-second timeout prevents indefinite waiting if the
        // AI agent is slow or overloaded during a disaster surge
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const d = await res.json();
        // Map agent response flags to the three outcome states
        setStatus(d.valid ? 'valid' : d.suspicious ? 'fake' : 'invalid');
        return;
      }
    } catch {
      // Swallow network / timeout errors and fall through to local fallback
    }
    // local fallback — heuristic validation when AI agent is unavailable:
    // accept numbers within ±1 digit of the country's expected local length
    // and that start with the country's required mobile prefix (if any)
    const ok = digits.length >= country.local - 1 && digits.length <= country.local + 1 &&
               (!country.prefix || digits.startsWith(country.prefix));
    setStatus(ok ? 'valid' : digits.length < 5 ? 'short' : 'invalid');
  };

  // Map each status key to its corresponding neon accent colour used
  // in the DMS design system for semantic feedback (red=error, green=ok, etc.)
  const statusColor = { valid:'#00c853', invalid:'#E63946', fake:'#FF7A00', short:'#a855f7', checking:'#00d4ff' }[status];

  return (
    // Outer column flex container; holds the input row and status badge
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {/* Row containing the country picker button and the digit input */}
      <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
        {/* Country picker button */}
        {/* Wrapper div receives the dropRef so outside-click logic can
            detect when clicks fall outside both the button and dropdown */}
        <div ref={dropRef} style={{ position:'relative', flexShrink:0 }}>
          {/* Toggle button — shows the selected country's flag and dial code.
              Hover border turns DMS red (#E63946) for interactive affordance */}
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
            {/* Country flag emoji */}
            <span style={{ fontSize:'1.1rem' }}>{country.flag}</span>
            {/* Dial code displayed in DMS red monospace for quick scanning */}
            <span style={{ fontFamily:'monospace', color:'#E63946', fontWeight:700 }}>{countryCode}</span>
            {/* Chevron icon indicates this is an expandable picker */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {/* AnimatePresence manages the mount/unmount animation of the dropdown */}
          <AnimatePresence>
            {open && (
              // Animated dropdown panel — slides down and fades in
              <motion.div initial={{ opacity:0, y:-6, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:-6, scale:0.97 }} transition={{ duration:0.15 }}
                style={{
                  position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:100,
                  background:'var(--bg-secondary)', border:'1.5px solid var(--border-input)',
                  borderRadius:12, width:220, maxHeight:240, overflowY:'auto',
                  boxShadow:'0 12px 40px rgba(0,0,0,0.25)',
                }}>
                {/* Render one button per supported country.
                    Selecting a country resets the digit field and notifies the
                    parent form with just the new dial code (no local number yet) */}
                {COUNTRIES.map(c => (
                  <button key={c.code} type="button"
                    onClick={() => { setCountryCode(c.code); setLocal(''); onChange(c.code); setOpen(false); setStatus(null); }}
                    style={{
                      width:'100%', padding:'8px 12px',
                      // Highlight the currently selected country with a subtle red tint
                      background: c.code === countryCode ? 'rgba(230,57,70,0.08)' : 'transparent',
                      border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                      color:'var(--text-primary)', fontSize:'0.8rem', textAlign:'left',
                    }}>
                    {/* Flag emoji for quick visual country identification */}
                    <span style={{ fontSize:'1rem' }}>{c.flag}</span>
                    {/* Country name fills available space */}
                    <span style={{ flex:1 }}>{c.name}</span>
                    {/* Dial code in DMS red at right edge */}
                    <span style={{ fontFamily:'monospace', fontSize:'0.75rem', color:'#E63946' }}>{c.code}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Number input */}
        {/* tel input with numeric inputMode for mobile keyboards.
            Border colour and glow dynamically reflect validation status
            using the neon accent colours from the DMS design system */}
        <input
          type="tel" inputMode="numeric"
          value={local}
          onChange={handleLocal}
          // Placeholder shows a country-specific example number to guide reporters
          placeholder={country.example}
          style={{
            flex:1, padding:'10px 14px',
            background:'var(--bg-input)', color:'var(--text-primary)',
            // Border dynamically adopts the status colour (green/red/orange/purple/cyan)
            border: `1.5px solid ${statusColor || 'var(--border-input)'}`,
            borderRadius:10, fontSize:'0.95rem', fontWeight:600,
            // Rajdhani is the DMS primary display font; Inter is the fallback
            fontFamily:"'Rajdhani','Inter',monospace", letterSpacing:'0.05em',
            outline:'none', transition:'border-color 0.2s, box-shadow 0.2s',
            // Neon glow effect matching the status colour for cyberpunk DMS aesthetic
            boxShadow: statusColor ? `0 0 8px ${statusColor}33` : 'none',
          }}
        />
      </div>

      {/* Status */}
      {/* AnimatePresence with mode="wait" ensures the old badge fully exits
          before the new one enters, preventing visual overlap between states */}
      <AnimatePresence mode="wait">
        {status && (
          // Animated pill badge — fades/slides in when a status is set
          <motion.div key={status} initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            transition={{ duration:0.18 }}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'4px 10px', borderRadius:20, width:'fit-content',
              // Semi-transparent background tinted with the status colour
              background:`${statusColor}15`, border:`1px solid ${statusColor}44`,
              fontSize:11, fontWeight:700, color:statusColor,
            }}>
            {/* Pulsing dot shown only during the async checking state */}
            {status === 'checking' && (
              <motion.div style={{ width:6, height:6, borderRadius:'50%', background:statusColor }}
                // Infinite opacity pulse conveys ongoing async activity
                animate={{ opacity:[1,0.3,1] }} transition={{ duration:0.5, repeat:Infinity }} />
            )}
            {/* Display the localised status message; fall back to English if
                the active language has no entry for this status key */}
            {(MSGS[status] || {})[lang] || (MSGS[status] || {}).en}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}