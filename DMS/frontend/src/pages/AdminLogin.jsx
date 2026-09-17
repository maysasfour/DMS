/**
 * AdminLogin.jsx
 *
 * Provides the secure administrator authentication portal for the Disaster Management System (DMS).
 * This page is strictly restricted to users with the ADMIN role. It presents a styled login form
 * with email/password credentials, performs role verification after API authentication, and
 * redirects successful admins to the main DMS dashboard. Non-admin users (citizens, officers,
 * team members) are denied access with a localized error message.
 *
 * Design: Neon cyberpunk dark theme with red (#E63946) accent color, animated hex-grid
 * background, and a scanning beam animation to convey a high-security restricted zone.
 */

// React core and hooks for component state, DOM refs, and lifecycle effects
import React, { useState, useRef, useEffect } from 'react';
// Link for navigation to citizen login; useNavigate for programmatic redirect after login
import { Link, useNavigate } from 'react-router-dom';
// motion and AnimatePresence provide entrance animations and error message transitions
import { motion, AnimatePresence } from 'framer-motion';
// useTranslation provides i18n support for Arabic, English, French, Spanish, Turkish locales
import { useTranslation } from 'react-i18next';
// authAPI wraps backend REST endpoints for authentication (POST /auth/login)
import { authAPI } from '../services/api';
// useAuthStore persists authenticated user data (token, role, profile) across the DMS app
// useUIStore can be used for global UI state such as loading overlays or notifications
import { useAuthStore, useUIStore } from '../store';
// LangSwitcher allows the admin to toggle the UI language without leaving the login page
import LangSwitcher from '../components/LangSwitcher';

/**
 * BI — Bootstrap Icons shorthand component.
 * Renders a <i> tag with the Bootstrap Icons class for a given icon name.
 * Used throughout this page for visual indicators (shield, envelope, lock, eye, etc.).
 *
 * @param {string} name      - The Bootstrap Icons icon name (e.g. "shield-lock-fill")
 * @param {string} className - Optional additional CSS classes for sizing or color overrides
 */
const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;

// Whitelist of roles permitted to access this admin portal.
// Any authenticated DMS user whose role is NOT in this list will be denied access,
// preventing citizens, officers, or team members from reaching admin-only screens.
const ALLOWED_ROLES = ['ADMIN'];

/**
 * AdminLogin — default export, page-level React component.
 * Renders the restricted DMS Admin Portal login screen with credential form,
 * animated background effects, role enforcement, and error feedback.
 */
