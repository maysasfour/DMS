/// user_management_model.dart
///
/// Defines the [UserManagementModel] data class used by the DMS admin panel
/// to represent and manage system users (citizens, officers, admins, teams).
/// This model bridges the backend UserDTO JSON payload to a typed Dart object,
/// normalising role strings so the UI can apply role-based access rules cleanly.

/// Immutable data model representing a DMS user as seen by the admin management interface.
/// Covers all user roles: CITIZEN, OFFICER, ADMIN, and TEAM members.
class UserManagementModel {
  /// Unique database identifier for the user, assigned by the backend.
  final int id;

  /// User's given (first) name, used for display in lists and detail views.
  final String firstName;

  /// User's family (last) name, combined with [firstName] to form the full display name.
  final String lastName;

  /// User's email address, which doubles as their login credential in the DMS.
  final String email;

  /// The user's primary role in the DMS (e.g. CITIZEN, OFFICER, ADMIN, TEAM).
  /// Stored without the Spring Security "ROLE_" prefix for cleaner UI logic.
  final String role;

  /// Optional phone number for the user; used for SMS alerts and contact lookup.
  /// Null if the user has not provided a phone number during registration.
  final String? phone;

  /// Whether the user account is currently active and permitted to log in.
  /// Inactive accounts are suspended by an admin and cannot access the system.
  final bool active;

  /// Creates an immutable [UserManagementModel].
  /// [id], [firstName], [lastName], [email], and [role] are required.
  /// [phone] is optional; [active] defaults to true for newly created accounts.
  const UserManagementModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    this.phone,
    this.active = true,
  });

  /// Computed full display name, trimmed to handle missing first or last name gracefully.
  String get name => '$firstName $lastName'.trim();

  /// Deserialises a DMS backend UserDTO JSON map into a [UserManagementModel].
  ///
  /// The backend sends roles as either a List<String> (UserDTO) or a plain String,
  /// so this factory handles both shapes and strips the Spring "ROLE_" prefix
  /// so the rest of the app works with clean role tokens like "OFFICER" or "ADMIN".
  factory UserManagementModel.fromJson(Map<String, dynamic> json) {
    // Default to CITIZEN when no role information is present in the payload.
    String role = 'CITIZEN';

    // Extract the raw roles field — the backend UserDTO uses a Set<String> serialised as a JSON array.
    final rawRoles = json['roles'];

    if (rawRoles is List && rawRoles.isNotEmpty) {
      // When roles arrive as a list, take the first entry (primary role) and strip the "ROLE_" prefix.
      role = rawRoles.first.toString().replaceFirst('ROLE_', '');
    } else if (rawRoles is String) {
      // Some endpoints serialise the role as a plain string rather than an array; handle that here.
      role = rawRoles.replaceFirst('ROLE_', '');
    } else {
      // Fallback: try the singular "role" key, then default to CITIZEN if absent.
      role = (json['role'] ?? 'CITIZEN').toString().replaceFirst('ROLE_', '');
    }

    return UserManagementModel(
      // Safely coerce id to int regardless of whether JSON decoded it as int or num.
      id: (json['id'] ?? 0) is int
          ? json['id'] ?? 0
          : (json['id'] as num).toInt(),
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      role: role,
      // Backend may use either "phoneNumber" (UserDTO) or "phone" depending on the endpoint.
      phone: json['phoneNumber'] ?? json['phone'],
      // Accounts are active by default; an admin can deactivate them via the user management panel.
      active: json['active'] ?? true,
    );
  }
}