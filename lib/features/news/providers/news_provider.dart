// =============================================================================
// news_provider.dart
//
// Riverpod state providers for the DMS News & Alerts feed feature.
//
// This file aggregates disaster-related news from three distinct sources:
//   1. Internal DMS backend — system-generated alerts (incidents, resource
//      warnings, emergency broadcasts) issued by administrators or officers.
//   2. USGS Earthquake Feed — real-time M4.5+ seismic events from the past
//      week via the USGS GeoJSON API, relevant for seismic disaster monitoring.
//   3. ReliefWeb Reports — UN OCHA's humanitarian disaster news feed, providing
//      global context on ongoing crises.
//
// All sources are merged, de-prioritised (DMS alerts always surface first),
// and sorted by recency. Hive is used as an offline cache so the news feed
// remains usable when network connectivity is degraded during a disaster.
// =============================================================================

// Core Dart library for JSON encoding/decoding of cached feed payloads.
import 'dart:convert';

// Dio HTTP client used for external API requests (USGS, ReliefWeb).
import 'package:dio/dio.dart';

// Riverpod for reactive state management — FutureProvider and StateProvider.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Hive Flutter for lightweight local key-value caching of feed data.
import 'package:hive_flutter/hive_flutter.dart';

// Authenticated Dio instance for internal DMS backend requests.
import '../../../core/network/dio_client.dart';

// Centralised API endpoint constants (e.g. ApiConstants.alerts path).
import '../../../core/constants/api_constants.dart';

// NewsItem domain model with factory constructors for each data source.
import '../data/news_model.dart';

// A dedicated, unauthenticated Dio instance for calling public external APIs
// (USGS, ReliefWeb) that do not require DMS session credentials.
// Shorter timeouts are set to prevent the news feed from stalling the UI
// during poor connectivity — common in disaster-affected areas.
final _externalDio = Dio(BaseOptions(
  // Maximum time to wait for the TCP connection to be established.
  connectTimeout: const Duration(seconds: 10),
  // Maximum time to wait for the response body to finish streaming.
  receiveTimeout: const Duration(seconds: 15),
));

