// =============================================================================
// incident_repository.dart
//
// Data layer repository for incident management in the Disaster Management
// System (DMS) Flutter mobile app. This file acts as the single source of
// truth for all incident-related HTTP communication between the Flutter client
// and the Spring Boot backend API.
//
// Responsibilities:
//   - Fetching paginated lists of incidents (all incidents or current user's)
//   - Retrieving a single incident by its ID
//   - Creating new disaster incidents via JSON POST requests
//   - Updating existing incident details via JSON PUT requests
//   - Patching the lifecycle status of an incident (e.g. OPEN → RESOLVED)
//   - Deleting incidents (admin/authorized roles only)
//   - Uploading media attachments (photos) linked to a specific incident
//
// All network errors are translated into typed ApiException instances so that
// UI layers can display meaningful error messages without depending on Dio.
// =============================================================================

// Dio HTTP client — used for making multipart and JSON REST requests
import 'package:dio/dio.dart';
// Riverpod — provides dependency-injected access to this repository across the app
import 'package:flutter_riverpod/flutter_riverpod.dart';
// image_picker XFile — represents a locally selected image file before upload
import 'package:image_picker/image_picker.dart';
// Centralised API endpoint strings (e.g. /api/v1/incidents, /api/v1/incidents/{id})
import '../../../core/constants/api_constants.dart';
// Configured Dio wrapper that injects JWT auth headers and base URL automatically
import '../../../core/network/dio_client.dart';
// Converts DioException into a DMS-typed ApiException with HTTP status details
import '../../../core/network/api_exception.dart';
// Domain model for a single incident record — maps to the backend IncidentDTO
import 'models/incident_model.dart';

/// Riverpod provider that exposes a singleton [IncidentRepository] to the widget
/// tree. Using [Provider] (not [StateProvider]) because the repository itself
/// is stateless — it just wraps HTTP calls.
final incidentRepositoryProvider = Provider((ref) {
  // Inject the shared DioClient so all requests share the same auth interceptor
  return IncidentRepository(ref.read(dioClientProvider));
});

/// Repository class that abstracts all incident-related REST API calls.
///
/// UI layers (pages, view-models) depend on this class rather than on Dio
/// directly, keeping networking concerns isolated to the data layer.
class IncidentRepository {
  /// The pre-configured HTTP client with JWT auth and base URL already applied
  final DioClient _client;

  /// Constructor — receives the DioClient via Riverpod dependency injection
  IncidentRepository(this._client);

