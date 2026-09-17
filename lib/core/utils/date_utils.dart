/// date_utils.dart
/// Utility class for formatting date and time strings throughout the Disaster Management System (DMS).
/// Used to display incident timestamps, alert creation times, resource assignment dates,
/// and other time-sensitive data in a consistent, human-readable format for DMS operators and responders.

// Internationalization package used for locale-aware date/time formatting
import 'package:intl/intl.dart';

/// Provides static date formatting helpers for use across the DMS Flutter application.
/// All methods accept ISO 8601 strings (as returned by the backend Spring Boot API)
/// and convert them to localized, display-ready strings for incident reports, alerts, and logs.
class AppDateUtils {
  /// Formats an ISO 8601 date-time string into a full human-readable date and time.
  /// Used for displaying precise incident creation or update timestamps (e.g., "14 Jul 2026, 09:45").
  /// Converts UTC server time to the device's local timezone for contextual awareness.
  /// Returns an empty string if [isoString] is null (e.g., when a timestamp field is missing).
  /// Falls back to the raw [isoString] if parsing fails, preventing display errors in the UI.
  static String format(String? isoString) {
    // Guard against null timestamps, which may occur for draft or incomplete incident records
    if (isoString == null) return '';
    try {
      // Parse the ISO string from the backend and convert to the responder's local timezone
      final dt = DateTime.parse(isoString).toLocal();
      // Format as "day Month year, HH:mm" — e.g., "14 Jul 2026, 09:45" — for incident detail views
      return DateFormat('dd MMM yyyy, HH:mm').format(dt);
    } catch (_) {
      // If parsing fails (malformed date from API), return raw string rather than crashing
      return isoString;
    }
  }

  /// Formats an ISO 8601 date-time string into a short date-only string (no time component).
  /// Used for displaying dates in incident list views, resource schedules, and report headers
  /// where time precision is not required (e.g., "14 Jul 2026").
  /// Returns an empty string if [isoString] is null.
  /// Falls back to the raw [isoString] if parsing fails.
  static String shortDate(String? isoString) {
    // Guard against null values from optional or unpopulated date fields in incident records
    if (isoString == null) return '';
    try {
      // Parse and localize the UTC timestamp received from the DMS backend API
      final dt = DateTime.parse(isoString).toLocal();
      // Format as "day Month year" — e.g., "14 Jul 2026" — for compact display contexts
      return DateFormat('dd MMM yyyy').format(dt);
    } catch (_) {
      // Return raw string on parse failure to avoid blank or broken date fields in the UI
      return isoString;
    }
  }
}