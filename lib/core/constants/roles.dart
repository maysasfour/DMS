/// roles.dart
/// ============================================================
/// Defines role-based access constants and incident lifecycle enums
/// for the Disaster Management System (DMS) mobile application.
///
/// This file centralises all user permission tiers (admin, responder,
/// citizen, official) and the complete incident lifecycle vocabulary
/// (status + severity) so that every screen, service, and widget in
/// the app references a single source of truth rather than raw strings.
///
/// Usage areas:
///   - Authentication & authorisation guards (who can do what)
///   - Incident creation and filtering screens
///   - Push-notification routing (which roles receive which alerts)
///   - Dashboard role-specific views
/// ============================================================

/// Enumerates every user role recognised by the DMS.
/// Each role maps to a distinct permission set enforced on both
/// the Flutter client and the Spring Boot backend.
enum UserRole {
  /// System administrator: full CRUD access to users, incidents, and resources.
  admin,

  /// Field responder (officer/team): can claim and update incident status,
  /// dispatch resources, and log response actions.
  responder,

  /// General public user: can report new incidents and receive area alerts,
  /// but cannot manage system data.
  citizen,

  /// Government or agency official: oversight role with read-only or
  /// coordinator-level access to ongoing operations and reports.
  official,
}

/// Extension on [UserRole] that adds human-readable presentation helpers.
/// Keeps display logic co-located with the enum so UI widgets stay clean.
extension UserRoleExtension on UserRole {
  /// Returns a short, localisation-ready label suitable for UI display
  /// (e.g., role badges on the admin user list or profile screens).
  String get displayName {
    switch (this) {
      // Full-access tier shown in the admin dashboard header
      case UserRole.admin:
        return 'Administrator';
      // Field-facing label shown on incident assignment cards
      case UserRole.responder:
        return 'Responder';
      // Public-portal label shown on citizen profile and report screens
      case UserRole.citizen:
        return 'Citizen';
      // Agency-facing label shown on coordination dashboards
      case UserRole.official:
        return 'Official';
    }
  }

  /// Returns a one-sentence capability summary for each role.
  /// Used in onboarding tooltips, role-selection dialogs, and
  /// the admin user-management screen to help operators understand
  /// the impact of assigning a particular role.
  String get description {
    switch (this) {
      // Admins can configure the system, manage users, and override any action
      case UserRole.admin:
        return 'Full system access and control';
      // Responders act on the ground — they update incident progress and resources
      case UserRole.responder:
        return 'Handle incident response';
      // Citizens are the primary reporters; they also receive proximity alerts
      case UserRole.citizen:
        return 'Report incidents and get alerts';
      // Officials monitor operations and coordinate cross-agency responses
      case UserRole.official:
        return 'Coordinate and oversee operations';
    }
  }
}

/// Enumerates every lifecycle stage an incident can occupy in the DMS.
/// The backend transitions incidents through these states; the mobile app
/// reads them to render colour-coded status badges and filter lists.
enum IncidentStatus {
  /// Initial state set automatically when a citizen or system submits an incident.
  reported,

  /// Set by a responder or official to confirm the incident has been seen
  /// and is awaiting resource assignment.
  acknowledged,

  /// Active response underway — at least one team or resource is on-site
  /// or en route.
  inProgress,

  /// Field responders have contained and closed out the incident;
  /// awaiting administrative sign-off.
  resolved,

  /// Final terminal state: incident archived after official review.
  closed,
}

/// Extension on [IncidentStatus] that provides display-friendly labels.
/// Used across incident list tiles, detail screens, and map overlays.
extension IncidentStatusExtension on IncidentStatus {
  /// Returns a human-readable status label for UI rendering.
  /// Each label is intentionally short to fit badge/chip widgets.
  String get displayName {
    switch (this) {
      // Newly submitted, not yet actioned by any responder
      case IncidentStatus.reported:
        return 'Reported';
      // Seen and logged by an operator or official
      case IncidentStatus.acknowledged:
        return 'Acknowledged';
      // Active field response in progress
      case IncidentStatus.inProgress:
        return 'In Progress';
      // Situation contained; pending final closure
      case IncidentStatus.resolved:
        return 'Resolved';
      // Fully archived; no further action required
      case IncidentStatus.closed:
        return 'Closed';
    }
  }
}

/// Enumerates the four severity tiers used to prioritise incidents.
/// Severity drives alert urgency, resource dispatch priority, and
/// heatmap colour intensity on the incident map.
enum IncidentSeverity {
  /// Minimal impact; monitored but not escalated.
  low,

  /// Moderate impact; requires attention but is not immediately life-threatening.
  medium,

  /// Significant impact; prompts rapid resource dispatch and official notification.
  high,

  /// Life-threatening or large-scale disaster; triggers emergency protocols
  /// and cross-agency coordination.
  critical,
}

/// Extension on [IncidentSeverity] that provides display-friendly labels.
/// Labels feed severity chips on incident cards, filter dropdowns, and
/// push-notification payloads so recipients can gauge urgency at a glance.
extension IncidentSeverityExtension on IncidentSeverity {
  /// Returns a concise severity label for UI chips, map legend, and alerts.
  String get displayName {
    switch (this) {
      // Green-tier: monitor only, no immediate dispatch needed
      case IncidentSeverity.low:
        return 'Low';
      // Yellow-tier: assign a responder, no emergency escalation yet
      case IncidentSeverity.medium:
        return 'Medium';
      // Orange-tier: priority dispatch, notify officials
      case IncidentSeverity.high:
        return 'High';
      // Red-tier: full emergency response, cross-agency alert broadcast
      case IncidentSeverity.critical:
        return 'Critical';
    }
  }
}