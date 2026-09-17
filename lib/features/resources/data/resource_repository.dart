// =============================================================================
// resource_repository.dart
//
// Data layer repository for managing disaster response resources in the DMS.
// Provides CRUD operations and status management for resources such as
// ambulances, fire trucks, rescue teams, medical supplies, and shelters.
//
// Communicates with the DMS backend REST API via a shared DioClient,
// and translates network-level DioExceptions into domain-level ApiExceptions
// for consistent error handling across the feature layer.
// =============================================================================

// Dio HTTP client library used for making REST API requests
import 'package:dio/dio.dart';
// Riverpod for dependency injection and provider-based state management
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Centralized API endpoint constants (e.g., /api/v1/resources)
import '../../../core/constants/api_constants.dart';
// Shared Dio HTTP client wrapper with auth headers and base URL pre-configured
import '../../../core/network/dio_client.dart';
// Domain exception type that wraps Dio errors with structured error messages
import '../../../core/network/api_exception.dart';
// Data model representing a single DMS resource (type, status, location, etc.)
import 'resource_model.dart';

/// Riverpod provider that exposes a singleton [ResourceRepository] instance.
/// Injects the shared [DioClient] so the repository uses the app's authenticated HTTP client.
final resourceRepositoryProvider = Provider((ref) {
  // Read the pre-configured Dio client from the core network provider
  return ResourceRepository(ref.read(dioClientProvider));
});

/// Repository responsible for all resource-related API interactions in the DMS.
/// Acts as the single source of truth for fetching, creating, updating,
/// changing status, and deleting disaster response resources.
class ResourceRepository {
  // Private Dio HTTP client wrapper used for all outbound API calls
  final DioClient _client;

  /// Constructs a [ResourceRepository] with an injected [DioClient].
  /// The client carries authentication tokens and the backend base URL.
  ResourceRepository(this._client);

  /// Fetches a paginated, optionally filtered list of resources from the DMS backend.
  ///
  /// [type]   — Filter by resource category (e.g., "VEHICLE", "MEDICAL", "SHELTER").
  /// [status] — Filter by availability status (e.g., "AVAILABLE", "DEPLOYED", "MAINTENANCE").
  /// [q]      — Free-text search query matched against resource name or description.
  /// [page]   — Zero-based page index for pagination (default: 0).
  /// [size]   — Number of resources to return per page (default: 50).
  ///
  /// Returns a flat [List<ResourceModel>] regardless of whether the backend
  /// responds with a paginated envelope or a bare array.
  Future<List<ResourceModel>> getResources({
    String? type,
    String? status,
    String? q,
    int page = 0,
    int size = 50,
  }) async {
    try {
      // Start with mandatory pagination parameters required by the backend
      final params = <String, dynamic>{'page': page, 'size': size};

      // Append optional type filter only when a non-empty value is provided
      if (type != null && type.isNotEmpty) params['type'] = type;

      // Append optional status filter to narrow results by resource availability
      if (status != null && status.isNotEmpty) params['status'] = status;

      // Append optional search query for keyword-based resource lookup
      if (q != null && q.isNotEmpty) params['q'] = q;

      // Execute GET /api/v1/resources with assembled query parameters
      final res = await _client.get(ApiConstants.resources,
          queryParameters: params);

      // Unwrap the response: backend may wrap payload under a 'data' key
      final data = res.data['data'] ?? res.data;

      // Handle both paginated (Spring Page with 'content') and plain array responses
      final content = data is Map ? (data['content'] ?? []) : data;

      // Deserialize each JSON object into a typed ResourceModel instance
      return (content as List)
          .map((e) => ResourceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Convert low-level Dio network errors into structured domain exceptions
      throw ApiException.fromDioError(e);
    }
  }

  /// Creates a new disaster response resource on the DMS backend.
  ///
  /// [body] — JSON map containing resource fields such as name, type,
  ///          quantity, location coordinates, and initial status.
  ///
  /// Returns the newly persisted [ResourceModel] as returned by the server,
  /// including its generated ID and timestamps.
  Future<ResourceModel> createResource(Map<String, dynamic> body) async {
    try {
      // POST the new resource payload to the resources endpoint
      final res = await _client.post(ApiConstants.resources, data: body);

      // Unwrap the 'data' envelope if present, or use the raw response body
      final data = (res.data['data'] ?? res.data) as Map<String, dynamic>;

      // Deserialize the server response into a ResourceModel with server-assigned ID
      return ResourceModel.fromJson(data);
    } on DioException catch (e) {
      // Translate network/server errors into a consistent ApiException
      throw ApiException.fromDioError(e);
    }
  }

  /// Updates all editable fields of an existing resource identified by [id].
  ///
  /// [id]   — The unique integer identifier of the resource to update.
  /// [body] — JSON map with updated resource fields (name, type, quantity, etc.).
  ///
  /// Returns the fully updated [ResourceModel] as confirmed by the backend.
  Future<ResourceModel> updateResource(int id, Map<String, dynamic> body) async {
    try {
      // PUT the updated payload to the resource-specific endpoint (e.g., /api/v1/resources/42)
      final res = await _client.put(ApiConstants.resourceById(id), data: body);

      // Unwrap the response envelope to reach the actual resource JSON object
      final data = (res.data['data'] ?? res.data) as Map<String, dynamic>;

      // Deserialize and return the updated resource with all server-confirmed values
      return ResourceModel.fromJson(data);
    } on DioException catch (e) {
      // Surface any HTTP or connectivity errors as a domain-level exception
      throw ApiException.fromDioError(e);
    }
  }

  // PATCH /api/v1/resources/{id}/status?status=VALUE
  // Dedicated status-only update to avoid overwriting other resource fields
  // and to keep status transitions atomic (e.g., AVAILABLE -> DEPLOYED).
  /// Changes the operational status of a resource without modifying other fields.
  ///
  /// [id]     — The unique identifier of the resource whose status is changing.
  /// [status] — The new status value (e.g., "AVAILABLE", "DEPLOYED", "MAINTENANCE").
  ///
  /// This lightweight PATCH call is used during incident dispatch workflows
  /// to mark resources as deployed or released back to available.
  Future<void> updateStatus(int id, String status) async {
    try {
      // PATCH to the dedicated status sub-resource endpoint with status as a query param
      await _client.patch(
        ApiConstants.resourceStatus(id), // e.g., /api/v1/resources/42/status
        queryParameters: {'status': status}, // Backend reads status from query string
      );
    } on DioException catch (e) {
      // Re-throw as ApiException so callers receive consistent error information
      throw ApiException.fromDioError(e);
    }
  }

  /// Permanently removes a resource record from the DMS backend.
  ///
  /// [id] — The unique identifier of the resource to delete.
  ///
  /// Typically used by administrators to decommission resources that are
  /// no longer available (e.g., destroyed equipment, closed shelters).
  Future<void> deleteResource(int id) async {
    try {
      // DELETE the resource identified by its ID from the backend store
      await _client.delete(ApiConstants.resourceById(id));
    } on DioException catch (e) {
      // Wrap Dio errors so the UI layer receives structured failure details
      throw ApiException.fromDioError(e);
    }
  }
}