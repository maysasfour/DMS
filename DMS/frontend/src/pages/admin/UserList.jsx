/**
 * @file UserList.jsx
 * @description Admin User Database page for the Disaster Management System (DMS).
 *
 * Provides a full CRUD interface for managing all system user accounts including
 * citizens who report incidents, responders who handle them, rescue teams deployed
 * to disaster zones, government officials overseeing operations, and system admins.
 *
 * Features:
 *  - Paginated server-side user listing via the userAPI service
 *  - Client-side filtering by role, account status (active/disabled), and text search
 *  - Inline role editing directly from the table row without opening a modal
 *  - Create new user modal with full field validation
 *  - Edit user modal scoped to role changes only (credentials managed separately)
 *  - Delete confirmation modal with permanent-removal warning
 *  - Enable/disable user accounts (soft deactivation — user cannot log in when disabled)
 *  - Live summary stats: total, active, disabled, and per-role counts
 *  - Animated transitions via Framer Motion for a responsive admin experience
 *  - Bootstrap Icons (BI) used consistently across all UI controls
 */

// React core hooks: useEffect for data fetching lifecycle, useState for local UI state,
// useCallback for memoized fetch function to avoid unnecessary re-renders
import React, { useEffect, useState, useCallback } from 'react';

// Link enables client-side navigation to the individual user profile detail page
import { Link } from 'react-router-dom';

// motion and AnimatePresence provide enter/exit animations for rows and modals
import { motion, AnimatePresence } from 'framer-motion';

// Multilingual support — DMS serves users in Arabic, English, French, Spanish, Turkish
import { useTranslation } from 'react-i18next';

// DMS user API service wrapping backend REST endpoints for user CRUD operations
import { userAPI } from '../../services/api';

// Global toast notification system used to surface success/error feedback to the admin
import { showNotification } from '../../components/NotificationHub';

/**
 * BI — Lightweight wrapper around Bootstrap Icons.
 * Renders a <i> element with the correct `bi bi-<name>` class so icon usage stays
 * concise throughout this file without repeating the class prefix every time.
 *
 * @param {string} name - Bootstrap Icon name (e.g. 'trash3-fill', 'person-fill')
 * @param {string} [className] - Additional Tailwind/CSS classes to apply
 * @param {object} [style] - Inline style object (e.g. font-size, color overrides)
 */
const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

/**
 * ROLES — Ordered list of all assignable roles in the DMS.
 * Order matters: it determines the sequence in the role picker UI.
 * - CITIZEN: public users who submit incident reports
 * - RESPONDER: field personnel dispatched to incidents
 * - RESCUE_TEAM: specialized teams for search and rescue operations
 * - OFFICIAL: government observers with read-heavy access
 * - ADMIN: system administrators with full management privileges
 */
const ROLES = ['CITIZEN', 'RESPONDER', 'RESCUE_TEAM', 'OFFICIAL', 'ADMIN'];

/**
 * ROLE_CFG — Visual configuration map keyed by DMS role name.
 * Each entry defines the accent color, background tint, Bootstrap Icon name,
 * and human-readable label used in badges, avatars, and role-picker buttons.
 * Colors follow the DMS neon cyberpunk design system (dark-mode safe).
 */
const ROLE_CFG = {
  // Admins are shown in red — highest authority, most visible in the list
  ADMIN:       { color: '#E63946', bg: 'rgba(230,57,70,0.12)',  icon: 'shield-fill',   label: 'Admin'       },
  // Responders in orange — actively deployed to handle disaster incidents
  RESPONDER:   { color: '#FF7A00', bg: 'rgba(255,122,0,0.12)',  icon: 'activity',      label: 'Responder'   },
  // Rescue teams in amber — fire/flood/collapse specialists
  RESCUE_TEAM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'fire',          label: 'Rescue Team' },
  // Officials in purple — government liaisons with oversight access
  OFFICIAL:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: 'briefcase-fill',label: 'Official'    },
  // Citizens in green — the public who report incidents via the DMS portal
  CITIZEN:     { color: '#059669', bg: 'rgba(5,150,105,0.12)',  icon: 'person-fill',   label: 'Citizen'     },
};

/**
 * EMPTY_FORM — Default blank state for the Create User form fields.
 * Role defaults to CITIZEN because the majority of new accounts are public users.
 * Password is always empty on open — never pre-filled for security reasons.
 */
const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '', role: 'CITIZEN' };

/* ── tiny helpers ── */

