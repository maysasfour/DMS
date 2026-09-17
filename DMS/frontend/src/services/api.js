/**
 * @file api.js
 * @description Centralized Axios-based API client for the Disaster Management System (DMS) frontend.
 *
 * This module creates a single configured Axios instance and exports domain-specific
 * API objects for every backend resource: authentication, users, incidents, resources,
 * alerts, notifications, shelters, rescue teams, location sharing, emergency mode,
 * dashboard statistics, and reports.
 *
 * All requests are automatically signed with the stored JWT bearer token, and any
 * 401 Unauthorized response triggers an automatic session teardown and redirect to
 * the login page — unless the user is already on an auth page.
 */

// Third-party HTTP client used for all DMS API calls
import axios from 'axios';

/**
 * Shared Axios instance pre-configured for the DMS backend.
 * All domain API objects below use this instance so base URL and headers
 * are defined in one place and never duplicated.
 */
const api = axios.create({
  // Relative base path — resolved by the Vite/Nginx reverse proxy to the Spring Boot backend
  baseURL: '/api/v1',
  // Tell the backend to parse request bodies as JSON by default
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT bearer token to every outgoing request ────
api.interceptors.request.use((config) => {
  // Retrieve the JWT token saved to localStorage after a successful login or OAuth flow
  const token = localStorage.getItem('authToken');
  // If a token exists, add it as an Authorization header so the backend can authenticate the caller
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Always return the (possibly mutated) config to continue the request chain
  return config;
}, (error) => Promise.reject(error)); // Propagate request setup errors unchanged

// ── Response interceptor: handle expired/invalid sessions globally ─────────────
api.interceptors.response.use(
  // Pass successful responses straight through without modification
  (response) => response,
  (error) => {
    // A 401 means the JWT is missing, expired, or invalid — the session is no longer trusted
    if (error.response?.status === 401) {
      // Avoid redirect loops: if the user is already on a login or register page, do nothing
      const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!onAuthPage) {
        // Wipe the stale token so it is not reused on the next page load
        localStorage.removeItem('authToken');
        // Wipe cached user info to prevent stale identity data from being displayed
        localStorage.removeItem('user');
        // Force navigation to the login page so the user can re-authenticate
        window.location.href = '/login';
      }
    }
    // Re-reject the error so per-call .catch() handlers can still inspect it
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
/**
 * Authentication API — handles login, registration, logout, identity retrieval,
 * and OAuth social login (e.g. Google, Facebook) for DMS users.
 */
export const authAPI = {
  // Authenticate a DMS user with email + password; returns a JWT on success
  login:       (email, password)      => api.post('/auth/login', { email, password }),
  // Create a new citizen or officer account with the provided registration data
  register:    (data)                 => api.post('/auth/register', data),
  // Invalidate the current server-side session; swallow errors since the client clears state anyway
  logout:      ()                     => api.post('/auth/logout').catch(() => {}),
  // Fetch the profile of the currently authenticated user (used to hydrate the app on load)
  me:          ()                     => api.get('/auth/me'),
  // Exchange a third-party OAuth ID token (e.g. Google) for a DMS JWT
  oauthLogin:  (provider, idToken)    => api.post('/auth/oauth', { provider, idToken }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
/**
 * User management API — covers profile operations for civilians as well as
 * admin-level CRUD and role/status management for DMS personnel.
 */
export const userAPI = {
  // Retrieve the authenticated user's own profile (name, contact, avatar, role)
  getProfile:     ()                    => api.get('/users/profile'),
  // Update editable profile fields such as name, phone, or language preference
  updateProfile:  (data)                => api.put('/users/profile', data),
  // Change the authenticated user's password (requires old + new password in data)
  changePassword: (data)                => api.put('/users/change-password', data),
  // Admin: list all registered DMS users with server-side pagination
  getAllUsers:    (page = 0, size = 20) => api.get(`/users?page=${page}&size=${size}`),
  // Admin: fetch a single user's details by their numeric database ID
  getUserById:    (id)                  => api.get(`/users/${id}`),
  // Admin: promote or demote a user's role (e.g. CITIZEN → OFFICER → ADMIN)
  updateRole:     (id, role)            => api.patch(`/users/${id}/role?role=${role}`),
  // Admin: enable or disable a user's account without deleting it
  toggleActive:   (id)                  => api.patch(`/users/${id}/toggle-active`),
  // Admin: permanently remove a user record from the DMS database
  deleteUser:     (id)                  => api.delete(`/users/${id}`),
  // Admin: create a new user account bypassing the public registration flow
  createUser:     (data)                => api.post('/auth/register', data),
  // Upload a profile avatar image; sends as multipart/form-data to the media service
  uploadAvatar:   (file) => {
    // Wrap the raw File object in FormData so Axios can serialize it as multipart
    const form = new FormData();
    form.append('file', file);
    // Override Content-Type so the browser sets the correct multipart boundary
    return api.post('/media/upload/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Incidents ─────────────────────────────────────────────────────────────────
/**
 * Incident API — core resource of the DMS; covers the full lifecycle of a disaster
 * incident from citizen report through officer assignment and resolution.
 */
export const incidentAPI = {
  // Fetch a filtered/paginated list of all incidents visible to the current user's role
  getIncidents:      (params = {})         => api.get('/incidents', { params }),
  // Fetch only the incidents reported by the currently authenticated citizen
  getMyIncidents:    (params = {})         => api.get('/incidents/my', { params }),
  // Retrieve full details of a single incident including location, media, and status history
  getIncidentById:   (id)                  => api.get(`/incidents/${id}`),
  // Submit a new disaster incident report (type, description, coordinates, severity)
  createIncident:    (data)                => api.post('/incidents', data),
  // Edit an existing incident's metadata (officers and admins only)
  updateIncident:    (id, data)            => api.put(`/incidents/${id}`, data),
  // Permanently delete an incident record (admin-level action)
  deleteIncident:    (id)                  => api.delete(`/incidents/${id}`),
  // Transition an incident through its workflow states: REPORTED → IN_PROGRESS → RESOLVED
  updateStatus:      (id, status)          => api.patch(`/incidents/${id}/status?status=${status}`),
  // Assign a rescue team to respond to a specific incident
  assignTeam:        (id, teamId)          => api.patch(`/incidents/${id}/assign?teamId=${teamId}`),
  // Attach photographic or video evidence to an incident report via multipart upload
  uploadMedia:       (incidentId, file) => {
    // Wrap the raw File object in FormData for multipart serialization
    const form = new FormData();
    form.append('file', file);
    // Send to the media endpoint scoped to the target incident ID
    return api.post(`/media/upload/${incidentId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Resources ─────────────────────────────────────────────────────────────────
/**
 * Resource API — manages physical assets tracked by the DMS such as ambulances,
 * fire trucks, rescue equipment, and supply caches.
 */
export const resourceAPI = {
  // List all resources, optionally filtered by type, status, or location via params
  getResources:           (params = {})        => api.get('/resources', { params }),
  // Fetch detailed information about a single resource (type, quantity, current location)
  getResourceById:        (id)                 => api.get(`/resources/${id}`),
  // Register a new physical resource in the DMS inventory
  createResource:         (data)               => api.post('/resources', data),
  // Edit resource metadata such as name, quantity, or home base location
  updateResource:         (id, data)           => api.put(`/resources/${id}`, data),
  // Remove a decommissioned or erroneous resource entry from the system
  deleteResource:         (id)                 => api.delete(`/resources/${id}`),
  // Change a resource's availability status (AVAILABLE, DEPLOYED, MAINTENANCE)
  updateStatus:           (id, status)         => api.patch(`/resources/${id}/status?status=${status}`),
  // Deploy a resource to a specific incident scene for operational use
  assignToIncident:       (id, incidentId)     => api.patch(`/resources/${id}/assign?incidentId=${incidentId}`),
};

// ── Alerts ────────────────────────────────────────────────────────────────────
/**
 * Alert API — handles broadcast warnings sent to civilians within affected areas
 * (e.g. evacuation orders, flood warnings, hazardous material notices).
 */
export const alertAPI = {
  // Retrieve all alerts with optional filters (severity, area, date range)
  getAlerts:      (params = {}) => api.get('/alerts', { params }),
  // Fetch only currently active (non-expired, non-deactivated) alerts for real-time display
  getActiveAlerts: ()           => api.get('/alerts/active'),
  // Retrieve the full content and metadata of a specific alert by ID
  getAlertById:   (id)          => api.get(`/alerts/${id}`),
  // Publish a new emergency alert to notify citizens of an imminent threat
  createAlert:    (data)        => api.post('/alerts', data),
  // Update an existing alert's message, severity, or affected area
  updateAlert:    (id, data)    => api.put(`/alerts/${id}`, data),
  // Mark an alert as no longer active (e.g. after a threat has passed)
  deactivate:     (id)          => api.patch(`/alerts/${id}/deactivate`),
  // Permanently delete an alert record (admin use for erroneous or test alerts)
  deleteAlert:    (id)          => api.delete(`/alerts/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
/**
 * Notification API — manages in-app notifications delivered to individual DMS users
 * for events such as incident status changes, team assignments, and new alerts.
 */
export const notificationAPI = {
  // Retrieve all notifications for the authenticated user (read and unread)
  getAll:         ()   => api.get('/notifications'),
  // Get the count of unread notifications for badge display in the UI
  getUnreadCount: ()   => api.get('/notifications/unread-count'),
  // Mark a single notification as read after the user has viewed it
  markAsRead:     (id) => api.patch(`/notifications/${id}/read`),
  // Bulk-mark all of the user's unread notifications as read in one request
  markAllAsRead:  ()   => api.patch('/notifications/read-all'),
};

// ── Shelters ──────────────────────────────────────────────────────────────────
/**
 * Shelter API — manages emergency shelters that house displaced civilians
 * during active disaster scenarios tracked by the DMS.
 */
export const shelterAPI = {
  // List all registered shelters with optional filters (location, capacity, status)
  getShelters:     (params = {}) => api.get('/shelters', { params }),
  // Fetch only shelters that still have remaining capacity for new occupants
  getAvailable:    ()            => api.get('/shelters/available'),
  // Retrieve full details of a specific shelter (address, capacity, facilities)
  getShelterById:  (id)          => api.get(`/shelters/${id}`),
  // Register a new emergency shelter location in the DMS
  createShelter:   (data)        => api.post('/shelters', data),
  // Update shelter information such as name, contact person, or total capacity
  updateShelter:   (id, data)    => api.put(`/shelters/${id}`, data),
  // Increment (positive delta) or decrement (negative delta) the current occupancy count
  updateCapacity:  (id, delta)   => api.patch(`/shelters/${id}/capacity?delta=${delta}`),
  // Remove a shelter record from the system (e.g. after it closes post-disaster)
  deleteShelter:   (id)          => api.delete(`/shelters/${id}`),
};

// ── Rescue Teams ──────────────────────────────────────────────────────────────
/**
 * Team API — manages rescue and response teams that are dispatched to incident scenes.
 * Teams can be filtered by availability before assignment to an incident.
 */
export const teamAPI = {
  // List all rescue teams with optional filters (specialty, location, availability)
  getTeams:        (params = {}) => api.get('/teams', { params }),
  // Fetch only teams currently marked as available for a new incident assignment
  getAvailable:    ()            => api.get('/teams/available'),
  // Retrieve full details of a specific team (members, specialty, current assignment)
  getTeamById:     (id)          => api.get(`/teams/${id}`),
  // Register a new rescue team in the DMS roster
  createTeam:      (data)        => api.post('/teams', data),
  // Update team metadata such as name, specialty, or member list
  updateTeam:      (id, data)    => api.put(`/teams/${id}`, data),
  // Toggle a team's availability flag (true = ready for deployment, false = occupied/off-duty)
  setAvailability: (id, val)     => api.patch(`/teams/${id}/availability?available=${val}`),
  // Remove a disbanded or decommissioned team from the DMS
  deleteTeam:      (id)          => api.delete(`/teams/${id}`),
};

// ── Location Sharing ──────────────────────────────────────────────────────────
/**
 * Location API — enables citizens to voluntarily share their real-time GPS coordinates
 * with DMS operators during an active emergency to facilitate rescue coordination.
 */
export const locationAPI = {
  // Submit a new location data point (latitude, longitude, timestamp) for the current user
  shareLocation:   (data) => api.post('/location/share', data),
  // Stop an active location-sharing session so the user's position is no longer broadcast
  stopSharing:     (id)   => api.patch(`/location/${id}/stop`),
  // Retrieve all location records previously shared by the authenticated user
  getMyLocations:  ()     => api.get('/location/mine'),
};

// ── Emergency Mode ────────────────────────────────────────────────────────────
/**
 * Emergency API — controls the system-wide emergency mode that unlocks elevated
 * response workflows, escalated notifications, and restricted UI actions across the DMS.
 */
export const emergencyAPI = {
  // Trigger emergency mode for a declared disaster event (type, area, severity in data)
  activate:    (data) => api.post('/emergency/activate', data),
  // Deactivate emergency mode once the situation is under control
  deactivate:  (id)   => api.patch(`/emergency/${id}/deactivate`),
  // Poll the current emergency mode status for real-time UI banner/alert display
  getStatus:   ()     => api.get('/emergency/status'),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
/**
 * Dashboard API — provides aggregated statistics and trend data for the DMS
 * admin and officer dashboards (incident counts, resource utilization, response times).
 */
export const dashboardAPI = {
  // Fetch snapshot KPI statistics: total incidents, active alerts, deployed resources, etc.
  getStatistics:     ()            => api.get('/dashboard/stats'),
  // Retrieve incident volume trend data for the given number of past days (default 14)
  getIncidentTrends: (days = 14)   => api.get(`/dashboard/trends?days=${days}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
/**
 * Report API — allows administrators and officers to query historical DMS data
 * and generate structured reports (PDF/CSV) for auditing and analysis purposes.
 */
export const reportAPI = {
  // List previously generated reports with optional filters (date range, type, author)
  getReports:    (params = {}) => api.get('/reports', { params }),
  // Trigger on-demand report generation with specified parameters (period, format, scope)
  generateReport:(data)        => api.post('/reports/generate', data),
};

// Export the raw Axios instance as the default so callers can make one-off requests
// outside the domain-specific API objects when needed
export default api;