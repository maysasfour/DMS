/// ---------------------------------------------------------------------------
/// api_constants.dart
///
/// Defines all API endpoint constants used by the Disaster Management System
/// (DMS) mobile application to communicate with the backend REST API.
///
/// This file acts as a single source of truth for every URL path in the DMS
/// system, covering authentication, incident reporting, resource management,
/// shelter lookup, real-time alerts/notifications, teams, user administration,
/// and file uploads.
///
/// The base URL is resolved at compile time from the `API_BASE_URL` build
/// environment variable, falling back to the production DuckDNS host so that
/// the app works out-of-the-box without extra configuration.
/// ---------------------------------------------------------------------------

/// Central registry of all DMS backend API endpoint paths.
///
/// All members are [static] so that callers can reference them without
/// creating an instance (e.g. `ApiConstants.incidents`). Path-only strings
/// are [const] where possible; dynamic endpoints are expressed as tiny
/// factory methods that interpolate the required ID(s).
class ApiConstants {
  /// Root URL of the DMS backend, resolved at compile time via --dart-define.
  ///
  /// Set `API_BASE_URL` during `flutter build` / `flutter run` to point at a
  /// staging or local server.  The default value targets the production DMS
  /// host deployed on DuckDNS so the app is always functional without extra
  /// setup.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://dms-maysas.duckdns.org',
  );

  // ---------------------------------------------------------------------------
  // Auth — endpoints for identity verification and session management
  // ---------------------------------------------------------------------------

  /// Authenticates a DMS user (citizen, officer, admin) with email + password.
  /// Returns a JWT access token used for all subsequent secured requests.
  static const String login      = '/api/v1/auth/login';

  /// Registers a new citizen account so they can report incidents and receive alerts.
  static const String register   = '/api/v1/auth/register';

  /// Returns the profile of the currently authenticated user based on the
  /// Bearer token in the Authorization header.
  static const String me         = '/api/v1/auth/me';

  /// Initiates or completes OAuth-based login (e.g. Facebook) so citizens can
  /// sign in with their existing social accounts.
  static const String oauthLogin = '/api/v1/auth/oauth';

  // ---------------------------------------------------------------------------
  // Users / Profile — user account and administration endpoints
  // ---------------------------------------------------------------------------

  /// Retrieves or updates the authenticated user's own profile data
  /// (name, phone, language preference, etc.).
  static const String profile        = '/api/v1/users/profile';

  /// Admin-only listing of all DMS user accounts for oversight and management.
  static const String users          = '/api/v1/users';

  /// Returns or modifies a single user account identified by [id].
  /// Used by admins to inspect citizen or officer details.
  static String userById(int id)     => '/api/v1/users/$id';

  /// Allows an authenticated user to update their own account password.
  static const String changePassword = '/api/v1/users/change-password';

  /// Endpoint for uploading or replacing a user's profile avatar image.
  static const String avatar         = '/api/v1/users/avatar';

  /// Admin endpoint to change the role (citizen / officer / admin) of the
  /// user identified by [id], controlling their access level in the DMS.
  static String userRole(int id)     => '/api/v1/users/$id/role';

  /// Admin endpoint to activate or deactivate the account of user [id],
  /// preventing suspended users from reporting or accessing the system.
  static String userToggle(int id)   => '/api/v1/users/$id/toggle-active';

  // ---------------------------------------------------------------------------
  // Incidents — core disaster event CRUD and workflow endpoints
  // ---------------------------------------------------------------------------

  /// Lists all reported incidents or creates a new incident report submitted
  /// by a citizen or auto-detected sensor in the DMS.
  static const String incidents        = '/api/v1/incidents';

  /// Fetches, updates, or deletes a single disaster incident identified by [id].
  static String incidentById(int id)   => '/api/v1/incidents/$id';

  /// Updates the workflow status of incident [id] (e.g. OPEN → IN_PROGRESS →
  /// RESOLVED), allowing officers and admins to track response progress.
  static String incidentStatus(int id) => '/api/v1/incidents/$id/status';

  /// Uploads or retrieves media attachments (photos, videos) for incident [id],
  /// giving responders visual context about the disaster scene.
  static String incidentMedia(int id)  => '/api/v1/incidents/$id/media';

  /// Assigns resource [resourceId] (vehicle, team, equipment) to incident [id]
  /// so that the dispatch system can track which assets are deployed where.
  static String incidentAssign(int id, int resourceId) =>
      '/api/v1/incidents/$id/assign-resource/$resourceId';

  // ---------------------------------------------------------------------------
  // Shelters — emergency shelter location and capacity endpoints
  // ---------------------------------------------------------------------------

  /// Lists all registered emergency shelters in the DMS, including location,
  /// capacity, and current occupancy, helping citizens find safe locations
  /// during a disaster.
  static const String shelters = '/api/v1/shelters';

  // ---------------------------------------------------------------------------
  // Dashboard — aggregate statistics and trend data for the admin overview
  // ---------------------------------------------------------------------------

  /// Retrieves summary statistics (total incidents, active resources, open
  /// alerts, etc.) displayed on the DMS admin dashboard.
  static const String dashboardStats  = '/api/v1/dashboard/stats';

  /// Retrieves time-series trend data (incident counts over time, resolution
  /// rates, etc.) used to render charts on the admin dashboard.
  static const String dashboardTrends = '/api/v1/dashboard/trends';

  // ---------------------------------------------------------------------------
  // Alerts / Notifications — real-time system notifications for DMS users
  // ---------------------------------------------------------------------------

  /// Lists all notifications sent to the authenticated user, such as incident
  /// status changes, resource assignments, or emergency broadcasts.
  static const String alerts            = '/api/v1/notifications';

  /// Returns the count of unread notifications so the app can display a badge
  /// on the notification bell icon.
  static const String alertsUnreadCount = '/api/v1/notifications/unread-count';

  /// Marks every pending notification as read in a single bulk operation,
  /// clearing the unread badge for the authenticated user.
  static const String alertsReadAll     = '/api/v1/notifications/read-all';

  /// Marks a single notification [id] as read, updating its seen status so
  /// it no longer contributes to the unread count.
  static String alertRead(int id)       => '/api/v1/notifications/$id/read';

  // ---------------------------------------------------------------------------
  // Resources — equipment, vehicles, and personnel asset management
  // ---------------------------------------------------------------------------

  /// Lists all DMS resources (fire trucks, ambulances, rescue teams, etc.) or
  /// creates a new resource entry for dispatch planning.
  static const String resources        = '/api/v1/resources';

  /// Fetches, updates, or deletes a single resource record identified by [id].
  static String resourceById(int id)   => '/api/v1/resources/$id';

  /// Updates the availability status of resource [id] (AVAILABLE, DEPLOYED,
  /// MAINTENANCE) so the dashboard reflects real-time asset readiness.
  static String resourceStatus(int id) => '/api/v1/resources/$id/status';

  /// Returns aggregate statistics about all resources (total count,
  /// available vs deployed ratio, etc.) for the admin resource overview panel.
  static const String resourceStats    = '/api/v1/resources/stats';

  // ---------------------------------------------------------------------------
  // Teams — response team management endpoints
  // ---------------------------------------------------------------------------

  /// Lists all registered response teams or creates a new team in the DMS,
  /// used to organize officers and volunteers for coordinated disaster response.
  static const String teams        = '/api/v1/teams';

  /// Fetches, updates, or deletes the response team identified by [id],
  /// including its member list and assigned incidents.
  static String teamById(int id)   => '/api/v1/teams/$id';

  // ---------------------------------------------------------------------------
  // Uploads — serving user-uploaded and system-generated files
  // ---------------------------------------------------------------------------

  /// Builds the URL path for a stored file (incident photo, avatar, document)
  /// given its [storagePath] as returned by the backend upload response.
  /// Append to [baseUrl] to obtain the full downloadable URL.
  static String upload(String storagePath) => '/uploads/$storagePath';
}