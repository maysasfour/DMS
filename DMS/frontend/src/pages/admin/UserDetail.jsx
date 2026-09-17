/**
 * UserDetail.jsx — Admin: User Detail & Management Page
 *
 * Provides a full administrative view of a single DMS user record.
 * Admins can inspect user profile information, change the user's system role
 * (CITIZEN, RESPONDER, OFFICIAL, ADMIN), and enable or disable the account.
 *
 * Used in the DMS admin panel to manage responders, officials, and citizens
 * who interact with incidents, resources, and alerts in the system.
 *
 * Route: /layout/users/:id
 * API dependencies: userAPI.getUserById, userAPI.updateRole, userAPI.toggleActive
 */

// React core — useEffect for side-effect (data fetch on mount), useState for local UI state
import React, { useEffect, useState } from 'react';

// useParams extracts the user :id from the route URL; useNavigate enables programmatic redirection
import { useParams, useNavigate } from 'react-router-dom';

// motion.div provides entrance animation (fade + slide-up) for the user detail card
import { motion } from 'framer-motion';

// i18n hook — provides t() for future-proofed translatable strings across DMS locales
import { useTranslation } from 'react-i18next';

// DMS API service layer — userAPI wraps all REST calls to the backend user management endpoints
import { userAPI } from '../../services/api';

// Global toast/notification system for showing success/error feedback to the admin
import { showNotification } from '../../components/NotificationHub';

/**
 * ROLE_STYLE — visual color mapping for each DMS user role badge.
 * Each role in the system has a distinct color to aid quick visual identification:
 *   ADMIN     — red (highest privilege, system administrators)
 *   RESPONDER — orange (field responders handling incidents on the ground)
 *   OFFICIAL  — purple (government or agency officials overseeing operations)
 *   CITIZEN   — green (general public submitting and tracking incident reports)
 */
