// =============================================================================
// team_repository.dart
//
// Data layer repository for managing disaster response teams in the DMS.
// Provides CRUD operations (fetch, create, update, delete) for TeamModel
// objects by communicating with the DMS Spring Boot backend REST API.
//
// This file bridges the feature layer (UI/state) and the network layer,
// using Dio for HTTP requests and Riverpod for dependency injection.
// Teams in this context are groups of first responders assigned to incidents.
// =============================================================================

// Dio HTTP client package — used for making REST API calls to the DMS backend
import 'package:dio/dio.dart';
// Riverpod state management — used to expose TeamRepository as a scoped provider
import 'package:flutter_riverpod/flutter_riverpod.dart';
// DMS API endpoint constants — centralised URLs for team-related REST routes
import '../../../core/constants/api_constants.dart';
// Configured Dio HTTP client instance with auth headers and base URL baked in
import '../../../core/network/dio_client.dart';
// Structured exception type that wraps Dio HTTP errors for consistent error handling
import '../../../core/network/api_exception.dart';
// TeamModel data class — represents a disaster response team entity from the API
import 'team_model.dart';

/// Riverpod provider that creates and exposes a [TeamRepository] instance.
/// Reads [dioClientProvider] so the repository automatically receives the
/// pre-configured HTTP client (with auth tokens and base URL) at runtime.
/// Scoped at the root widget tree so all team-related features share one instance.
final teamRepositoryProvider = Provider((ref) {
  // Inject the shared DioClient from the provider tree into TeamRepository
  // so that the repository always uses the same authenticated HTTP session
  return TeamRepository(ref.read(dioClientProvider));
});

/// Repository class encapsulating all data access operations for disaster teams.
/// Acts as the single source of truth for team data within the DMS feature layer;
/// callers (providers, view-models) never touch Dio or raw HTTP directly.
/// Follows the Repository pattern to keep business logic decoupled from I/O concerns.
class TeamRepository {
  // Private Dio HTTP client wrapper — carries auth headers and base URL config
  // declared final to prevent reassignment after construction
  final DioClient _client;

  /// Constructs a [TeamRepository] with the given [_client].
  /// The client is injected by [teamRepositoryProvider] for testability.
  /// Accepting [DioClient] via constructor allows mocking in unit tests.
  TeamRepository(this._client);

  /// Fetches the full list of active disaster response teams from the backend.
  /// Supports paginated responses (Spring Data page envelope) by unwrapping
  /// the nested `data.content` field, falling back to the raw list if absent.
  /// Returns a [List<TeamModel>] or throws [ApiException] on HTTP/network error.
  /// Called by the teams list screen to populate the team roster in the DMS UI.
  Future<List<TeamModel>> getTeams() async {
    try {
      // GET /api/teams — retrieve all registered teams from the DMS backend
      // The DioClient automatically attaches Bearer auth token to this request
      final res = await _client.get(ApiConstants.teams);
      // Unwrap the DMS standard response envelope: prefer `data` key if present,
      // falling back to the raw response body for non-enveloped endpoints
      final data = res.data['data'] ?? res.data;
      // Handle Spring paginated responses by extracting the `content` array,
      // or use the full response body if it is already a flat list of teams
      final content = data['content'] ?? data;
      // Map each raw JSON object to a strongly-typed TeamModel instance
      // using the factory constructor defined in team_model.dart
      return (content as List)
          .map((e) => TeamModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      // Convert low-level Dio error (timeout, 4xx, 5xx) into a domain-level exception
      // so that the calling layer receives consistent, typed error information
      throw ApiException.fromDioError(e);
    }
  }

  /// Creates a new disaster response team in the DMS backend.
  /// [body] should contain team fields such as name, type, and capacity.
  /// Returns the newly created [TeamModel] (with server-assigned ID) or
  /// throws [ApiException] if validation fails or the server is unreachable.
  /// Typically invoked from an admin form when registering a new response unit.
  Future<TeamModel> createTeam(Map<String, dynamic> body) async {
    try {
      // POST /api/teams — submit new team details to the backend for persistence
      // [body] is serialised to JSON by Dio and sent in the request body
      final res = await _client.post(ApiConstants.teams, data: body);
      // Unwrap the response envelope to extract the persisted team object
      // which now includes the server-generated primary key (team ID)
      final data = res.data['data'] ?? res.data;
      // Deserialise the JSON payload into a TeamModel with the generated team ID
      // so the UI can immediately reference the new team without a round-trip fetch
      return TeamModel.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      // Surface HTTP/network failures as a typed ApiException to the caller
      // (e.g., 400 Bad Request if required team fields are missing)
      throw ApiException.fromDioError(e);
    }
  }

  /// Updates an existing disaster response team identified by [id].
  /// [body] may contain any updatable team fields (name, status, capacity, etc.).
  /// Returns the updated [TeamModel] reflecting the server's persisted state,
  /// or throws [ApiException] if the team is not found or the request fails.
  /// Used by admins to reassign teams, change availability status, or rename units.
  Future<TeamModel> updateTeam(int id, Map<String, dynamic> body) async {
    try {
      // PUT /api/teams/{id} — send updated team data to overwrite the existing record
      // [ApiConstants.teamById] builds the parameterised URL /api/teams/{id}
      final res = await _client.put(ApiConstants.teamById(id), data: body);
      // Unwrap the standard DMS response envelope to get the updated team object
      // confirming the fields the backend actually persisted after validation
      final data = res.data['data'] ?? res.data;
      // Deserialise the updated JSON payload back into a typed TeamModel
      // so callers receive a strongly-typed object rather than raw dynamic data
      return TeamModel.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      // Translate Dio network/HTTP failure into a domain-level ApiException
      // (e.g., 404 Not Found if the team ID no longer exists in the DMS)
      throw ApiException.fromDioError(e);
    }
  }

  /// Permanently deletes the disaster response team identified by [id].
  /// Used by admins to decommission teams that are no longer operational.
  /// Completes with no return value on success, or throws [ApiException]
  /// if the team does not exist or the request cannot be completed.
  /// Callers should confirm deletion intent in the UI before invoking this method.
  Future<void> deleteTeam(int id) async {
    try {
      // DELETE /api/teams/{id} — remove the specified team record from the DMS
      // This is a destructive, irreversible operation on the backend database
      await _client.delete(ApiConstants.teamById(id));
      // No return value on success; the team entry has been removed from the system
    } on DioException catch (e) {
      // Wrap Dio error (e.g., 404 not found, 403 forbidden) as ApiException
      // so the UI layer can display a meaningful error message to the admin user
      throw ApiException.fromDioError(e);
    }
  }
}