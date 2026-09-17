// Per-user theme management: dark / light / system, persisted via SharedPreferences.
// Also holds the global currentUserIdProvider that locale_provider.dart depends on.
// Building both light and dark ThemeData here ensures the full brand token system
// (AppColors, Google Fonts Inter) is applied consistently across every widget.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // StateNotifierProvider, StateProvider, Provider
import 'package:google_fonts/google_fonts.dart'; // Inter font for text theme
import 'package:shared_preferences/shared_preferences.dart'; // Persistent key-value store
import '../core/constants/app_colors.dart'; // Brand color palette (primary, bgDark, cardDark, etc.)

// ── Per-user theme persistence ────────────────────────────────────────────────
// Holds the current ThemeMode (dark/light/system) and persists changes under a per-user key.
class ThemeNotifier extends StateNotifier<ThemeMode> {
  final String _userId; // Used to namespace prefs key so each user has their own preference
  ThemeNotifier(this._userId) : super(ThemeMode.system) { // Default to system until pref loads
    _load(); // Async-load saved theme preference after construction
  }

  // Per-user key: 'theme_<userId>' or 'theme_global' when logged out
  String get _key => 'theme_${_userId.isNotEmpty ? _userId : "global"}';

  // Reads the saved theme string ('dark'/'light'/'system') from SharedPreferences
  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key); // null on first launch
    if (saved == 'dark') state = ThemeMode.dark;
    else if (saved == 'light') state = ThemeMode.light;
    else state = ThemeMode.system; // Covers null and 'system'
  }

  // Called from Settings screen theme toggle to change and persist the mode
  Future<void> setMode(ThemeMode mode) async {
    state = mode; // Immediately updates Riverpod state → triggers MaterialApp rebuild
    final prefs = await SharedPreferences.getInstance();
    final val = mode == ThemeMode.dark ? 'dark' : mode == ThemeMode.light ? 'light' : 'system';
    await prefs.setString(_key, val); // Persist the string representation
  }
}

// Holds the currently logged-in user's ID string (empty when logged out).
// Updated by main.dart's authProvider listener so theme + locale providers
// both re-create their notifiers with the new user's ID on login/logout.
final currentUserIdProvider = StateProvider<String>((ref) => '');

// Recreated whenever currentUserIdProvider changes so login/logout loads the new user's pref
final themeModeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) {
  final userId = ref.watch(currentUserIdProvider);
  return ThemeNotifier(userId); // Each user gets their own ThemeNotifier instance
});

// Static providers — ThemeData never changes at runtime, only which one is active changes
final lightThemeProvider = Provider<ThemeData>((ref) => _buildTheme(Brightness.light));
final darkThemeProvider  = Provider<ThemeData>((ref) => _buildTheme(Brightness.dark));

// Builds a complete Material 3 ThemeData using the app's brand token system.
// Called once each for light and dark; switching themes does NOT rebuild this.
ThemeData _buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark; // Convenience flag

  const primary   = AppColors.primary;   // Brand blue — used for buttons, active states
  const secondary = AppColors.secondary; // Accent color for secondary actions

  return ThemeData(
    brightness: brightness, // Tells Material widgets which contrast level to use
    useMaterial3: true, // Enables Material You components and color tokens
    colorScheme: ColorScheme(
      brightness: brightness,
      primary:   primary,        // Buttons, FAB, active indicators
      onPrimary: Colors.white,   // Text/icons on primary-colored surfaces
      secondary: secondary,
      onSecondary: Colors.white,
      error:     AppColors.danger, // Red for validation errors
      onError:   Colors.white,
      surface:   isDark ? AppColors.cardDark  : AppColors.cardLight, // Card and dialog backgrounds
      onSurface: isDark ? AppColors.textPrimary : AppColors.textLight, // Default text on surfaces
    ),
    scaffoldBackgroundColor: isDark ? AppColors.bgDark   : AppColors.bgLight, // Page background
    cardColor:               isDark ? AppColors.cardDark : AppColors.cardLight, // Card fallback
    textTheme: GoogleFonts.interTextTheme(TextTheme( // Inter applied as the base font
      displayLarge:   TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: isDark ? AppColors.textPrimary : AppColors.textLight),
      headlineLarge:  TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: isDark ? AppColors.textPrimary : AppColors.textLight),
      headlineMedium: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: isDark ? AppColors.textPrimary : AppColors.textLight),
      titleLarge:     TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: isDark ? AppColors.textPrimary : AppColors.textLight),
      bodyLarge:      TextStyle(fontSize: 15, color: isDark ? AppColors.textPrimary : AppColors.textLight),
      bodyMedium:     TextStyle(fontSize: 14, color: isDark ? AppColors.textSecondary : AppColors.textMuted),
      bodySmall:      TextStyle(fontSize: 12, color: isDark ? AppColors.textSecondary : AppColors.textMuted),
      labelLarge:     TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isDark ? AppColors.textPrimary : AppColors.textLight),
    )),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? AppColors.bgSurface : Colors.white, // Slightly elevated from page bg
      foregroundColor: isDark ? AppColors.textPrimary : AppColors.textLight, // Back-button and action icons
      elevation: 0, // Flat design — no shadow by default
      centerTitle: true, // iOS-style centered title
      shadowColor: Colors.black26,
      surfaceTintColor: Colors.transparent, // Prevents Material 3 tinting the AppBar
      titleTextStyle: GoogleFonts.inter(
        fontSize: 17, fontWeight: FontWeight.w700,
        color: isDark ? AppColors.textPrimary : AppColors.textLight,
        letterSpacing: 0.3, // Slight tracking for readability
      ),
      iconTheme: IconThemeData(color: isDark ? AppColors.textSecondary : AppColors.textMuted),
    ),
    cardTheme: CardThemeData(
      color: isDark ? AppColors.cardDark : AppColors.cardLight,
      elevation: 0, // Cards use border instead of shadow
      margin: EdgeInsets.zero, // Let callers control margin
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12), // Rounded corners for all cards
        side: BorderSide(color: isDark ? AppColors.border : AppColors.borderLight), // Subtle border
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary, // Brand blue fill
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        side: const BorderSide(color: primary), // Brand-colored border
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, // Gives fields a solid background
      fillColor: isDark ? AppColors.cardGlass : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: isDark ? AppColors.border : AppColors.borderLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: isDark ? AppColors.border : AppColors.borderLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: primary, width: 1.5), // Thicker brand-colored border on focus
      ),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.danger)),
      focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.danger, width: 1.5)),
      labelStyle: TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted),
      hintStyle:  TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primary, foregroundColor: Colors.white, elevation: 2,
    ),
    dividerTheme: DividerThemeData(
      color: isDark ? AppColors.border : AppColors.borderLight, thickness: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: isDark ? AppColors.cardGlass : AppColors.surfaceLight,
      selectedColor: primary.withValues(alpha: 0.15), // Subtle tint when chip is selected
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      labelStyle: TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted, fontSize: 13),
      side: BorderSide(color: isDark ? AppColors.border : AppColors.borderLight),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: isDark ? AppColors.cardGlass : AppColors.textLight,
      contentTextStyle: const TextStyle(color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      behavior: SnackBarBehavior.floating, // Floats above bottom nav bar
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: primary), // Brand-colored spinners
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: isDark ? AppColors.bgSurface : Colors.white,
      selectedItemColor: primary, // Active tab uses brand blue
      unselectedItemColor: isDark ? AppColors.textSecondary : AppColors.textMuted,
      type: BottomNavigationBarType.fixed, // All items always visible (no shifting)
      elevation: 0,
    ),
  );
}
