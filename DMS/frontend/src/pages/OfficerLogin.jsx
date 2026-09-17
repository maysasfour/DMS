/**
 * OfficerLogin.jsx
 *
 * Government Official (Officer) authentication portal for the Disaster Management System (DMS).
 *
 * This page provides a dedicated, role-restricted login interface exclusively for users
 * holding the OFFICIAL role. It prevents citizens, team members, and admins from
 * accessing the officer dashboard by validating the role returned from the DMS backend
 * before persisting the session. On successful authentication the officer is redirected
 * to the main layout dashboard where they can manage incidents, resources, and alerts.
 *
 * Key responsibilities:
 *  - Render a styled login form with email + password fields
 *  - Call the shared authAPI.login endpoint and inspect the returned role
 *  - Block access if the authenticated user is not an OFFICIAL
 *  - Persist the validated user object and JWT token via the global auth store
 *  - Display granular, i18n-translated error messages for credential, access, and network failures
 *  - Support RTL/LTR layout switching through the LangSwitcher component
 */

// React core and hooks used for state management and DOM references
import React, { useState, useRef, useEffect } from 'react';
// Link provides client-side navigation to the citizen login page; useNavigate redirects after login
import { Link, useNavigate } from 'react-router-dom';
// motion and AnimatePresence enable entrance animations for the card and error banners
import { motion, AnimatePresence } from 'framer-motion';
// useTranslation provides i18n keys for multilingual support (Arabic, English, French, Spanish, Turkish)
import { useTranslation } from 'react-i18next';
// authAPI wraps the DMS backend /auth/login endpoint call
import { authAPI } from '../services/api';
// useAuthStore provides the global login action that stores user + JWT token in Zustand state
import { useAuthStore } from '../store';
// LangSwitcher allows officers to switch the UI language from the login page itself
import LangSwitcher from '../components/LangSwitcher';

// Convenience wrapper that renders a Bootstrap Icon by name, avoiding repetitive className strings
const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;

// Role allowlist — only users whose backend role resolves to OFFICIAL may proceed through this portal
const ALLOWED_ROLES = ['OFFICIAL'];

