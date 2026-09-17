// =============================================================================
// incident_provider.dart
//
// State management layer for disaster incidents in the DMS Flutter application.
// This file defines [IncidentState] (an immutable data container),
// [IncidentNotifier] (a Riverpod StateNotifier that drives all incident CRUD
// and filtering operations), and two Riverpod providers that expose incident
// data to the UI:
//   - [incidentProvider]       — paginated, filterable incident list
//   - [incidentDetailProvider] — single incident detail by ID
//
// The notifier delegates all network/persistence work to [IncidentRepository],
// keeping business logic and UI state cleanly separated.
// =============================================================================

// Riverpod state management framework for Flutter — provides StateNotifier,
// FutureProvider, and the provider infrastructure used throughout this file.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Repository that abstracts all HTTP calls to the DMS backend incident API.
import '../data/incident_repository.dart';

// Data model representing a single disaster incident (title, type, severity,
// location, status, assigned team, media attachments, etc.).
import '../data/models/incident_model.dart';

/// Immutable snapshot of the incident list screen's UI state.
///
/// Holds the loaded incidents, pagination cursor, active filter criteria,
/// and async status flags (loading / error). Because it is immutable, every
/// state transition produces a new instance via [copyWith].
class IncidentState {
  /// The current page of incident records fetched from the DMS backend.
  final List<IncidentModel> incidents;

  /// True while an async fetch is in-flight; used to show loading indicators
  /// and to prevent concurrent duplicate requests.
  final bool isLoading;

  /// Non-null when the last fetch failed; carries the error message to display.
  final String? error;

  /// False once a page returns fewer than the page-size threshold (20),
  /// signalling that all matching incidents have been loaded.
  final bool hasMore;

  /// Zero-based page index for the next paginated fetch from the backend.
  final int page;

  /// Active incident status filter (e.g. "OPEN", "IN_PROGRESS", "RESOLVED").
  /// Empty string means no filter applied.
  final String filterStatus;

  /// Active severity filter (e.g. "LOW", "MEDIUM", "HIGH", "CRITICAL").
  /// Empty string means no filter applied.
  final String filterSeverity;

  /// Active incident type filter (e.g. "FIRE", "FLOOD", "EARTHQUAKE").
  /// Empty string means no filter applied.
  final String filterType;

  /// Free-text search query entered by the user to narrow the incident list.
  final String searchQuery;

  /// Creates an [IncidentState] with sensible defaults: empty list, not loading,
  /// no error, pagination at page 0, and all filters cleared.
  const IncidentState({
    this.incidents = const [],
    this.isLoading = false,
    this.error,
    this.hasMore = true,
    this.page = 0,
    this.filterStatus = '',
    this.filterSeverity = '',
    this.filterType = '',
    this.searchQuery = '',
  });

  /// Returns a new [IncidentState] with only the supplied fields replaced.
  ///
  /// [clearError] can be set to true to explicitly nullify [error] even when
  /// no new error value is provided — useful when starting a fresh fetch.
  IncidentState copyWith({
    List<IncidentModel>? incidents,
    bool? isLoading,
    String? error,
    bool? hasMore,
    int? page,
    String? filterStatus,
    String? filterSeverity,
    String? filterType,
    String? searchQuery,
    // When true, resets error to null regardless of the error parameter value.
    bool clearError = false,
  }) =>
      IncidentState(
        incidents: incidents ?? this.incidents,
        isLoading: isLoading ?? this.isLoading,
        // clearError takes precedence; otherwise keeps the incoming or existing error.
        error: clearError ? null : (error ?? this.error),
        hasMore: hasMore ?? this.hasMore,
        page: page ?? this.page,
        filterStatus: filterStatus ?? this.filterStatus,
        filterSeverity: filterSeverity ?? this.filterSeverity,
        filterType: filterType ?? this.filterType,
        searchQuery: searchQuery ?? this.searchQuery,
      );
}

/// Riverpod [StateNotifier] that manages all incident list operations.
///
/// Responsibilities include:
/// - Paginated loading and refreshing of incident records from the DMS API
/// - Loading incidents reported by the currently authenticated citizen/officer
/// - Applying and resetting filter/search criteria
/// - Deleting incidents (admin/officer action)
/// - Updating an incident's workflow status (e.g. escalating or resolving)
class IncidentNotifier extends StateNotifier<IncidentState> {
  /// Repository injected at construction time; handles all DMS backend calls.
  final IncidentRepository _repo;

  /// Initialises the notifier with a default (empty) [IncidentState].
  IncidentNotifier(this._repo) : super(const IncidentState());

