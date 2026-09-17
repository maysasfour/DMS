/**
 * Register.jsx — Public citizen registration page for the Disaster Management System (DMS).
 *
 * Allows new users (citizens, community members) to create a DMS account so they can
 * report incidents, receive emergency alerts, track disaster resources, and coordinate
 * with response teams. Implements a split-panel layout: a branded left panel with
 * feature highlights and a right panel containing the registration form.
 *
 * Features:
 *  - Full-name, email, phone, and password fields with real-time validation
 *  - Password strength meter to encourage secure credentials for sensitive DMS access
 *  - Confirm-password mismatch detection before form submission
 *  - Terms-of-service agreement gate (required for DMS data policy compliance)
 *  - Animated success audio cue on successful registration
 *  - Multilingual support via react-i18next (Arabic, English, French, Spanish, Turkish)
 *  - Neon cyberpunk theme using CSS custom properties (--bg-primary, --text-primary, etc.)
 *  - Redirects to /login?registered=1 on success so the login page can show a welcome message
 */

// React core and state hook for managing form fields, UI toggles, and async state
import React, { useState } from 'react';
// Link for client-side navigation to /login; useNavigate for programmatic redirect after registration
import { Link, useNavigate } from 'react-router-dom';
// motion for animated form entrance and button press feedback; AnimatePresence for error fade in/out
import { motion, AnimatePresence } from 'framer-motion';
// useTranslation hook provides t() for all user-facing strings — supports DMS multilingual requirements
import { useTranslation } from 'react-i18next';
// authAPI wraps the DMS backend's /auth/register endpoint to create a new citizen account
import { authAPI } from '../services/api';

/**
 * BI — Lightweight wrapper around Bootstrap Icons (<i class="bi bi-{name}">).
 * Used throughout the registration page for consistent iconography (shields, locks, etc.).
 * @param {string} name - Bootstrap Icon name (e.g. "shield-exclamation", "lock-fill")
 * @param {string} className - Additional Tailwind or utility classes for sizing/color
 */
const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;

/**
 * playSuccessSound — Plays a short ascending tone using the Web Audio API
 * to give audible feedback when a new DMS citizen account is created successfully.
 * Uses a sine oscillator ramped from 880 Hz to 1400 Hz over 350 ms.
 * Wrapped in try/catch so audio failures never block the registration flow.
 */
function playSuccessSound() {
  try {
    // Create a new audio context; fall back to webkit prefix for Safari compatibility
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Oscillator node generates the tone waveform
    const osc = ctx.createOscillator();
    // Gain node controls the volume envelope so the sound fades out gracefully
    const gain = ctx.createGain();
    // Route audio: oscillator → gain → speaker output
    osc.connect(gain); gain.connect(ctx.destination);
    // Sine wave gives a clean, pleasant "success" chime (not harsh like square/sawtooth)
    osc.type = 'sine';
    // Start at 880 Hz (A5) then sweep up to 1400 Hz for a rising "success" feel
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.2);
    // Start at moderate volume then exponentially fade to near-silence over 350 ms
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    // Play and auto-stop the tone after 350 ms
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch (_) {
    // Silently swallow errors — audio is an enhancement, not a requirement
  }
}

/**
 * STRENGTH_LEVELS — Ordered array defining the four password strength tiers.
 * Each level maps a i18n key (displayed to the user), a color (shown on the strength bar),
 * and a minimum score threshold. Used by getStrength() and the strength bar UI to guide
 * DMS users toward stronger passwords that protect sensitive emergency account data.
 */
const STRENGTH_LEVELS = [
  { key: 'strength_short',  color: '#E63946', min: 0  }, // Red — password too short (<6 chars)
  { key: 'strength_weak',   color: '#FF7A00', min: 6  }, // Orange — length OK but lacks complexity
  { key: 'strength_fair',   color: '#f59e0b', min: 8  }, // Amber — moderate; meets minimum DMS policy
  { key: 'strength_strong', color: '#059669', min: 10 }, // Green — strong; recommended for DMS accounts
];