  /// Fetches a paginated list of incidents from the backend.
  ///
  /// Supports optional server-side filters:
  /// - [page] / [size]: zero-based page index and records-per-page count
  /// - [status]: lifecycle filter, e.g. "OPEN", "IN_PROGRESS", "RESOLVED"
  /// - [severity]: urgency filter, e.g. "LOW", "MEDIUM", "HIGH", "CRITICAL"
  /// - [type]: incident category, e.g. "FLOOD", "FIRE", "EARTHQUAKE"
  /// - [q]: free-text search query matched against title/description
  ///
  /// Returns a flat [List<IncidentModel>] extracted from the Spring Page wrapper.
  Future<List<IncidentModel>> getIncidents({
    int page = 0,   // Default to first page
    int size = 10,  // Default page size — 10 incidents per request
    String? status,   // Optional lifecycle status filter
    String? severity, // Optional severity filter
    String? type,     // Optional disaster type filter
    String? q,        // Optional free-text search keyword
  }) async {
    try {
      // Build the query parameter map starting with mandatory pagination fields
      final params = <String, dynamic>{'page': page, 'size': size};
      // Only append optional filters when they carry a non-empty value to avoid
      // sending empty string parameters that the backend might reject or mishandle
      if (status != null && status.isNotEmpty) params['status'] = status;
      if (severity != null && severity.isNotEmpty) params['severity'] = severity;
      if (type != null && type.isNotEmpty) params['type'] = type;
      if (q != null && q.isNotEmpty) params['q'] = q;

      // GET /api/v1/incidents?page=0&size=10&...
      final res = await _client.get(ApiConstants.incidents, queryParameters: params);
      // Unwrap envelope: some endpoints return {data: ..., message: ...}
      // while others return the payload directly; handle both shapes
      final body = (res.data['data'] ?? res.data);
      // Spring Page: {content:[...], totalElements, ...}
      // Extract the "content" array from a Spring Page response, or treat the
      // body itself as a list if the backend returned a plain array
      final content = body is Map ? (body['content'] ?? []) : body;
      // Deserialise each raw JSON map into a typed IncidentModel domain object
      return (content as List)
          .map((e) => IncidentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Translate network/HTTP errors into a DMS-typed exception for the UI layer
      throw ApiException.fromDioError(e);
    }
  }

  /// Fetches only the incidents reported by the currently authenticated user.
  ///
  /// Relies on the backend filtering by the JWT subject (user identity) when
  /// [mine]=true is passed — no separate /my endpoint is required.
  Future<List<IncidentModel>> getMyIncidents({int page = 0, int size = 10}) async {
    try {
      // Backend filters by authenticated user via JWT — no separate /my endpoint
      // The `mine: true` query param signals the backend to apply ownership filter
      final res = await _client.get(ApiConstants.incidents,
          queryParameters: {'page': page, 'size': size, 'mine': true});
      // Unwrap the response envelope in the same way as [getIncidents]
      final body = (res.data['data'] ?? res.data);
      // Handle both Spring Page shape ({content:[...]}) and plain list responses
      final content = body is Map ? (body['content'] ?? []) : body;
      // Map each JSON element to an IncidentModel instance
      return (content as List)
          .map((e) => IncidentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Surface network failures as ApiException so UI can render error state
      throw ApiException.fromDioError(e);
    }
  }

  /// Retrieves a single incident record by its unique database [id].
  ///
  /// Used on the Incident Detail screen to display full incident information
  /// including location, severity, assigned resources, and status history.
  Future<IncidentModel> getIncident(int id) async {
    try {
      // GET /api/v1/incidents/{id}
      final res = await _client.get(ApiConstants.incidentById(id));
      // Unwrap the data envelope; cast to Map because a single record is always an object
      final data = (res.data['data'] ?? res.data) as Map<String, dynamic>;
      // Deserialise into the typed domain model
      return IncidentModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // POST /api/v1/incidents — plain JSON @RequestBody IncidentDTO
  /// Creates a new incident record in the DMS backend.
  ///
  /// [body] must conform to the backend's IncidentDTO shape (title, type,
  /// severity, description, latitude, longitude, etc.).
  /// Returns the persisted [IncidentModel] including the server-assigned ID.
  Future<IncidentModel> createIncident(Map<String, dynamic> body) async {
    try {
      // POST the incident JSON payload to the incidents collection endpoint
      final res = await _client.post(ApiConstants.incidents, data: body);
      // Unwrap and cast the created incident from the response envelope
      final data = (res.data['data'] ?? res.data) as Map<String, dynamic>;
      return IncidentModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // PUT /api/v1/incidents/{id} — plain JSON @RequestBody IncidentDTO
  /// Updates the full details of an existing incident identified by [id].
  ///
  /// Used by authorised operators/admins to correct incident information
  /// (e.g. change type, severity, or description) after initial reporting.
  Future<IncidentModel> updateIncident(int id, Map<String, dynamic> body) async {
    try {
      // PUT replaces the entire incident resource at the given ID
      final res = await _client.put(ApiConstants.incidentById(id), data: body);
      // Unwrap and parse the updated incident from the server response
      final data = (res.data['data'] ?? res.data) as Map<String, dynamic>;
      return IncidentModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // PATCH /api/incidents/{id}/status — body: {"status":"VALUE"}
  /// Transitions the lifecycle status of incident [id] to [status].
  ///
  /// Uses PATCH (partial update) rather than PUT because only the status field
  /// changes — e.g. moving an incident from "OPEN" to "IN_PROGRESS" when a
  /// response team is dispatched, or to "RESOLVED" when the situation is cleared.
  Future<void> updateStatus(int id, String status) async {
    try {
      // PATCH only the status field; the backend validates allowed transitions
      await _client.patch(
        ApiConstants.incidentStatus(id), // e.g. /api/v1/incidents/42/status
        data: {'status': status},         // e.g. {"status": "RESOLVED"}
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Permanently deletes an incident record identified by [id].
  ///
  /// This operation is typically restricted to admin roles on the backend.
  /// Soft-delete behaviour (if any) is handled server-side.
  Future<void> deleteIncident(int id) async {
    try {
      // DELETE /api/v1/incidents/{id} — no response body expected on success
      await _client.delete(ApiConstants.incidentById(id));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Uploads one or more image files as media attachments to incident [incidentId].
  ///
  /// Images are sent as a multipart/form-data POST so the backend can stream
  /// them directly to object storage (e.g. S3/MinIO). This is separate from
  /// [createIncident] to allow media to be attached after the incident record
  /// already exists, or in a retry scenario if the initial upload failed.
  Future<void> uploadMedia(int incidentId, List<XFile> files) async {
    // Skip the network call entirely when the caller passes an empty list
    if (files.isEmpty) return;
    try {
      // Build a multipart form with a "files" field containing all selected images
      final formData = FormData.fromMap({
        // Await all XFile → MultipartFile conversions concurrently for efficiency
        'files': await Future.wait(files.map((f) async => MultipartFile.fromFile(
          f.path,           // Absolute path on the device filesystem
          filename: f.name, // Preserve the original filename for the server
          // Set the correct image MIME sub-type so the backend can validate format
          contentType: DioMediaType('image', _ext(f.name)),
        ))),
      });
      // POST /api/v1/incidents/{id}/media with the multipart form payload
      await _client.post(ApiConstants.incidentMedia(incidentId), data: formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Extracts the image MIME sub-type from a filename extension.
  ///
  /// Used to populate the [DioMediaType] when building multipart uploads so
  /// the backend receives the correct Content-Type for each image part.
  /// Defaults to "jpeg" for any unrecognised or missing extension.
  String _ext(String name) {
    final lower = name.toLowerCase(); // Normalise to lower-case for comparison
    if (lower.endsWith('.png')) return 'png';   // Lossless PNG screenshots/maps
    if (lower.endsWith('.webp')) return 'webp'; // Modern compressed web images
    return 'jpeg'; // Default — covers .jpg, .jpeg, and unknown formats
  }
}