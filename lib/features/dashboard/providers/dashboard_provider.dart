// =============================================================================
// dashboard_provider.dart
// =============================================================================
// Purpose: Provides state management for the DMS dashboard screen using
// Riverpod. Defines the DashboardStats data model (aggregated incident counts
// and trends) and exposes a FutureProvider that fetches live statistics from
// the backend API. This file is the single source of truth for all KPI tiles
// displayed on the responder/admin dashboard (total, active, critical,
// resolved, in-progress incident counts and historical trend data).
// =============================================================================

// Riverpod state-management library — supplies FutureProvider and ref utilities
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Incident domain model — shares type definitions with the incidents feature
import '../../incidents/data/models/incident_model.dart';
// Centralised API endpoint constants — keeps URLs out of business logic
import '../../../core/constants/api_constants.dart';
// Configured Dio HTTP client provider — handles auth headers and base URL
import '../../../core/network/dio_client.dart';

/// Immutable snapshot of aggregated incident statistics shown on the dashboard.
///
/// Each field maps to a KPI tile visible to dispatchers and administrators:
/// total incidents ever recorded, those currently active, those flagged
/// critical, those marked resolved, and those currently being handled.
/// The [trends] list carries time-series data used to render sparkline charts.
class DashboardStats {
  /// Total number of incidents ever recorded in the DMS, regardless of status.
  final int total;

  /// Incidents that are currently open and awaiting or receiving a response.
  final int active;

  /// Incidents classified as CRITICAL severity requiring immediate attention.
  final int critical;

  /// Incidents whose response has been completed and closed.
  final int resolved;

  /// Incidents actively being worked on by a response team.
  final int inProgress;

  /// Time-series trend entries (e.g. incidents per day/hour) for chart rendering.
  /// Each map typically contains a date label and a count value.
  final List<Map<String, dynamic>> trends;

  /// Creates a [DashboardStats] instance with safe zero defaults.
  /// Using const allows Flutter to reuse the same object when nothing changed.
  const DashboardStats({
    this.total = 0,
    this.active = 0,
    this.critical = 0,
    this.resolved = 0,
    this.inProgress = 0,
    this.trends = const [],
  });

  /// Deserialises a backend JSON payload into a [DashboardStats] instance.
  ///
  /// The backend may return fields under two naming conventions
  /// (e.g. `total` vs `totalIncidents`), so each field tries both keys
  /// before falling back to 0. This guards against breaking the dashboard
  /// when the API response shape evolves.
  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
    // Accept either short key or verbose key for total incident count
    total: _toInt(json['total'] ?? json['totalIncidents'] ?? 0),
    // Accept either short key or verbose key for active incident count
    active: _toInt(json['active'] ?? json['activeIncidents'] ?? 0),
    // Accept either short key or verbose key for critical incident count
    critical: _toInt(json['critical'] ?? json['criticalIncidents'] ?? 0),
    // Accept either short key or verbose key for resolved incident count
    resolved: _toInt(json['resolved'] ?? json['resolvedIncidents'] ?? 0),
    // Accept either short key or verbose key for in-progress incident count
    inProgress: _toInt(json['inProgress'] ?? json['inProgressIncidents'] ?? 0),
    // Safely cast the trends array; default to empty list if absent or null
    trends: (json['trends'] as List?)
        ?.map((e) => e as Map<String, dynamic>)
        .toList() ?? [],
  );
}

/// Converts any numeric value coming from JSON (int or double) to a Dart [int].
/// Returns 0 for null to prevent null-pointer errors when a field is missing.
int _toInt(dynamic v) => v == null ? 0 : (v as num).toInt();

/// Riverpod [FutureProvider] that fetches dashboard statistics from the backend.
///
/// Consumers (dashboard widgets) watch this provider to display KPI tiles.
/// On success it returns a populated [DashboardStats]; on any network or
/// parsing error it silently returns a zeroed [DashboardStats] so the dashboard
/// renders with empty counters rather than crashing — important during incidents
/// when connectivity may be degraded.
final dashboardStatsProvider = FutureProvider<DashboardStats>((ref) async {
  // Obtain the shared Dio HTTP client (pre-configured with auth token + base URL)
  final client = ref.read(dioClientProvider);
  try {
    // GET /api/dashboard/stats — returns aggregated incident KPIs from backend
    final res = await client.get(ApiConstants.dashboardStats);
    // Some backend versions wrap the payload in a 'data' envelope; unwrap it
    final data = res.data['data'] ?? res.data;
    // Parse the raw map into the typed DashboardStats model
    return DashboardStats.fromJson(data as Map<String, dynamic>);
  } catch (_) {
    // Return safe zero-value stats on failure so the UI never shows an error screen
    return const DashboardStats();
  }
});