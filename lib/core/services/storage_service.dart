// =============================================================================
// storage_service.dart
// -----------------------------------------------------------------------------
// Provides a lightweight in-memory key-value storage abstraction for the
// Disaster Management System (DMS) Flutter app. This service is used to persist
// transient runtime data such as authentication tokens, cached user profiles,
// incident drafts, and session metadata. Because the backing store is an
// in-memory map, data does not survive app restarts; it is intended for
// short-lived session state rather than permanent persistence.
// =============================================================================

// Provides JSON encoding/decoding utilities for serialising complex DMS objects
// such as incident payloads, user data, and resource records.
import 'dart:convert';

// Supplies debugPrint for conditional console logging — output is suppressed in
// release builds, keeping storage operation traces out of production logs.
import 'package:flutter/foundation.dart';

/// A session-scoped in-memory storage service for the DMS mobile application.
///
/// Wraps a static [Map] to provide a consistent async API for reading and
/// writing primitive strings and JSON objects. Typical use cases include
/// caching the authenticated user's JWT token, storing the active incident
/// draft between screens, and holding temporary resource or alert metadata
/// before it is synced to the backend.
class StorageService {
  /// Shared in-memory store backing all [StorageService] instances.
  ///
  /// Declared `static` so that all instances share the same data within a
  /// single app session — ensures that tokens or incident state written by one
  /// part of the DMS UI are immediately visible to another.
  static final Map<String, dynamic> _storage = {};

  /// Persists a plain string [value] under [key] in the in-memory store.
  ///
  /// Used for simple scalar values such as auth tokens, user IDs, or locale
  /// preferences. Errors are caught and logged rather than rethrown so that
  /// a storage failure does not crash the DMS incident-reporting flow.
  Future<void> save(String key, String value) async {
    try {
      // Write the value directly into the shared map under the given key.
      _storage[key] = value;
      // Confirm successful write in debug builds for easier tracing.
      debugPrint('✓ Saved $key to storage');
    } catch (e) {
      // Log any unexpected error without propagating it to the caller.
      debugPrint('✗ Storage save error: $e');
    }
  }

  /// Retrieves the string value stored under [key], or `null` if absent.
  ///
  /// Callers should handle a `null` return — for example, redirecting an
  /// unauthenticated DMS user to the login screen when no token is found.
  Future<String?> get(String key) async {
    try {
      // Perform a direct map lookup; returns null if the key does not exist.
      return _storage[key];
    } catch (e) {
      // Return null on error so callers can treat missing and errored values
      // uniformly without needing separate error-handling branches.
      debugPrint('✗ Storage get error: $e');
      return null;
    }
  }

  /// Serialises [json] to a JSON string and stores it under [key].
  ///
  /// Suitable for saving structured DMS objects such as incident reports,
  /// user profile maps, or resource allocation records that arrive as
  /// [Map<String, dynamic>] from the backend API.
  Future<void> saveJson(String key, Map<String, dynamic> json) async {
    try {
      // Encode the map to a JSON string before storage so it can be
      // retrieved and decoded as a typed map later.
      _storage[key] = jsonEncode(json);
      // Log the key name to aid debugging of complex DMS data flows.
      debugPrint('✓ Saved JSON $key to storage');
    } catch (e) {
      // Catch encoding failures (e.g. non-serialisable values) without
      // surfacing them as uncaught exceptions in the UI layer.
      debugPrint('✗ Storage saveJson error: $e');
    }
  }

  /// Retrieves and deserialises a JSON object stored under [key].
  ///
  /// Returns the decoded [Map<String, dynamic>] if the key exists and its
  /// value is valid JSON, or `null` otherwise. Used to restore cached DMS
  /// entity data such as the current user's profile or an incident draft.
  Future<Map<String, dynamic>?> getJson(String key) async {
    try {
      // Look up the raw JSON string stored for this key.
      final value = _storage[key];
      // Return null early if nothing was previously saved under this key.
      if (value == null) return null;
      // Decode the JSON string back into a typed map for consumption by
      // DMS models and UI widgets.
      return jsonDecode(value);
    } catch (e) {
      // A decode error means the stored value is malformed; return null so
      // callers can fall back to fetching fresh data from the backend.
      debugPrint('✗ Storage getJson error: $e');
      return null;
    }
  }

  /// Deletes the entry associated with [key] from the in-memory store.
  ///
  /// Use this to invalidate specific cached values — for example, clearing
  /// a stale incident draft after it has been successfully submitted, or
  /// removing an expired auth token during logout.
  Future<void> remove(String key) async {
    try {
      // Remove only the targeted key, leaving all other stored values intact.
      _storage.remove(key);
      // Confirm the removal in debug output for traceability.
      debugPrint('✓ Removed $key from storage');
    } catch (e) {
      // Log without rethrowing so that a failed removal does not interrupt
      // the DMS logout or navigation flow.
      debugPrint('✗ Storage remove error: $e');
    }
  }

  /// Erases all entries from the in-memory store.
  ///
  /// Typically called during a full DMS session reset — for instance, when a
  /// user logs out — to ensure that no stale tokens, incident data, or cached
  /// user information persists for the next session.
  Future<void> clear() async {
    try {
      // Wipe every key-value pair from the shared static map in one operation.
      _storage.clear();
      // Confirm complete clearance so developers can verify logout flows.
      debugPrint('✓ Cleared storage');
    } catch (e) {
      // Swallow the error to prevent a failed clear from blocking the
      // remainder of the DMS logout or app-reset sequence.
      debugPrint('✗ Storage clear error: $e');
    }
  }
}