/**
 * @file Profile.jsx
 * @description User profile management page for the Disaster Management System (DMS).
 *
 * This page allows authenticated DMS users of any role (ADMIN, RESCUE_TEAM, RESPONDER,
 * OFFICIAL, CITIZEN) to view and update their personal information. The UI dynamically
 * adapts based on the logged-in user's role, showing role-specific tabs and fields such as:
 *   - Citizens: emergency contact details used during incident response
 *   - Rescue Team / Responders: agency, badge number, certifications, vehicle type
 *   - Officials: government department, jurisdiction, and official ID
 *   - Admins: read-only overview of full system privileges
 *   - All roles: personal info (name, phone) and password/security settings
 *
 * Uses the global auth store (Zustand), the userAPI service, i18n translations,
 * and framer-motion animations. Persists profile updates to both the backend and
 * localStorage to keep the auth session in sync after changes.
 */

// React core — useState for local form/UI state, useRef (imported for potential future use)
import React, { useState, useRef } from 'react';
// framer-motion — motion for animated elements, AnimatePresence for tab transition animations
import { motion, AnimatePresence } from 'framer-motion';
// i18next React hook — provides the t() translation function for multilingual DMS UI
import { useTranslation } from 'react-i18next';
// Global Zustand auth store — provides the current user object and setUser updater
import { useAuthStore } from '../store';
// DMS REST API service — userAPI exposes updateProfile and changePassword endpoints
import { userAPI } from '../services/api';
// DMS notification hub — displays ephemeral toast alerts for success/error feedback
import { showNotification } from '../components/NotificationHub';

/**
 * BI — Convenience wrapper for Bootstrap Icons.
 * Renders a <i> element using the Bootstrap Icons CSS class pattern (bi bi-<name>).
 * Used throughout this page for role icons, tab icons, action icons, and status dots.
 *
 * @param {string} name - Bootstrap icon name (e.g. 'shield-fill', 'person-circle')
 * @param {string} [className] - Additional CSS classes to append
 * @param {object} [style] - Inline styles (e.g. color, fontSize) for icon theming
 */
const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

// ── Role config per account type ──────────────────────────────────────────────
/**
 * ROLE_CONFIG — Static configuration map keyed by DMS user role.
 * Each entry defines the visual theme (accent color, background tint, text color),
 * display label, Bootstrap icon, description, and list of capabilities shown on the
 * profile hero card. This drives the role-aware color scheme and capability summary
 * across the entire profile page without needing conditional style logic in JSX.
 */