// Default export: the OfficerLogin page component mounted at the /officer-login route
export default function OfficerLogin() {
  // useNavigate hook used to redirect the officer to /layout/dashboard after successful login
  const navigate = useNavigate();
  // login action from the global Zustand auth store — persists user data and JWT to app state
  const { login } = useAuthStore();
  // t function provides translated strings; keys are defined in i18n locale JSON files
  const { t } = useTranslation();
  // Controlled form state holding the officer's email and password inputs
  const [form, setForm] = useState({ email: '', password: '' });
  // Toggle to reveal or mask the password field for usability
  const [showPw, setShowPw] = useState(false);
  // Tracks async login request state to disable the submit button and show a spinner
  const [loading, setLoading] = useState(false);
  // Holds the current error message string to display in the animated error banner
  const [error, setError] = useState('');
  // Ref attached to the email input so it can receive focus automatically on mount
  const emailRef = useRef(null);

  // Auto-focus the email field when the login page mounts, improving UX flow
  useEffect(() => {
    emailRef.current?.focus();
  }, []); // Empty dependency array — runs once after initial render

  /**
   * handleSubmit — async form submission handler for the officer login flow.
   *
   * Steps:
   * 1. Prevents default HTML form submission (page reload).
   * 2. Calls the DMS backend login API with the provided credentials.
   * 3. Extracts the role from the response and validates it against ALLOWED_ROLES.
   * 4. If the role is not OFFICIAL, blocks login and shows an access-denied error.
   * 5. On success, builds a clean user object and persists it with the JWT via the auth store.
   * 6. Navigates the officer to the main dashboard.
   * 7. Maps HTTP error codes to user-friendly translated messages.
   */
  const handleSubmit = async (e) => {
    // Prevent browser from reloading the page on form submission
    e.preventDefault();
    setLoading(true);
    setError(''); // Clear any previous error before a new attempt
    try {
      // Call the shared DMS auth endpoint — returns the user object and JWT token
      const { data: body } = await authAPI.login(form.email, form.password);
      // Handle both wrapped (body.data) and flat (body) response shapes from the backend
      const userData = body?.data || body;
      // Extract the first role from an array, or fall back to a scalar role field
      const rawRole = Array.isArray(userData.roles) ? userData.roles[0] : (userData.role || '');
      // Strip the Spring Security ROLE_ prefix (e.g. "ROLE_OFFICIAL" → "OFFICIAL")
      const role = typeof rawRole === 'string' ? rawRole.replace(/^ROLE_/, '') : rawRole;

      // Portal access guard — reject any authenticated user who is not a Government Official
      if (!ALLOWED_ROLES.includes(role)) {
        setError(t('auth.access_denied_portal', 'Access denied. This portal is for Government Officials only.'));
        setLoading(false);
        return; // Abort without storing any session data
      }

      // Build a clean user object with only the fields the DMS app needs across all pages
      const user = {
        id: userData.id,           // Unique user ID used for API requests on behalf of this officer
        email: userData.email,     // Officer's email, displayed in the profile and header
        firstName: userData.firstName, // Used for personalized greetings in the dashboard
        lastName: userData.lastName,
        role,                      // Normalized role string ("OFFICIAL") stored in auth state
        avatarUrl: userData.avatarUrl, // Profile picture URL shown in the navigation bar
      };
      // Persist the user and JWT token in the global Zustand store and localStorage
      await login(user, userData.token);
      // Redirect the officer to the main application dashboard
      navigate('/layout/dashboard');
    } catch (err) {
      // Read the HTTP status code and backend message for specific error handling
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      // 401 or a "credentials" message indicates wrong email/password
      if (status === 401 || msg?.toLowerCase().includes('credentials')) {
        setError(t('auth.invalid_credentials'));
      // 403 means the account exists but is suspended or blocked by an admin
      } else if (status === 403) {
        setError(t('auth.access_blocked'));
      // No response object means the DMS backend is unreachable (network/server down)
      } else if (!err.response) {
        setError(t('auth.no_server'));
      } else {
        // Fallback: display the backend's own message or generic invalid credentials string
        setError(msg || t('auth.invalid_credentials'));
      }
    } finally {
      // Always clear the loading spinner regardless of success or failure
      setLoading(false);
    }
  };

  // Brand accent color (violet) used consistently for borders, glows, and gradient fills
  const ACCENT = '#7c3aed';

  return (
    // Full-screen centering wrapper with a deep dark background matching the DMS cyberpunk design system
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" dir="ltr"
      style={{ background: 'linear-gradient(160deg, #000 0%, #050010 50%, #0a0018 100%)' }}>

      {/* Subtle SVG hexagonal grid pattern overlaid on the background for visual depth */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
        <defs>
          {/* Repeating hexagon tile pattern keyed to this page to avoid SVG ID conflicts with other portals */}
          <pattern id="hex-officer" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke={ACCENT} strokeWidth="0.8"/>
          </pattern>
        </defs>
        {/* Fill the entire viewport with the hex grid pattern */}
        <rect width="100%" height="100%" fill="url(#hex-officer)"/>
      </svg>

      {/* Animated horizontal scan-line that sweeps top-to-bottom on an infinite loop for a cyberpunk feel */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}55, transparent)` }}
        animate={{ top: ['-2px', '100%'] }}
        transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
      />

      {/* Language switcher positioned in the top-right corner so officers can change locale before logging in */}
      <div className="absolute top-4 right-4 z-50" dir="ltr"><LangSwitcher /></div>

      {/* Constrained card container with auto direction for RTL language support */}
      <div className="relative w-full max-w-md" dir="auto">
        {/* Decorative top-edge gradient bar that visually anchors the card with the accent color */}
        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #a855f7, ${ACCENT})` }} />

        {/* Main login card — fades and slides up on mount using Framer Motion */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8"
          style={{ background: 'rgba(10,10,10,0.95)', border: `1px solid ${ACCENT}35`, backdropFilter: 'blur(12px)' }}
        >
          {/* Card header: portal icon + title + role subtitle */}
          <div className="flex items-center gap-3 mb-8">
            {/* Glowing briefcase icon badge identifying this as the Government Official portal */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #5b21b6)`, boxShadow: `0 0 24px ${ACCENT}50` }}>
              <BI name="briefcase-fill" className="text-white text-xl" />
            </div>
            <div>
              {/* Portal name heading — translated and styled with wide letter-spacing */}
              <h1 className="font-black text-xl text-white leading-tight" style={{ letterSpacing: '0.05em' }}>
                {t('auth.officer_portal', 'Officer Portal')}
              </h1>
              {/* Role descriptor rendered in monospace uppercase to reinforce official branding */}
              <p className="text-xs mt-0.5" style={{ color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {t('auth.government_official', 'Government Official')}
              </p>
            </div>
          </div>

          {/* Animated error banner — appears when login fails (wrong credentials, wrong role, server down) */}
          <AnimatePresence>
            {error && (
              // Slides in from above with a violet-tinted background; AnimatePresence handles unmount animation
              <motion.div key="err"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: '#c4b5fd' }}>
                {/* Warning icon followed by the translated error message string */}
                <BI name="exclamation-octagon-fill" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login form — submission is handled by handleSubmit; space-y-4 stacks fields vertically */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field group */}
            <div>
              {/* Accessible label for the email input with Bootstrap envelope icon */}
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <BI name="envelope-fill" className="me-1" /> {t('auth.email_address')}
              </label>
              <input
                ref={emailRef}         // Attach ref so this field auto-focuses on page load
                type="email" required autoComplete="username" // Browser autofill hint for email credentials
                value={form.email}     // Controlled value from form state
                // Update email in form state and clear any error on each keystroke
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
                placeholder={t('auth.email_placeholder')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1.5px solid ${ACCENT}30` }}
                // Highlight border with full accent color when focused for clear visual feedback
                onFocus={(e) => e.target.style.borderColor = ACCENT}
                // Fade border back to subtle when the field loses focus
                onBlur={(e) => e.target.style.borderColor = `${ACCENT}30`}
              />
            </div>

            {/* Password field group */}
            <div>
              {/* Accessible label for the password input with Bootstrap lock icon */}
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <BI name="lock-fill" className="me-1" /> {t('auth.password_label')}
              </label>
              {/* Relative wrapper to position the show/hide toggle button inside the input */}
              <div className="relative">
                {/* Password input — type switches between 'password' and 'text' based on showPw state */}
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password} // Controlled value from form state
                  // Update password in form state and clear any previous error on each keystroke
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pe-12"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1.5px solid ${ACCENT}30` }}
                  // Highlight border when focused
                  onFocus={(e) => e.target.style.borderColor = ACCENT}
                  // Reset border when blurred
                  onBlur={(e) => e.target.style.borderColor = `${ACCENT}30`}
                />
                {/* Toggle button that shows or hides the password — tabIndex=-1 keeps it out of tab order */}
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(v => !v)} // Flip the showPw boolean on each click
                  className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {/* Switch between eye and eye-slash icon depending on password visibility state */}
                  <BI name={showPw ? 'eye-slash' : 'eye'} className="text-base" />
                </button>
              </div>
            </div>

            {/* Submit button — disabled and shows a spinner during the async login request */}
            <motion.button
              type="submit" disabled={loading}
              // Subtle scale-up on hover and scale-down on tap for tactile feedback; disabled during loading
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #5b21b6 100%)`, boxShadow: `0 4px 20px ${ACCENT}40` }}
            >
              {/* Conditionally render spinner + "Authenticating" text while the API call is in-flight */}
              {loading ? (
                <>
                  {/* Tailwind animate-spin SVG spinner displayed while waiting for backend response */}
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {/* Translated "Authenticating…" label shown alongside the spinner */}
                  {t('auth.authenticating')}
                </>
              ) : (
                // Default idle state: briefcase icon + "Access System" call-to-action text
                <><BI name="briefcase" className="text-base" /> {t('auth.access_system', 'Access System')}</>
              )}
            </motion.button>
          </form>

          {/* Footer row with navigation back to the citizen login portal and a role reminder badge */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {/* Back link directing non-officials to the citizen login page */}
            <Link to="/login" className="flex items-center gap-1 hover:text-white transition-colors">
              <BI name="arrow-left" /> {t('auth.citizen_login', 'Citizen Login')}
            </Link>
            {/* Static badge reminding users that this portal is restricted to government officials only */}
            <span className="flex items-center gap-1">
              <BI name="briefcase-fill" /> {t('auth.officials_only', 'Officials only')}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}