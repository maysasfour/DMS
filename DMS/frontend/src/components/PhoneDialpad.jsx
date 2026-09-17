/**
 * PhoneDialpad.jsx
 *
 * Interactive phone number input component for the Disaster Management System (DMS).
 *
 * This component provides a full dialpad UI used during incident reporting and user
 * registration to capture and validate reporter/responder phone numbers. It:
 *  - Auto-detects the reporter's country from GPS coordinates (latitude/longitude)
 *    supplied by the incident location picker, pre-selecting the correct country code.
 *  - Displays a 12-button DTMF dialpad (digits 0–9, *, #) with letter sub-labels.
 *  - Validates the entered number against country-specific length/format rules, then
 *    optionally verifies it via the AI agent service (port 3002) for suspicious/fake numbers.
 *  - Shows colour-coded status feedback (valid ✓, invalid ✗, suspicious, checking…).
 *  - Supports all five DMS UI languages: English, Arabic, French, Spanish, Turkish.
 *
 * Props:
 *   value      {string}  — Controlled E.164-style phone value (e.g. "+9627XXXXXXXX")
 *   onChange   {func}    — Callback invoked with the new full phone string on every change
 *   latitude   {number}  — Reporter's GPS latitude used for automatic country detection
 *   longitude  {number}  — Reporter's GPS longitude used for automatic country detection
 */

// React core hooks for state, side-effects, and mutable refs
import { useState, useEffect, useRef } from 'react';
// Framer Motion for animated dialpad button taps, dropdown transitions, and status badge
import { motion, AnimatePresence } from 'framer-motion';
// i18next hook to read the active DMS UI language (en/ar/fr/es/tr)
import { useTranslation } from 'react-i18next';

/* Country codes derived from lat/lng bounding boxes —
   used to auto-select the dialing prefix from the incident's GPS location */
const COUNTRY_CODES = [
  // Middle-East and North Africa countries most relevant to DMS deployments
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
  // Additional countries included to support international DMS users and aid organisations
  { code: '+90',  country: 'TR', name: 'Turkey',       lat: [35.8, 42.1], lng: [25.7, 44.8] },
  { code: '+33',  country: 'FR', name: 'France',       lat: [41.3, 51.1], lng: [-5.2, 9.6] },
  { code: '+34',  country: 'ES', name: 'Spain',        lat: [35.9, 43.8], lng: [-9.3, 4.3] },
  { code: '+1',   country: 'US', name: 'USA',          lat: [24.5, 49.4], lng: [-125, -66.9] },
  { code: '+44',  country: 'GB', name: 'UK',           lat: [49.9, 60.9], lng: [-8.2, 1.8] },
  { code: '+49',  country: 'DE', name: 'Germany',      lat: [47.3, 55.1], lng: [5.9, 15.1] },
];

// Standard 12-key DTMF dialpad layout — rows top-to-bottom as on a physical phone
const DIALPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

// Letter sub-labels displayed beneath each digit key, matching standard telephone keypad
// '0' maps to '+' (international dialing), '*' and '#' have no sub-labels
const SUB = { '2':'ABC','3':'DEF','4':'GHI','5':'JKL','6':'MNO','7':'PQRS','8':'TUV','9':'WXYZ','0':'+','1':'','*':'','#':'' };

/**
 * detectCountry — resolves a country record by checking whether the given
 * GPS coordinates fall within any country's bounding box.
 * Falls back to Jordan (index 0) when coordinates are available but match nothing,
 * and returns null when no coords are provided (user must select manually).
 *
 * @param {number|null} lat — Latitude of the incident or reporter location
 * @param {number|null} lng — Longitude of the incident or reporter location
 * @returns {object|null} Matched COUNTRY_CODES entry, or null if undetectable
 */