const ROLE_CONFIG = {
  // ADMIN: Full system access — red accent reflects urgency/authority in the DMS color system
  ADMIN: {
    accent: '#E63946', bg: 'rgba(230,57,70,0.1)', text: '#fca5a5',
    label: 'System Administrator', icon: 'shield-fill',
    description: 'Full system access — manage users, incidents, resources and system configuration.',
    // Capabilities shown as pills on the profile hero; inform the admin of their DMS permissions
    capabilities: ['Manage all users & roles', 'View all incidents system-wide', 'Configure system settings', 'Access audit logs & reports', 'Manage resources & teams'],
  },
  // RESCUE_TEAM: Field responder — amber accent matches operational/warning tone
  RESCUE_TEAM: {
    accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: '#fcd34d',
    label: 'Rescue Team Officer', icon: 'fire',
    description: 'Field responder with real-time incident access and resource coordination.',
    // Capabilities reflect on-site incident response and resource coordination actions
    capabilities: ['View & respond to active incidents', 'Update incident status on-site', 'Access resource & team assignments', 'View incident maps & media', 'Coordinate with dispatch'],
  },
  // RESPONDER: Emergency dispatch — orange accent differentiates from RESCUE_TEAM in the UI
  RESPONDER: {
    accent: '#FF7A00', bg: 'rgba(255,122,0,0.1)', text: '#fdba74',
    label: 'Emergency Responder', icon: 'activity',
    description: 'Emergency dispatch and field coordination for active incidents.',
    // Capabilities focus on incident assignment and resource allocation
    capabilities: ['Manage incident assignments', 'Update incident status', 'Allocate emergency resources', 'View all active incidents', 'Access team & resource maps'],
  },
  // OFFICIAL: Government oversight — purple accent signals authority/reporting role
  OFFICIAL: {
    accent: '#7c3aed', bg: 'rgba(124,58,237,0.1)', text: '#c4b5fd',
    label: 'Government Official', icon: 'building',
    description: 'Oversight and reporting access for government coordination.',
    // Capabilities are read-only / analytical — officials cannot mutate incidents directly
    capabilities: ['View all incident reports', 'Access analytics & trends', 'Generate official reports', 'Monitor resource utilization', 'View system-wide statistics'],
  },
  // CITIZEN: Public user — green accent signals safety/community; most limited access set
  CITIZEN: {
    accent: '#059669', bg: 'rgba(5,150,105,0.1)', text: '#6ee7b7',
    label: 'Community Member', icon: 'person-circle',
    description: 'Report incidents and track your emergency reports.',
    // Citizens can submit and track their own incident reports and receive emergency alerts
    capabilities: ['Submit incident reports', 'Track your own reports', 'Receive emergency alerts', 'View incident map', 'Get real-time notifications'],
  },
};

// ── Animated stat card ────────────────────────────────────────────────────────
/**
 * StatCard — Reusable animated metric card used for displaying account security stats
 * (e.g. member-since date, last login, alert status) in the Security tab.
 * Animates in with a staggered vertical slide using framer-motion.
 *
 * @param {string} icon - Bootstrap icon name for the stat visual
 * @param {string} label - Descriptive label shown below the value (e.g. "Member Since")
 * @param {string|number} value - The stat value to display (e.g. "Today", "2024-01-01")
 * @param {string} color - Hex or CSS color string matching the current role accent
 * @param {number} [delay=0] - Framer-motion entry animation delay in seconds for staggering
 */
function StatCard({ icon, label, value, color, delay = 0 }) {
  return (
    // Animate the card in from below with configurable delay for stagger effect
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="flex flex-col items-center gap-1 p-3 rounded-2xl flex-1"
      // Background tint and border use role accent color at low opacity for subtle theming
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}
    >
      {/* Role-colored icon representing the stat category */}
      <BI name={icon} style={{ color, fontSize: '1.25rem' }} />
      {/* Primary stat value — bold and role-accent colored for visual emphasis */}
      <span className="text-lg font-black" style={{ color }}>{value}</span>
      {/* Descriptive label in tertiary text color for visual hierarchy */}
      <span className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </motion.div>
  );
}

/**
 * Profile — Main profile page component for the DMS.
 * Renders a role-aware user profile card with tabbed sections for personal info,
 * role-specific data, and security/password management. All form submissions patch
 * the backend via userAPI and keep the Zustand auth store and localStorage in sync.
 */
