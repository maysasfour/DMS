/**
 * TeamLogin.jsx — Team Portal Authentication Page for the Disaster Management System (DMS)
 *
 * This page provides a dedicated login interface for field-level DMS personnel:
 * specifically Rescue Teams and Responders. It enforces role-based access by
 * rejecting logins from citizens, admins, or officers who attempt to authenticate
 * through this portal. Upon successful authentication, team members are redirected
 * to the main operational dashboard where they can manage incidents and resources.
 *
 * Visual design: Neon amber/orange cyberpunk theme on a dark background,
 * consistent with the DMS design system for field-facing portals.
 */

// React core and hooks for state management and DOM references
import React, { useState, useRef, useEffect } from 'react';
// Link provides navigation to the citizen login page; useNavigate handles post-login redirect
import { Link, useNavigate } from 'react-router-dom';
// Framer Motion for animated card entrance, scan-line effect, and button interactions
import { motion, AnimatePresence } from 'framer-motion';
// Internationalization hook — all user-visible text is translated for multilingual DMS users
import { useTranslation } from 'react-i18next';
// authAPI provides the REST call to the DMS backend authentication endpoint
import { authAPI } from '../services/api';
// useAuthStore holds global auth state (token, user) shared across all DMS pages
import { useAuthStore } from '../store';
// LangSwitcher allows field responders to switch UI language (Arabic, English, French, etc.)
import LangSwitcher from '../components/LangSwitcher';

// Lightweight helper to render Bootstrap Icons by name without repeating the class prefix
const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;

// Only RESCUE_TEAM and RESPONDER roles are permitted access via this portal;
// any other role (e.g. ADMIN, OFFICER, USER) will be rejected with an access-denied error
const ALLOWED_ROLES = ['RESCUE_TEAM', 'RESPONDER'];