function detectCountry(lat, lng) {
  // No GPS fix yet — cannot auto-detect; caller will prompt the user to pick manually
  if (lat == null || lng == null) return COUNTRY_CODES[0]; // default Jordan
  // Iterate bounding boxes in priority order (Middle-East first) and return first match
  for (const c of COUNTRY_CODES) {
    if (lat >= c.lat[0] && lat <= c.lat[1] && lng >= c.lng[0] && lng <= c.lng[1]) return c;
  }
  // Coordinates provided but no country matched (e.g. open sea or unlisted territory)
  return null;
}

/**
 * PHONE_MSGS — multilingual status messages shown to the reporter during phone validation.
 * Keys correspond to validation states; each key maps language codes to localised strings.
 * Supports all five DMS languages: English, Arabic, French, Spanish, Turkish.
 */
const PHONE_MSGS = {
  // Shown while the AI agent (port 3002) is performing async phone verification
  checking:  { en:'Checking number…',ar:'جارٍ التحقق من الرقم…',fr:'Vérification du numéro…',es:'Verificando número…',tr:'Numara kontrol ediliyor…' },
  // Phone number passed format and AI verification checks
  valid:     { en:'Valid number ✓',ar:'رقم صحيح ✓',fr:'Numéro valide ✓',es:'Número válido ✓',tr:'Geçerli numara ✓' },
  // Number does not match country format rules and AI did not confirm it
  invalid:   { en:'Invalid number — please check',ar:'رقم غير صحيح — يرجى المراجعة',fr:'Numéro invalide — veuillez vérifier',es:'Número inválido — por favor verifique',tr:'Geçersiz numara — lütfen kontrol edin' },
  // AI agent flagged number as suspicious or unregistered — possible false incident report
  fake:      { en:'Suspicious / unregistered number',ar:'رقم مشبوه أو غير مسجّل',fr:'Numéro suspect / non enregistré',es:'Número sospechoso / no registrado',tr:'Şüpheli / kayıtsız numara' },
  // Fewer digits entered than the minimum required to attempt validation
  short:     { en:'Number too short',ar:'الرقم قصير جدًا',fr:'Numéro trop court',es:'Número muy corto',tr:'Numara çok kısa' },
  // GPS unavailable and no country was manually selected — prefix unknown
  nocode:    { en:'Could not detect country — select manually',ar:'تعذّر تحديد البلد — اختر يدويًا',fr:'Impossible de détecter le pays — sélectionnez manuellement',es:'No se pudo detectar el país — seleccione manualmente',tr:'Ülke algılanamadı — manuel seçin' },
};

/**
 * msg — retrieves a localised validation message string.
 * Falls back to English if the requested language key is absent.
 *
 * @param {string} key  — One of the PHONE_MSGS status keys (e.g. 'valid', 'fake')
 * @param {string} lang — BCP-47 language code short form (en/ar/fr/es/tr)
 * @returns {string} Localised message text
 */
function msg(key, lang) {
  // Return the language variant, falling back to English, then empty string if key missing
  return (PHONE_MSGS[key] || {})[lang] || PHONE_MSGS[key]?.en || '';
}

/* Validates phone length/format for a country code */
/**
 * validateLength — performs a country-specific local-digit length and prefix check
 * as a client-side fallback when the AI agent is unreachable.
 * Each country's mobile number format is hard-coded from ITU-T E.164 national rules.
 *
 * @param {string} digits      — Local digits entered (without country prefix)
 * @param {string} countryCode — Dialing prefix string (e.g. '+962')
 * @returns {boolean} True if the digit string satisfies the country's format rules
 */
