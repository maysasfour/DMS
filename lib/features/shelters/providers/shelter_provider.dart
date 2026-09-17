// =============================================================================
// shelter_provider.dart
// =============================================================================
// Riverpod provider for fetching and caching emergency shelter data in the
// Disaster Management System (DMS). This provider retrieves shelter records
// from the DMS backend API and stores them locally via Hive for offline
// resilience — critical during active disaster scenarios where connectivity
// may be degraded. Falls back to hardcoded demo shelters (Jordan-specific)
// when both the API and local cache are unavailable.
// =============================================================================

// Standard Dart library for JSON encoding/decoding shelter cache payloads
import 'dart:convert';

// Riverpod for reactive state management; FutureProvider drives async data fetching
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Hive for lightweight local key-value caching of shelter data for offline use
import 'package:hive_flutter/hive_flutter.dart';

// DMS API endpoint constants — ApiConstants.shelters resolves the shelter route
import '../../../core/constants/api_constants.dart';

// Configured Dio HTTP client with auth headers and base URL injection
import '../../../core/network/dio_client.dart';

// ShelterModel: data class representing a single emergency shelter record
import '../data/shelter_model.dart';

/// Riverpod [FutureProvider] that asynchronously loads the list of available
/// emergency shelters from the DMS backend.
///
/// Resolution order:
///   1. Live API call to [ApiConstants.shelters]
///   2. Hive cache (`shelters_cache`) if the API fails
///   3. Hardcoded [_demoShelters] if no cache exists (e.g., first launch offline)
final shelterProvider = FutureProvider<List<ShelterModel>>((ref) async {
  // Open the shared DMS Hive box used across the app for offline caching
  final box = Hive.box('dms_cache');

  try {
    // Obtain the pre-configured Dio client (includes auth token and base URL)
    final dio = ref.read(dioClientProvider);

    // Fetch shelter list from the DMS REST API (GET /shelters or equivalent)
    final resp = await dio.get(ApiConstants.shelters);

    // Unwrap the response body — backend may wrap payload in 'data', 'content', or return raw
    final body = resp.data as Map<String, dynamic>;

    // Normalize response shape: support paginated ('content') and direct ('data') formats
    final data = (body['data'] ?? body['content'] ?? body) as List? ?? [];

    // Deserialize each raw JSON map into a typed ShelterModel instance
    final shelters = data.map((e) => ShelterModel.fromJson(e as Map<String, dynamic>)).toList();

    // Persist the raw JSON list to Hive so it survives app restarts without connectivity
    box.put('shelters_cache', jsonEncode(data));

    // Return the freshly fetched and deserialized shelter list to the UI
    return shelters;
  } catch (_) {
    // API call failed (network error, timeout, server error, etc.) — attempt cache fallback
    final cached = box.get('shelters_cache');

    if (cached != null) {
      // Cache hit: decode the previously stored JSON string back to a list
      final data = jsonDecode(cached) as List;

      // Rebuild ShelterModel instances from the cached raw JSON entries
      return data.map((e) => ShelterModel.fromJson(e as Map<String, dynamic>)).toList();
    }

    // Return demo data if API not available
    // Last resort: return static demo shelters so the UI remains functional
    return _demoShelters;
  }
});

/// Hardcoded fallback shelter list representing real-world emergency facilities
/// across Jordan. Used only when the API is unreachable and no Hive cache exists.
/// These entries allow the app to demonstrate shelter-mapping functionality
/// without a live backend connection (e.g., during development or field demos).
const _demoShelters = [
  // Amman city emergency shelter operated by Civil Defense — high capacity, currently open
  ShelterModel(id: 1, name: 'Civil Defense Center — Amman', address: 'Abdali District, Amman', latitude: 31.9754, longitude: 35.9095, capacity: 600, currentOccupancy: 145, isOpen: true, type: 'Emergency', phone: '+962-6-500-0001'),

  // Zarqa Red Crescent shelter — near capacity, indicating active displacement pressure
  ShelterModel(id: 2, name: 'Red Crescent Shelter — Zarqa', address: 'Al Zarqa, Jordan', latitude: 32.0728, longitude: 36.0880, capacity: 400, currentOccupancy: 380, isOpen: true, type: 'General', phone: '+962-5-385-0002'),

  // Irbid school repurposed as emergency shelter specifically for flood evacuees
  ShelterModel(id: 3, name: 'School Emergency Shelter — Irbid', address: 'University District, Irbid', latitude: 32.5556, longitude: 35.8500, capacity: 250, currentOccupancy: 60, isOpen: true, type: 'Flood', phone: '+962-2-720-0003'),

  // Large Amman sports hall — currently closed (isOpen: false), zero occupancy; reserve capacity
  ShelterModel(id: 4, name: 'Sports City Hall — Amman', address: 'Al Wehdat, Amman', latitude: 31.9402, longitude: 35.9297, capacity: 1000, currentOccupancy: 0, isOpen: false, type: 'General', phone: '+962-6-500-0004'),

  // Aqaba coastal hub with medical support — serves port area and southern Jordan disasters
  ShelterModel(id: 5, name: 'Aqaba Emergency Hub', address: 'Port Area, Aqaba', latitude: 29.5321, longitude: 35.0063, capacity: 300, currentOccupancy: 80, isOpen: true, type: 'Medical', phone: '+962-3-201-0005'),
];