/**
 * getStrength — Scores a password on a 0–3 scale based on length and character diversity.
 * Returns -1 when no password is entered (hides the strength bar entirely).
 * Returns 0 when the password is critically short (forced "too short" label).
 * Scores 1–3 based on cumulative bonus points earned for length thresholds,
 * uppercase letters, digits, and special characters.
 *
 * @param {string} pw - The password string to evaluate
 * @returns {number} Strength index (−1 = empty, 0 = short, 1 = weak, 2 = fair, 3 = strong)
 */
function getStrength(pw) {
  // No input yet — return sentinel so the UI hides the strength bar
  if (!pw) return -1;
  let score = 0;
  // +1 for meeting the minimum 8-character DMS password policy
  if (pw.length >= 8)  score++;
  // Additional +1 for longer passwords (12+ chars) which resist brute-force attacks
  if (pw.length >= 12) score++;
  // +1 for including at least one uppercase letter (character class diversity)
  if (/[A-Z]/.test(pw)) score++;
  // +1 for including at least one digit
  if (/[0-9]/.test(pw)) score++;
  // +1 for including at least one special character (symbols, punctuation, etc.)
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  // Override: anything under 6 chars is classified as critically short regardless of score
  if (pw.length < 6) return 0;
  // Map cumulative score to the three non-short tiers
  if (score <= 1) return 1; // Weak — only one complexity criterion met
  if (score <= 3) return 2; // Fair — two or three criteria met
  return 3;                  // Strong — four or five criteria met
}

/**
 * Register — Main page component for new DMS citizen account creation.
 * Renders a responsive split-panel layout. On desktop (lg+) the left panel
 * presents DMS branding and feature highlights; the right panel contains the form.
 * On mobile both panels collapse into a single centered form with a compact logo.
 */
