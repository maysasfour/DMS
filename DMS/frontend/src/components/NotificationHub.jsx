/**
 * NotificationHub.jsx
 *
 * Centralized notification display component for the Disaster Management System (DMS).
 * Renders a global toast container that surfaces real-time alerts to operators,
 * officers, and admins — covering events such as new incident reports, resource
 * assignments, user actions, and system errors.
 *
 * The module exports two items:
 *   1. NotificationHub (default) — a React component that mounts the toast container
 *      once at the application root so all DMS pages share a single notification layer.
 *   2. showNotification (named) — a utility function called throughout the app to
 *      trigger success, error, warning, or info toasts (e.g., "Incident submitted",
 *      "Resource unavailable", "User account updated").
 */

// React core — required for JSX rendering of the toast container component
import React from 'react';

// ToastContainer: renders the notification layer in the DOM
// toast: imperative API used by showNotification to fire individual alerts
import { ToastContainer, toast } from 'react-toastify';

// Default react-toastify stylesheet — provides built-in toast animations and styling
import 'react-toastify/dist/ReactToastify.css';

/**
 * NotificationHub component
 *
 * Mounts a single, application-wide toast container that displays DMS notifications.
 * Should be placed once near the root of the React tree (e.g., in App.jsx) so every
 * page — Dashboard, Incident Detail, Admin Panel, etc. — can display alerts without
 * each page managing its own notification UI.
 *
 * @returns {JSX.Element} The ToastContainer that intercepts all toast() calls app-wide.
 */
export default function NotificationHub() {
  return (
    // ToastContainer listens for toast() calls triggered anywhere in the DMS app
    <ToastContainer
      // Toasts appear in the top-right corner, away from primary map and form content
      position="top-right"
      // Auto-dismiss after 5 seconds; keeps the UI uncluttered during active incident management
      autoClose={5000}
      // Show the countdown progress bar so users know when the alert will dismiss
      hideProgressBar={false}
      // Newest alerts stack on top, ensuring the most recent DMS event is always visible
      newestOnTop={true}
      // Allow users to dismiss a toast by clicking on it
      closeOnClick
      // Left-to-right layout; set true if Arabic (ar) locale is active for RTL support
      rtl={false}
      // Pause auto-close timer when the browser tab loses focus (user switched tabs)
      pauseOnFocusLoss
      // Allow users to drag and dismiss toasts manually
      draggable
      // Pause the auto-close countdown while the user hovers over the notification
      pauseOnHover
      // Use light theme to match the DMS design system's default light mode
      theme="light"
    />
  );
}

/**
 * showNotification
 *
 * Imperative helper that fires a toast notification from anywhere in the DMS codebase
 * without needing direct access to the ToastContainer component.
 *
 * Usage examples in DMS:
 *   showNotification('Incident reported successfully', 'success');
 *   showNotification('Failed to load resource list', 'error');
 *   showNotification('High-severity alert in your area', 'warning');
 *   showNotification('New incident assigned to your team', 'info');
 *
 * @param {string} message - Human-readable notification text shown to the DMS user.
 * @param {'success'|'error'|'warning'|'info'} type - Severity level; defaults to 'info'.
 * @returns {import('react-toastify').Id} Toast ID, can be used to programmatically dismiss it.
 */
export const showNotification = (message, type = 'info') => {
  // Shared display options applied to all DMS notification types
  const options = {
    // Consistent positioning with the NotificationHub container
    position: 'top-right',
    // Standard 5-second visibility window for routine alerts
    autoClose: 5000,
    // Always show countdown bar so urgency is visually communicated
    hideProgressBar: false,
    // Let operators quickly dismiss a toast by clicking, freeing screen space
    closeOnClick: true,
    // Pause dismiss timer on hover so users can read longer incident messages
    pauseOnHover: true,
    // Draggable for touch-device users in field operations
    draggable: true,
  };

  // Route the notification to the appropriate toast style based on DMS event severity
  switch (type) {
    // Green success toast — e.g., incident submitted, resource allocated, user saved
    case 'success':
      return toast.success(message, options);

    // Red error toast with extended display time (8s) — critical failures need more reading time
    // e.g., API failure, authentication error, resource conflict
    case 'error':
      return toast.error(message, { ...options, autoClose: 8000 });

    // Orange warning toast — e.g., incomplete form fields, low resource availability
    case 'warning':
      return toast.warning(message, options);

    // Blue info toast (default) — e.g., status updates, team assignments, general system messages
    case 'info':
    default:
      return toast.info(message, options);
  }
};