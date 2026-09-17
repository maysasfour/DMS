// =============================================================================
// File: dio_client.dart
// Purpose: Centralized HTTP client for the Disaster Management System (DMS)
//          mobile app. Wraps the Dio HTTP library to provide authenticated
//          API access to the DMS Spring Boot backend. Handles JWT token
//          injection on every request, token validation to prevent malformed
//          credentials from being sent, and automatic token cleanup on
//          401 Unauthorized responses (e.g., expired sessions for field
//          officers, team leaders, or admin users).
// =============================================================================

// Dio HTTP client library for making REST API calls to the DMS backend
import 'package:dio/dio.dart';
// Secure encrypted storage for persisting the JWT token across app restarts
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
// Riverpod for dependency injection, exposing DioClient as a global provider
import 'package:flutter_riverpod/flutter_riverpod.dart';
// DMS-specific API constants such as base URL and upload endpoint paths
import '../constants/api_constants.dart';

/// Shared secure storage instance used across the app to read/write the JWT
/// token. Configured with platform-specific encryption: AES-256 via Android
/// EncryptedSharedPreferences and an IndexedDB-backed store on web.
/// The dbName 'dms_secure' scopes storage to this app to avoid key collisions.
const sharedStorage = FlutterSecureStorage(
  // Web-specific storage: uses IndexedDB with a named DB and public key for obfuscation
  webOptions: WebOptions(dbName: 'dms_secure', publicKey: 'dms_key'),
  // Android-specific: use EncryptedSharedPreferences for hardware-backed AES encryption
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

/// Riverpod provider that exposes a singleton [DioClient] instance to the app.
/// Consuming this provider (e.g., in incident, user, or resource repositories)
/// ensures all HTTP calls share the same configured Dio instance with auth interceptors.
final dioClientProvider = Provider<DioClient>((ref) => DioClient());

/// Centralized HTTP client for all DMS backend communication.
/// Encapsulates Dio configuration, security headers, JWT authentication,
/// and exposes convenience methods for GET, POST, PUT, PATCH, and DELETE
/// operations used by incident reporting, resource management, and user flows.
class DioClient {
  /// The underlying Dio instance; private to enforce use of the typed wrapper methods.
  late final Dio _dio;

  /// Constructs and configures the Dio client with base options and interceptors.
  /// Called once by the Riverpod provider; all DMS repositories share this instance.
  DioClient() {
    // Initialize Dio with DMS backend base URL and security-focused default headers
    _dio = Dio(
      BaseOptions(
        // Base URL for all DMS API endpoints (incidents, users, resources, alerts)
        baseUrl: ApiConstants.baseUrl,
        // 15-second connect timeout — balances reliability in disaster-zone networks
        connectTimeout: const Duration(seconds: 15),
        // 15-second receive timeout — allows for larger payloads (e.g., incident lists)
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          // Declare JSON body format for all outgoing DMS API requests
          'Content-Type': 'application/json',
          // Prevent MIME-type sniffing attacks on responses
          'X-Content-Type-Options': 'nosniff',
          // Disallow the DMS API responses from being embedded in iframes
          'X-Frame-Options': 'DENY',
          // Signals to the server that this is an XHR-style request (CSRF protection aid)
          'X-Requested-With': 'XMLHttpRequest',
        },
      ),
    );

    // Attach an interceptor to inject the JWT token and handle auth errors globally
    _dio.interceptors.add(
      InterceptorsWrapper(
        /// Called before every outgoing request (incidents, users, resources, etc.).
        /// Reads the stored JWT from secure storage and attaches it as a Bearer token
        /// if it is structurally valid (three non-empty Base64URL segments).
        onRequest: (options, handler) async {
          // Retrieve the stored JWT token for the currently logged-in DMS user
          final token = await sharedStorage.read(key: 'jwt_token');
          if (token != null) {
            // Split the JWT into its three structural parts: header, payload, signature
            final parts = token.split('.');
            // Validate that the token has exactly 3 non-empty segments (well-formed JWT)
            if (parts.length == 3 && parts.every((p) => p.isNotEmpty)) {
              // Attach the valid JWT as a Bearer token for backend role-based auth
              options.headers['Authorization'] = 'Bearer $token';
            } else {
              // Remove the malformed token to force re-login rather than sending bad creds
              await sharedStorage.delete(key: 'jwt_token');
            }
          }
          // Pass the (possibly modified) request options along the interceptor chain
          handler.next(options);
        },
        /// Called when any DMS API request returns an error response.
        /// On 401 Unauthorized, deletes the stored JWT so the user is prompted
        /// to re-authenticate — prevents stale tokens from blocking incident access.
        onError: (error, handler) async {
          // 401 means the token is expired or revoked; clear it to force re-login
          if (error.response?.statusCode == 401) {
            await sharedStorage.delete(key: 'jwt_token');
          }
          // Propagate the error so individual repositories can handle it appropriately
          handler.next(error);
        },
      ),
    );
  }

  /// Exposes the raw Dio instance for advanced use cases (e.g., multipart uploads
  /// for incident image attachments) that require direct Dio configuration.
  Dio get dio => _dio;

  /// Performs an HTTP GET request to a DMS backend endpoint.
  /// Used for fetching incidents, resources, user profiles, alerts, and reports.
  /// [path] is the endpoint path relative to the base URL.
  /// [queryParameters] supports optional filtering (e.g., by incident status or region).
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) =>
      _dio.get(path, queryParameters: queryParameters);

  /// Performs an HTTP POST request to create a new DMS resource.
  /// Used for creating incidents, registering users, submitting reports, and sending alerts.
  /// [data] is the request body (typically a JSON-serializable map or FormData).
  /// [options] allows per-request overrides (e.g., content-type for multipart uploads).
  Future<Response> post(String path, {dynamic data, Options? options}) =>
      _dio.post(path, data: data, options: options);

  /// Performs an HTTP PUT request to fully replace a DMS resource.
  /// Used for updating entire incident records, user profiles, or resource assignments.
  /// [data] is the replacement payload; [options] allows content-type overrides.
  Future<Response> put(String path, {dynamic data, Options? options}) =>
      _dio.put(path, data: data, options: options);

  /// Performs an HTTP PATCH request to partially update a DMS resource.
  /// Used for updating specific fields like incident status, severity, or assignee
  /// without replacing the entire record.
  /// [queryParameters] supports additional filtering or versioning hints.
  Future<Response> patch(String path,
          {dynamic data,
          Map<String, dynamic>? queryParameters,
          Options? options}) =>
      _dio.patch(path,
          data: data, queryParameters: queryParameters, options: options);

  /// Performs an HTTP DELETE request to remove a DMS resource by path.
  /// Used for deleting incidents, removing resources, or revoking user access.
  Future<Response> delete(String path) => _dio.delete(path);

  /// Constructs the full URL for accessing an uploaded file (e.g., incident photos,
  /// damage assessment images) stored on the DMS backend.
  /// [storagePath] is the relative path returned by the backend after upload.
  String imageUrl(String storagePath) =>
      '${ApiConstants.baseUrl}${ApiConstants.upload(storagePath)}';
}