/** TeamLogin — default export; the full login page component for DMS field team members */
export default function TeamLogin() {
  // useNavigate allows programmatic redirect to /layout/dashboard after successful login
  const navigate = useNavigate();
  // login action from the global auth store — persists user data and JWT token
  const { login } = useAuthStore();
  // t() translates keys like 'auth.invalid_credentials' based on the active locale
  const { t } = useTranslation();
  // form holds the controlled input values for email and password fields
  const [form, setForm] = useState({ email: '', password: '' });
  // showPw toggles the password field between masked and plain-text display
  const [showPw, setShowPw] = useState(false);
  // loading disables the submit button and shows a spinner during the API call
  const [loading, setLoading] = useState(false);
  // error stores the localized error message shown to the user on failed login attempts
  const [error, setError] = useState('');
  // emailRef is used to auto-focus the email input on page mount for faster field login
  const emailRef = useRef(null);

  // Auto-focus the email field when the component mounts — improves UX for field responders
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  /**
   * handleSubmit — Handles login form submission for DMS team members.
   * Sends credentials to the backend, validates the user's role against ALLOWED_ROLES,
   * stores authenticated user data in global state, and redirects to the dashboard.
   * Handles specific HTTP error codes (401 bad credentials, 403 blocked account, no response).
   */
  const handleSubmit = async (e) => {
    // Prevent the default browser form submission which would reload the page
    e.preventDefault();
    setLoading(true);
    // Clear any previous error before a new login attempt
    setError('');
    try {
      // Call the DMS backend authentication endpoint with submitted credentials
      const { data: body } = await authAPI.login(form.email, form.password);
      // Backend may wrap user data in a `data` envelope or return it directly
      const userData = body?.data || body;
      // Extract the role — backend may return an array of role strings or a single role field
      const rawRole = Array.isArray(userData.roles) ? userData.roles[0] : (userData.role || '');
      // Strip the Spring Security "ROLE_" prefix (e.g. "ROLE_RESCUE_TEAM" → "RESCUE_TEAM")
      const role = typeof rawRole === 'string' ? rawRole.replace(/^ROLE_/, '') : rawRole;

      // Enforce portal restriction: only rescue teams and responders may log in here
      if (!ALLOWED_ROLES.includes(role)) {
        setError(t('auth.access_denied_portal', 'Access denied. This portal is for Rescue Teams and Responders only.'));
        setLoading(false);
        return;
      }

      // Build a clean user object with only the fields needed by the DMS frontend store
      const user = {
        id: userData.id,               // Unique DMS user ID for API calls
        email: userData.email,         // Email used for display and profile
        firstName: userData.firstName, // Used in dashboard greeting and profile
        lastName: userData.lastName,   // Used in dashboard greeting and profile
        role,                          // Normalized role string stored for route guards
        avatarUrl: userData.avatarUrl, // Profile picture shown in the navbar
      };
      // Persist user data and JWT token in global store (localStorage-backed)
      await login(user, userData.token);
      // Redirect the authenticated team member to the main operational dashboard
      navigate('/layout/dashboard');
    } catch (err) {
      // Extract HTTP status and backend error message for specific error handling
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 401 || msg?.toLowerCase().includes('credentials')) {
        // Wrong email or password — prompt the user to try again
        setError(t('auth.invalid_credentials'));
      } else if (status === 403) {
        // Account exists but is blocked or suspended by an administrator
        setError(t('auth.access_blocked'));
      } else if (!err.response) {
        // Network failure or backend is unreachable — common in disaster field conditions
        setError(t('auth.no_server'));
      } else {
        // Fallback: show backend message or generic invalid credentials text
        setError(msg || t('auth.invalid_credentials'));
      }
    } finally {
      // Always re-enable the submit button regardless of success or failure
      setLoading(false);
    }
  };

  // Amber/orange accent color matching the DMS team portal design token
  const ACCENT = '#f59e0b';

  return (
    // Full-screen dark background with a deep amber gradient — team portal visual identity
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" dir="ltr"
      style={{ background: 'linear-gradient(160deg, #000 0%, #0a0800 50%, #100a00 100%)' }}>

      {/* Subtle hexagonal grid pattern overlaid on the background — DMS cyberpunk aesthetic */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
        <defs>
          {/* Hex tile pattern used as a repeating background texture */}
          <pattern id="hex-team" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke={ACCENT} strokeWidth="0.8"/>
          </pattern>
        </defs>
        {/* Fill the entire SVG viewport with the hex pattern */}
        <rect width="100%" height="100%" fill="url(#hex-team)"/>
      </svg>

      {/* Animated horizontal scan-line that scrolls top-to-bottom infinitely — cinematic effect */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}55, transparent)` }}
        animate={{ top: ['-2px', '100%'] }}
        transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
      />

      {/* Language switcher fixed to top-right so responders can change locale before logging in */}
      <div className="absolute top-4 right-4 z-50" dir="ltr"><LangSwitcher /></div>

      {/* Centered card container with max width for readability on mobile field devices */}
      <div className="relative w-full max-w-md" dir="auto">
        {/* Top accent bar visually marks this as the team (amber) portal vs. officer (blue) portal */}
        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #FF7A00, ${ACCENT})` }} />

        {/* Login card — animates in from below on mount using Framer Motion */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8"
          style={{ background: 'rgba(10,10,10,0.95)', border: `1px solid ${ACCENT}35`, backdropFilter: 'blur(12px)' }}
        >
          {/* Portal header: icon badge + title identifies this as the Rescue Team / Responder portal */}
          <div className="flex items-center gap-3 mb-8">
            {/* Amber glowing icon badge — people icon signals a team/group context */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #d97706)`, boxShadow: `0 0 24px ${ACCENT}50` }}>
              <BI name="people-fill" className="text-white text-xl" />
            </div>
            <div>
              {/* Main portal title — localized for multilingual DMS deployments */}
              <h1 className="font-black text-xl text-white leading-tight" style={{ letterSpacing: '0.05em' }}>
                {t('auth.team_portal', 'Team Portal')}
              </h1>
              {/* Subtitle clarifies exactly which roles belong here — reduces wrong-portal logins */}
              <p className="text-xs mt-0.5" style={{ color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {t('auth.rescue_responder', 'Rescue Team / Responder')}
              </p>
            </div>
          </div>

          {/* AnimatePresence enables exit animation when the error message is cleared */}
          <AnimatePresence>
            {error && (
              // Animated error banner — slides in when login fails (wrong role, bad credentials, etc.)
              <motion.div key="err"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: ACCENT }}>
                {/* Warning icon precedes the localized error message text */}
                <BI name="exclamation-octagon-fill" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login form — calls handleSubmit which authenticates against the DMS backend */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email address field — the primary login identifier for DMS team accounts */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <BI name="envelope-fill" className="me-1" /> {t('auth.email_address')}
              </label>
              <input
                ref={emailRef}  // Ref enables auto-focus on mount for faster field login
                type="email" required autoComplete="username"
                value={form.email}
                // Update email in form state and clear any existing error on every keystroke
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
                placeholder={t('auth.email_placeholder')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1.5px solid ${ACCENT}30` }}
                // Highlight border with full accent color on focus for visual feedback
                onFocus={(e) => e.target.style.borderColor = ACCENT}
                // Revert border to dim amber when the field loses focus
                onBlur={(e) => e.target.style.borderColor = `${ACCENT}30`}
              />
            </div>

            {/* Password field with toggle to reveal/mask input — wraps input in relative container */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <BI name="lock-fill" className="me-1" /> {t('auth.password_label')}
              </label>
              {/* Relative wrapper positions the show/hide button inside the input on the right */}
              <div className="relative">
                {/* Password input — type switches between 'password' and 'text' based on showPw state */}
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password}
                  // Update password in form state and clear any existing error on each keystroke
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pe-12"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1.5px solid ${ACCENT}30` }}
                  // Highlight border with full accent color on focus for visual feedback
                  onFocus={(e) => e.target.style.borderColor = ACCENT}
                  // Revert border to dim amber when the field loses focus
                  onBlur={(e) => e.target.style.borderColor = `${ACCENT}30`}
                />
                {/* Eye icon button toggles password visibility — tabIndex={-1} keeps it out of tab order */}
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {/* Icon switches between eye and eye-slash depending on current showPw state */}
                  <BI name={showPw ? 'eye-slash' : 'eye'} className="text-base" />
                </button>
              </div>
            </div>

            {/* Submit button — disabled and shows spinner while the login API call is in flight */}
            <motion.button
              type="submit" disabled={loading}
              // Subtle scale-up on hover and scale-down on tap — suppressed while loading
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #d97706 100%)`, boxShadow: `0 4px 20px ${ACCENT}40` }}
            >
              {loading ? (
                // Loading state: spinning SVG indicator + localized "Authenticating..." text
                <>
                  {/* SVG spinner — pure CSS animation, no external library needed */}
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t('auth.authenticating')}
                </>
              ) : (
                // Default state: fire icon + localized "Access System" call-to-action
                <><BI name="fire" className="text-base" /> {t('auth.access_system', 'Access System')}</>
              )}
            </motion.button>
          </form>

          {/* Footer navigation bar below the form — separates portal links from the form */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {/* Link back to the citizen (public) login portal — for users who landed on the wrong page */}
            <Link to="/login" className="flex items-center gap-1 hover:text-white transition-colors">
              <BI name="arrow-left" /> {t('auth.citizen_login', 'Citizen Login')}
            </Link>
            {/* Static label reminding users this portal is restricted to team roles only */}
            <span className="flex items-center gap-1">
              <BI name="people-fill" /> {t('auth.team_only', 'Team only')}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}