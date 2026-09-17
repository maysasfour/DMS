// Manages per-user locale (language) selection, persisted via SharedPreferences.
// Each user's preference is stored under a unique key so language survives app restarts
// and switches correctly when a different user logs in on the same device.
import 'dart:ui' as ui; // PlatformDispatcher for reading the device's system locale
import 'package:flutter/material.dart'; // Locale class
import 'package:flutter_riverpod/flutter_riverpod.dart'; // StateNotifierProvider
import 'package:shared_preferences/shared_preferences.dart'; // Persistent key-value storage
import 'theme_provider.dart'; // currentUserIdProvider — shared user-ID state

// All language codes the app has translations for in app_strings.dart
const supportedLocales = ['en','ar','fr','es','tr','de','it','zh','ru','pt','hi','ja','ko','uk'];

// StateNotifier that holds the active Locale and persists changes to SharedPreferences.
// Initialized to the device system locale (or 'en' if unsupported), then overridden by saved pref.
class LocaleNotifier extends StateNotifier<Locale> {
  final String _userId; // Used to namespace the prefs key per user
  LocaleNotifier(this._userId) : super(_deviceLocale()) {
    _load(); // Async-load saved preference after default is set
  }

  // Per-user key: 'locale_<userId>' or 'locale_global' when no user is logged in
  String get _key => 'locale_${_userId.isNotEmpty ? _userId : "global"}';

  // Returns the device's system locale if it's supported, otherwise defaults to English
  static Locale _deviceLocale() {
    final lang = ui.PlatformDispatcher.instance.locale.languageCode; // e.g. 'ar', 'fr'
    return Locale(supportedLocales.contains(lang) ? lang : 'en'); // Fallback to 'en'
  }

  // Loads the user's previously saved locale from SharedPreferences on startup
  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key); // null if first launch for this user
    if (code != null && supportedLocales.contains(code)) {
      state = Locale(code); // Override the device-default with user's saved choice
    }
  }

  // Called from the language picker UI to change and persist the locale
  Future<void> setLocale(String languageCode) async {
    if (!supportedLocales.contains(languageCode)) return; // Guard: ignore unknown codes
    state = Locale(languageCode); // Immediately update Riverpod state → rebuilds MaterialApp
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, languageCode); // Persist so it survives app restarts
  }
}

// Global provider — recreated whenever currentUserIdProvider changes (login/logout),
// so switching users loads that user's saved locale automatically.
final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) {
  final userId = ref.watch(currentUserIdProvider); // Re-creates notifier on user change
  return LocaleNotifier(userId);
});
