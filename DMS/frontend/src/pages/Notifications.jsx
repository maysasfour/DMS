/**
 * Notifications.jsx — DMS Notification Center
 *
 * Displays a real-time list of system alerts and notifications for the
 * Disaster Management System. Handles all alert types including incident
 * reports, resource assignments, team assignments, and system messages.
 *
 * Key responsibilities:
 *  - Fetches up to 100 alerts from the backend alertAPI on mount
 *  - Allows users to mark individual or all alerts as read
 *  - Keeps the global unread count in sync via useAlertStore (Zustand)
 *  - Renders type-specific SVG icons and color-coded borders per alert category
 *  - Supports animated entry/exit of notification cards via framer-motion
 *  - Fully internationalised through react-i18next (Arabic, English, French, etc.)
 */

// React core: useEffect for side-effects (data fetching), useState for local UI state
import React, { useEffect, useState } from 'react';
// framer-motion: AnimatePresence enables exit animations; motion adds entry/exit transitions to cards
import { motion, AnimatePresence } from 'framer-motion';
// i18n hook — translates notification labels for multilingual DMS users
import { useTranslation } from 'react-i18next';
// alertAPI — REST client methods for fetching, marking alerts read in the DMS backend
import { alertAPI } from '../services/api';
// useAlertStore — Zustand global store that tracks the badge count of unread alerts
import { useAlertStore } from '../store';

/**
 * Maps each DMS alert type to a named icon key.
 * INCIDENT_REPORTED / ALERT → warning triangle
 * INCIDENT_UPDATED         → refresh/sync arrows (status change)
 * RESOURCE_ASSIGNED        → truck (vehicle/equipment deployment)
 * ASSIGNMENT               → clipboard (task assignment to officer/team)
 * SYSTEM                   → settings gear (backend/infra notifications)
 * GENERAL                  → bell (generic informational alert)
 */
const TYPE_ICON = {
  INCIDENT_REPORTED: 'alert',
  INCIDENT_UPDATED: 'refresh',
  RESOURCE_ASSIGNED: 'truck',
  ASSIGNMENT: 'clipboard',
  ALERT: 'alert',
  SYSTEM: 'settings',
  GENERAL: 'bell',
};

/**
 * NotifSvg — Renders an inline SVG icon matching the DMS alert type.
 * Uses the TYPE_ICON map to resolve which icon to display; falls back
 * to a generic bell icon for unknown or future alert types.
 *
 * @param {string} type — Alert type string (e.g. 'INCIDENT_REPORTED')
 */
const NotifSvg = ({ type }) => {
  // Icon lookup table keyed by icon name — each value is an inline SVG element
  const icons = {
    // Warning triangle — used for new incident reports and critical alerts
    alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>,
    // Circular arrows — used when an existing incident's status or details are updated
    refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
    // Truck/vehicle icon — used when a resource (ambulance, fire truck, etc.) is dispatched
    truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    // Clipboard — used when a task or incident is assigned to an officer or response team
    clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
    // Gear/cog — used for backend system messages such as maintenance or configuration changes
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    // Bell — fallback icon for general/informational DMS notifications
    bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/></svg>,
  };
  // Resolve icon name from type via TYPE_ICON map; fall back to bell for unknown types
  return icons[TYPE_ICON[type]] || icons.bell;
};

/**
 * TYPE_COLOR — Maps each DMS alert type to a hex accent color used for
 * icon backgrounds and unread card borders.
 * Red    = critical incidents / alerts
 * Orange = incident updates requiring attention
 * Purple = resource dispatches
 * Blue   = officer/team assignment notifications
 * Gray   = system/infrastructure messages
 * Green  = general informational notifications
 */
const TYPE_COLOR = {
  INCIDENT_REPORTED: '#E63946', INCIDENT_UPDATED: '#FF7A00',
  RESOURCE_ASSIGNED: '#7c3aed', ASSIGNMENT: '#3b82f6',
  ALERT: '#E63946', SYSTEM: '#6b7280', GENERAL: '#059669',
};

/**
 * Notifications — Main page component for the DMS notification center.
 * Renders the full list of alerts for the authenticated user (officer, admin,
 * or team member) with read/unread state management.
 */
