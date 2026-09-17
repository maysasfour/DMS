/**
 * Login.jsx — Citizen / Public User Login Page for the Disaster Management System (DMS)
 *
 * This page serves as the primary authentication entry point for citizens and public users
 * accessing the DMS portal. It supports credential-based login (email + password) as well
 * as OAuth 2.0 social login via Google and Facebook, enabling rapid onboarding during
 * emergency situations. Upon successful authentication, users are routed to the main
 * dashboard where they can report incidents, track alerts, and access resources.
 *
 * Staff roles (Admin, Team, Officer) are directed to their dedicated portals via quick-links
 * shown at the bottom of the form.
 *
 * Design: Neon cyberpunk split-screen layout — left panel is a decorative hero with animated
 * radar rings and real-time system statistics; right panel contains the login form.
 */

// React core and hooks for state, side effects, and DOM refs
import React, { useState, useEffect, useRef } from 'react';
// React Router utilities: Link for navigation, useNavigate for programmatic redirect,
// useSearchParams to read ?registered=1 after a successful registration flow
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// Framer Motion for animated entrance effects, scan beams, radar rings, and corner brackets
import { motion, AnimatePresence } from 'framer-motion';
// i18n hook: provides t() for translating UI strings into the user's selected language
import { useTranslation } from 'react-i18next';
// Google OAuth button component — initiates Google sign-in flow for DMS citizen login
import { GoogleLogin } from '@react-oauth/google';
// DMS API service layer — wraps Axios calls to the Spring Boot auth endpoints
import { authAPI } from '../services/api';
// Zustand global auth store — persists the authenticated user and JWT token across the app
import { useAuthStore } from '../store';
// Language switcher component rendered in the top-right corner for accessibility
import LangSwitcher from '../components/LangSwitcher';

/**
 * BI — Bootstrap Icons shorthand component.
 * Renders a <i> element with the Bootstrap Icons CSS class for the given icon name.
 * Used throughout the page to avoid repeating the "bi bi-" prefix.
 * @param {string} name - Bootstrap icon identifier (e.g. "shield-exclamation")
 * @param {string} className - Additional Tailwind/CSS classes for sizing or color
 */
const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;


/**
 * playSuccessSound — Plays a short ascending tone when login succeeds.
 * Uses the Web Audio API to generate a sine wave sweep from 880 Hz to 1200 Hz,
 * providing auditory feedback that confirms a user has authenticated and been granted
 * access to the DMS dashboard. Silently catches errors in restricted audio contexts.
 */