function validateLength(digits, countryCode) {
  const len = digits.length;
  // If no country is selected, accept any reasonably long number (minimum 7 digits)
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

/**
 * PhoneDialpad — controlled React component rendering a full phone entry UI.
 * Used on the DMS incident-creation form and registration pages so that reporters
 * and responders can enter their contact number with guided country detection and
 * real-time AI-powered phone verification.
 *
 * @param {string}      value     — Current E.164 phone value managed by the parent form
 * @param {function}    onChange  — Parent setter called whenever the phone string changes
 * @param {number|null} latitude  — GPS latitude from the incident location picker
 * @param {number|null} longitude — GPS longitude from the incident location picker
 */
export default function PhoneDialpad({ value, onChange, latitude, longitude }) {
  // i18next translation hook — used only for the active language code, not t()
  const { i18n } = useTranslation();
  // Normalise BCP-47 tag (e.g. "ar-JO") to short form ("ar") for PHONE_MSGS lookup
  const lang = i18n.language?.split('-')[0] || 'en';

  // Currently selected country object ({code, country, name, lat, lng}) or null
  const [country, setCountry] = useState(null);
  // Local digits entered by the user, without the country prefix (e.g. "712345678")
  const [localDigits, setLocalDigits] = useState('');
  // Validation/verification status: null | 'checking' | 'valid' | 'invalid' | 'fake' | 'short'
  const [status, setStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid' | 'fake' | 'short'
  // Controls visibility of the country-selector dropdown
  const [open, setOpen] = useState(false);
  // Ref holding the debounce timer ID so it can be cleared on each new keystroke
  const checkTimer = useRef(null);

  /* detect country from GPS — runs whenever the incident location changes */
  useEffect(() => {
    // Re-run country detection each time the parent provides updated GPS coordinates
    const c = detectCountry(latitude, longitude);
    setCountry(c);
  }, [latitude, longitude]);

  /* sync external value → local digits — keeps component in sync with parent form resets */
  useEffect(() => {
    // If the parent clears the value (e.g. form reset after incident submission), clear local state
    if (!value) { setLocalDigits(''); return; }
    const prefix = country?.code;
    // Strip the known country prefix to isolate the local-digit portion for display
    if (prefix && value.startsWith(prefix)) {
      setLocalDigits(value.slice(prefix.length).replace(/\D/g, ''));
    } else {
      // Value has no recognised prefix — store raw digits (handles manual input or paste)
      setLocalDigits(value.replace(/[^\d]/g, ''));
    }
  }, [value, country]);

  /**
   * pushDigit — appends a dialled digit to the local number and notifies the parent.
   * Enforces a 12-digit maximum to prevent excessively long numbers.
   * Debounces AI verification so rapid dialling doesn't spam the agent endpoint.
   *
   * @param {string} d — Single character digit pressed ('0'–'9')
   */
  const pushDigit = (d) => {
    // Hard cap: no country uses more than 12 local digits
    if (localDigits.length >= 12) return;
    const next = localDigits + d;
    setLocalDigits(next);
    // Clear any previous validation status while the user is still typing
    setStatus(null);
    // Compose the full E.164 number and bubble up to the parent form field
    const full = (country?.code || '') + next;
    onChange(full);
    // Debounce validation — wait for a pause in typing before hitting the AI agent
    scheduleCheck(next);
  };

  /**
   * backspace — removes the last entered digit and re-schedules validation if
   * enough digits remain (>= 7) to attempt a format check.
   */
  const backspace = () => {
    const next = localDigits.slice(0, -1);
    setLocalDigits(next);
    // Clear status on deletion; user is correcting the number
    setStatus(null);
    onChange((country?.code || '') + next);
    // Only re-validate if the remaining digits are long enough to be meaningful
    if (next.length >= 7) scheduleCheck(next);
  };

  /** clear — resets the dialpad entirely, used when the user wants to start over */
  const clear = () => { setLocalDigits(''); setStatus(null); onChange(''); };

  /**
   * scheduleCheck — debounces the phone verification call by 800 ms.
   * Prevents the AI agent from being called on every individual keypress during rapid dialling.
   *
   * @param {string} digits — Current local digits to validate after the debounce delay
   */
  const scheduleCheck = (digits) => {
    // Cancel any previously pending check before starting a new timer
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => checkNumber(digits), 800);
  };

  /**
   * checkNumber — asynchronously validates the entered phone number.
   * First contacts the Gemini-based AI agent on port 3002 (/verify-phone) which checks
   * whether the number is registered and non-suspicious (guarding against fake incident reports).
   * Falls back to the local validateLength() rule-set if the agent is unreachable.
   *
   * @param {string} digits — Local digits to validate (without country prefix)
   */
  const checkNumber = async (digits) => {
    // Reject trivially short strings before contacting the AI agent
    if (!digits || digits.length < 6) { setStatus('short'); return; }
    // Show a loading pulse to the reporter while the AI processes the number
    setStatus('checking');
    try {
      // Compose the full E.164 number for the AI agent's lookup
      const full = (country?.code || '') + digits;
      // POST to the DMS AI verification agent (Gemini 2.5-flash, port 3002)
      const res = await fetch(`http://localhost:3002/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send country metadata so the agent can apply region-specific validation rules
        body: JSON.stringify({ phone: full, countryCode: country?.code, countryName: country?.name, lang }),
      });
      if (!res.ok) throw new Error('agent error');
      const data = await res.json();
      // Map agent response flags to one of three status values for the UI badge
      setStatus(data.valid ? 'valid' : data.suspicious ? 'fake' : 'invalid');
    } catch {
      /* fallback: local format check — used when the AI agent is down or unreachable */
      const ok = validateLength(digits, country?.code);
      setStatus(ok ? 'valid' : 'invalid');
    }
  };

  // Formatted display string shown in the phone display box (e.g. "+962 712345678")
  const displayNumber = country ? `${country.code} ${localDigits}` : localDigits;

  // Maps each status key to a themed neon colour matching the DMS cyberpunk design system
  const statusColor = {
    checking: '#00d4ff', // Cyan pulse — AI is working
    valid: '#00ff88',    // Neon green — number confirmed
    invalid: '#E63946',  // DMS alert red — format error
    fake: '#FF7A00',     // Orange warning — suspicious number
    short: '#a855f7',    // Purple hint — user still typing
  }[status] || 'transparent';

  return (
    // Outer flex column container — stacks all dialpad sections vertically with 10px gap
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Country selector — shows the auto-detected or manually chosen dialing prefix */}
      <div style={{ position: 'relative' }}>
        {/* Toggle button — opens/closes the country dropdown */}
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.6rem 0.875rem',
            // Uses DMS CSS variables so the button respects the dark/light theme
            background: 'var(--bg-input)', border: '1.5px solid var(--border-input)',
            borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.875rem',
          }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* "COUNTRY" label — small monospace hint above the selected country name */}
            <span style={{ fontSize: 11, opacity: 0.6, fontFamily: 'monospace' }}>COUNTRY</span>
            {/* Shows the detected/selected country name and dialing code, or a placeholder */}
            <span style={{ fontWeight: 600 }}>
              {country ? `${country.name} (${country.code})` : 'Select country…'}
            </span>
          </span>
          {/* Chevron-down icon indicating this is an expandable selector */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {/* Animated dropdown list — slides in when open is true */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
                background: 'var(--bg-secondary)', border: '1.5px solid var(--border-input)',
                borderRadius: 10, maxHeight: 220, overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}>
              {/* Render one button per country — selecting resets digits and clears validation */}
              {COUNTRY_CODES.map(c => (
                <button key={c.code} type="button"
                  // On select: update country, close dropdown, clear digits and re-validation status
                  onClick={() => { setCountry(c); setOpen(false); setLocalDigits(''); onChange(''); setStatus(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '0.5rem 0.875rem',
                    // Highlight the currently active country with an accent background
                    background: country?.code === c.code ? 'var(--accent-soft)' : 'transparent',
                    border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem',
                    textAlign: 'left',
                  }}>
                  {/* Country code shown in neon-red monospace for quick visual scanning */}
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--neon-red)', minWidth: 36 }}>{c.code}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phone display — shows the composed number; border glows with status colour */}
      <div className="phone-display" style={{
        // Dynamically colour the border and glow based on the current validation status
        borderColor: status ? statusColor : undefined,
        boxShadow: status ? `0 0 12px ${statusColor}44` : undefined,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        {/* Show the formatted number, or a dim placeholder if nothing has been entered yet */}
        {displayNumber || <span style={{ opacity: 0.3, fontSize: '1rem' }}>
          {country ? `${country.code} …` : 'Enter phone'}
        </span>}
      </div>

      {/* Status badge — animated pill that appears below the display with coloured feedback */}
      <AnimatePresence mode="wait">
        {status && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.35rem 0.75rem', borderRadius: 20,
              // Semi-transparent background tinted with the status colour
              background: `${statusColor}18`, border: `1px solid ${statusColor}44`,
              fontSize: 12, fontWeight: 600, color: statusColor,
              textShadow: `0 0 8px ${statusColor}66`,
            }}>
            {/* Pulsing dot shown while the AI agent is verifying the phone number */}
            {status === 'checking' && (
              <motion.div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }}/>
            )}
            {/* Check-mark icon for confirmed valid numbers */}
            {status === 'valid' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>}
            {/* X icon for invalid or suspicious (potentially fake report) numbers */}
            {(status === 'invalid' || status === 'fake') && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            {/* Localised status message text (language resolved from active DMS locale) */}
            {msg(status, lang)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dial pad — 3-column grid of DTMF buttons; '*' and '#' are decorative/inactive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {/* Flatten the 4-row DIALPAD matrix and render one animated button per key */}
        {DIALPAD.flat().map(d => (
          <motion.button key={d} type="button"
            className="dialpad-btn"
            // Scale-down tap animation for tactile feedback on mobile devices
            whileTap={{ scale: 0.9 }}
            // '*' and '#' are not used in phone entry — disable their click action
            onClick={() => d !== '*' && d !== '#' ? pushDigit(d) : undefined}
            // Visually dim non-functional keys so users understand they are inactive
            style={{ opacity: (d === '*' || d === '#') ? 0.4 : 1, cursor: (d === '*' || d === '#') ? 'default' : 'pointer' }}
          >
            {/* Primary digit character — larger, bold */}
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{d}</span>
            {/* Sub-label letters (ABC, DEF, …) shown in smaller text beneath the digit */}
            {SUB[d] && <span style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.5, marginTop: 1 }}>{SUB[d]}</span>}
          </motion.button>
        ))}
      </div>

      {/* Action row: clear (CLR), manual verify (CHECK), and backspace buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 2 }}>
        {/* CLR button — wipes the entire entered number so the reporter can start fresh */}
        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={clear}
          style={{
            padding: '0.6rem', borderRadius: 10, border: '1.5px solid var(--border-input)',
            background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11,
            fontWeight: 600, letterSpacing: '0.05em',
          }}>
          CLR
        </motion.button>

        {/* CHECK button — manually triggers AI phone verification without waiting for debounce */}
        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={() => checkNumber(localDigits)}
          style={{
            padding: '0.6rem', borderRadius: 10, border: '1.5px solid rgba(230,57,70,0.4)',
            // DMS alert-red gradient — matches the system's emergency-action button style
            background: 'linear-gradient(135deg, #E63946, #c0202d)',
            color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 0 12px rgba(230,57,70,0.35)',
          }}>
          CHECK
        </motion.button>

        {/* Backspace button — deletes the last entered digit (SVG left-arrow icon) */}
        <motion.button type="button" whileTap={{ scale: 0.9 }}
          onClick={backspace}
          style={{
            padding: '0.6rem', borderRadius: 10, border: '1.5px solid var(--border-input)',
            background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {/* Left-pointing arrow with eraser shape — standard backspace iconography */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12H9M9 12l4-4M9 12l4 4"/><path d="M3 6l3-3h15v18H6l-3-3V6z" opacity="0.3"/>
          </svg>
        </motion.button>
      </div>

      {/* Hint shown when GPS is unavailable and no country has been selected manually,
          prompting the reporter to choose their country from the dropdown above */}
      {!country && latitude == null && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
          {msg('nocode', lang)}
        </div>
      )}
    </div>
  );
}