/// Combined news provider that merges DMS backend alerts with external
/// disaster news sources into a single, sorted [NewsItem] list.
///
/// Implemented as a [FutureProvider] so the UI can trivially react to
/// loading, error, and data states without manual state management.
final newsProvider = FutureProvider<List<NewsItem>>((ref) async {
  // Open the shared DMS Hive cache box used for offline-first feed storage.
  final box = Hive.box('dms_cache');

  // Accumulator list that collects NewsItems from all three sources before
  // the final sort is applied.
  final items = <NewsItem>[];

  // ── Source 1: DMS Backend Alerts ─────────────────────────────────────────
  // Fetch operator-issued alerts (e.g. evacuation notices, resource shortages)
  // from the internal DMS REST API using the authenticated Dio client.
  try {
    // Retrieve the authenticated Dio instance registered in the provider scope.
    final dio = ref.read(dioClientProvider);

    // GET /alerts — returns paginated or flat list of active system alerts.
    final resp = await dio.get(ApiConstants.alerts);

    // Cast response to a generic map; backend may wrap items under 'data' or
    // 'content' keys depending on the pagination strategy in use.
    final body = resp.data as Map<String, dynamic>;

    // Defensively extract the list, falling back through known wrapper keys
    // and finally treating the body itself as the list if unwrapped.
    final data = (body['data'] ?? body['content'] ?? body) as List? ?? [];

    // Convert each raw alert map into a NewsItem flagged as a DMS alert.
    for (final a in data) {
      items.add(NewsItem.fromAlert(a as Map<String, dynamic>));
    }
  } catch (_) {
    // Silently swallow network/parse errors — the feed degrades gracefully
    // to external sources and cached data rather than blocking the entire list.
  }

  // ── Source 2: USGS Earthquake Feed ───────────────────────────────────────
  // Pull M4.5+ seismic events from the past 7 days. This threshold is chosen
  // because M4.5+ quakes are typically felt and operationally relevant to DMS
  // field teams assessing structural damage or casualty risk.
  try {
    // Fetch GeoJSON FeatureCollection from the USGS public earthquake feed.
    final resp = await _externalDio.get(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
    );

    // Extract the 'features' array; each element is a GeoJSON Feature object.
    final features = (resp.data as Map<String, dynamic>)['features'] as List? ?? [];

    // Map each GeoJSON feature's 'properties' block to a NewsItem.
    for (final f in features) {
      // Properties contain magnitude, place, time, and alert level fields.
      final props = (f as Map<String, dynamic>)['properties'] as Map<String, dynamic>? ?? {};
      items.add(NewsItem.fromUSGS(props));
    }

    // Cache the raw features list so earthquake data is available offline —
    // critical when field teams lose connectivity post-disaster.
    box.put('usgs_cache', jsonEncode(features));
  } catch (_) {
    // Network failed — attempt to serve stale earthquake data from Hive cache.
    final cached = box.get('usgs_cache');
    if (cached != null) {
      // Re-parse the JSON-encoded feature list stored during the last successful fetch.
      for (final f in jsonDecode(cached) as List) {
        try {
          // Extract properties and convert to NewsItem; skip malformed entries.
          final props = (f as Map<String, dynamic>)['properties'] as Map<String, dynamic>? ?? {};
          items.add(NewsItem.fromUSGS(props));
        } catch (_) {}
      }
    }
  }

  // ── Source 3: ReliefWeb Humanitarian Reports ──────────────────────────────
  // Pull the 15 most recent humanitarian situation reports from ReliefWeb,
  // the UN OCHA information platform. This provides global disaster context
  // that supplements locally-generated DMS incident data.
  try {
    // Query the ReliefWeb v1 reports endpoint requesting only the fields needed
    // to render a news card: title, creation date, and canonical URL alias.
    // Results are sorted newest-first and capped at 15 items to limit payload size.
    final resp = await _externalDio.get(
      'https://api.reliefweb.int/v1/reports?appname=dms-mobile&fields[include][]=title&fields[include][]=date.created&fields[include][]=url_alias&sort[]=date.created:desc&limit=15',
    );

    // Extract the 'data' array from the ReliefWeb envelope response.
    final data = (resp.data as Map<String, dynamic>)['data'] as List? ?? [];

    // Convert each ReliefWeb report object into a NewsItem.
    for (final item in data) {
      items.add(NewsItem.fromReliefWeb(item as Map<String, dynamic>));
    }

    // Persist the fresh report list to Hive for offline fallback.
    box.put('reliefweb_cache', jsonEncode(data));
  } catch (_) {
    // Network failed — fall back to the most recently cached ReliefWeb reports.
    final cached = box.get('reliefweb_cache');
    if (cached != null) {
      for (final item in jsonDecode(cached) as List) {
        // Skip individual malformed items without discarding the entire cache.
        try { items.add(NewsItem.fromReliefWeb(item as Map<String, dynamic>)); } catch (_) {}
      }
    }
  }

  // ── Sorting: DMS Alerts first, then chronological descending ─────────────
  // DMS-issued alerts (e.g. evacuation orders) are always elevated above
  // external news so that operationally critical information is immediately
  // visible at the top of the feed without the user having to scroll.
  items.sort((a, b) {
    // If one item is a DMS alert and the other is not, the alert wins.
    if (a.isAlert != b.isAlert) return a.isAlert ? -1 : 1;

    // Within the same category, sort by parsed date descending (newest first).
    // Fall back to a distant past date so items with unparseable dates sink
    // to the bottom rather than crashing the comparator.
    final da = DateTime.tryParse(a.date) ?? DateTime(2000);
    final db = DateTime.tryParse(b.date) ?? DateTime(2000);
    return db.compareTo(da);
  });

  // Return the fully merged and sorted news feed to the UI layer.
  return items;
});

/// Riverpod [StateProvider] holding the currently selected news category filter.
///
/// An empty string means "All" (no filter applied). The UI layer can write
/// category slugs (e.g. 'earthquake', 'alert', 'relief') to narrow the feed.
/// Using a [StateProvider] keeps the filter reactive and automatically
/// invalidates dependent widgets when the category changes.
final newsCategoryProvider = StateProvider<String>((_) => '');