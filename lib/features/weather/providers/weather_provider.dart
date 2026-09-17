// =============================================================================
// weather_provider.dart
//
// Purpose: Riverpod state providers for fetching and caching real-time weather
// data in the Disaster Management System (DMS). Weather conditions are critical
// for situational awareness during disaster incidents — responders and admins
// rely on current temperature, precipitation, and wind data to assess field
// conditions and allocate resources appropriately.
//
// Data source: Open-Meteo free public API (no API key required).
// Caching strategy: Hive local storage keyed by rounded lat/lon coordinates,
// used as fallback when the network request fails (e.g., in disaster zones
// where connectivity may be intermittent).
//
// Location resolution order:
//   1. Manually set location via weatherLocationProvider (e.g., incident site)
//   2. Device GPS position (if permission granted and service enabled)
//   3. Default fallback: Amman, Jordan (DMS primary deployment region)
// =============================================================================

// Standard Dart library for JSON encoding/decoding weather API responses
import 'dart:convert';

// Riverpod for reactive, compile-safe state management across the DMS app
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Geolocator for accessing device GPS to pinpoint responder or user location
import 'package:geolocator/geolocator.dart';

// Dio HTTP client with timeout support for resilient API calls in low-bandwidth disaster zones
import 'package:dio/dio.dart';

// Hive Flutter for lightweight local caching of weather data (offline resilience)
import 'package:hive_flutter/hive_flutter.dart';

// Domain model that maps Open-Meteo JSON fields to typed Dart weather objects
import '../data/weather_model.dart';

// Shared Dio HTTP client configured with a 10-second connect timeout to avoid
// hanging requests in degraded network conditions common during disaster events
final _dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));

// Fallback latitude for Amman, Jordan — used when GPS is unavailable or denied
const _defaultLat = 31.9539;

// Fallback longitude for Amman, Jordan — paired with _defaultLat as the DMS default region
const _defaultLon = 35.9106;

/// Riverpod StateProvider holding a manually overridden (latitude, longitude) pair.
/// When set (e.g., to an active incident's coordinates), weatherProvider uses it
/// instead of the device GPS, allowing dispatchers to check weather at a remote site.
/// Null means no override is active — fall back to GPS or default coordinates.
final weatherLocationProvider = StateProvider<(double, double)?>((_) => null);

/// Riverpod FutureProvider that asynchronously resolves current and 7-day
/// forecast weather data for the DMS. Used by weather widgets on dashboards and
/// incident detail screens to surface conditions relevant to field operations.
final weatherProvider = FutureProvider<WeatherData>((ref) async {
  // Watch the manual location override; rebuilds this provider when it changes
  final loc = ref.watch(weatherLocationProvider);

  // lat/lon will be resolved from override, GPS, or default — declared here for scope
  double lat, lon;

  if (loc != null) {
    // Use the manually pinned location (e.g., an incident site set by the dispatcher)
    lat = loc.$1; lon = loc.$2;
  } else {
    // No manual override — attempt to resolve device GPS position
    try {
      // Check if the device location service (GPS hardware) is enabled at all
      bool se = await Geolocator.isLocationServiceEnabled();

      if (!se) {
        // Location service disabled — use DMS default region (Amman, Jordan)
        lat = _defaultLat; lon = _defaultLon;
      } else {
        // Location service is on — now check app-level permission status
        var perm = await Geolocator.checkPermission();

        // If permission was previously denied (but not permanently), prompt user now
        if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();

        if (perm == LocationPermission.deniedForever) {
          // User permanently blocked location access — silently fall back to default
          lat = _defaultLat; lon = _defaultLon;
        } else {
          // Permission granted — acquire actual device position for weather lookup
          final pos = await Geolocator.getCurrentPosition(
            // Low accuracy is sufficient for weather; saves battery during sustained DMS use
            desiredAccuracy: LocationAccuracy.low,
          );
          // Use the resolved GPS coordinates for the weather API request
          lat = pos.latitude; lon = pos.longitude;
        }
      }
    } catch (_) {
      // Any unexpected GPS error (timeout, hardware failure) — degrade to default location
      lat = _defaultLat; lon = _defaultLon;
    }
  }

  // Open the DMS shared Hive cache box for offline weather data persistence
  final box = Hive.box('dms_cache');

  // Build a location-specific cache key rounded to 2 decimal places (~1 km precision)
  // so nearby requests share the same cached entry and reduce redundant API calls
  final cacheKey = 'weather_${lat.toStringAsFixed(2)}_${lon.toStringAsFixed(2)}';

  try {
    // Fetch 7-day weather forecast from Open-Meteo for the resolved coordinates
    final resp = await _dio.get(
      'https://api.open-meteo.com/v1/forecast',
      queryParameters: {
        // Target coordinates resolved above (incident site, GPS, or default)
        'latitude': lat, 'longitude': lon,

        // Include current real-time weather block (temperature, wind, WMO code)
        'current_weather': true,

        // Daily fields: WMO weather code, temp range, precipitation, wind, UV index
        // These surface-level metrics directly inform evacuation and field safety decisions
        'daily': 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,uv_index_max',

        // Hourly temperature and precipitation probability for granular timeline planning
        'hourly': 'temperature_2m,weathercode,precipitation_probability',

        // Let Open-Meteo auto-detect the correct timezone from coordinates
        'timezone': 'auto',

        // Request 7 days of forecast to support multi-day incident response planning
        'forecast_days': 7,
      },
    );

    // Extract the raw JSON map from the Dio response body
    final data = resp.data as Map<String, dynamic>;

    // Persist fresh API response to Hive cache as JSON string for offline fallback
    box.put(cacheKey, jsonEncode(data));

    // Parse and return the strongly-typed WeatherData model for UI consumption
    return WeatherData.fromJson(data);
  } catch (_) {
    // Network request failed (no connectivity, timeout, or API error) —
    // attempt to serve stale cached data so the DMS UI remains functional offline
    final cached = box.get(cacheKey);

    if (cached != null) {
      // Return previously cached weather data decoded from JSON string
      return WeatherData.fromJson(jsonDecode(cached));
    }

    // No network and no cache available — propagate the error to the UI layer
    // so FutureProvider.when() can display an appropriate error state
    rethrow;
  }
});