const ROLE_STYLE = {
  ADMIN:     { bg: 'rgba(230,57,70,0.12)',  color: '#E63946' },
  RESPONDER: { bg: 'rgba(255,122,0,0.12)',  color: '#FF7A00' },
  OFFICIAL:  { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  CITIZEN:   { bg: 'rgba(5,150,105,0.12)', color: '#059669' },
};

// ALL_ROLES — ordered list of every role available for assignment in the DMS role-change dropdown
const ALL_ROLES = ['CITIZEN', 'RESPONDER', 'OFFICIAL', 'ADMIN'];

/**
 * UserDetail — admin page component for viewing and managing a single DMS user.
 * Fetches user data by ID from the backend, displays profile info,
 * and exposes controls for role reassignment and account enable/disable.
 */
export default function UserDetail() {
  // Extract the user's numeric/UUID id from the current route path (e.g. /layout/users/42)
  const { id } = useParams();

  // Router navigation hook — used to redirect back to the user list or on fetch failure
  const navigate = useNavigate();

  // i18n translation function — available for labelling UI strings in multiple DMS locales
  const { t } = useTranslation();

  // user — holds the fetched DMS user object (name, email, role, active status, etc.)
  const [user, setUser]       = useState(null);

  // loading — true while the user data is being fetched from the backend API
  const [loading, setLoading] = useState(true);

  // newRole — tracks the role currently selected in the role-change dropdown before saving
  const [newRole, setNewRole] = useState('');

  // saving — true while the role-update API request is in-flight, disables the Apply button
  const [saving, setSaving]   = useState(false);

  // Trigger user fetch whenever the route :id parameter changes (e.g. admin navigates between users)
  useEffect(() => { fetchUser(); }, [id]);

  /**
   * fetchUser — loads the full DMS user record from the backend by the route :id.
   * Normalises the API response shape (supports both wrapped `data.data` and flat `data`).
   * On success, seeds the role selector with the user's current role.
   * On failure, shows an error notification and redirects back to the user list.
   */
  const fetchUser = async () => {
    try {
      // Call backend GET /users/:id endpoint via the DMS API service
      const { data } = await userAPI.getUserById(id);

      // Normalise response: some endpoints wrap payload in data.data, others return it flat
      const u = data?.data || data;

      // Populate the component state with the retrieved user object
      setUser(u);

      // Pre-select the user's existing role in the role-change dropdown; default to CITIZEN
      setNewRole(u?.role || 'CITIZEN');
    } catch (_) {
      // Notify the admin that the user record could not be retrieved
      showNotification('Failed to load user', 'error');

      // Redirect back to the user list since this page has no valid user to display
      navigate('/layout/users');
    } finally {
      // Always clear the loading spinner regardless of success or failure
      setLoading(false);
    }
  };

  /**
   * handleRoleChange — submits the newly selected role to the backend for the current user.
   * Updates local state optimistically on success so the badge reflects the change immediately.
   * Roles in DMS control access to incident management, resource allocation, and admin features.
   */
  const handleRoleChange = async () => {
    // Signal that the save request is in-flight to disable the Apply button
    setSaving(true);
    try {
      // Call backend PATCH/PUT endpoint to persist the new role assignment for this user
      await userAPI.updateRole(id, newRole);

      // Optimistically update the local user object so the role badge reflects the change
      setUser(u => ({ ...u, role: newRole }));

      // Inform the admin that the role change was applied successfully
      showNotification('Role updated', 'success');
    } catch (_) {
      // Notify the admin if the backend rejected or failed to apply the role change
      showNotification('Failed to update role', 'error');
    } finally {
      // Re-enable the Apply button once the request is settled
      setSaving(false);
    }
  };

  /**
   * handleToggleActive — toggles the DMS user's active/disabled status on the backend.
   * Disabled accounts cannot log in or submit/manage incidents in the system.
   * Updates local state immediately so the button label and status field stay in sync.
   */
  const handleToggleActive = async () => {
    try {
      // Call backend endpoint to flip the user's active flag (enable if disabled, disable if active)
      await userAPI.toggleActive(id);

      // Flip the local active flag so the UI reflects the new account state without a refetch
      setUser(u => ({ ...u, active: !u.active }));

      // Confirm to the admin that the account status change was applied
      showNotification('Status updated', 'success');
    } catch (_) {
      // Alert the admin if the toggle request failed on the backend
      showNotification('Failed to update status', 'error');
    }
  };

  // Show a full-page spinner while the user record is being loaded from the backend
  if (loading) {
    return (
      // Centered loading indicator — neon red top-border spinner matches DMS cyberpunk theme
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent"
          style={{ borderTopColor: '#E63946' }} />
      </div>
    );
  }

  // Resolve the color scheme for the user's current role badge (falls back to CITIZEN green)
  const rs = ROLE_STYLE[user?.role] || ROLE_STYLE.CITIZEN;

  return (
    // Constrained-width container with vertical spacing between the back button and detail card
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Back navigation — returns admin to the full user list at /layout/users */}
      <button
        onClick={() => navigate('/layout/users')}
        className="flex items-center gap-2 text-sm font-semibold hover:underline"
        style={{ color: '#E63946' }}
      >
        {/* Left arrow icon from Bootstrap Icons library */}
        <i className="bi bi-arrow-left" /> Back to Users
      </button>

      {/* Animated card — fades in and slides up from y+16 when the component mounts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card-disaster p-6"
      >
        {/* Avatar + name — shows user initials in a gradient circle alongside their name and role badge */}
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar circle — displays first letters of firstName and lastName as a visual identifier */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
          >
            {/* Initials derived from the user's first and last name fields */}
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>

          {/* Name and role badge column */}
          <div>
            {/* Full display name of the DMS user */}
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </h1>
            {/* Role badge — background and text color come from the ROLE_STYLE map for visual distinction */}
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: rs.bg, color: rs.color }}>
              {user?.role}
            </span>
          </div>

          {/* Enable/Disable account toggle — pushed to the right with ms-auto */}
          <div className="ms-auto">
            {/*
              Toggle button label and color switch based on current active state:
              - Active users show "Disable Account" in grey (destructive action)
              - Disabled users show "Enable Account" in green (restorative action)
            */}
            <button
              onClick={handleToggleActive}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: user?.active !== false ? '#6b7280' : '#059669' }}
            >
              {user?.active !== false ? 'Disable Account' : 'Enable Account'}
            </button>
          </div>
        </div>

        {/* Info grid — displays key profile fields in a 2-column card layout */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/*
            Render a card tile for each of the four core user profile fields:
            Email, Phone, Account Status (Active/Disabled), and Registration Date.
            These fields help admins verify user identity and account standing.
          */}
          {[
            { label: 'Email',   value: user?.email },
            { label: 'Phone',   value: user?.phoneNumber || '—' },
            // active !== false treats null/undefined as active (default state for legacy records)
            { label: 'Status',  value: user?.active !== false ? 'Active' : 'Disabled' },
            // Format ISO timestamp to locale-appropriate date string; show em-dash if missing
            { label: 'Joined',  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            // Each info tile uses DMS theme tokens for background and border consistency
            <div key={label}
              className="p-3 rounded-xl"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
              {/* Field label — muted tertiary color for visual hierarchy */}
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              {/* Field value — prominent primary color for readability */}
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Role change section — allows the admin to reassign the user's DMS system role */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
          {/* Section label */}
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Change Role</p>

          {/* Role selector and Apply button row */}
          <div className="flex gap-2">
            {/*
              Dropdown listing all valid DMS roles.
              Changing this does not save immediately — admin must click Apply.
              newRole state is kept in sync via onChange so the Apply button can
              detect whether the selection differs from the user's current role.
            */}
            <select
              value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
            >
              {/* Render one <option> per DMS role from the ALL_ROLES constant */}
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {/*
              Apply button — disabled while saving or if the selected role matches the current role
              (prevents a no-op API call). Shows "Saving…" label during the in-flight request.
            */}
            <button
              onClick={handleRoleChange} disabled={saving || newRole === user?.role}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}