/**
 * Avatar — Displays a user's initials inside a colored circle.
 * The background gradient color is derived from the user's DMS role via ROLE_CFG
 * so admins, responders, and citizens are visually distinguishable at a glance.
 *
 * @param {object} user - User object containing firstName, lastName, and role
 * @param {number} [size=8] - Tailwind size class value (e.g. 8 → w-8 h-8)
 */
function Avatar({ user, size = 8 }) {
  // Look up role-specific color; fall back to CITIZEN styling if role is unknown
  const cfg = ROLE_CFG[user?.role] || ROLE_CFG.CITIZEN;
  return (
    // Circle container sized by the `size` prop; flex-centered for the initials text
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)` }}>
      {/* Display first letter of first name + first letter of last name as the avatar */}
      {user?.firstName?.[0]}{user?.lastName?.[0]}
    </div>
  );
}

/**
 * RoleBadge — Inline pill badge displaying a user's DMS role.
 * Shows the role icon and label with role-specific color coding so admins can
 * instantly identify a user's permission level in the table.
 *
 * @param {string} role - DMS role string (e.g. 'RESPONDER', 'CITIZEN')
 */
function RoleBadge({ role }) {
  // Look up display config for the given role; fall back to CITIZEN defaults
  const cfg = ROLE_CFG[role] || ROLE_CFG.CITIZEN;
  return (
    // Pill-shaped badge with role-specific background tint and text color
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      {/* Small role icon at reduced size to keep badge compact */}
      <BI name={cfg.icon} style={{ fontSize: '0.6rem' }} /> {cfg.label}
    </span>
  );
}

/* ── Create / Edit modal ── */

/**
 * UserModal — Shared modal for creating a new DMS user or editing an existing one.
 *
 * In 'create' mode: collects firstName, lastName, email, password, phone, and role.
 * In 'edit' mode: only allows changing the user's role (credentials are not editable here).
 *
 * On save, calls the appropriate userAPI method and triggers a success/error notification.
 *
 * @param {'create'|'edit'} mode - Determines which form fields are shown and which API to call
 * @param {object} [user] - Existing user object (required in 'edit' mode for pre-population)
 * @param {function} onClose - Callback to close the modal without saving
 * @param {function} onSave - Callback invoked after a successful save to refresh the user list
 */
function UserModal({ mode, user, onClose, onSave }) {
  // t() provides localized strings for form labels and placeholders
  const { t } = useTranslation();

  /**
   * form — Controlled state for all input fields in the modal.
   * In edit mode, pre-fill from the existing user object; password always starts empty.
   * In create mode, start from the blank EMPTY_FORM template.
   */
  const [form, setForm] = useState(
    mode === 'edit'
      ? { firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '',
          password: '', phoneNumber: user.phoneNumber || '', role: user.role || 'CITIZEN' }
      : { ...EMPTY_FORM }
  );

  // saving — tracks the async API call in flight; disables the submit button while true
  const [saving, setSaving] = useState(false);

  // errors — per-field validation error messages displayed below each input
  const [errors, setErrors] = useState({});

  /**
   * set — Immutable field updater: sets a single form key and clears its error simultaneously.
   * This prevents stale validation messages from persisting after the user corrects input.
   *
   * @param {string} k - Form field key (e.g. 'email', 'role')
   * @param {*} v - New field value
   */
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  /**
   * validate — Client-side validation for the create/edit form.
   * Returns an object of field-keyed error messages; empty object means valid.
   * Password minimum length is only enforced on create (not applicable in edit mode).
   *
   * @returns {object} Map of fieldName → error message string
   */
  const validate = () => {
    const e = {};
    // First name is required to identify the user in incident assignments and logs
    if (!form.firstName.trim()) e.firstName = 'Required';
    // Last name required for full-name display across all DMS views
    if (!form.lastName.trim())  e.lastName  = 'Required';
    // Email must be a valid address — used as the login credential
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    // Password is only collected on create; minimum 8 chars enforced by the backend too
    if (mode === 'create' && form.password.length < 8) e.password = 'Min 8 characters';
    return e;
  };

  /**
   * handleSubmit — Form submission handler.
   * Validates fields, then calls userAPI.createUser or userAPI.updateRole depending on mode.
   * Triggers a toast notification and closes the modal on success.
   * Displays an error notification if the API call fails (e.g. duplicate email).
   *
   * @param {React.FormEvent} e - Form submit event (prevented to avoid page reload)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Run client-side validation before sending any request to the backend
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (mode === 'create') {
        // Create mode: send full user payload including roles array (backend expects array)
        await userAPI.createUser({ ...form, roles: [form.role] });
        showNotification(`✅ ${form.firstName} ${form.lastName} created as ${ROLE_CFG[form.role]?.label}`, 'success');
      } else {
        // Edit mode: only update the role — other fields are managed via profile or auth flows
        await userAPI.updateRole(user.id, form.role);
        showNotification(`Role updated to ${ROLE_CFG[form.role]?.label}`, 'success');
      }
      // Refresh the parent user list then dismiss this modal
      onSave();
      onClose();
    } catch (err) {
      // Surface backend error message (e.g. "Email already in use") or a generic fallback
      const msg = err.response?.data?.message || 'Failed to save user';
      showNotification(msg, 'error');
    } finally { setSaving(false); }
  };

  // Shared Tailwind class for all text inputs in the modal form
  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all';

  /**
   * inputStyle — Returns an inline style object for an input field.
   * Border turns red if there is a validation error for that field.
   * Uses CSS variables so styles respect the DMS light/dark theme.
   *
   * @param {string|undefined} err - The error message for this field (falsy if valid)
   * @returns {object} React inline style object
   */
  const inputStyle = (err) => ({
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: `1.5px solid ${err ? '#E63946' : 'var(--border-input)'}`,
  });

  return (
    // Full-screen overlay with blur backdrop to focus attention on the modal
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      {/* Animated modal card: scales and fades in/out for a polished transition */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
      >
        {/* Header — gradient banner showing whether we are creating or editing a user */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', }}>
          <div className="flex items-center gap-3">
            {/* Icon changes based on mode: person-plus for create, pencil for edit */}
            <BI name={mode === 'create' ? 'person-plus-fill' : 'pencil-fill'} className="text-white text-lg" />
            <h2 className="text-white font-black text-base">
              {/* Title shows "Create New User" or the name of the user being edited */}
              {mode === 'create' ? 'Create New User' : `Edit — ${user.firstName} ${user.lastName}`}
            </h2>
          </div>
          {/* Close button dismisses the modal without saving changes */}
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <BI name="x-lg" className="text-xl" />
          </button>
        </div>

        {/* Form body — fields vary by mode; role picker is always shown */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Create-only fields: full name, email, password, phone not shown in edit mode */}
          {mode === 'create' && (
            <>
              {/* Side-by-side first/last name inputs to match the DMS user profile layout */}
              <div className="grid grid-cols-2 gap-3">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>First Name *</label>
                  <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                    className={inputCls} style={inputStyle(errors.firstName)} placeholder={t('auth.first_name')} />
                  {/* Show validation error below the field if firstName is missing */}
                  {errors.firstName && <p className="text-xs mt-1 text-red-500">{errors.firstName}</p>}
                </div>
                {/* Last Name */}
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Last Name *</label>
                  <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                    className={inputCls} style={inputStyle(errors.lastName)} placeholder={t('auth.last_name')} />
                  {/* Show validation error below the field if lastName is missing */}
                  {errors.lastName && <p className="text-xs mt-1 text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email — used as the unique login identifier in the DMS authentication system */}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="envelope-fill" className="me-1" /> Email *
                </label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className={inputCls} style={inputStyle(errors.email)} placeholder={t('auth.email_placeholder')} />
                {/* Email validation catches malformed addresses before hitting the backend */}
                {errors.email && <p className="text-xs mt-1 text-red-500">{errors.email}</p>}
              </div>

              {/* Password — initial credential set by the admin; users can change it via profile */}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> Password * (min 8 chars)
                </label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  className={inputCls} style={inputStyle(errors.password)} placeholder="••••••••" />
                {/* Enforce minimum length to meet DMS security policy */}
                {errors.password && <p className="text-xs mt-1 text-red-500">{errors.password}</p>}
              </div>

              {/* Phone — optional but important for emergency contact and SMS alert delivery */}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="telephone-fill" className="me-1" /> {t('auth.phone')}
                </label>
                <input type="tel" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}
                  className={inputCls} style={inputStyle(false)} placeholder={t('profile.phone_placeholder', '+962 7X XXX XXXX')} />
              </div>
            </>
          )}

          {/* Role picker — shown in both create and edit modes.
              Selecting a role determines what the user can see and do in the DMS. */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              <BI name="person-badge-fill" className="me-1" /> Role *
            </label>
            {/* Grid of role buttons — each button highlights when its role is selected */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map(role => {
                const cfg = ROLE_CFG[role];
                // active — true when this role button matches the currently selected role
                const active = form.role === role;
                return (
                  // Clicking a role button updates form.role via the set() helper
                  <button key={role} type="button" onClick={() => set('role', role)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      // Active button gets the role's background tint and colored border with glow
                      background: active ? cfg.bg : 'var(--bg-tertiary)',
                      color: active ? cfg.color : 'var(--text-secondary)',
                      border: `2px solid ${active ? cfg.color : 'var(--border-input)'}`,
                      boxShadow: active ? `0 0 12px ${cfg.color}30` : 'none',
                    }}>
                    {/* Role icon */}
                    <BI name={cfg.icon} />
                    {cfg.label}
                    {/* Checkmark icon only shown for the currently active selection */}
                    {active && <BI name="check-circle-fill" className="ms-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role description — contextual hint explaining what the selected role can do in DMS */}
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-secondary)' }}>
            {/* Info icon tinted to match the active role color for visual consistency */}
            <BI name="info-circle-fill" className="me-1" style={{ color: ROLE_CFG[form.role]?.color }} />
            {/* One description per role — only the matching one renders */}
            {form.role === 'ADMIN'       && 'Full system access — can manage all users, incidents, and resources.'}
            {form.role === 'RESPONDER'   && 'Emergency responder — can manage and respond to assigned incidents.'}
            {form.role === 'RESCUE_TEAM' && 'Rescue team member — can view incidents and update rescue operations.'}
            {form.role === 'OFFICIAL'    && 'Government official — can view reports, resources, and incident data.'}
            {form.role === 'CITIZEN'     && 'Regular citizen — can report incidents and track their own submissions.'}
          </div>

          {/* Actions row — Cancel dismisses the modal; Save/Create triggers handleSubmit */}
          <div className="flex gap-3 pt-2">
            {/* Cancel button: secondary styling, does not submit the form */}
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
              Cancel
            </button>
            {/* Submit button: animated with scale effects; disabled and dimmed while saving */}
            <motion.button type="submit" disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 4px 14px rgba(230,57,70,0.35)' }}>
              {/* While saving: spinning loader; otherwise show appropriate action label */}
              {saving ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving…</>
              : <><BI name={mode === 'create' ? 'person-plus-fill' : 'check-lg'} /> {mode === 'create' ? 'Create User' : 'Save Changes'}</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Delete confirm modal ── */

/**
 * DeleteModal — Confirmation dialog shown before permanently deleting a DMS user.
 * Displays the user's full name and email so the admin can verify the correct account
 * before irreversibly removing it from the system.
 *
 * Deletion is permanent — no soft-delete; the admin should use "Disable" instead
 * if they only want to suspend access without losing the user's incident history.
 *
 * @param {object} user - User object to be deleted (firstName, lastName, email displayed)
 * @param {function} onClose - Callback to cancel and close the modal
 * @param {function} onConfirm - Async callback that performs the actual delete API call
 */
function DeleteModal({ user, onClose, onConfirm }) {
  // loading — tracks the delete API call; prevents double-submit and shows spinner
  const [loading, setLoading] = useState(false);

  /**
   * handle — Wraps onConfirm with loading state management.
   * Awaits the delete operation so the spinner remains visible until completion.
   */
  const handle = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    // Full-screen overlay with blur — same pattern as UserModal for visual consistency
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      {/* Compact centered card with a red border to signal a destructive action */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(230,57,70,0.4)' }}>
        {/* Red trash icon circle as a visual warning signal */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(230,57,70,0.15)' }}>
          <BI name="trash3-fill" style={{ fontSize: '1.5rem', color: '#E63946' }} />
        </div>
        {/* Modal title */}
        <h3 className="font-black text-base mb-1" style={{ color: 'var(--text-primary)' }}>Delete User?</h3>
        {/* Confirmation message showing the specific user being deleted to prevent accidental removals */}
        <p className="text-sm mb-5" style={{ color: 'var(--text-tertiary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</strong> ({user.email}) will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          {/* Cancel — closes modal without deleting; the safer default action */}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
            Cancel
          </button>
          {/* Delete — triggers handle(); disabled while loading to prevent duplicate requests */}
          <button onClick={handle} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#E63946' }}>
            {/* Show spinner SVG while delete is in flight, otherwise trash icon */}
            {loading ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <BI name="trash3-fill" />}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main page ── */

/**
 * UserList — Main admin page component for managing all DMS user accounts.
 *
 * Fetches a paginated list of users from the backend, supports role/status/text filtering,
 * and exposes controls to create, edit, disable, or delete user accounts.
 * Exported as the default export and mounted under the /layout/users admin route.
 */
export default function UserList() {
  // t() provides i18n strings for search placeholders and other translatable labels
  const { t } = useTranslation();

  // users — the current page of user objects returned from the backend
  const [users,       setUsers]       = useState([]);

  // loading — true while the API call is in flight; triggers skeleton placeholder rows
  const [loading,     setLoading]     = useState(true);

  // page — zero-indexed current page number for server-side pagination (20 users per page)
  const [page,        setPage]        = useState(0);

  // totalPages — total page count returned by the backend; controls Prev/Next visibility
  const [totalPages,  setTotalPages]  = useState(1);

  // search — text entered in the search box; used for client-side name/email filtering
  const [search,      setSearch]      = useState('');

  // roleFilter — active role filter pill; 'ALL' means no role filter is applied
  const [roleFilter,  setRoleFilter]  = useState('ALL');

  // statusFilter — account status filter; values: 'ALL', 'ACTIVE', or 'DISABLED'
  const [statusFilter,setStatusFilter]= useState('ALL'); // ALL | ACTIVE | DISABLED

  // modal — controls which modal is open and for which user; null means no modal shown
  const [modal,       setModal]       = useState(null);  // null | { type: 'create' | 'edit' | 'delete', user? }

  // editingRole — maps userId → the newly selected role during inline role editing in the table
  const [editingRole, setEditingRole] = useState({});    // { [id]: role }

  // savingRole — maps userId → boolean indicating an inline role save is in progress
  const [savingRole,  setSavingRole]  = useState({});    // { [id]: bool }

  /**
   * fetchUsers — Loads the current page of users from the DMS backend API.
   * Wrapped in useCallback to stabilize the reference across renders so the
   * useEffect dependency array does not trigger infinite re-fetches.
   * Fetches 20 users per page to keep the table scannable without overloading.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Request page of 20 users; backend returns a Spring Page object or flat array
      const { data } = await userAPI.getAllUsers(page, 20);
      // Normalize: handle both paged Spring Page response and flat array fallbacks
      const paged = data?.data || data;
      setUsers(paged?.content || (Array.isArray(paged) ? paged : []));
      // totalPages used to show/hide pagination controls
      setTotalPages(paged?.totalPages || 1);
    } catch {
      showNotification('Failed to load users', 'error');
    } finally { setLoading(false); }
  }, [page]); // Re-fetch whenever the admin navigates to a different page

  // Trigger a fresh fetch whenever page changes (e.g. admin clicks Next/Prev)
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /**
   * handleToggleActive — Enables or disables a user's DMS account.
   * Disabled users cannot log in or submit incident reports but their data is preserved.
   * Useful for temporarily suspending accounts without losing audit history.
   *
   * @param {object} u - User object whose active status will be toggled
   */
  const handleToggleActive = async (u) => {
    try {
      await userAPI.toggleActive(u.id);
      // Notification message adapts based on the resulting state after toggle
      showNotification(`${u.firstName} ${u.active !== false ? 'disabled' : 'enabled'}`, u.active !== false ? 'warning' : 'success');
      // Refresh the list so the status badge reflects the new state immediately
      fetchUsers();
    } catch { showNotification('Failed to update status', 'error'); }
  };

  /**
   * handleDeleteUser — Permanently deletes a DMS user account via the API.
   * Called by DeleteModal after admin confirms the action.
   * On success, closes the delete modal and refreshes the user list.
   *
   * @param {object} u - User object to permanently delete
   */
  const handleDeleteUser = async (u) => {
    try {
      await userAPI.deleteUser(u.id);
      showNotification(`${u.firstName} ${u.lastName} deleted`, 'success');
      // Refresh the list to remove the deleted user from view
      fetchUsers();
      // Close the DeleteModal now that the operation is complete
      setModal(null);
    } catch (err) {
      // Surface backend error (e.g. cannot delete user with active incident assignments)
      showNotification(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  /**
   * handleInlineRoleSave — Saves a role change made via the inline dropdown in the table row.
   * Short-circuits if the selected role is unchanged to avoid unnecessary API calls.
   * After saving, clears the inline editing state for that row to restore the badge display.
   *
   * @param {object} u - User object whose role is being changed inline
   */
  const handleInlineRoleSave = async (u) => {
    // Retrieve the role the admin selected in the inline dropdown for this user
    const newRole = editingRole[u.id];
    // Skip if no role selected or it hasn't changed from the existing role
    if (!newRole || newRole === u.role) return;
    // Mark this specific row as saving to show the "…" indicator
    setSavingRole(s => ({ ...s, [u.id]: true }));
    try {
      await userAPI.updateRole(u.id, newRole);
      showNotification(`${u.firstName}'s role changed to ${ROLE_CFG[newRole]?.label}`, 'success');
      // Refresh list so the RoleBadge in the table reflects the new role immediately
      fetchUsers();
    } catch { showNotification('Failed to update role', 'error'); }
    finally {
      // Clear the saving flag for this row
      setSavingRole(s => ({ ...s, [u.id]: false }));
      // Remove this user from the editingRole map so the table reverts to badge display
      setEditingRole(e => { const n = {...e}; delete n[u.id]; return n; });
    }
  };

  // Client-side filter — applied after server-side fetch to narrow the current page
  const filtered = users.filter(u => {
    // Match against the selected role filter pill (or accept all if 'ALL')
    const matchRole   = roleFilter   === 'ALL' || u.role === roleFilter;
    // Match account status: ACTIVE means u.active is not explicitly false; DISABLED means it is
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.active !== false : u.active === false);
    // Text search across full name and email — case-insensitive substring match
    const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchStatus && matchSearch;
  });

  // Stats — computed from the raw unfiltered users array for the summary tiles
  // total — total users on the current page (note: server-side paged, not full count)
  const total    = users.length;
  // active — accounts where active is not explicitly false (includes null/undefined as active)
  const active   = users.filter(u => u.active !== false).length;
  // disabled — difference between total and active; accounts explicitly set to inactive
  const disabled = total - active;
  // roleCounts — per-role counts for the stat tiles (Admin, Official, Teams, Citizens)
  const roleCounts = Object.fromEntries(ROLES.map(r => [r, users.filter(u => u.role === r).length]));

  return (
    // Outer container with vertical spacing between sections and bottom padding
    <div className="space-y-5 pb-8">

      {/* Modals — rendered via AnimatePresence so exit animations play when modal is closed */}
      <AnimatePresence>
        {/* Create User modal — shown when admin clicks "Add New User" */}
        {modal?.type === 'create' && (
          <UserModal mode="create" onClose={() => setModal(null)} onSave={fetchUsers} />
        )}
        {/* Edit User modal — shown when admin clicks the edit action for a specific user */}
        {modal?.type === 'edit' && (
          <UserModal mode="edit" user={modal.user} onClose={() => setModal(null)} onSave={fetchUsers} />
        )}
        {/* Delete confirmation modal — shown when admin clicks the trash button for a user */}
        {modal?.type === 'delete' && (
          <DeleteModal user={modal.user} onClose={() => setModal(null)} onConfirm={() => handleDeleteUser(modal.user)} />
        )}
      </AnimatePresence>

      {/* Header — page title and "Add New User" button */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {/* Page title with a gradient icon badge matching the DMS admin design language */}
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <BI name="database-fill" className="text-white" />
            </div>
            User Database
          </h1>
          {/* Subtitle describing the scope of this management page */}
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Create and manage admin, staff, and citizen accounts
          </p>
        </div>
        {/* Primary CTA: opens the Create User modal */}
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 4px 14px rgba(230,57,70,0.35)' }}>
          <BI name="person-plus-fill" /> Add New User
        </motion.button>
      </motion.div>

      {/* Stats tiles — quick snapshot of the user population on the current page.
          Tiles: Total, Active, Disabled, Admins, Officials, Teams (Responders+Rescue), Citizens */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Total',    value: total,           color: '#6b7280' },
          { label: 'Active',   value: active,          color: '#059669' },
          { label: 'Disabled', value: disabled,        color: '#E63946' },
          { label: 'Admins',   value: roleCounts.ADMIN,       color: ROLE_CFG.ADMIN.color },
          { label: 'Officials',value: roleCounts.OFFICIAL,    color: ROLE_CFG.OFFICIAL.color },
          // Teams combines Responders and Rescue Teams since both are operational field roles
          { label: 'Teams',    value: roleCounts.RESCUE_TEAM + roleCounts.RESPONDER, color: ROLE_CFG.RESCUE_TEAM.color },
          { label: 'Citizens', value: roleCounts.CITIZEN,     color: ROLE_CFG.CITIZEN.color },
        ].map(({ label, value, color }) => (
          // Each tile uses a tinted background and border derived from its stat color
          <div key={label} className="flex flex-col items-center py-3 px-2 rounded-2xl"
            style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
            {/* Large colored number as the primary data point */}
            <span className="text-xl font-black" style={{ color }}>{value}</span>
            {/* Small muted label below the number */}
            <span className="text-xs mt-0.5 text-center" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Search + Filters bar — allows admins to narrow the user list without a page reload */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.07 }}
        className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>

        {/* Search input — filters users by first name, last name, or email substring */}
        <div className="flex-1 min-w-[200px] relative">
          {/* Search icon positioned inside the input using absolute positioning */}
          <BI name="search" className="absolute start-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('users.search_placeholder', 'Search by name or email…')}
            className="w-full ps-9 pe-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' }} />
        </div>

        {/* Role filter pills — clicking a role shows only users with that DMS role */}
        <div className="flex gap-1.5 flex-wrap">
          {/* 'ALL' is prepended so admins can clear the role filter */}
          {['ALL', ...ROLES].map(role => {
            const cfg = ROLE_CFG[role];
            // active — true when this pill matches the current roleFilter state
            const active = roleFilter === role;
            return (
              // Clicking updates roleFilter; active pill gets the role's solid color fill
              <button key={role} onClick={() => setRoleFilter(role)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? (cfg?.color || '#6b7280') : 'var(--bg-tertiary)',
                  color:      active ? 'white' : 'var(--text-secondary)',
                  border:     `1px solid ${active ? (cfg?.color || '#6b7280') : 'var(--border-input)'}`,
                }}>
                {/* 'ALL' shows a friendly "All Roles" label; others show role label from ROLE_CFG */}
                {role === 'ALL' ? 'All Roles' : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Status filter pills — filter by ALL, ACTIVE, or DISABLED account status */}
        <div className="flex gap-1.5">
          {[['ALL','All'], ['ACTIVE','Active'], ['DISABLED','Disabled']].map(([val, label]) => (
            // Each pill highlights with a status-specific color when selected
            <button key={val} onClick={() => setStatusFilter(val)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                // Active pill: DISABLED → red, ACTIVE → green, ALL → gray
                background: statusFilter === val ? (val === 'DISABLED' ? '#E63946' : val === 'ACTIVE' ? '#059669' : '#6b7280') : 'var(--bg-tertiary)',
                color:      statusFilter === val ? 'white' : 'var(--text-secondary)',
                border:     `1px solid ${statusFilter === val ? (val === 'DISABLED' ? '#E63946' : val === 'ACTIVE' ? '#059669' : '#6b7280') : 'var(--border-input)'}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table — skeleton loading state shown while fetching; real table shown on completion */}
      {loading ? (
        // Skeleton: 8 animated placeholder rows indicate data is being loaded from the backend
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : (
        // Real user table wrapped in an animated container that slides in after load
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>

          {/* Horizontal scroll wrapper ensures the table is usable on small screens */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                {/* Header row with muted uppercase column labels */}
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-primary)' }}>
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-black uppercase tracking-wide"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* AnimatePresence animates rows in and out as filters change */}
                <AnimatePresence>
                  {filtered.length === 0 ? (
                    // Empty state — shown when no users match the active filters
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <BI name="person-x" style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)' }} />
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>No users found</p>
                        {/* Offer a shortcut to add the first user when no accounts exist */}
                        <button onClick={() => setModal({ type: 'create' })}
                          className="mt-4 px-4 py-2 rounded-xl text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
                          <BI name="person-plus-fill" className="me-1" /> Add First User
                        </button>
                      </td>
                    </tr>
                  ) : filtered.map((u, i) => {
                    // cfg — role-specific visual config for this user's row
                    const cfg      = ROLE_CFG[u.role] || ROLE_CFG.CITIZEN;
                    // isActive — true when the account is not explicitly disabled
                    const isActive = u.active !== false;
                    // roleEditing — true if this user's row is in the inline role-edit state
                    const roleEditing = editingRole[u.id] !== undefined;
                    // currentRole — the role shown in the inline dropdown (pending change or existing)
                    const currentRole = editingRole[u.id] ?? u.role;

                    return (
                      // Animated table row: slides in sequentially with a small delay per row index
                      <motion.tr key={u.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.015 }}
                        className="group"
                        style={{ borderBottom: '1px solid var(--border-secondary)' }}
                      >
                        {/* User cell — avatar with initials, full name, and optional phone number */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              {/* Avatar sized at 9 (w-9 h-9) for table density */}
                              <Avatar user={u} size={9} />
                              {/* Small online/offline dot overlaid on the avatar bottom-right corner */}
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                style={{ background: isActive ? '#059669' : '#6b7280', borderColor: 'var(--bg-secondary)' }} />
                            </div>
                            <div>
                              {/* User's full name in bold — primary identifier in the row */}
                              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                                {u.firstName} {u.lastName}
                              </p>
                              {/* Phone number shown only when present — useful for emergency contact */}
                              {u.phoneNumber && (
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{u.phoneNumber}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email cell — login identifier, muted secondary color */}
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                        </td>

                        {/* Role cell — toggles between inline dropdown editor and RoleBadge display */}
                        <td className="px-4 py-3">
                          {roleEditing ? (
                            // Inline edit mode: dropdown + save/cancel buttons without opening a modal
                            <div className="flex items-center gap-1.5">
                              {/* Dropdown populated with all DMS roles; current selection highlighted */}
                              <select value={currentRole}
                                onChange={e => setEditingRole(r => ({ ...r, [u.id]: e.target.value }))}
                                className="px-2 py-1 rounded-lg text-xs outline-none"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: `1.5px solid ${cfg.color}` }}>
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_CFG[r].label}</option>)}
                              </select>
                              {/* Save button: triggers handleInlineRoleSave; shows "…" while in-flight */}
                              <button onClick={() => handleInlineRoleSave(u)} disabled={savingRole[u.id]}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                                style={{ background: '#059669' }}>
                                {savingRole[u.id] ? '…' : <BI name="check-lg" />}
                              </button>
                              {/* Cancel button: removes this user from editingRole, reverting to badge */}
                              <button onClick={() => setEditingRole(e => { const n={...e}; delete n[u.id]; return n; })}
                                className="px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-input)' }}>
                                <BI name="x" />
                              </button>
                            </div>
                          ) : (
                            // Normal display mode: clicking the badge reveals the inline dropdown
                            <button onClick={() => setEditingRole(r => ({ ...r, [u.id]: u.role }))}
                              className="group/role flex items-center gap-1.5 transition-opacity"
                              title="Click to change role">
                              {/* Role pill badge with color coding per DMS role */}
                              <RoleBadge role={u.role} />
                              {/* Pencil edit hint — only visible on row hover via group-hover */}
                              <BI name="pencil-fill" className="text-xs opacity-0 group-hover/role:opacity-60 transition-opacity"
                                style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                          )}
                        </td>

                        {/* Status cell — green "Active" or red "Disabled" with icon */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold"
                            style={{ color: isActive ? '#059669' : '#E63946' }}>
                            {/* Check circle for active, X circle for disabled */}
                            <BI name={isActive ? 'check-circle-fill' : 'x-circle-fill'} />
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Joined cell — account creation date formatted to locale string */}
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {/* Show em-dash if createdAt is missing from the backend response */}
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Actions cell — View profile link, Enable/Disable toggle, Delete button */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* View: navigates to the user's full profile page in the DMS admin layout */}
                            <Link to={`/layout/users/${u.id}`}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80 flex items-center gap-1"
                              style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
                              <BI name="eye-fill" /> View
                            </Link>
                            {/* Enable/Disable: toggles account access; gray for disable, green for enable */}
                            <button onClick={() => handleToggleActive(u)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-80 flex items-center gap-1"
                              style={{ background: isActive ? '#6b7280' : '#059669' }}>
                              {/* Icon and label change based on current active state */}
                              <BI name={isActive ? 'slash-circle' : 'check-circle'} />
                              {isActive ? 'Disable' : 'Enable'}
                            </button>
                            {/* Delete: opens DeleteModal for confirmation before permanent removal */}
                            <button onClick={() => setModal({ type: 'delete', user: u })}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-80 flex items-center gap-1"
                              style={{ background: '#E63946' }}>
                              <BI name="trash3-fill" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Table footer — shows filtered/total count and pagination Prev/Next controls */}
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
            style={{ borderTop: '1px solid var(--border-secondary)', background: 'var(--bg-tertiary)' }}>
            {/* Result count: clarifies how many users are currently visible after filters */}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong> users
            </span>
            {/* Pagination controls — only rendered when the backend reports more than one page */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {/* Prev button — disabled on the first page (page === 0) */}
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
                  <BI name="chevron-left" /> Prev
                </button>
                {/* Current page indicator: 1-indexed for human readability */}
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{page + 1} / {totalPages}</span>
                {/* Next button — disabled when on the last page */}
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
                  Next <BI name="chevron-right" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}