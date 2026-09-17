// =============================================================================
// app_localizations.dart
// Disaster Management System (DMS) — Flutter Mobile App
//
// Purpose:
//   Provides a backward-compatible localization wrapper for the DMS app.
//   This file bridges older screens that relied on a static AppLocalizations
//   class with the newer reactive localization system (app_strings.dart).
//
//   In the DMS context, localization is critical for emergency responders and
//   affected civilians who may speak different languages (Arabic, English, etc.).
//   All user-facing strings — incident alerts, resource labels, status messages —
//   must be accessible through this or the primary t() helper.
//
//   New screens should use t(context, ref, key) from app_strings.dart directly
//   for reactive language switching without rebuilding the entire widget tree.
// =============================================================================

// Flutter core package — provides BuildContext used for widget tree traversal
import 'package:flutter/material.dart';

// Riverpod state management — WidgetRef enables reactive provider reads
// so language changes propagate automatically to listening widgets
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Primary localization source — contains appString() map and the reactive t() helper
// that maps string keys to their translations for the current locale
import '../l10n/app_strings.dart';

/// Thin backward-compatible wrapper for the DMS localization system.
///
/// Older screens in the disaster management app (e.g., incident report forms,
/// alert banners, resource lists) may depend on this class directly.
/// It delegates all lookups to [app_strings.dart] to keep a single source
/// of truth for translated strings across the application.
///
/// All new screens should use the reactive [t] helper from app_strings.dart
/// instead of this class, to ensure UI rebuilds on language change.
class AppLocalizations {

  /// Non-reactive static translation lookup for a given [key] and [languageCode].
  ///
  /// Use this only in contexts where a [WidgetRef] is unavailable — for example,
  /// in utility functions, notification handlers, or background services that
  /// need to format a DMS alert message without access to the widget tree.
  ///
  /// [key] — the string identifier (e.g., 'incident_reported', 'resource_available')
  /// [languageCode] — ISO 639-1 language code (e.g., 'en', 'ar', 'fr')
  ///
  /// Returns the translated string, or the key itself if no translation is found.
  ///
  /// Prefer the reactive [of] method when a [WidgetRef] is available, so the UI
  /// automatically updates when the operator or victim switches the app language.
  static String translate(String key, String languageCode) {
    // Delegate to the central appString() lookup in app_strings.dart,
    // which holds all DMS translations (incident types, severities, statuses, etc.)
    return appString(key, languageCode);
  }

  /// Reactive translation lookup that rebuilds the calling widget when the language changes.
  ///
  /// Reads the current locale from Riverpod state via [ref], then resolves [key]
  /// to the appropriate DMS UI string. This ensures emergency dashboards, incident
  /// forms, and resource panels refresh instantly when a user switches language.
  ///
  /// [context] — the widget's [BuildContext], used internally by the [t] helper
  /// [ref]     — Riverpod [WidgetRef] to subscribe to the active language provider
  /// [key]     — the localization string key (e.g., 'login_button', 'alert_critical')
  ///
  /// Delegates directly to the [t] function from app_strings.dart for consistent behavior.
  static String of(BuildContext context, WidgetRef ref, String key) =>
      // t() is the canonical reactive lookup — reads language state and maps key to string
      t(context, ref, key);
}