  /// Fetches a page of incidents from the DMS backend, applying the current
  /// filter and search state.
  ///
  /// When [refresh] is true the list is reset to page 0 and existing items
  /// are replaced; otherwise new items are appended (infinite-scroll pattern).
  /// Guards against duplicate concurrent calls by checking [state.isLoading].
  Future<void> loadIncidents({bool refresh = false}) async {
    // Prevent a second fetch from firing while one is already in-flight.
    if (state.isLoading) return;

    // On refresh start from the first page; otherwise continue from current cursor.
    final page = refresh ? 0 : state.page;

    // Signal loading and clear any previous error before making the request.
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Delegate to the repository, passing active filter/search parameters.
      final items = await _repo.getIncidents(
        page: page,
        status: state.filterStatus,  // e.g. "OPEN" or "" for all statuses
        q: state.searchQuery,         // free-text search forwarded to the API
      );
      state = state.copyWith(
        // Replace list on refresh; append pages on infinite scroll.
        incidents: refresh ? items : [...state.incidents, ...items],
        isLoading: false,
        page: page + 1,           // advance cursor for the next load
        // Assume more pages exist only if a full page was returned.
        hasMore: items.length >= 20,
      );
    } catch (e) {
      // Store the error message so the UI can display an appropriate alert.
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Loads only the incidents reported by the currently logged-in user.
  ///
  /// Used on the citizen's "My Reports" screen to show personal incident history.
  /// Treats the result as a complete (non-paginated) list, so [hasMore] is false.
  Future<void> loadMyIncidents() async {
    // Prevent concurrent requests from overlapping.
    if (state.isLoading) return;

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Repository call scoped to the authenticated user's own incidents.
      final items = await _repo.getMyIncidents();
      state = state.copyWith(
        incidents: items,
        isLoading: false,
        page: 1,        // mark as first page loaded even though we won't paginate
        hasMore: false, // personal incident list is returned in full — no more pages
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Updates the active filter criteria and resets the list to trigger a fresh load.
  ///
  /// Clears the current incident list and resets pagination so that the next
  /// call to [loadIncidents] fetches page 0 with the new filter parameters.
  /// Null arguments leave the corresponding filter unchanged.
  void setFilters({
    String? status,    // incident workflow status to filter by (e.g. "OPEN")
    String? severity,  // incident severity level to filter by (e.g. "HIGH")
    String? type,      // incident category to filter by (e.g. "FLOOD")
    String? query,     // free-text search string
  }) {
    state = state.copyWith(
      filterStatus: status ?? state.filterStatus,
      filterSeverity: severity ?? state.filterSeverity,
      filterType: type ?? state.filterType,
      searchQuery: query ?? state.searchQuery,
      incidents: [],  // clear existing results so the UI shows a fresh list
      page: 0,        // reset pagination cursor to the beginning
      hasMore: true,  // assume there are results until proven otherwise
    );
  }

  /// Deletes the incident with the given [id] via the DMS backend, then removes
  /// it from the local state so the UI updates immediately without a refetch.
  Future<void> deleteIncident(int id) async {
    // Perform the delete on the server first; throws on failure.
    await _repo.deleteIncident(id);

    // Filter the deleted incident out of the local list optimistically.
    state = state.copyWith(
      incidents: state.incidents.where((i) => i.id != id).toList(),
    );
  }

  /// Updates the workflow status of incident [id] (e.g. "IN_PROGRESS", "RESOLVED")
  /// both on the DMS backend and in local state for immediate UI reflection.
  Future<void> updateStatus(int id, String status) async {
    // Persist the status change on the server.
    await _repo.updateStatus(id, status);

    // Replace the matching incident in the local list with an updated copy.
    state = state.copyWith(
      incidents: state.incidents
          .map((i) => i.id == id ? _withStatus(i, status) : i)
          .toList(),
    );
  }

  /// Creates a copy of [IncidentModel] [i] with only the [status] field replaced.
  ///
  /// All other incident fields (location, severity, assigned team, media, etc.)
  /// are preserved verbatim. This avoids a full API refetch after a status update.
  IncidentModel _withStatus(IncidentModel i, String status) => IncidentModel(
        id: i.id,
        title: i.title,
        description: i.description,
        type: i.type,
        severity: i.severity,
        status: status,              // only this field changes on a status update
        city: i.city,
        address: i.address,
        latitude: i.latitude,
        longitude: i.longitude,
        reportedByName: i.reportedByName,
        assignedTeamName: i.assignedTeamName,
        createdAt: i.createdAt,
        media: i.media,
      );
}

/// Global Riverpod provider exposing [IncidentNotifier] and its [IncidentState].
///
/// Screens that display or manage the incident list (e.g. incident map, admin
/// dashboard, citizen portal) watch this provider to react to state changes.
/// The notifier is wired to the shared [incidentRepositoryProvider] so all
/// widgets share a single source of truth for the incident list.
final incidentProvider =
    StateNotifierProvider<IncidentNotifier, IncidentState>((ref) {
  // Inject the repository; Riverpod handles lifecycle and disposal.
  return IncidentNotifier(ref.read(incidentRepositoryProvider));
});

/// Riverpod provider for fetching a single incident's full detail by its [id].
///
/// Uses [FutureProvider.family] so each unique incident ID gets its own cached
/// async value. Widgets that display incident detail pages (photos, assigned
/// team, GPS location, status timeline) use this provider.
final incidentDetailProvider =
    FutureProvider.family<IncidentModel, int>((ref, id) async {
  // Fetch the full incident record from the DMS backend by primary key.
  return ref.read(incidentRepositoryProvider).getIncident(id);
});