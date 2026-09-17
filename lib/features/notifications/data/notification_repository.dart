// =============================================================================
// notification_repository.dart
//
// Data layer repository for managing DMS alert/notification interactions.
// Responsible for fetching disaster alerts, tracking unread notification counts,
// and marking notifications as read on behalf of DMS users (officers, admins,
// field teams). Communicates with the Spring Boot backend via the shared
// DioClient HTTP abstraction. All network errors are normalized into
// ApiException so UI layers receive consistent error types.
// =============================================================================

// HTTP client library used for making REST API calls to the DMS backend
import 'package:dio/dio.dart';
// Riverpod: provides the Provider primitive for dependency injection across the app
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Centralized API endpoint constants (e.g., alerts path, unread count path)
import '../../../core/constants/api_constants.dart';
// Shared Dio HTTP client configured with base URL, auth headers, and interceptors
import '../../../core/network/dio_client.dart';
// Converts raw DioException network errors into structured ApiException objects
import '../../../core/network/api_exception.dart';
// Data model representing a single DMS alert/notification from the backend
import 'notification_model.dart';

/// Riverpod provider that creates and exposes a [NotificationRepository] instance.
/// Reads [dioClientProvider] so the repository inherits the app-wide HTTP config
/// (base URL, auth token headers, timeout settings).
final notificationRepositoryProvider = Provider((ref) {
  return NotificationRepository(ref.read(dioClientProvider));
});

/// Repository handling all notification/alert data operations for the DMS app.
/// Acts as the single source of truth between the DMS backend alert endpoints
/// and the Riverpod state layer above it.
class NotificationRepository {
  /// The shared HTTP client used to communicate with the DMS REST API.
  final DioClient _client;

  /// Constructs the repository by injecting the configured [DioClient].
  NotificationRepository(this._client);

  /// Fetches the full list of DMS alerts/notifications for the current user.
  ///
  /// Handles two backend response shapes:
  ///   - `{ "data": [...] }` — direct list envelope
  ///   - `{ "data": { "content": [...] } }` — paginated Spring Data envelope
  /// Returns a typed list of [NotificationModel] objects on success.
  /// Throws [ApiException] on any network or HTTP error.
  Future<List<NotificationModel>> getNotifications() async {
    try {
      // GET /alerts — retrieves all alerts visible to the authenticated user
      final res = await _client.get(ApiConstants.alerts);

      // Unwrap the outer "data" envelope, falling back to the raw response body
      final data = res.data['data'] ?? res.data;

      // Support both a bare list and a Spring Page "content" wrapper
      final list = data is List ? data : (data['content'] ?? []);

      // Deserialize each JSON map into a typed NotificationModel
      return (list as List)
          .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Normalize the Dio network error into an app-level ApiException
      throw ApiException.fromDioError(e);
    }
  }

  /// Retrieves the count of unread alerts for the current DMS user.
  ///
  /// The backend may return the count as:
  ///   - A bare integer in the response body
  ///   - A numeric value nested inside a `data` envelope
  ///   - A map with a `count` or `unreadCount` key
  /// Used to drive notification badge indicators in the UI.
  /// Throws [ApiException] on network failure.
  Future<int> getUnreadCount() async {
    try {
      // GET /alerts/unread-count — returns how many alerts the user hasn't seen
      final res = await _client.get(ApiConstants.alertsUnreadCount);

      // Unwrap the standard "data" envelope if present
      final data = res.data['data'] ?? res.data;

      // Handle a bare integer response (simplest backend shape)
      if (data is int) return data;

      // Handle a numeric (double/num) response and convert to int
      if (data is num) return data.toInt();

      // Handle a map response by trying known key names for the count field
      if (data is Map) return _toInt(data['count'] ?? data['unreadCount'] ?? 0);

      // Default to zero if the response shape is unrecognized
      return 0;
    } on DioException catch (e) {
      // Normalize the Dio network error into an app-level ApiException
      throw ApiException.fromDioError(e);
    }
  }

  /// Marks a single notification as read by its unique [id].
  ///
  /// Called when a DMS user opens or dismisses an individual alert, ensuring
  /// the unread badge count decrements accordingly.
  /// Throws [ApiException] on network failure.
  Future<void> markRead(int id) async {
    try {
      // PATCH /alerts/{id}/read — updates the read status of one alert
      await _client.patch(ApiConstants.alertRead(id));
    } on DioException catch (e) {
      // Normalize the Dio network error into an app-level ApiException
      throw ApiException.fromDioError(e);
    }
  }

  /// Marks all of the current user's notifications as read in one operation.
  ///
  /// Used by the "Mark all as read" UI action, resetting the unread badge to zero
  /// without requiring individual PATCH calls for every pending alert.
  /// Throws [ApiException] on network failure.
  Future<void> markAllRead() async {
    try {
      // PATCH /alerts/read-all — bulk-marks every unread alert as read
      await _client.patch(ApiConstants.alertsReadAll);
    } on DioException catch (e) {
      // Normalize the Dio network error into an app-level ApiException
      throw ApiException.fromDioError(e);
    }
  }

  /// Deletes a specific notification by [id].
  ///
  /// Currently a no-op stub — backend deletion endpoint not yet implemented.
  /// Placeholder to maintain interface consistency; implement when the
  /// DELETE /alerts/{id} endpoint is available on the DMS backend.
  Future<void> deleteNotification(int id) async {}
}

/// Helper that safely converts a dynamic numeric value to [int].
///
/// Returns 0 if [v] is null, otherwise casts to [num] and truncates to int.
/// Used to safely parse unread count values from varied API response shapes.
int _toInt(dynamic v) => v == null ? 0 : (v as num).toInt();