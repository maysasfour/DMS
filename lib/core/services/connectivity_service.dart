// =============================================================================
// connectivity_service.dart
// =============================================================================
// Purpose: Monitors real-time network connectivity for the Disaster Management
// System (DMS) mobile app. Exposes a reactive stream that indicates whether the
// device currently has an active internet connection, enabling the app to gate
// critical operations (e.g. submitting incident reports, fetching alerts, or
// syncing resources) on network availability.
// =============================================================================

// Connectivity package that detects network status changes (WiFi, mobile data, etc.)
import 'package:connectivity_plus/connectivity_plus.dart';
// Riverpod for reactive state management; used to expose the online status as a provider
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A Riverpod [StreamProvider] that emits `true` when the device is online
/// and `false` when it has no active network connection.
///
/// Used throughout the DMS app to conditionally enable or disable features
/// that require connectivity, such as reporting incidents, uploading images,
/// or receiving real-time disaster alerts.
///
/// Widgets that depend on network availability should watch this provider
/// and display appropriate offline banners or disable submission controls
/// when the value resolves to `false`.
final isOnlineProvider = StreamProvider<bool>((ref) {
  // Listen to the connectivity_plus stream which fires whenever the network
  // state changes (e.g. WiFi connected/disconnected, mobile data toggled).
  // This ensures the DMS app reacts immediately to connectivity loss so users
  // are not left waiting on a stalled incident-submit or alert-fetch request.
  return Connectivity().onConnectivityChanged.map(
    // Convert the list of current ConnectivityResult values to a single boolean:
    // the device is considered online if at least one result is not 'none'.
    // Using .any() handles multi-interface devices (e.g. WiFi + mobile data)
    // where both interfaces may be reported simultaneously — if either is active
    // the app can proceed with network-dependent DMS operations.
    (results) => results.any((r) => r != ConnectivityResult.none),
  );
});