export default function Notifications() {
  // t — translation function for rendering localised strings (e.g. Arabic, French)
  const { t } = useTranslation();

  // alerts — local state holding the list of DMS alert objects fetched from the API
  const [alerts, setAlerts] = useState([]);

  // loading — controls skeleton placeholder display while alert data is being fetched
  const [loading, setLoading] = useState(true);

  // setUnreadCount — updates the global badge count shown in the sidebar/navbar
  // unreadCount   — current global unread count used to decrement on individual mark-read
  const { setUnreadCount, unreadCount } = useAlertStore();

  /**
   * On mount, fetch up to 100 alerts for the current user.
   * The API may return data in multiple envelope shapes (paginated content
   * or a bare array), so we normalise both to a flat list before storing.
   */
  useEffect(() => {
    alertAPI.getAlerts({ page: 0, size: 100 })
      .then(({ data }) => {
        // Handle paginated response (data.data.content) or bare array response
        const inner = data?.data ?? data ?? [];
        // Extract .content for paginated results; accept plain array otherwise
        const list = inner?.content ?? (Array.isArray(inner) ? inner : []);
        // Store the normalised flat alert list in local state
        setAlerts(list);
      })
      .catch(() => {}) // Silently fail — user sees empty state rather than error screen
      .finally(() => setLoading(false)); // Always stop the loading skeleton
  }, []); // Empty dependency array — runs once on component mount

  /**
   * markRead — Marks a single alert as read both on the server and locally.
   * Decrements the global unread badge count by 1, clamped to 0.
   *
   * @param {number|string} id — The unique ID of the alert to mark as read
   */
  const markRead = async (id) => {
    // Persist the read state to the backend; ignore network errors gracefully
    await alertAPI.markAsRead(id).catch(() => {});
    // Optimistically update local state so the unread indicator disappears immediately
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true, read: true } : a));
    // Decrement global badge count but never go below 0
    setUnreadCount(Math.max(0, (unreadCount || 1) - 1));
  };

  /**
   * markAllRead — Marks every visible alert as read in one operation.
   * Resets the global unread badge count to zero.
   */
  const markAllRead = async () => {
    // Call bulk mark-all-read endpoint on the backend
    await alertAPI.markAllAsRead().catch(() => {});
    // Set isRead and read flags to true on every alert in the local list
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true, read: true })));
    // Clear the global badge — no unread alerts remain
    setUnreadCount(0);
  };

  /**
   * isUnread — Predicate that checks whether an alert has not yet been read.
   * Checks both isRead (backend field) and read (legacy/alternate field) for compatibility.
   *
   * @param {object} a — Alert object
   * @returns {boolean} true if the alert is unread
   */
  const isUnread = (a) => !a.isRead && !a.read;

  // Count of currently unread alerts — displayed in the page subtitle
  const unread = alerts.filter(isUnread).length;

  return (
    // Page wrapper — no extra padding; layout is managed by the parent shell
    <div>
      {/* Page header: title, unread count subtitle, and "Mark all read" action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {/* Page title — localised, e.g. "Notifications" / "الإشعارات" */}
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('notifications.title')}
          </h1>
          {/* Subtitle showing how many alerts are currently unread */}
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {unread} {t('notifications.unread')}
          </p>
        </div>
        {/* Only show "Mark all as read" button when there are unread alerts */}
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-semibold hover:underline"
            style={{ color: '#E63946' }} // Red accent matches critical alert color
          >
            {t('notifications.mark_all')}
          </button>
        )}
      </div>

      {/* Conditional rendering: loading skeleton → empty state → alert list */}
      {loading ? (
        // Loading skeleton — shows 5 pulsing placeholder cards while fetching alerts
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse h-20"
              style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        // Empty state — displayed when the user has no alerts in the DMS system
        <div className="text-center py-16 card-disaster">
          {/* Bell icon centered above the empty message */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            {/* Inline bell SVG used for the empty state illustration */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/></svg>
          </div>
          {/* Localised "No notifications" message */}
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('notifications.none')}</p>
        </div>
      ) : (
        // Alert list — rendered only when at least one alert exists
        <div className="space-y-3">
          {/* AnimatePresence allows framer-motion to animate cards when they exit the DOM */}
          <AnimatePresence>
            {alerts.map((alert) => {
              // Determine read status for this specific alert card
              const unreadItem = isUnread(alert);
              return (
                // motion.div — animated alert card with slide-in entry and fade-out exit
                <motion.div
                  key={alert.id} // Stable key ensures correct diffing as read states change
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  // Clicking an unread card marks it as read; read cards are non-interactive
                  onClick={() => unreadItem && markRead(alert.id)}
                  className="rounded-2xl p-4 transition cursor-pointer"
                  style={{
                    background: unreadItem ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                    // Unread cards get a subtle red border to signal they need attention
                    border: unreadItem
                      ? '1px solid rgba(230,57,70,0.3)'
                      : '1px solid var(--border-primary)',
                    // Unread cards have a slight shadow to lift them visually
                    boxShadow: unreadItem ? 'var(--shadow-sm)' : 'none',
                  }}
                  // Hover highlight — uses CSS variable so it respects dark/light theme
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                >
                  {/* Card inner layout: icon column + text column */}
                  <div className="flex items-start gap-3">
                    {/* Icon badge — background color is a 12% opacity tint of the alert type color */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${TYPE_COLOR[alert.type] || '#6b7280'}20` }}
                    >
                      {/* Render the SVG icon that matches this alert's DMS type */}
                      <NotifSvg type={alert.type} />
                    </div>
                    {/* Text section: title, message body, and timestamp */}
                    <div className="flex-1 min-w-0">
                      {/* Title row with optional unread dot indicator */}
                      <div className="flex items-center gap-2">
                        {/* Alert title — bold for unread, muted for already-read alerts */}
                        <p className="font-semibold text-sm" style={{ color: unreadItem ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {alert.title}
                        </p>
                        {/* Small red dot shown only on unread alerts as a visual badge */}
                        {unreadItem && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#E63946' }} />
                        )}
                      </div>
                      {/* Alert message body — describes the incident event or system action */}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {alert.message}
                      </p>
                      {/* Timestamp — formatted to local date/time; hidden if missing from API response */}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}