function playSuccessSound() {
  try {
    // Create an AudioContext, falling back to webkit prefix for older Safari versions
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Oscillator produces the tone; GainNode controls volume fade-out
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    // Route signal: oscillator → gain → speakers
    osc.connect(gain); gain.connect(ctx.destination);
    // Sine wave produces a clean, pleasant confirmation tone
    osc.type = 'sine';
    // Start at 880 Hz (A5) and ramp up to 1200 Hz over 150 ms — upward sweep = success
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    // Set initial volume at 25% then fade to near-silence over 300 ms
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    // Play the tone for 300 ms
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (_) {} // Silently ignore if AudioContext is unavailable or blocked by browser policy
}

/**
 * playErrorSound — Plays a short descending harsh tone when login fails.
 * Uses the Web Audio API to generate a sawtooth wave sweep from 200 Hz to 100 Hz,
 * providing a distinct audio cue for authentication errors (wrong credentials,
 * account blocked, server unreachable) so responders are immediately alerted.
 */
function playErrorSound() {
  try {
    // Create an AudioContext, falling back to webkit prefix for older Safari versions
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Oscillator produces the tone; GainNode controls volume fade-out
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    // Route signal: oscillator → gain → speakers
    osc.connect(gain); gain.connect(ctx.destination);
    // Sawtooth wave produces a harsh, buzzing tone suitable for errors/alerts
    osc.type = 'sawtooth';
    // Start at 200 Hz and ramp down to 100 Hz — descending sweep = failure/warning
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
    // Set initial volume at 20% then fade to near-silence over 300 ms
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    // Play the error tone for 300 ms
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (_) {} // Silently ignore if AudioContext is unavailable or blocked by browser policy
}

/**
 * Login — Main public login page component for the DMS citizen portal.
 * Renders a split-screen layout: a decorative neon hero panel on the left (desktop)
 * and an authentication form on the right. Handles credential login, Google OAuth,
 * and Facebook OAuth flows, then redirects authenticated users to the DMS dashboard.
 */
export default function Login() {
  // useNavigate hook — used to redirect to /layout/dashboard after successful authentication
  const navigate = useNavigate();
  // Read query parameters: ?registered=1 is appended after a citizen self-registers
  const [params] = useSearchParams();
  // Zustand auth store action — persists the user object and JWT token globally
  const { login } = useAuthStore();
  // i18n translation function — localizes all visible text for multilingual DMS users
  const { t } = useTranslation();
  // Form state: tracks email and password inputs before submission to the auth API
  const [form, setForm] = useState({ email: '', password: '' });
  // Toggle to reveal/hide the password field — improves usability under stress
  const [showPw, setShowPw] = useState(false);
  // Loading flag: disables the submit button and shows a spinner during API calls
  const [loading, setLoading] = useState(false);
  // Error message: displayed in the red banner for failed logins (wrong credentials, blocked)
  const [error, setError] = useState('');
  // Success message: pre-populated when redirected here after a successful citizen registration
  const [success, setSuccess] = useState(params.get('registered') === '1' ? t('auth.register_success') : '');
  // Ref to the email input — used to auto-focus on mount for faster login during emergencies
  const emailRef = useRef(null);

  // Auto-focus the email field on component mount so users can start typing immediately
  useEffect(() => {
    emailRef.current?.focus();
  }, []); // Empty dependency array — runs once after the component is first rendered

  // Facebook SDK — dynamically injects the Facebook JavaScript SDK into the page head
  // only when a Facebook App ID is configured in the environment (.env: VITE_FACEBOOK_APP_ID)
  useEffect(() => {
    // Read the Facebook App ID from Vite environment variables (set in .env)
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
    // Skip SDK injection entirely if Facebook login is not configured for this DMS deployment
    if (!fbAppId) return;

    // fbAsyncInit is the Facebook SDK's global callback — called once the SDK script loads
    window.fbAsyncInit = function () {
      // Initialize the Facebook SDK with the DMS app credentials
      // cookie: true enables cookie-based session support; xfbml: false disables social plugins
      window.FB.init({ appId: fbAppId, cookie: true, xfbml: false, version: 'v19.0' });
    };

    // Only inject the SDK script if it hasn't already been added to the DOM
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk'; // ID prevents duplicate injection on re-renders
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      // async + defer ensure the SDK loads without blocking the login form render
      script.async = true; script.defer = true;
      document.head.appendChild(script);
    }
  }, []); // Empty dependency array — runs once on mount

  /**
   * handleOAuthLogin — Handles social login (Google or Facebook) for DMS citizens.
   * Sends the provider's OAuth token to the DMS backend, which validates it and
   * returns a DMS JWT token and user profile. On success, stores credentials and
   * navigates to the dashboard. On failure, shows the error banner.
   * @param {string} provider - OAuth provider name: 'google' or 'facebook'
   * @param {string} token - ID token (Google) or access token (Facebook) from the provider
   */
  const handleOAuthLogin = async (provider, token) => {
    // Show loading state and clear any previous error before making the API call
    setLoading(true); setError('');
    try {
      // POST to DMS backend: exchange the social token for a DMS JWT and user profile
      const { data: body } = await authAPI.oauthLogin(provider, token);
      // Normalize the response — some endpoints wrap data in a "data" envelope
      const userData = body?.data || body;
      // Build a normalized DMS user object from the OAuth profile returned by the backend
      const user = {
        id: userData.id,                 // DMS internal user ID
        email: userData.email,           // User's email from the OAuth provider
        firstName: userData.firstName,   // First name for personalized dashboard greeting
        lastName: userData.lastName,     // Last name for display and profile
        // Full display name: combines firstName + lastName, trimmed to remove extra spaces
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        // Extract the primary role, stripping the Spring Security "ROLE_" prefix
        // Defaults to CITIZEN if no roles are returned (most common DMS public user role)
        role: Array.isArray(userData.roles) ? userData.roles[0].replace(/^ROLE_/, '') : 'CITIZEN',
        avatarUrl: userData.avatarUrl,   // Profile picture URL for the DMS user avatar
      };
      // Play ascending tone to confirm successful social authentication
      playSuccessSound();
      // Persist user object and JWT token in Zustand store and localStorage
      await login(user, userData.token);
      // Redirect to the DMS main dashboard where incidents and alerts are visible
      navigate('/layout/dashboard');
    } catch (err) {
      // Play error tone to immediately alert the user that social login failed
      playErrorSound();
      // Show the backend error message, or a generic provider-specific fallback
      setError(err.response?.data?.message || `${provider} login failed. Please try again.`);
    } finally { setLoading(false); } // Always restore the button/form to an interactive state
  };

  /**
   * handleSubmit — Handles credential-based login form submission.
   * Sends the email and password to the DMS authentication endpoint. On success,
   * normalizes the user profile, stores the JWT, and redirects to the dashboard.
   * Provides granular error messages for rate limiting, blocked accounts, wrong
   * credentials, and server connectivity issues.
   * @param {React.FormEvent} e - The form submission event (prevents default page reload)
   */
  const handleSubmit = async (e) => {
    // Prevent the browser from reloading the page on form submission
    e.preventDefault(); setLoading(true); setError('');
    try {
      // POST credentials to the DMS backend auth endpoint and receive a JWT + user profile
      const { data: body } = await authAPI.login(form.email, form.password);
      // Normalize the response — accounts for both wrapped {"data": ...} and flat responses
      const userData = body?.data || body;
      // Build the DMS user object from the credential login response
      const user = {
        id: userData.id,               // DMS internal user ID for subsequent API calls
        email: userData.email,         // Email used as the user's unique identifier in DMS
        firstName: userData.firstName, // First name shown in the dashboard header
        lastName: userData.lastName,   // Last name for full profile display
        // Normalize role: extract from roles array or role field, strip "ROLE_" Spring prefix
        // Supports both array format (["ROLE_CITIZEN"]) and string format ("CITIZEN")
        role: (() => {
          const raw = Array.isArray(userData.roles) ? userData.roles[0] : (userData.role || 'CITIZEN');
          return typeof raw === 'string' ? raw.replace(/^ROLE_/, '') : raw;
        })(),
        avatarUrl: userData.avatarUrl, // Profile photo for the DMS user avatar widget
      };
      // Play ascending confirmation tone on successful credential authentication
      playSuccessSound();
      // Persist authenticated user and JWT in Zustand store and localStorage for session persistence
      await login(user, userData.token);
      // Navigate to the DMS dashboard — incident map, alerts, and resources become accessible
      navigate('/layout/dashboard');
    } catch (err) {
      // Play descending error tone to alert user that login attempt failed
      playErrorSound();
      // Extract HTTP status code to provide specific, actionable error messages
      const status = err.response?.status;
      // Extract the error message from the backend response body if available
      const msg = err.response?.data?.message;
      if (status === 429) setError(t('auth.rate_limit'));          // Too many failed attempts — brute force protection
      else if (status === 403) setError(t('auth.access_blocked')); // Account suspended or role-restricted
      else if (status === 401 || msg?.toLowerCase().includes('credentials') || msg?.toLowerCase().includes('password'))
        setError(t('auth.invalid_credentials')); // Wrong email or password — most common login failure
      else if (!err.response) setError(t('auth.no_server')); // Network error — DMS backend unreachable
      else setError(msg || t('auth.invalid_credentials')); // Unexpected backend error with optional message
    } finally { setLoading(false); } // Always re-enable the form so the user can retry
  };

  return (
    // Outer container: full-screen flexbox layout, LTR enforced to prevent RTL breaking the split-screen
    <div className="min-h-screen flex overflow-hidden" dir="ltr" style={{ fontFamily: "'Inter', sans-serif", background: 'var(--bg-primary)' }}>

      {/* ── LEFT PANEL — neon cyberpunk hero (desktop only) ── */}
      {/* Visible only on large screens (lg:flex); hidden on mobile to maximize form space */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #000000 0%, #050505 50%, #0a0000 100%)' }}>

        {/* Hex grid — subtle SVG hexagon pattern overlaid on the hero background for cyberpunk texture */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
          <defs>
            {/* Repeating hexagon tile: 60×52 units, red stroke, no fill — creates a radar-style grid */}
            <pattern id="hexlogin" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke="#E63946" strokeWidth="0.8"/>
            </pattern>
          </defs>
          {/* Fill the entire left panel with the repeating hex pattern */}
          <rect width="100%" height="100%" fill="url(#hexlogin)"/>
        </svg>

        {/* Scan beam — animated horizontal cyan line sweeping top-to-bottom, simulating a radar sweep
            Communicates real-time monitoring activity in the DMS system */}
        <motion.div className="absolute left-0 right-0 pointer-events-none"
          style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)' }}
          animate={{ top: ['-2px', '100%'] }}       // Sweeps from above the panel to the bottom
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }} // Continuous loop at 4s per sweep
        />

        {/* Radar rings — three concentric pulsing circles centered on the panel,
            evoking an emergency broadcast or incident detection radar visualization */}
        {[140, 260, 380].map((size, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: size, height: size, top: '50%', left: '50%',
              // Offset by half the ring size to perfectly center each ring
              marginTop: -size/2, marginLeft: -size/2, border: '1px solid rgba(230,57,70,0.15)' }}
            // Pulse scale and opacity to simulate an outward radar signal broadcast
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.15, 0.5] }}
            // Stagger each ring's pulse by 0.9s so they ripple outward in sequence
            transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.9 }} />
        ))}

        {/* Corner brackets — four L-shaped red brackets at panel corners, HUD/targeting-reticle style
            Reinforces the command-center aesthetic for the DMS emergency response interface */}
        {[
          { top: 16, left: 16,  borderTop: '2px solid rgba(230,57,70,0.6)', borderLeft: '2px solid rgba(230,57,70,0.6)' },   // Top-left bracket
          { top: 16, right: 16, borderTop: '2px solid rgba(230,57,70,0.6)', borderRight: '2px solid rgba(230,57,70,0.6)' },  // Top-right bracket
          { bottom: 16, left: 16,  borderBottom: '2px solid rgba(230,57,70,0.6)', borderLeft: '2px solid rgba(230,57,70,0.6)' },  // Bottom-left bracket
          { bottom: 16, right: 16, borderBottom: '2px solid rgba(230,57,70,0.6)', borderRight: '2px solid rgba(230,57,70,0.6)' }, // Bottom-right bracket
        ].map((s, i) => (
          // Each bracket fades in with a slight stagger for a dramatic startup sequence effect
          <motion.div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}/>
        ))}

        {/* Logo — DMS brand mark in the top-left of the hero panel */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            {/* Animated shield icon: pulsing red glow conveys active emergency monitoring */}
            <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
              animate={{ boxShadow: ['0 0 20px rgba(230,57,70,0.5)', '0 0 40px rgba(230,57,70,0.8)', '0 0 20px rgba(230,57,70,0.5)'] }}
              transition={{ duration: 2, repeat: Infinity }}>
              {/* Shield with exclamation mark — DMS emergency branding icon */}
              <BI name="shield-exclamation" className="text-white text-lg" />
            </motion.div>
            {/* "DMS" wordmark with wide letter-spacing and subtle red text shadow */}
            <span className="text-white font-black text-xl" style={{ letterSpacing: '0.18em', textShadow: '0 0 20px rgba(230,57,70,0.5)' }}>DMS</span>
          </div>
          {/* System full name in monospace cyan, styled as a technical readout label */}
          <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Disaster Management System
          </p>
        </div>

        {/* Center content — mission tagline and system description for the DMS hero */}
        <div className="relative z-10 text-center">
          {/* Fade-in + slide-up animation for the tagline block */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {/* Three-word mission statement using Rajdhani for military/command-center feel */}
            <div className="font-black text-white leading-none mb-3"
              style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.06em' }}>
              PROTECT.<br />
              {/* "RESPOND." highlighted in DMS red with pulsing text shadow to draw attention */}
              <motion.span style={{ color: '#E63946' }}
                animate={{ textShadow: ['0 0 20px rgba(230,57,70,0.5)', '0 0 40px rgba(230,57,70,0.9)', '0 0 20px rgba(230,57,70,0.5)'] }}
                transition={{ duration: 2, repeat: Infinity }}>
                RESPOND.
              </motion.span><br />
              RECOVER.
            </div>
            {/* Subtitle describing the DMS user base: first responders, officials, citizens */}
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: 280, margin: '1rem auto 0', lineHeight: 1.6 }}>
              Real-time emergency coordination for first responders, government officials, and citizens.
            </p>
          </motion.div>
        </div>

        {/* Bottom stats — key DMS platform metrics displayed as a 3-column grid */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {/* Each stat card shows an icon, a metric value, and a label with color-coded accent */}
          {[
            { label: 'Responders',    value: '2,847+', icon: 'people-fill',    color: '#E63946' }, // Total registered responders in DMS
            { label: 'Response Rate', value: '94%',    icon: 'graph-up-arrow', color: '#FF7A00' }, // Incident response success rate
            { label: 'Incidents',     value: '15K+',   icon: 'clipboard-data', color: '#00d4ff' }, // Total incidents managed by the system
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="text-center p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22` }}>
              {/* Colored icon representing the metric category */}
              <BI name={icon} className="text-lg block mb-1" style={{ color }} />
              {/* Metric value with a colored glow matching the icon */}
              <div className="text-white font-black text-sm" style={{ textShadow: `0 0 12px ${color}66` }}>{value}</div>
              {/* Metric label in muted white */}
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — login form ── */}
      {/* dir="auto" allows the form to adapt to RTL languages (Arabic, Hebrew) */}
      <div className="flex-1 flex items-center justify-center p-6 relative min-h-screen"
        dir="auto"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Top accent bar — thin red-to-orange gradient stripe at the top of the form panel,
            reinforcing the DMS brand color system */}
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #E63946, #FF7A00, #E63946)' }} />

        {/* Language switcher — pinned to the top-right corner, always LTR to avoid RTL displacement.
            Allows users to switch locale before logging in (important for non-English speakers) */}
        <div className="absolute top-4 right-4 z-50" dir="ltr">
          <LangSwitcher />
        </div>

        {/* ── Centered form card — constrained to 384px max width for readability ── */}
        <div className="w-full max-w-sm">

          {/* Mobile logo — shown only when the left hero panel is hidden (below lg breakpoint) */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            {/* Compact shield icon with DMS gradient background */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <BI name="shield-exclamation" className="text-white" />
            </div>
            {/* "DMS" text wordmark for mobile header */}
            <span className="font-black text-lg tracking-widest" style={{ color: 'var(--text-primary)' }}>DMS</span>
          </div>

          {/* Animated wrapper: fades in and slides up the entire form on mount */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Page heading — translated login title ("Sign In to DMS" or equivalent) */}
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('auth.sign_in_title')}
            </h2>
            {/* Subheading — translated note that only authorized users can access the DMS */}
            <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
              {t('auth.authorized_only')}
            </p>

            {/* Status banners — displayed above the form, animated in/out with AnimatePresence */}
            <AnimatePresence>
              {/* Success banner: shown after a user successfully registers and is redirected here */}
              {success && (
                <motion.div key="success"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669' }}>
                  {/* Green checkmark icon confirms a positive outcome */}
                  <BI name="check-circle-fill" /> {success}
                </motion.div>
              )}
              {/* Error banner: shown when authentication fails — invalid credentials, blocked account, etc. */}
              {error && (
                <motion.div key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', color: '#E63946' }}>
                  {/* Red octagon exclamation icon signals a critical login error */}
                  <BI name="exclamation-octagon-fill" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Credential login form — submits email + password to DMS auth endpoint */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div>
                {/* Label with envelope icon — uppercase small caps for the DMS form aesthetic */}
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  <BI name="envelope-fill" className="me-1" /> {t('auth.email_address')}
                </label>
                <input
                  ref={emailRef}                          // Auto-focuses this field on page load for quick login
                  type="email" required autoComplete="username" // "username" autocomplete maps to saved email credentials
                  value={form.email}
                  // Update email in form state and clear error on every keystroke
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
                  placeholder={t('auth.email_placeholder')}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' }}
                  // Highlight border in DMS red on focus to guide user attention
                  onFocus={(e) => e.target.style.borderColor = '#E63946'}
                  // Restore default border color when the field loses focus
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-input)'}
                />
              </div>

              {/* Password field */}
              <div>
                {/* Label with lock icon — uppercase small caps matching the email label style */}
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> {t('auth.password_label')}
                </label>
                {/* Wrapper div for positioning the show/hide toggle button inside the input */}
                <div className="relative">
                  <input
                    // Toggle between "password" (hidden) and "text" (visible) based on showPw state
                    type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                    value={form.password}
                    // Update password in form state and clear error on every keystroke
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                    placeholder={t('auth.password_placeholder')}
                    // pe-12 adds right padding to prevent text overlapping the eye toggle button
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pe-12"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' }}
                    // Highlight border in DMS red on focus
                    onFocus={(e) => e.target.style.borderColor = '#E63946'}
                    // Restore default border when blurred
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-input)'}
                  />
                  {/* Show/hide password toggle button — tabIndex=-1 keeps it out of tab order */}
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                    style={{ color: 'var(--text-tertiary)' }}>
                    {/* Eye-slash when visible (click to hide), eye when hidden (click to reveal) */}
                    <BI name={showPw ? 'eye-slash' : 'eye'} className="text-base" />
                  </button>
                </div>
              </div>

              {/* Submit button — animated with Framer Motion for hover/press feedback */}
              <motion.button
                type="submit" disabled={loading} // Disabled during API call to prevent duplicate submissions
                whileHover={{ scale: loading ? 1 : 1.01 }} // Subtle scale-up on hover (skip if loading)
                whileTap={{ scale: loading ? 1 : 0.98 }}   // Press-down effect on tap/click (skip if loading)
                className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #E63946 0%, #c0392b 100%)', boxShadow: '0 4px 20px rgba(230,57,70,0.35)' }}
              >
                {/* Show spinner + "Authenticating..." text while the API call is in progress */}
                {loading ? (
                  <>
                    {/* Tailwind animate-spin SVG spinner — provides visual feedback during login */}
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('auth.authenticating')}
                  </>
                ) : (
                  // Default state: login icon + translated "Login" label
                  <><BI name="box-arrow-in-right" className="text-base" /> {t('auth.login')}</>
                )}
              </motion.button>
            </form>

            {/* Social Login section — only rendered if at least one OAuth provider is configured */}
            {(import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_FACEBOOK_APP_ID) && (
              <div className="mt-5">
                {/* Divider with "or continue with" label separating credential from social login */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: 'var(--border-input)' }} />
                  <span className="text-xs font-medium px-2" style={{ color: 'var(--text-tertiary)' }}>
                    {t('auth.or_continue_with', 'or continue with')}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-input)' }} />
                </div>
                <div className="flex flex-col gap-3">
                  {/* Google Login — only shown when VITE_GOOGLE_CLIENT_ID is set in .env */}
                  {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                    <div className="flex justify-center">
                      {/* GoogleLogin component from @react-oauth/google — renders Google's branded button */}
                      <GoogleLogin
                        // On successful Google auth, pass the ID credential token to the DMS backend
                        onSuccess={(resp) => handleOAuthLogin('google', resp.credential)}
                        // Show error banner if the Google login popup fails or is cancelled
                        onError={() => setError('Google login failed')}
                        useOneTap={false}        // Disable One Tap to avoid unintended auto-sign-in during emergencies
                        theme="outline"          // Outlined style integrates cleanly with the DMS dark theme
                        size="large"             // Large button for accessibility and touch targets
                        width="320"              // Fixed width matches the form column width
                        text="continue_with"     // Button text: "Continue with Google"
                        shape="rectangular"      // Matches the rectangular style of other DMS form elements
                      />
                    </div>
                  )}
                  {/* Facebook Login — only shown when VITE_FACEBOOK_APP_ID is set in .env */}
                  {import.meta.env.VITE_FACEBOOK_APP_ID && (
                    <button type="button"
                      onClick={() => {
                        // Guard: ensure the FB SDK has loaded before attempting login
                        if (!window.FB) { setError(t('auth.facebook_sdk_error')); return; }
                        // Trigger the Facebook login dialog, requesting email and public_profile permissions
                        window.FB.login((resp) => {
                          // Successful login: user authorized the DMS app and an access token is available
                          if (resp.status === 'connected' && resp.authResponse?.accessToken)
                            handleOAuthLogin('facebook', resp.authResponse.accessToken);
                          // User is logged into Facebook but has not authorized the DMS app
                          else if (resp.status === 'not_authorized')
                            setError(t('auth.facebook_not_authorized'));
                          // User closed the dialog or an unknown error occurred
                          else setError(t('auth.facebook_login_failed'));
                        }, { scope: 'email,public_profile' }); // Request only minimal required permissions
                      }}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all"
                      // Facebook brand blue background with white text for instant recognition
                      style={{ background: '#1877F2', color: '#fff', boxShadow: '0 2px 8px rgba(24,119,242,0.35)' }}
                      // Darken background on hover for interactive feedback
                      onMouseEnter={(e) => e.currentTarget.style.background = '#166FE5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#1877F2'}
                    >
                      {/* Facebook "f" logo SVG — inline to avoid external resource blocking by CSP */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {/* Translated "Continue with Facebook" button label */}
                      {t('auth.continue_facebook')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Staff portals quick-links — allows Admin, Team, and Officer roles to navigate
                to their dedicated login pages without going through the citizen login flow */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              {/* Section label with a building-lock icon indicating restricted staff access */}
              <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                <BI name="building-lock" /> {t('auth.staff_portals', 'Staff Portals')}
              </p>
              {/* 3-column grid: one button per staff role */}
              <div className="grid grid-cols-3 gap-2">
                {/* Portal links: Admin (red), Team (amber), Officer (purple) — each routes to a dedicated login page */}
                {[
                  { to: '/admin-login',   label: t('auth.portal_admin', 'Admin'),   icon: 'shield-fill',    color: '#E63946' }, // System administrators managing users and incidents
                  { to: '/team-login',    label: t('auth.portal_team', 'Team'),     icon: 'people-fill',    color: '#f59e0b' }, // Field response teams coordinating on active incidents
                  { to: '/officer-login', label: t('auth.portal_officer', 'Officer'), icon: 'briefcase-fill', color: '#7c3aed' }, // Command officers overseeing resource allocation
                ].map(({ to, label, icon, color }) => (
                  <Link key={to} to={to}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all text-center"
                    // Semi-transparent tinted background using role's brand color for visual differentiation
                    style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
                    // Darken tint on hover to signal interactivity
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${color}18`; }}
                  >
                    {/* Role icon — shield for admin authority, people for teams, briefcase for officers */}
                    <BI name={icon} className="text-base" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Registration prompt — directs new citizens to the registration page to request DMS access */}
            <p className="text-center text-xs mt-5" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.new_to_dms')}{' '}
              {/* Link to /register with DMS red color and arrow icon to reinforce the call to action */}
              <Link to="/register" className="font-bold hover:underline" style={{ color: '#E63946' }}>
                {t('auth.request_access')} <BI name="arrow-right" />
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
}