export default function Profile() {
  // Pull current authenticated user and the setter to update auth state after profile edits
  const { user, setUser } = useAuthStore();
  // t() provides translated strings for all labels, placeholders, and notifications
  const { t } = useTranslation();
  // Derive the user's DMS role; default to CITIZEN if role is absent (e.g. legacy accounts)
  const role = user?.role || 'CITIZEN';
  // Look up the visual/theme config for the current role; fall back to CITIZEN defaults
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.CITIZEN;

  /**
   * formData — Controlled form state for all editable profile fields.
   * Seeded from the current user in the auth store on mount.
   * Fields are grouped by role: base fields (all roles), CITIZEN extras,
   * RESCUE_TEAM/RESPONDER extras, and OFFICIAL extras. Only the relevant
   * subset is sent to the backend on submit.
   */
  const [formData, setFormData] = useState({
    // Base personal info fields — editable by all DMS user roles
    firstName:   user?.firstName   || '',
    lastName:    user?.lastName    || '',
    email:       user?.email       || '',       // read-only — identity field, not updatable via profile
    phoneNumber: user?.phoneNumber || '',
    // CITIZEN extras — emergency contact used during incident-triggered alerts
    emergencyContactName:  user?.emergencyContactName  || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
    // RESCUE_TEAM / RESPONDER extras — operational identity for field assignment and dispatch
    agency:           user?.agency           || '',  // e.g. "Civil Defense Unit 3"
    certifications:   user?.certifications   || '',  // e.g. "EMT, HazMat, Swift Water"
    badgeNumber:      user?.badgeNumber      || '',  // official badge/ID for field identification
    vehicleType:      user?.vehicleType      || '',  // e.g. "Fire Engine", "Ambulance"
    // OFFICIAL extras — government identity for oversight and inter-agency coordination
    department:       user?.department       || '',  // e.g. "Ministry of Interior"
    jurisdiction:     user?.jurisdiction     || '',  // e.g. "Amman Governorate"
    officialId:       user?.officialId       || '',  // government-issued official identifier
  });

  // Password change form state — kept separate from profile data to avoid accidental submission
  const [pwForm,    setPwForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  // isLoading — tracks async profile update request to disable submit and show spinner
  const [isLoading, setIsLoading] = useState(false);
  // pwLoading — tracks async password change request separately from profile save
  const [pwLoading, setPwLoading] = useState(false);
  // showPw — toggles the password change form visibility; collapsed by default for safety
  const [showPw,    setShowPw]    = useState(false);
  // activeTab — controls which tab panel is currently visible (e.g. 'info', 'security')
  const [activeTab, setActiveTab] = useState('info');

  /**
   * set — Shorthand helper for updating a single key in formData immutably.
   * Avoids repeating the spread pattern in every onChange handler.
   * @param {string} k - Field key in formData (e.g. 'firstName', 'agency')
   * @param {*} v - New value to set for that field
   */
  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  /**
   * handleSubmit — Handles profile form submission for all role-specific tabs.
   * Builds a role-filtered payload (only sends fields relevant to the user's role)
   * to avoid accidentally overwriting fields with empty strings on the backend.
   * On success: merges the API response into localStorage and Zustand auth store
   * so the nav/header immediately reflects the updated name/phone.
   * On failure: shows a generic error notification.
   *
   * @param {React.FormEvent} e - Form submit event; prevented from causing page reload
   */
  const handleSubmit = async (e) => {
    // Prevent native form submit which would trigger a full page reload
    e.preventDefault();
    setIsLoading(true);
    try {
      // Always include base personal info fields in the update payload
      const payload = { firstName: formData.firstName, lastName: formData.lastName, phoneNumber: formData.phoneNumber };
      // Conditionally append role-specific fields — only send what's applicable to avoid data loss
      // CITIZEN: include emergency contact so first responders can reach someone during incidents
      if (role === 'CITIZEN')  Object.assign(payload, { emergencyContactName: formData.emergencyContactName, emergencyContactPhone: formData.emergencyContactPhone });
      // RESCUE_TEAM / RESPONDER: include field identity used in dispatch and resource assignment
      if (role === 'RESCUE_TEAM' || role === 'RESPONDER') Object.assign(payload, { agency: formData.agency, certifications: formData.certifications, badgeNumber: formData.badgeNumber, vehicleType: formData.vehicleType });
      // OFFICIAL: include government credentials used for inter-agency reporting
      if (role === 'OFFICIAL') Object.assign(payload, { department: formData.department, jurisdiction: formData.jurisdiction, officialId: formData.officialId });

      // PATCH the user profile via the DMS backend REST API
      const { data } = await userAPI.updateProfile(payload);
      // API may wrap the user object in a .data envelope — unwrap defensively
      const updated = data?.data || data;
      // Read the current user from localStorage to preserve fields the API doesn't return
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      // Merge API response over stored user to get the full up-to-date user object
      const merged = { ...stored, ...updated };
      // Persist the merged user back to localStorage so auth survives page refresh
      localStorage.setItem('user', JSON.stringify(merged));
      // Update Zustand auth store so all components consuming useAuthStore reflect changes immediately
      setUser(merged);
      // Show success notification using the DMS notification hub
      showNotification(t('profile.updated'), 'success');
    } catch (_) {
      // Show generic error notification — specific error details are not exposed to the user
      showNotification(t('profile.error'), 'error');
    } finally {
      // Always re-enable the submit button regardless of outcome
      setIsLoading(false);
    }
  };

  /**
   * handlePasswordChange — Handles password update form submission.
   * Validates that newPassword and confirmPassword match before calling the API.
   * On success: clears the password form and collapses the form panel for security.
   * On failure: shows the backend error message if available, else a generic fallback.
   *
   * @param {React.FormEvent} e - Form submit event; prevented from page reload
   */
  const handlePasswordChange = async (e) => {
    // Prevent native form submit
    e.preventDefault();
    // Client-side validation: ensure new password fields match before hitting the backend
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showNotification(t('auth.passwords_no_match'), 'error'); return;
    }
    setPwLoading(true);
    try {
      // Call the DMS changePassword endpoint with current and new password for verification
      await userAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      // Notify the user of success and reset the password form fields
      showNotification(t('profile.pw_changed'), 'success');
      // Clear all password fields to prevent stale credentials remaining in state
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Collapse the password form for security — requires deliberate re-open to try again
      setShowPw(false);
    } catch (err) {
      // Show backend error message (e.g. "Incorrect current password") or generic fallback
      showNotification(err.response?.data?.message || t('profile.pw_failed'), 'error');
    } finally {
      // Re-enable the submit button regardless of success or failure
      setPwLoading(false);
    }
  };

  // inputCls — shared Tailwind utility classes for all form input elements
  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all';
  // inputStyle — shared inline styles applying DMS CSS design token variables to inputs
  const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' };
  // labelStyle — shared inline styles for form field labels using DMS design tokens
  const labelStyle = { color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' };
  // cardStyle — shared card container style using DMS secondary background and shadow tokens
  const cardStyle  = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 16, boxShadow: 'var(--shadow-sm)' };
  // focusRed — onFocus handler that highlights input border with the role accent color
  const focusRed   = e => (e.target.style.borderColor = cfg.accent);
  // blurGray — onBlur handler that restores the neutral border color on input blur
  const blurGray   = e => (e.target.style.borderColor = 'var(--border-input)');

  // initials — two-character avatar placeholder derived from the user's first and last name
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  // Tabs per role — dynamically build the tab list based on the current user's DMS role
  const tabs = [
    // 'info' tab is always present — all roles can update base personal info
    { key: 'info',     label: 'Personal Info', icon: 'person-fill' },
    // 'emergency' tab — only CITIZEN users need to supply emergency contact for incident response
    ...(role === 'CITIZEN'                        ? [{ key: 'emergency', label: 'Emergency Contact', icon: 'telephone-fill' }] : []),
    // 'field' tab — only RESCUE_TEAM and RESPONDER roles have operational field details
    ...(role === 'RESCUE_TEAM' || role === 'RESPONDER' ? [{ key: 'field',     label: 'Field Info',       icon: 'activity'     }] : []),
    // 'official' tab — only OFFICIAL role has government department and jurisdiction fields
    ...(role === 'OFFICIAL'                        ? [{ key: 'official',  label: 'Official Info',    icon: 'building'     }] : []),
    // 'admin' tab — only ADMIN role sees the system privilege overview panel
    ...(role === 'ADMIN'                           ? [{ key: 'admin',     label: 'Admin Access',     icon: 'shield-fill'  }] : []),
    // 'security' tab is always present — all roles can change their password
    { key: 'security', label: 'Security',       icon: 'lock-fill' },
  ];

  return (
    // Outer page wrapper — constrained width, bottom padding, vertical spacing between cards
    <div className="max-w-2xl mx-auto pb-10 space-y-5">

      {/* Hero header — animated role identity card with avatar, role badge, and capability pills */}
      <motion.div
        // Slide down from above on mount for a polished entry animation
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        // Background gradient uses role accent color to visually signal the user's DMS role
        style={{ background: `linear-gradient(135deg, ${cfg.accent}20, ${cfg.accent}08)`, border: `1px solid ${cfg.accent}30` }}
      >
        {/* Background decorative radial gradient pattern — purely visual, zero opacity impact on content */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${cfg.accent} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${cfg.accent} 0%, transparent 40%)`,
        }} />

        {/* Hero content row — avatar on left, user info on right */}
        <div className="relative flex items-start gap-4">
          {/* Avatar block — displays user initials or fallback icon; springs on hover */}
          <motion.div
            whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}
            className="relative flex-shrink-0"
          >
            {/* Avatar circle — gradient background uses role accent; boxShadow adds depth */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl"
              style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}aa)`, boxShadow: `0 8px 32px ${cfg.accent}40` }}>
              {/* Render initials if available; otherwise fall back to a generic person icon */}
              {initials || <BI name="person-fill" />}
            </div>
            {/* Green online presence indicator dot — shows user is currently active in DMS */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ background: '#059669', borderColor: 'var(--bg-primary)' }}>
              {/* Inner white dot for contrast against the green indicator */}
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </motion.div>

          {/* User identity info block — name, email, role badge, and role description */}
          <div className="flex-1 min-w-0">
            {/* Full name headline */}
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </h1>
            {/* Email shown as secondary text — not editable but used as DMS login identity */}
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
            {/* Role badge pill — uses role accent color and icon from ROLE_CONFIG */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: cfg.bg, color: cfg.accent }}>
              {/* Role icon (e.g. shield for admin, fire for rescue team) */}
              <BI name={cfg.icon} />
              {/* Role display label (e.g. "System Administrator", "Community Member") */}
              {cfg.label}
            </span>
            {/* Short role description explaining the user's access level and DMS responsibilities */}
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {cfg.description}
            </p>
          </div>
        </div>

        {/* Capability pills — animate in with stagger to list role-specific DMS permissions */}
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {cfg.capabilities.map((cap, i) => (
            // Each pill staggers in with a 50ms delay increment for a cascade animation effect
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
            >
              {/* Checkmark icon in role accent color precedes each capability text */}
              <BI name="check-circle-fill" className="me-1" style={{ color: cfg.accent, fontSize: '0.65rem' }} />
              {cap}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Tab bar — role-filtered navigation tabs; scrollable horizontally on small screens */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-none"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
      >
        {/* Render only the tabs applicable to the current user's DMS role */}
        {tabs.map(tab => (
          <button
            key={tab.key}
            // Switch the active tab panel on click
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              // Active tab gets role accent background + glow; inactive tabs are transparent
              background: activeTab === tab.key ? cfg.accent : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.key ? `0 4px 12px ${cfg.accent}40` : 'none',
            }}
          >
            {/* Tab icon using Bootstrap Icons */}
            <BI name={tab.icon} />
            {/* Tab label text */}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content — AnimatePresence enables smooth cross-fade between tab panels */}
      <AnimatePresence mode="wait">
        {/* Animated content card — slides and fades on tab switch */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          style={cardStyle} className="p-6"
        >

          {/* ── PERSONAL INFO ── */}
          {/* Shown for all roles; collects base identity info: name and phone number */}
          {activeTab === 'info' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section heading with role accent icon */}
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="person-fill" style={{ color: cfg.accent }} /> Personal Information
              </h2>
              {/* First name / Last name on same row using a two-column grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>{t('profile.first_name')}</label>
                  {/* First name input — updates formData.firstName on change */}
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.firstName} onChange={e => set('firstName', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.last_name')}</label>
                  {/* Last name input — updates formData.lastName on change */}
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.lastName} onChange={e => set('lastName', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('profile.email')}</label>
                {/* Email is disabled — it is the user's unique DMS identity and cannot be changed here */}
                <input className={inputCls} style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  type="email" value={formData.email} disabled />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.phone')}</label>
                {/* Phone number input — used for emergency contact and incident alert delivery */}
                <input className={inputCls} style={inputStyle} type="tel"
                  value={formData.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.phone_placeholder', '+962 7X XXX XXXX')} />
              </div>

              {/* Role info row — read-only display reminding the user of their current DMS role */}
              <div className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: cfg.bg, border: `1px solid ${cfg.accent}30` }}>
                {/* Role icon in accent color for visual association */}
                <BI name={cfg.icon} style={{ color: cfg.accent, fontSize: '1.5rem' }} />
                <div>
                  {/* Role label — e.g. "Rescue Team Officer" */}
                  <p className="text-xs font-semibold" style={{ color: cfg.accent }}>{cfg.label}</p>
                  {/* Localized note explaining that account type is managed by administrators */}
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('profile.account_type_note')}</p>
                </div>
              </div>

              {/* Submit button — disabled during loading to prevent duplicate requests */}
              <motion.button type="submit" disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`, boxShadow: `0 4px 16px ${cfg.accent}30` }}>
                {/* Show spinner + localized "Saving…" text while request is in flight */}
                {isLoading ? <><BI name="arrow-repeat" className="me-2" style={{ animation: 'spin 1s linear infinite' }} />{t('profile.saving')}</> : <><BI name="check-lg" className="me-2" />{t('profile.save')}</>}
              </motion.button>
            </form>
          )}

          {/* ── CITIZEN: Emergency Contact ── */}
          {/* Only rendered for CITIZEN role; captures emergency contact for incident response use */}
          {activeTab === 'emergency' && role === 'CITIZEN' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section heading with green phone icon — green reinforces safety/citizen theme */}
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="telephone-fill" style={{ color: '#059669' }} /> {t('profile.emergency_contact_section')}
              </h2>
              {/* Informational banner explaining why emergency contact info is collected */}
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', color: '#059669' }}>
                <BI name="info-circle-fill" className="me-1.5" />
                {t('profile.emergency_contact_desc')}
              </div>
              <div>
                <label style={labelStyle}>{t('profile.emergency_name')}</label>
                {/* Emergency contact name — person to notify when citizen is involved in an incident */}
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.emergency_name_placeholder')} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.emergency_phone')}</label>
                {/* Emergency contact phone — dialed by responders if citizen cannot be reached */}
                <input className={inputCls} style={inputStyle} type="tel"
                  value={formData.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.emergency_phone_placeholder', '+962 7X XXX XXXX')} />
              </div>
              {/* Save button with green gradient matching the citizen/safety color theme */}
              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                <BI name="check-lg" className="me-2" />{t('profile.save')}
              </motion.button>
            </form>
          )}

          {/* ── RESCUE_TEAM / RESPONDER: Field Info ── */}
          {/* Only rendered for field role types; captures operational details for incident dispatch */}
          {activeTab === 'field' && (role === 'RESCUE_TEAM' || role === 'RESPONDER') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section heading using role accent color to maintain visual consistency */}
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="activity" style={{ color: cfg.accent }} /> {t('profile.field_info_section')}
              </h2>
              {/* Agency and Badge Number in a two-column grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>{t('profile.agency_unit')}</label>
                  {/* Agency/unit name — used by dispatchers to assign responders to incidents */}
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.agency} onChange={e => set('agency', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.agency_placeholder')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.badge_id')}</label>
                  {/* Badge/ID number — official identifier for field responder authentication */}
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.badgeNumber} onChange={e => set('badgeNumber', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.badge_placeholder')} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('profile.certifications_label')}</label>
                {/* Certifications — e.g. EMT, HazMat; determines which incident types can be assigned */}
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.certifications} onChange={e => set('certifications', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.cert_placeholder')} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.vehicle_equipment')}</label>
                {/* Vehicle/equipment type — e.g. "Fire Engine"; used in resource allocation for incidents */}
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.vehicleType} onChange={e => set('vehicleType', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.vehicle_placeholder')} />
              </div>
              {/* Save button styled with role accent gradient (amber for RESCUE_TEAM, orange for RESPONDER) */}
              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`, boxShadow: `0 4px 16px ${cfg.accent}30` }}>
                <BI name="check-lg" className="me-2" />{t('profile.save')}
              </motion.button>
            </form>
          )}

          {/* ── OFFICIAL: Official Info ── */}
          {/* Only rendered for OFFICIAL role; captures government identity for oversight coordination */}
          {activeTab === 'official' && role === 'OFFICIAL' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section heading with purple building icon matching OFFICIAL role accent */}
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="building" style={{ color: '#7c3aed' }} /> {t('profile.official_info_section')}
              </h2>
              {/* Department and Official ID in a two-column grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>{t('profile.department_label')}</label>
                  {/* Government department — e.g. "Ministry of Interior", used for inter-agency reporting */}
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.department} onChange={e => set('department', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.department_placeholder')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.official_id_label')}</label>
                  {/* Official government-issued ID — used to verify the official's identity in DMS */}
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.officialId} onChange={e => set('officialId', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.official_id_placeholder')} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('profile.jurisdiction_label')}</label>
                {/* Jurisdiction — geographic/administrative area the official oversees (e.g. "Amman Governorate") */}
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.jurisdiction} onChange={e => set('jurisdiction', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder={t('profile.jurisdiction_placeholder')} />
              </div>
              {/* Save button with purple gradient matching the OFFICIAL role accent color */}
              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                <BI name="check-lg" className="me-2" />{t('profile.save')}
              </motion.button>
            </form>
          )}

          {/* ── ADMIN: Access Overview ── */}
          {/* Read-only panel showing the system admin their full DMS privilege set */}
          {activeTab === 'admin' && role === 'ADMIN' && (
            <div className="space-y-4">
              {/* Section heading with red shield icon matching ADMIN role accent */}
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="shield-fill" style={{ color: '#E63946' }} /> Administrator Access
              </h2>
              {/* Privilege container with red tint background to reinforce admin authority */}
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.2)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#E63946' }}>Full System Privileges</p>
                {/* Admin privilege list — each item explains an admin's DMS system access area */}
                {[
                  { icon: 'people-fill',     label: 'User Management',      desc: 'Create, edit, disable and assign roles to all users' },
                  { icon: 'exclamation-triangle-fill', label: 'Incident Control', desc: 'View, update, assign and close all incidents' },
                  { icon: 'graph-up-arrow',  label: 'Analytics Access',     desc: 'Full access to all dashboards and reports' },
                  { icon: 'gear-fill',       label: 'System Configuration', desc: 'Manage resources, teams, shelters, alerts' },
                  { icon: 'file-earmark-text-fill', label: 'Audit Logs',   desc: 'View complete system activity and audit trail' },
                ].map((item, i) => (
                  // Each privilege row slides in from the left with staggered animation
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 py-2" style={{ borderBottom: i < 4 ? '1px solid rgba(230,57,70,0.1)' : 'none' }}>
                    {/* Privilege category icon in red admin accent color */}
                    <BI name={item.icon} style={{ color: '#E63946', fontSize: '1rem', marginTop: 2 }} />
                    <div>
                      {/* Privilege label — short name for the admin access area */}
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                      {/* Privilege description — one-line explanation of what the admin can do */}
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {/* Shown for all roles; allows changing account password and viewing account security metadata */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Section heading with role-accent lock icon */}
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="lock-fill" style={{ color: cfg.accent }} /> {t('profile.change_password')}
              </h2>
              {/* Password strength guidance banner — encourages secure DMS account hygiene */}
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                <BI name="info-circle-fill" className="me-1.5" />
                Use a strong password with at least 8 characters, including uppercase, numbers, and symbols.
              </div>
              {/* Show a "Change Password" prompt button when the form is collapsed */}
              {!showPw ? (
                // Outline button styled with role accent — opens the password form on click
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPw(true)}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ border: `1.5px solid ${cfg.accent}`, color: cfg.accent, background: cfg.bg }}>
                  <BI name="pencil-fill" /> Change Password
                </motion.button>
              ) : (
                // Password change form — rendered inline when the user clicks "Change Password"
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  {/* Dynamically render three password fields using a field config array */}
                  {[
                    { name: 'currentPassword', label: t('profile.current_password'), placeholder: t('profile.current_password_placeholder') },
                    { name: 'newPassword',      label: t('profile.new_password'),     placeholder: t('profile.new_password_placeholder') },
                    // confirmPassword is validated client-side against newPassword before submission
                    { name: 'confirmPassword',  label: t('profile.confirm_password'), placeholder: t('profile.confirm_password_placeholder') },
                  ].map(({ name, label, placeholder }) => (
                    <div key={name}>
                      <label style={labelStyle}>{label}</label>
                      {/* Password input — type="password" masks input; required prevents empty submission */}
                      <input className={inputCls} style={inputStyle} type="password" required
                        placeholder={placeholder}
                        // Update the specific pwForm field using computed property name
                        value={pwForm[name]} onChange={e => setPwForm(p => ({ ...p, [name]: e.target.value }))}
                        onFocus={focusRed} onBlur={blurGray} />
                    </div>
                  ))}
                  {/* Action row: Cancel collapses the form; Submit sends the password change request */}
                  <div className="flex gap-2 pt-1">
                    {/* Cancel button — resets showPw to false, collapsing the form without saving */}
                    <button type="button" onClick={() => setShowPw(false)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                      style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
                      {t('common.cancel')}
                    </button>
                    {/* Submit button — disabled during the async password change request */}
                    <motion.button type="submit" disabled={pwLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 py-2.5 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                      style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)` }}>
                      {/* Show loading text while awaiting API response; otherwise show action label */}
                      {pwLoading ? t('common.loading') : t('profile.change_password')}
                    </motion.button>
                  </div>
                </form>
              )}

              {/* Account security info — read-only metadata grid showing account status details */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Security metadata items: registration date, last login, auth method, alert status */}
                {[
                  // createdAt from user object — shows when this DMS account was registered
                  { icon: 'calendar-check', label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
                  // Last login is currently static — could be populated from an audit log in future
                  { icon: 'clock-history',  label: 'Last Login',   value: 'Today' },
                  // Auth method indicator — currently only password auth is supported in DMS
                  { icon: 'shield-check',   label: 'Security',     value: 'Password Auth' },
                  // Alert status — indicates the user is subscribed to emergency notifications
                  { icon: 'bell-fill',      label: 'Alerts',       value: 'Enabled' },
                ].map(({ icon, label, value }, i) => (
                  // Each metadata tile uses tertiary background and primary border for subtle card appearance
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                    {/* Metadata icon in role accent color for visual consistency across the security tab */}
                    <BI name={icon} style={{ color: cfg.accent, fontSize: '1rem' }} />
                    <div>
                      {/* Metadata label in tertiary text for reduced visual weight */}
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                      {/* Metadata value in primary text for readability */}
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}