export default function AdminLogin() {
  // useNavigate hook — used to redirect admin to /layout/dashboard after successful login
  const navigate = useNavigate();
  // login — action from auth store that persists the authenticated user object and JWT token
  const { login } = useAuthStore();
  // t — translation function for rendering locale-aware strings (error messages, labels, placeholders)
  const { t } = useTranslation();
  // form — controlled state object holding the admin's email and password input values
  const [form, setForm] = useState({ email: '', password: '' });
  // showPw — toggles password field between masked (password) and readable (text) mode
  const [showPw, setShowPw] = useState(false);
  // loading — tracks whether the login API call is in flight; disables the submit button to prevent double-submission
  const [loading, setLoading] = useState(false);
  // error — stores a localized error string to display when authentication fails or role is denied
  const [error, setError] = useState('');
  // emailRef — DOM ref attached to the email input so it auto-focuses on page mount for quick keyboard entry
  const emailRef = useRef(null);

  // On initial mount, move focus to the email input field so admins can start typing immediately
  useEffect(() => {
    // Optional chaining guards against the rare case where the ref is not yet attached to the DOM
    emailRef.current?.focus();
  }, []); // Empty dependency array — runs once after the component mounts

  /**
   * handleSubmit — async form submission handler for admin credential authentication.
   *
   * Flow:
   * 1. Prevents the browser's default form submission (page reload).
   * 2. Calls the DMS backend login endpoint with email/password credentials.
   * 3. Extracts the user's role from the response (handles both array and string formats).
   * 4. Strips the Spring Security "ROLE_" prefix if present (e.g. "ROLE_ADMIN" → "ADMIN").
   * 5. Enforces that only ADMIN-role users can proceed; others receive an access-denied error.
   * 6. Builds a normalized user profile object and persists it via the auth store with the JWT token.
   * 7. Redirects the authenticated admin to the DMS dashboard.
   * 8. Handles common HTTP errors: 401 for bad credentials, 403 for blocked accounts,
   *    network errors for server unavailability, and a fallback for unexpected responses.
   *
   * @param {React.FormEvent} e - The form submit event
   */
  const handleSubmit = async (e) => {
    // Prevent browser form default (page reload) so React handles submission
    e.preventDefault();
    // Show spinner and clear any previous error before attempting login
    setLoading(true);
    setError('');
    try {
      // POST credentials to the backend /auth/login endpoint; response contains JWT + user profile
      const { data: body } = await authAPI.login(form.email, form.password);
      // Normalize response shape — backend may wrap data in a `data` envelope or return it flat
      const userData = body?.data || body;
      // Extract the first role from the roles array, or fall back to a plain `role` string field
      const rawRole = Array.isArray(userData.roles) ? userData.roles[0] : (userData.role || '');
      // Strip Spring Security's "ROLE_" prefix so stored role is "ADMIN", not "ROLE_ADMIN"
      const role = typeof rawRole === 'string' ? rawRole.replace(/^ROLE_/, '') : rawRole;

      // Enforce admin-only access — reject citizens, officers, or team members who try this portal
      if (!ALLOWED_ROLES.includes(role)) {
        // Show a localized "access denied" message; fall back to English if translation key is missing
        setError(t('auth.access_denied_portal', 'Access denied. This portal is for Administrators only.'));
        setLoading(false);
        return; // Stop here; do not persist session or redirect
      }

      // Build a clean, normalized user object containing only the fields needed by the DMS app
      const user = {
        id: userData.id,                   // Unique admin user ID from the DMS database
        email: userData.email,             // Admin's email address for display and identity
        firstName: userData.firstName,     // Used in greeting messages and profile display
        lastName: userData.lastName,       // Combined with firstName for full name rendering
        role,                              // Normalized role string ("ADMIN") for route guards
        avatarUrl: userData.avatarUrl,     // Optional profile photo URL for the admin header
      };
      // Persist the user profile and JWT token in the auth store (Zustand), setting auth state app-wide
      await login(user, userData.token);
      // Redirect the now-authenticated admin to the DMS dashboard to manage incidents and resources
      navigate('/layout/dashboard');
    } catch (err) {
      // Extract HTTP status code and backend error message for targeted error handling
      const status = err.response?.status;
      // Backend may include a human-readable message in the response body
      const msg = err.response?.data?.message;
      if (status === 401 || msg?.toLowerCase().includes('credentials')) {
        // Wrong email or password — prompt admin to retry
        setError(t('auth.invalid_credentials'));
      } else if (status === 403) {
        // Account exists but is blocked or suspended by a super-admin
        setError(t('auth.access_blocked'));
      } else if (!err.response) {
        // No HTTP response received — backend server is unreachable or network is down
        setError(t('auth.no_server'));
      } else {
        // Fallback: show the backend's own message or the generic invalid-credentials text
        setError(msg || t('auth.invalid_credentials'));
      }
    } finally {
      // Always stop the loading spinner regardless of success or failure
      setLoading(false);
    }
  };

  // JSX render — the full Admin Portal login UI
  return (
    // Full-screen container with dark red-tinted gradient background and LTR forced layout
    // dir="ltr" ensures the overall page layout flows left-to-right even in RTL locales (Arabic)
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" dir="ltr"
      style={{ background: 'linear-gradient(160deg, #000 0%, #0a0000 50%, #1a000a 100%)' }}>

      {/* Hex grid background — subtle repeating hexagon SVG pattern adds a cyber-security aesthetic */}
      {/* pointer-events-none ensures the decorative SVG never blocks clicks on the form below */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
        <defs>
          {/* SVG pattern definition: 60×52 unit hexagon tile, red stroke, near-invisible opacity */}
          <pattern id="hex-admin" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            {/* Single hexagon polygon forming one tile of the repeating background grid */}
            <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke="#E63946" strokeWidth="0.8"/>
          </pattern>
        </defs>
        {/* Fill entire background area with the hex pattern defined above */}
        <rect width="100%" height="100%" fill="url(#hex-admin)"/>
      </svg>

      {/* Scan beam — animated horizontal red gradient line that sweeps top-to-bottom continuously,
          reinforcing the "security scan" visual metaphor for this restricted admin area */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,57,70,0.4), transparent)' }}
        // Animate vertical position from above viewport to below, looping indefinitely
        animate={{ top: ['-2px', '100%'] }}
        // 5-second linear loop — slow enough to be ambient, fast enough to feel active
        transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
      />

      {/* Language switcher — positioned top-right so admins can change locale before logging in */}
      {/* z-50 ensures it sits above all other page layers including the hex grid and scan beam */}
      <div className="absolute top-4 right-4 z-50" dir="ltr"><LangSwitcher /></div>

      {/* Login card container — max-width 448px, centered, supports RTL text via dir="auto" */}
      {/* dir="auto" lets the browser infer text direction from the locale for labels and placeholders */}
      <div className="relative w-full max-w-md" dir="auto">
        {/* Top accent bar — red-to-orange gradient line crowns the card, indicating admin-level access */}
        {/* -top-px overlaps the card border so the accent appears as an integrated top border */}
        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #E63946, #FF7A00, #E63946)' }} />

        {/* Login card — fade+slide entrance animation, dark glass-morphism style with red border */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}   // Starts invisible and 24px below final position
          animate={{ opacity: 1, y: 0 }}    // Animates to fully visible at natural position
          className="rounded-2xl p-8"
          // Semi-transparent dark background with red-tinted border and blur for glass-morphism effect
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(230,57,70,0.25)', backdropFilter: 'blur(12px)' }}
        >
          {/* Header section — shield icon badge + portal title + "Restricted Access" sub-label */}
          <div className="flex items-center gap-3 mb-8">
            {/* Shield icon badge — red gradient with glow, signals security/admin authority */}
            {/* flex-shrink-0 prevents the badge from compressing on narrow screens */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 0 24px rgba(230,57,70,0.5)' }}>
              {/* Filled shield-lock icon — universally understood symbol for a secured area */}
              <BI name="shield-lock-fill" className="text-white text-xl" />
            </div>
            <div>
              {/* Page title — "Admin Portal" rendered in bold with wide letter spacing */}
              <h1 className="font-black text-xl text-white leading-tight" style={{ letterSpacing: '0.05em' }}>
                {t('auth.admin_portal', 'Admin Portal')}
              </h1>
              {/* Sub-label — "RESTRICTED ACCESS" in red monospace uppercase caps for emphasis */}
              {/* letterSpacing 0.2em and uppercase transform create a military/clearance badge feel */}
              <p className="text-xs mt-0.5" style={{ color: '#E63946', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {t('auth.restricted_access', 'Restricted Access')}
              </p>
            </div>
          </div>

          {/* Error message banner — animates in when login fails or role is not ADMIN.
              AnimatePresence enables the exit animation when the error is cleared on next keystroke. */}
          <AnimatePresence>
            {/* Conditionally render the error banner only when an error string is present */}
            {error && (
              <motion.div key="err"
                // Slide down on enter, fade out on exit for smooth UX feedback
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
                // Red-tinted background with red border — visually distinct warning state
                style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.35)', color: '#E63946' }}>
                {/* Octagon exclamation icon draws attention to the authentication error message */}
                <BI name="exclamation-octagon-fill" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login form — controlled inputs bound to `form` state, submits via handleSubmit */}
          {/* space-y-4 applies consistent vertical spacing between email field, password field, and button */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email field — used as the admin's unique identity credential in the DMS system */}
            <div>
              {/* Label — uppercase tracking style matches the DMS admin design system */}
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {/* Envelope icon prefix reinforces that this input expects an email address */}
                <BI name="envelope-fill" className="me-1" /> {t('auth.email_address')}
              </label>
              <input
                ref={emailRef}                        // DOM ref enables auto-focus on page mount
                type="email" required autoComplete="username"
                value={form.email}                    // Controlled value from form state
                // Update email in form state and clear any existing error on each keystroke
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
                placeholder={t('auth.email_placeholder')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                // Dark semi-transparent background with subdued red border matches card style
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1.5px solid rgba(230,57,70,0.25)' }}
                // Highlight border red on focus to match the DMS admin color scheme
                onFocus={(e) => e.target.style.borderColor = '#E63946'}
                // Restore subtle border when focus leaves the field
                onBlur={(e) => e.target.style.borderColor = 'rgba(230,57,70,0.25)'}
              />
            </div>

            {/* Password field — hidden by default; toggle button reveals plaintext for usability */}
            <div>
              {/* Label — uppercase style consistent with email label above */}
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {/* Lock icon prefix communicates that this field holds a secret credential */}
                <BI name="lock-fill" className="me-1" /> {t('auth.password_label')}
              </label>
              {/* Relative wrapper enables absolute positioning of the show/hide toggle button inside */}
              <div className="relative">
                {/* Password input — switches between "password" and "text" type based on showPw state */}
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password}               // Controlled value from form state
                  // Update password in form state and clear any existing error on each keystroke
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  placeholder="••••••••••••"          // Dot placeholder reinforces it's a secret field
                  // pe-12 (padding-end) reserves space on the right so text doesn't overlap the toggle button
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pe-12"
                  // Matches email input styling for visual consistency within the form
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1.5px solid rgba(230,57,70,0.25)' }}
                  // Highlight border red on focus for consistent neon admin theme
                  onFocus={(e) => e.target.style.borderColor = '#E63946'}
                  // Restore dim border when focus is removed
                  onBlur={(e) => e.target.style.borderColor = 'rgba(230,57,70,0.25)'}
                />
                {/* Show/hide password toggle — tabIndex -1 keeps it out of the keyboard tab order
                    so Tab key moves directly from password input to submit button */}
                <button type="button" tabIndex={-1}
                  // Toggle showPw state between true/false to reveal or mask the password
                  onClick={() => setShowPw(v => !v)}
                  // Centered vertically via translate, aligned to the end (right in LTR) of the input
                  className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {/* Eye icon changes based on visibility state: eye-slash when visible, eye when masked */}
                  <BI name={showPw ? 'eye-slash' : 'eye'} className="text-base" />
                </button>
              </div>
            </div>

            {/* Submit button — animated with framer-motion hover/tap effects; disabled during API call */}
            <motion.button
              type="submit" disabled={loading}
              // Subtle scale-up on hover and scale-down on tap for tactile feedback; no effect while loading
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              // disabled:opacity-60 dims the button while the API call is in flight to signal unavailability
              className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              // Red gradient with glowing shadow maintains the admin danger/authority color language
              style={{ background: 'linear-gradient(135deg, #E63946 0%, #c0392b 100%)', boxShadow: '0 4px 20px rgba(230,57,70,0.4)' }}
            >
              {/* Conditional render: show spinner + "Authenticating…" during API call, or icon + label when idle */}
              {loading ? (
                <>
                  {/* Spinning SVG circle — CSS animation class "animate-spin" drives the rotation */}
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    {/* Background track circle — low opacity gives depth to the spinner */}
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    {/* Arc segment completes the spinner visual with higher opacity to show progress */}
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {/* Localized "Authenticating…" label shown while waiting for backend response */}
                  {t('auth.authenticating')}
                </>
              ) : (
                // Idle state: shield-lock icon + "Access System" call-to-action label
                <><BI name="shield-lock" className="text-base" /> {t('auth.access_system', 'Access System')}</>
              )}
            </motion.button>
          </form>

          {/* Footer navigation — divider line separating form from auxiliary links */}
          {/* justify-between spreads the back link and "Admin only" label to opposite ends */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {/* Back link — navigates to /login (citizen portal) if the user reached this page by mistake */}
            <Link to="/login" className="flex items-center gap-1 hover:text-white transition-colors">
              {/* Left arrow icon provides a clear visual affordance for backward navigation */}
              <BI name="arrow-left" /> {t('auth.citizen_login', 'Citizen Login')}
            </Link>
            {/* Static label reinforcing that this portal accepts only DMS administrator accounts */}
            <span className="flex items-center gap-1">
              {/* Small lock icon echoes the password field, reinforcing the restricted nature of this portal */}
              <BI name="lock-fill" /> {t('auth.admin_only', 'Admin only')}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}