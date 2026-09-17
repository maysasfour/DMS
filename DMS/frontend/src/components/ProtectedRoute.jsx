/**
 * ProtectedRoute.jsx
 *
 * Route guard component for the Disaster Management System (DMS).
 * Wraps sensitive routes (incident management, resource tracking, admin panels, etc.)
 * to ensure only authenticated users with valid JWT tokens can access them.
 * Unauthenticated or expired-session users are redirected to the login page,
 * and stale auth state is cleared to prevent inconsistent UI behavior.
 */

// React core — required for JSX rendering of the route guard
import React from 'react';
// Navigate: programmatically redirects unauthenticated users to the login page
// Outlet: renders the matched child route when authentication passes
import { Navigate, Outlet } from 'react-router-dom';
// Global auth store (Zustand) — holds the current DMS user, JWT token, and logout action
import { useAuthStore } from '../store';

/**
 * Validates a JWT token by decoding its payload and checking the expiration claim.
 * Prevents expired tokens (e.g., after a long session or server-side revocation)
 * from granting access to protected DMS resources.
 *
 * @param {string} token - The JWT access token stored in the auth store
 * @returns {boolean} true if the token exists and has not yet expired, false otherwise
 */
function isTokenValid(token) {
  // Reject immediately if no token is present (user never logged in or token was cleared)
  if (!token) return false;
  try {
    // JWT structure: header.payload.signature — decode the Base64-encoded payload (middle segment)
    const payload = JSON.parse(atob(token.split('.')[1]));
    // JWT `exp` is in seconds; multiply by 1000 to compare against Date.now() (milliseconds)
    return payload.exp * 1000 > Date.now();
  } catch { return false; } // Malformed token (tampered or corrupt) — treat as invalid
}

/**
 * ProtectedRoute component — acts as an authentication gate for DMS routes.
 * Renders child routes (via <Outlet />) only when the user is authenticated
 * and holds a non-expired JWT. Otherwise, clears stale auth state and redirects
 * to the login page to re-authenticate before accessing incident or resource data.
 */
export default function ProtectedRoute() {
  // Extract the current DMS user object, JWT token, and the logout action from global auth state
  const { user, token, logout } = useAuthStore();

  // Guard check: deny access if the user record is missing, the token is absent, or the token has expired
  if (!user || !token || !isTokenValid(token)) {
    // If partial auth state exists (e.g., user set but token expired), clear it to avoid stale UI
    if (user || token) logout(); // clear stale state
    // Redirect to the DMS login page; `replace` prevents the protected URL from appearing in browser history
    return <Navigate to="/login" replace />;
  }

  // Authentication passed — render the matched child route (e.g., incident list, resource form, admin panel)
  return <Outlet />;
}