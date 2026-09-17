// ============================================================
// api_exception.dart
// DMS Mobile Application — Core Network Layer
//
// Defines a unified exception type for all HTTP and network
// errors arising from communication with the DMS backend
// (Spring Boot on port 9090). Wraps Dio errors into
// domain-friendly messages shown to field officers, team
// members, and admins when incident submissions, resource
// requests, or authentication calls fail.
// ============================================================

// Dio HTTP client package — provides DioException and related
// connection error types used throughout the network layer
import 'package:dio/dio.dart';

/// Represents a structured API error in the DMS mobile app.
///
/// Thrown by repository classes when a network call to the
/// DMS backend fails, whether due to connectivity issues,
/// authentication errors, or server-side faults. Carries
/// a human-readable [message] suitable for display in the UI
/// and an optional HTTP [statusCode] for programmatic handling.
class ApiException implements Exception {
  /// Human-readable error description shown to the app user
  /// (e.g., a field officer who failed to submit an incident report).
  final String message;

  /// HTTP status code returned by the DMS backend, if available.
  /// Null for purely network-level failures (timeouts, no connectivity).
  final int? statusCode;

  /// Creates an [ApiException] with a required error [message]
  /// and an optional HTTP [statusCode].
  const ApiException(this.message, {this.statusCode});

  /// Returns the error message as the string representation,
  /// making it safe to display directly in SnackBars or dialogs.
  @override
  String toString() => message;

  /// Factory constructor that converts a raw [DioException] into
  /// a user-friendly [ApiException] for the DMS context.
  ///
  /// Handles the full range of Dio error types:
  /// - Timeout variants (connection, send, receive)
  /// - Connection errors (backend unreachable on port 9090)
  /// - HTTP error responses with JSON bodies from the Spring Boot API
  /// - Well-known HTTP status codes (401, 403, 404, 5xx)
  factory ApiException.fromDioError(DioException e) {
    // Extract the HTTP status code from the response, if one was received
    final code = e.response?.statusCode;

    // Mutable message variable built up through the parsing logic below
    String msg;

    // Handle network-level failures before attempting to parse response bodies
    switch (e.type) {
      // All three timeout cases indicate the backend did not respond in time;
      // likely a slow network in a disaster field environment
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        // Instruct the user to verify server availability and network membership
        return ApiException(
            'Connection timed out. Make sure the server is running and you are on the same network.',
            statusCode: code);

      // The device cannot reach the DMS backend at all — common when a field
      // officer switches to a different WiFi or the backend container is down
      case DioExceptionType.connectionError:
        // Provide actionable checklist referencing the known backend port (9090)
        return ApiException(
            'Cannot reach server at ${e.requestOptions.baseUrl}. Check that:\n'
            '1. The backend is running on port 9090\n'
            '2. Your device is on the same WiFi network',
            statusCode: code);

      // For all other DioExceptionTypes (badResponse, cancel, unknown, etc.)
      // fall through to response-body parsing below
      default:
        break;
    }

    // Attempt to extract the error message from the JSON response body
    // returned by the Spring Boot backend (fields: "message" or "error")
    try {
      final data = e.response?.data;

      if (data is Map) {
        // Prefer the "message" field; fall back to "error"; default to generic text
        msg = (data['message'] ?? data['error'] ?? 'Unknown error').toString();
      } else {
        // Response body is not a JSON map (e.g., plain text or empty); use Dio's message
        msg = e.message ?? 'Unknown error';
      }
    } catch (_) {
      // Response parsing threw unexpectedly; fall back to Dio's built-in message
      msg = e.message ?? 'Unknown error';
    }

    // Override parsed message with domain-specific text for well-known status codes

    // 401: Login attempt failed — officer or admin supplied wrong credentials
    if (code == 401) msg = 'Invalid email or password.';

    // 403: Authenticated user lacks the required role (e.g., a team member
    // attempting an admin-only action such as managing resources or users)
    if (code == 403) msg = 'You do not have permission to perform this action.';

    // 404: The requested DMS resource (incident, user, alert, etc.) was not found
    if (code == 404) msg = 'Resource not found.';

    // 5xx: Internal server error on the DMS backend — advise retry
    if (code != null && code >= 500) msg = 'Server error ($code). Try again later.';

    // Return the fully resolved exception with message and status code
    return ApiException(msg, statusCode: code);
  }
}