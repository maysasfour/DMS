// ============================================================
// File: team_model.dart
// Feature: Teams — Data Layer
//
// Defines the TeamModel data class used to represent a response
// team within the Disaster Management System (DMS). Response
// teams are organized groups (e.g., firefighters, medics, search
// and rescue) that can be dispatched to handle disaster incidents.
//
// This model is consumed by the teams feature to display team
// listings, assign teams to incidents, and track team availability
// and specialization across the DMS mobile application.
// ============================================================

/// Immutable data model representing a response team in the DMS.
/// Holds all relevant attributes returned from the DMS backend API
/// when fetching team information for incident coordination.
class TeamModel {
  /// Unique identifier for the team as assigned by the backend database.
  final int id;

  /// Human-readable name of the team (e.g., "Alpha Rescue Unit").
  final String name;

  /// The team's area of expertise relevant to disaster response
  /// (e.g., "Medical", "Fire Suppression", "Search and Rescue").
  /// Nullable because some teams may not yet have a assigned specialization.
  final String? specialization;

  /// Current operational status of the team within the DMS
  /// (e.g., "AVAILABLE", "DEPLOYED", "STANDBY", "INACTIVE").
  /// Nullable to handle cases where status is not yet set by an admin.
  final String? status;

  /// Total number of personnel currently assigned to this team.
  /// Nullable as the backend may not always return this count.
  final int? memberCount;

  /// Primary contact phone number for reaching the team during an incident.
  /// Nullable since contact info may not be configured for all teams.
  final String? contactNumber;

  /// Current or base geographic location of the team
  /// (e.g., "Station 4, North District"). Used to assess proximity
  /// to disaster sites and optimize deployment decisions.
  /// Nullable as location may be unknown or not yet assigned.
  final String? location;

  /// Creates a [TeamModel] instance with required [id] and [name],
  /// and optional attributes that may be absent in partial API responses.
  const TeamModel({
    required this.id,      // Team ID is always required to uniquely identify the team
    required this.name,    // Team name is always required for display and identification
    this.specialization,   // Optional: may be null if team type is not yet categorized
    this.status,           // Optional: may be null if operational status is not set
    this.memberCount,      // Optional: may be null if headcount is not provided
    this.contactNumber,    // Optional: may be null if contact info is not configured
    this.location,         // Optional: may be null if location is not yet assigned
  });

  /// Deserializes a [TeamModel] from a JSON map received from the DMS REST API.
  /// Uses null-safe fallbacks so missing fields do not crash the application —
  /// critical for resilience when the API returns partial team records.
  factory TeamModel.fromJson(Map<String, dynamic> json) => TeamModel(
        id: json['id'] ?? 0,                          // Default to 0 if id is absent (should not happen in practice)
        name: json['name'] ?? '',                     // Default to empty string to avoid null display in UI
        specialization: json['specialization'],       // Preserve null — UI handles missing specialization gracefully
        status: json['status'],                       // Preserve null — allows UI to show "Unknown" or similar fallback
        memberCount: json['memberCount'],             // Preserve null — member count may not be computed yet
        contactNumber: json['contactNumber'],         // Preserve null — contact may not be set for all teams
        location: json['location'],                   // Preserve null — location may be unassigned at time of fetch
      );

  /// Serializes this [TeamModel] to a JSON map for sending team data
  /// to the DMS backend (e.g., when creating or updating a team record).
  /// Note: [id] and [memberCount] are intentionally excluded because
  /// the backend assigns the ID on creation and computes member count server-side.
  Map<String, dynamic> toJson() => {
        'name': name,                        // Team name sent to backend for create/update operations
        'specialization': specialization,    // Disaster response specialty included for team categorization
        'contactNumber': contactNumber,      // Contact number included so dispatchers can reach the team
        'location': location,               // Base location included for proximity-based dispatch logic
      };
}