export default function Register() {
  // useNavigate provides programmatic redirect to /login after successful registration
  const navigate = useNavigate();
  // t() translates all user-visible strings for DMS multilingual support (ar/en/es/fr/tr)
  const { t } = useTranslation();

  /**
   * form — Controlled state object holding all registration field values.
   * Kept as a single object so a single handleChange handler updates any field by name.
   * phoneNumber is optional; it enables SMS alerts for incident notifications.
   */
  const [form, setForm] = useState({
    firstName:       '',  // Citizen's given name — displayed in the DMS dashboard profile
    lastName:        '',  // Citizen's family name
    email:           '',  // Primary login credential and notification address
    password:        '',  // Account password — evaluated by getStrength() in real time
    confirmPassword: '',  // Re-entry of password to catch typos before submission
    phone:           '',  // Optional phone number for emergency SMS contact
  });

  // showPw — toggles password field visibility so users can verify what they typed
  const [showPw, setShowPw]   = useState(false);
  // showCpw — toggles confirm-password field visibility independently from showPw
  const [showCpw, setShowCpw] = useState(false);
  // loading — true while the registration API call is in-flight; disables the submit button
  const [loading, setLoading] = useState(false);
  // error — stores the user-facing error message (API errors, validation failures, etc.)
  const [error, setError]     = useState('');
  // agreed — tracks whether the user has accepted the DMS data policy terms of service
  const [agreed, setAgreed]   = useState(false);

  /**
   * handleChange — Generic onChange handler for all text/tel/email input fields.
   * Spreads existing form state and overwrites only the changed field using e.target.name,
   * then clears any previous error so stale messages don't mislead the user.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // Clear error on any field change to give the user a clean slate
  };

  /**
   * handleSubmit — Async form submission handler for DMS citizen registration.
   * Validates passwords match and terms are agreed before calling the backend.
   * On success: plays the audio cue and redirects to /login?registered=1.
   * On failure: displays the API error message or a generic fallback.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submit event
   */
  const handleSubmit = async (e) => {
    // Prevent default HTML form submission which would cause a full page reload
    e.preventDefault();
    // Client-side guard: confirm passwords match before sending data to the backend
    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }
    // Terms-of-service gate: required by the DMS emergency services data policy
    if (!agreed) {
      setError(t('auth.terms_agree') + ' ' + t('auth.terms_link'));
      return;
    }
    // Show loading spinner and clear any residual error message
    setLoading(true);
    setError('');
    try {
      // Call the DMS backend /auth/register endpoint with the citizen's profile data
      await authAPI.register({
        firstName:   form.firstName,
        lastName:    form.lastName,
        email:       form.email,
        password:    form.password,
        // Only include phoneNumber if provided — it's optional in the DMS user schema
        phoneNumber: form.phone || undefined,
      });
      // Play success chime to confirm the account was created
      playSuccessSound();
      // Redirect to login page with a query flag so it can display a "welcome" banner
      navigate('/login?registered=1');
    } catch (err) {
      // Show the server's error message (e.g. "Email already in use") or a safe fallback
      setError(err.response?.data?.message || t('auth.register_error'));
    } finally {
      // Always re-enable the submit button whether the call succeeded or failed
      setLoading(false);
    }
  };

  // Compute real-time password strength index to drive the strength bar UI
  const strength = getStrength(form.password);

  // Shared Tailwind class string for all text input fields — ensures visual consistency
  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all";

  // Shared inline style for all inputs — uses DMS CSS variables to respect the theme (dark/light)
  const inputStyle = {
    background: 'var(--bg-secondary)',
    color:      'var(--text-primary)',
    border:     '1.5px solid var(--border-input)',
  };

  // focusRed — highlights the active input with the DMS danger/accent red on focus
  const focusRed = (e) => (e.target.style.borderColor = '#E63946');
  // blurGray — restores the neutral border color when focus leaves an input
  const blurGray  = (e) => (e.target.style.borderColor = 'var(--border-input)');

  return (
    // Full-viewport container with horizontal split layout (left panel + right form)
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT BRANDING PANEL ──────────────────────────────────────────────────────
          Visible only on large screens (lg:flex). Shows the DMS logo, a dark
          gradient background with a subtle disaster-scene photo overlay, a grid
          texture, a list of registration benefits, and a data-protection notice.  */}
      <div className="hidden lg:flex lg:w-2/5 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060d1a 0%, #0E2A47 60%, #1a1a2e 100%)' }}>

        {/* Faint background photo of a disaster/emergency scene for contextual atmosphere */}
        <div className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=75&auto=format&fit=crop')" }} />

        {/* Dark overlay on top of the photo to keep text legible against the gradient */}
        <div className="absolute inset-0" style={{ background: 'rgba(6,13,26,0.7)' }} />

        {/* Subtle grid texture overlay for the DMS neon cyberpunk visual identity */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* DMS logo mark and system name — positioned above the benefit list */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            {/* Shield-exclamation icon badge — visually represents emergency/disaster management */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 0 24px rgba(230,57,70,0.5)' }}>
              <BI name="shield-exclamation" className="text-white text-lg" />
            </div>
            {/* DMS acronym in bold white with wide letter-spacing for brand recognition */}
            <span className="text-white font-black text-xl" style={{ letterSpacing: '0.15em' }}>DMS</span>
          </div>
          {/* Full system name subtitle below the logo */}
          <p className="text-white/40 text-xs tracking-widest uppercase">Disaster Management System</p>
        </div>

        {/* Registration benefit list — explains what citizens gain by joining DMS */}
        <div className="relative z-10">
          {/* Section heading translated via i18n */}
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-bold">{t('auth.why_register')}</p>

          {/* Four core DMS value propositions: location tracking, alerts, community, incident tracking */}
          {[
            { icon: 'geo-alt-fill',      key: 'why_location' }, // Real-time incident location sharing
            { icon: 'bell-fill',         key: 'why_alerts'   }, // Emergency push / SMS alerts
            { icon: 'people-fill',       key: 'why_connect'  }, // Connection with responder teams
            { icon: 'clipboard2-check',  key: 'why_track'    }, // Incident status tracking
          ].map(({ icon, key }) => (
            // Each benefit row: colored icon badge + translated description
            <div key={icon} className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.25)' }}>
                <BI name={icon} className="text-red-400 text-sm" />
              </div>
              {/* Benefit description text pulled from i18n locale files */}
              <p className="text-white/60 text-sm leading-relaxed">{t(`auth.${key}`)}</p>
            </div>
          ))}
        </div>

        {/* Data protection notice — reassures users their personal emergency data is secure */}
        <div className="relative z-10 p-4 rounded-xl"
          style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)' }}>
          <p className="text-white/70 text-xs leading-relaxed">
            <BI name="shield-lock-fill" className="text-red-400 me-1" />
            Your data is protected under our emergency services data policy. Access is strictly controlled.
          </p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────────────────────
          Full-width on mobile, 60% width on desktop. Contains the registration form
          with all citizen account fields, password strength feedback, and submit CTA. */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Top accent bar — thin gradient stripe matching the DMS danger/warning color ramp */}
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #E63946, #FF7A00, #E63946)' }} />

        {/* Constrained form card — max-w-sm keeps the form readable on large screens */}
        <div className="w-full max-w-sm py-8">

          {/* Mobile-only DMS logo — hidden on lg+ where the left panel shows the logo instead */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <BI name="shield-exclamation" className="text-white" />
            </div>
            <span className="font-black text-lg tracking-widest" style={{ color: 'var(--text-primary)' }}>DMS</span>
          </div>

          {/* Animated form container — slides up and fades in on mount for a polished first impression */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Page heading and subtitle explaining the registration context */}
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('auth.create_account')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              {t('auth.register_subtitle')}
            </p>

            {/* AnimatePresence — enables the error banner to animate out when it is dismissed */}
            <AnimatePresence>
              {error && (
                // Error banner: slides in when set, fades out when cleared
                <motion.div key="err"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', color: '#E63946' }}>
                  {/* Warning icon for visual prominence of the error state */}
                  <BI name="exclamation-octagon-fill" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Registration form — all fields are controlled via the form state object */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Name Row ── Two-column grid so first and last name sit side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* First name — required; used in DMS profile display and alert salutations */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    {t('auth.first_name')} <span style={{ color: '#E63946' }}>*</span>
                  </label>
                  <input type="text" name="firstName" required className={inputCls} style={inputStyle}
                    value={form.firstName} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.first_name')} />
                </div>
                {/* Last name — required; completes the citizen's full identity in the DMS */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    {t('auth.last_name')} <span style={{ color: '#E63946' }}>*</span>
                  </label>
                  <input type="text" name="lastName" required className={inputCls} style={inputStyle}
                    value={form.lastName} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.last_name')} />
                </div>
              </div>

              {/* ── Email Field ── Primary credential and notification address for DMS alerts */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="envelope-fill" className="me-1" /> {t('auth.email')} <span style={{ color: '#E63946' }}>*</span>
                </label>
                {/* type="email" enables browser-native format validation before form submission */}
                <input type="email" name="email" required className={inputCls} style={inputStyle}
                  value={form.email} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                  placeholder={t('auth.email_placeholder')} autoComplete="email" />
              </div>

              {/* ── Phone Field ── Optional; used for SMS emergency alerts and incident notifications */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="telephone-fill" className="me-1" /> {t('auth.phone')}
                  {/* No asterisk — phone is optional in the DMS registration schema */}
                </label>
                {/* type="tel" triggers the numeric keyboard on mobile devices */}
                <input type="tel" name="phone" className={inputCls} style={inputStyle}
                  value={form.phone} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                  placeholder={t('profile.phone_placeholder', '+962 7X XXX XXXX')} />
              </div>

              {/* ── Password Field ── With real-time strength meter and show/hide toggle */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> {t('auth.password')} <span style={{ color: '#E63946' }}>*</span>
                </label>
                {/* Relative container positions the show/hide eye button inside the input */}
                <div className="relative">
                  {/* showPw toggles between text and password type so users can verify their entry */}
                  <input type={showPw ? 'text' : 'password'} name="password" required minLength={8}
                    className={`${inputCls} pe-12`} style={inputStyle}
                    value={form.password} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.password_placeholder')}
                    autoComplete="new-password" /* Hints to password managers this is a new credential */ />
                  {/* Show/hide toggle button — tabIndex=-1 keeps keyboard tab order on the form fields */}
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                    style={{ color: 'var(--text-tertiary)' }}>
                    {/* Eye/eye-slash icon reflects the current visibility state */}
                    <BI name={showPw ? 'eye-slash' : 'eye'} />
                  </button>
                </div>

                {/* ── Password Strength Bar ── Only visible once the user starts typing */}
                {form.password.length > 0 && (
                  <div className="mt-1.5">
                    {/* Four segment bar — filled segments up to the current strength level */}
                    <div className="flex gap-1 mb-0.5">
                      {[0, 1, 2, 3].map(i => (
                        // Each segment lights up in the tier color if i <= current strength
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: i <= strength ? STRENGTH_LEVELS[strength]?.color || '#059669' : 'var(--border-primary)' }} />
                      ))}
                    </div>
                    {/* Textual strength label (e.g. "Too short", "Weak", "Fair", "Strong") */}
                    <p className="text-xs" style={{ color: STRENGTH_LEVELS[strength]?.color || '#6b7280' }}>
                      {t(`auth.${STRENGTH_LEVELS[strength]?.key}`)}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Confirm Password Field ── Validates that both passwords match before submission */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> {t('auth.confirm_password')} <span style={{ color: '#E63946' }}>*</span>
                </label>
                <div className="relative">
                  {/* Border turns red in real time if confirmPassword doesn't match password */}
                  <input type={showCpw ? 'text' : 'password'} name="confirmPassword" required
                    className={`${inputCls} pe-12`} style={{
                      ...inputStyle,
                      // Inline mismatch highlight: overrides the default border color when passwords differ
                      borderColor: form.confirmPassword && form.password !== form.confirmPassword
                        ? '#E63946'
                        : 'var(--border-input)',
                    }}
                    value={form.confirmPassword} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.confirm_password')} autoComplete="new-password" />
                  {/* Independent eye toggle for the confirm field so it can be revealed separately */}
                  <button type="button" tabIndex={-1} onClick={() => setShowCpw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <BI name={showCpw ? 'eye-slash' : 'eye'} />
                  </button>
                </div>
                {/* Inline mismatch error — shown as soon as the user starts typing in the confirm field */}
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#E63946' }}>
                    <BI name="x-circle-fill" className="me-1" /> {t('auth.passwords_no_match')}
                  </p>
                )}
              </div>

              {/* ── Terms of Service Checkbox ──
                  Citizens must accept the DMS data policy before creating an account.
                  This is enforced both here (UI gate) and in handleSubmit (JS guard).  */}
              <label className="flex items-start gap-2 cursor-pointer">
                {/* accent-red-600 styles the native checkbox with the DMS brand color */}
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-red-600 w-4 h-4 flex-shrink-0" />
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {/* Terms agreement text split across i18n keys for flexible per-language formatting */}
                  {t('auth.terms_agree')}{' '}
                  <span className="font-semibold" style={{ color: '#E63946' }}>{t('auth.terms_link')}</span>{' '}
                  {t('auth.terms_note')}
                </span>
              </label>

              {/* ── Submit Button ──
                  Disabled while the API call is in-flight or if terms haven't been accepted.
                  Shows a spinner + progress label during loading; the standard CTA otherwise. */}
              <motion.button
                type="submit"
                // Prevent double-submission and block unaccepted-terms submissions
                disabled={loading || !agreed}
                // Subtle scale hover/tap animations for tactile button feel
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 4px 20px rgba(230,57,70,0.3)' }}
              >
                {loading ? (
                  // Loading state: animated spinner SVG + in-progress label
                  <>
                    {/* Tailwind animate-spin rotates the SVG to indicate async work in progress */}
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('auth.creating')}
                  </>
                ) : (
                  // Default state: person-plus icon + "Create Account" call to action
                  <><BI name="person-plus-fill" /> {t('auth.create_account')}</>
                )}
              </motion.button>
            </form>

            {/* ── Login Link ── Directs existing DMS citizens back to the login page */}
            <p className="text-center text-xs mt-5" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.already_registered')}{' '}
              {/* React Router Link — client-side navigation avoids a full page reload */}
              <Link to="/login" className="font-bold hover:underline" style={{ color: '#E63946' }}>
                {t('auth.login')} <BI name="arrow-right" />
              </Link>
            </p>

          </motion.div>
        </div>
      </div>
    </div>
  );
}