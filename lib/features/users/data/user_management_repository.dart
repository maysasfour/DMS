// ============================================================================
// user_management_repository.dart
//
// Repository layer for admin-level user management operations in the DMS.
// Provides CRUD and lifecycle controls (role update, activation toggle, delete)
// for all registered users — including field officers, team members, and admins.
//
// This file bridges the Flutter UI and the Spring Boot REST API exposed under
// /api/v1/users, using the shared DioClient for authenticated HTTP calls and
// ApiException for uniform error propagation across the DMS feature modules.
// ============================================================================

// Dio HTTP client library used for making REST calls to the DMS backend
import 'package:dio/dio.dart';
// Riverpod for dependency injection and provider-based state management
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Centralised API endpoint constants (base URLs, path builders) for the DMS API
import '../../../core/constants/api_constants.dart';
// Shared authenticated Dio wrapper that injects JWT/session headers automatically
import '../../../core/network/dio_client.dart';
// Converts DioException into a DMS-specific ApiException with structured error info
import '../../../core/network/api_exception.dart';
// Data model representing a DMS user record returned by the management endpoints
import 'user_management_model.dart';

/// Riverpod provider that creates and exposes a singleton [UserManagementRepository].
/// Reads the [dioClientProvider] so the repository always uses the app-wide
/// authenticated HTTP client configured with base URL and interceptors.
final userManagementRepositoryProvider = Provider((ref) {
  // Instantiate the repository by resolving the authenticated DioClient from the provider graph
  return UserManagementRepository(ref.read(dioClientProvider));
});

/// Repository responsible for all admin user-management API interactions.
/// Encapsulates network calls so UI layers (controllers, notifiers) remain
/// decoupled from HTTP concerns.
class UserManagementRepository {
  /// The shared authenticated HTTP client used to reach the DMS backend.
  /// Private to enforce access only through this repository's public methods.
  final DioClient _client;

  /// Constructs the repository by injecting the [DioClient] dependency.
  /// Called automatically by [userManagementRepositoryProvider].
  UserManagementRepository(this._client);

  /// Fetches a paginated list of all DMS users from GET /api/v1/users.
  ///
  /// [page] is zero-indexed; defaults to the first page with a page size of 20.
  /// Returns a [List<UserManagementModel>] parsed from the API response.
  /// Throws [ApiException] on any network or server error.
  Future<List<UserManagementModel>> getUsers({int page = 0}) async {
    try {
      // Request the user list with pagination query parameters
      final res = await _client.get(ApiConstants.users,
          queryParameters: {'page': page, 'size': 20});

      // Unwrap the top-level 'data' envelope if present; otherwise use root directly
      final data = res.data['data'] ?? res.data;

      // Handle both a plain JSON array and a Spring Page object with a 'content' key
      // Spring Boot Page responses wrap items under 'content'; plain arrays are used as-is
      final content = data is List ? data : (data['content'] ?? data);

      // Map each raw JSON map to a typed UserManagementModel domain object
      return (content as List)
          .map((e) => UserManagementModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Wrap low-level Dio errors into a DMS ApiException for consistent handling
      throw ApiException.fromDioError(e);
    }
  }

  /// Updates the role of a DMS user identified by [id]
  /// via PATCH /api/v1/users/{id}/role?role=VALUE.
  ///
  /// [role] must be one of the backend-recognised role strings
  /// (e.g. ADMIN, OFFICER, TEAM_MEMBER, CITIZEN).
  /// Changing a user's role affects which incidents, resources, and
  /// admin panels they can access within the DMS.
  /// Throws [ApiException] on failure.
  Future<void> updateRole(int id, String role) async {
    try {
      // Send a PATCH request with the new role as a query parameter
      await _client.patch(ApiConstants.userRole(id),
          queryParameters: {'role': role});
    } on DioException catch (e) {
      // Surface backend validation or auth errors as a structured ApiException
      throw ApiException.fromDioError(e);
    }
  }

  /// Toggles the active/inactive status of a DMS user identified by [id]
  /// via PATCH /api/v1/users/{id}/toggle-active.
  ///
  /// Deactivating a user prevents them from logging into the DMS and responding
  /// to incidents or accessing alerts, without permanently deleting their record.
  /// Re-activating restores full access based on their assigned role.
  /// Throws [ApiException] on failure.
  Future<void> toggleActive(int id) async {
    try {
      // Send a PATCH request to flip the user's active flag server-side
      await _client.patch(ApiConstants.userToggle(id));
    } on DioException catch (e) {
      // Propagate network or server errors as a DMS-specific exception
      throw ApiException.fromDioError(e);
    }
  }

  /// Permanently deletes a DMS user record identified by [id]
  /// via DELETE /api/v1/users/{id}.
  ///
  /// This is a destructive operation — associated audit logs and incident
  /// assignments referencing this user may be affected depending on backend
  /// cascade rules. Use [toggleActive] for a non-destructive suspension.
  /// Throws [ApiException] on failure.
  Future<void> deleteUser(int id) async {
    try {
      // Send a DELETE request targeting the specific user resource by ID
      await _client.delete(ApiConstants.userById(id));
    } on DioException catch (e) {
      // Wrap and rethrow as ApiException so callers handle errors uniformly
      throw ApiException.fromDioError(e);
    }
  }
}