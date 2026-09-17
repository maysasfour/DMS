/// ============================================================
/// File: user_model.dart
/// Feature: Authentication — Data Layer
/// ============================================================
/// Defines [UserModel], the immutable data-transfer object (DTO)
/// representing an authenticated DMS user on the client side.
///
/// This model is populated from the backend REST API response after
/// login or profile fetch. It carries identity and role information
/// needed to drive role-based UI behaviour (Admin, Officer, Team,
/// Citizen) throughout the disaster management application.
///
/// Roles recognised by the DMS backend include:
///   ADMIN, OFFICER, TEAM, CITIZEN (returned with or without the
///   "ROLE_" Spring Security prefix — normalised here).
/// ============================================================

/// Immutable value object representing a DMS user.
/// Used across auth, profile, and role-gated feature screens.
class UserModel {
  /// Unique numeric identifier assigned by the DMS backend database.
  final int id;

  /// User's login email — used for authentication and contact display.
  final String email;

  /// Given name of the DMS user (e.g. first name on registration form).
  final String firstName;

  /// Family name of the DMS user (e.g. last name on registration form).
  final String lastName;

  // Extracted from roles Set — first entry, stripped of ROLE_ prefix
  /// Normalised role string (e.g. "ADMIN", "OFFICER", "CITIZEN").
  /// Derived from the backend's roles collection; controls which
  /// dashboards and incident management actions the user can access.
  final String role;

  /// Optional contact phone number for emergency notifications and
  /// two-factor verification flows used in DMS alerting.
  final String? phone;

  /// Optional URL to the user's avatar/profile image, shown on the
  /// Profile screen and in team member listings.
  final String? avatarUrl;

  /// Creates an immutable [UserModel].
  /// All identity fields are required; contact and avatar are optional
  /// because they may not be set at registration time.
  const UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.phone,
    this.avatarUrl,
  });

  /// Convenience getter returning the user's full display name.
  /// Trims trailing whitespace in case lastName is absent.
  String get name => '$firstName $lastName'.trim();

  /// Deserialises a [UserModel] from a JSON map returned by the DMS
  /// backend (e.g. /api/auth/login or /api/users/me endpoints).
  factory UserModel.fromJson(Map<String, dynamic> json) {
    // roles is Set<String> e.g. ["ADMIN"] or ["ROLE_ADMIN"]
    /// Start with an empty role; resolved below from whichever
    /// shape the backend sends the roles data in.
    String role = '';

    /// Raw value of the "roles" key — may be a List, a plain String,
    /// or absent entirely depending on the endpoint version.
    final rawRoles = json['roles'];

    if (rawRoles is List && rawRoles.isNotEmpty) {
      // Most common: backend sends roles as a JSON array; take the first entry.
      // Strip the Spring Security "ROLE_" prefix so the app works with clean
      // role names like "ADMIN" rather than "ROLE_ADMIN".
      role = rawRoles.first.toString().replaceFirst('ROLE_', '');
    } else if (rawRoles is String) {
      // Some older endpoint versions serialise a single role as a plain string.
      role = rawRoles.replaceFirst('ROLE_', '');
    } else {
      // fallback: single 'role' field
      // Graceful degradation: check for a flat "role" field used by some
      // profile endpoints; default to empty string if neither key exists.
      role = (json['role'] ?? '').toString().replaceFirst('ROLE_', '');
    }

    return UserModel(
      /// Coerce id to int whether the JSON sends an int or a double/num,
      /// guarding against serialisation differences across API versions.
      id: (json['id'] ?? 0) is int
          ? json['id'] ?? 0
          : (json['id'] as num).toInt(),

      /// Map standard user identity fields; default to empty string to
      /// avoid null-related UI rendering errors on the profile screen.
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',

      /// Already resolved above.
      role: role,

      /// Accept both "phone" and "phoneNumber" key names to support
      /// multiple backend endpoint response shapes without breaking.
      phone: json['phone'] ?? json['phoneNumber'],

      /// Accept both "avatarUrl" and "profileImagePath" key names for
      /// compatibility between user profile and authentication responses.
      avatarUrl: json['avatarUrl'] ?? json['profileImagePath'],
    );
  }

  /// Serialises this [UserModel] to a JSON map.
  /// Used when persisting the session locally (e.g. SharedPreferences)
  /// so the user stays logged in between app restarts.
  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'role': role,
        'phone': phone,
        'avatarUrl': avatarUrl,
      };

  /// Returns a copy of this [UserModel] with selected fields replaced.
  /// Follows the immutable-update pattern so state-management layers
  /// (e.g. Bloc/Provider) can update profile data without mutating state.
  /// [id], [email], and [role] are intentionally excluded — they must not
  /// be changed after authentication.
  UserModel copyWith({
    /// Updated given name, e.g. after the user edits their profile.
    String? firstName,

    /// Updated family name, e.g. after the user edits their profile.
    String? lastName,

    /// Updated contact phone, used for DMS alert notification settings.
    String? phone,

    /// Updated avatar URL after the user uploads a new profile image.
    String? avatarUrl,
  }) =>
      UserModel(
        // Preserve immutable identity and role fields unchanged.
        id: id,
        email: email,

        // Apply override if provided, otherwise keep existing value.
        firstName: firstName ?? this.firstName,
        lastName: lastName ?? this.lastName,

        // Role cannot be changed client-side; always preserved from original.
        role: role,

        // Apply override if provided, otherwise keep existing value.
        phone: phone ?? this.phone,
        avatarUrl: avatarUrl ?? this.avatarUrl,
      );
}