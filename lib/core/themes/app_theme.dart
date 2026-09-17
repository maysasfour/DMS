/// ============================================================================
/// app_theme.dart — DMS Application Theme Configuration
///
/// Defines the visual design system for the Disaster Management System (DMS)
/// mobile application. This file centralises all Material 3 theme data so that
/// every screen — incident reports, alert dashboards, resource maps, and user
/// profiles — renders with a consistent neon-cyberpunk aesthetic regardless of
/// the active role (citizen, officer, admin).
///
/// Two theme variants are provided:
///   • [buildDarkTheme]  — flagship dark/neon look suited for field officers
///     working in low-light emergency environments.
///   • [buildLightTheme] — clean light variant for daytime or accessibility use.
///
/// Both themes accept a [primaryColor] parameter so that role-specific accent
/// colours (e.g. admin purple vs officer cyan) can be injected at runtime
/// without duplicating theme logic.
///
/// Font: Rajdhani — a condensed, high-legibility typeface appropriate for
/// reading incident titles and alert counts under stress.
/// ============================================================================

// Flutter Material Design widgets and theme primitives.
import 'package:flutter/material.dart';
// SystemUiOverlayStyle — controls status-bar icon brightness on device OS chrome.
import 'package:flutter/services.dart';
// DMS colour palette constants shared across dark and light themes.
import 'color_palette.dart';

/// Central theme factory for the Disaster Management System Flutter app.
///
/// All theme creation is static so consumers can call [buildDarkTheme] or
/// [buildLightTheme] without instantiating this class.
class AppTheme {
  /// Rajdhani is the primary typeface for all DMS UI text.
  /// Its condensed width maximises information density on incident list tiles.
  static const String _fontFamily = 'Rajdhani';

  // ── Dark theme (primary / flagship) ──────────────────────────────────────

  /// Builds the dark Material 3 theme used as the flagship DMS appearance.
  ///
  /// [primaryColor] is injected at runtime to support per-role branding:
  /// admin screens use purple, officer screens use cyan, etc.
  static ThemeData buildDarkTheme({required Color primaryColor}) {
    // Full Material 3 ColorScheme for the dark variant.
    // Each slot maps to a specific UI concern (surface, error, outline, etc.)
    // so that incident severity colours remain distinguishable in dark conditions.
    final cs = ColorScheme(
      // Tells Material widgets that this scheme is dark-mode.
      brightness: Brightness.dark,
      // Role-specific accent: drives buttons, FABs, selected nav items.
      primary: primaryColor,
      // Text / icons drawn on top of [primary] fills — always white for contrast.
      onPrimary: ColorPalette.neutral0,
      // Subtle tinted container for primary-branded chips and badges (e.g. status pills).
      primaryContainer: primaryColor.withOpacity(0.2),
      // Content colour rendered inside [primaryContainer] — matches the accent hue.
      onPrimaryContainer: primaryColor,
      // Cyan accent used for secondary actions such as "View on Map" buttons.
      secondary: ColorPalette.accentCyan,
      // Dark text over cyan fills ensures legibility on alert banners.
      onSecondary: ColorPalette.neutral900,
      // Muted cyan wash for secondary chip backgrounds (e.g. incident type tags).
      secondaryContainer: ColorPalette.accentCyan.withOpacity(0.15),
      // Cyan text inside secondary containers for consistent tag colouring.
      onSecondaryContainer: ColorPalette.accentCyan,
      // Warm amber tertiary signals caution/pending states in resource forms.
      tertiary: ColorPalette.accentWarm,
      // Dark text on warm amber keeps priority labels readable.
      onTertiary: ColorPalette.neutral900,
      // Semantic red for validation failures (e.g. missing incident location).
      error: ColorPalette.error,
      // White text over error fills for maximum contrast on critical alerts.
      onError: ColorPalette.neutral0,
      // Muted error wash used in error-state input field fills.
      errorContainer: ColorPalette.error.withOpacity(0.2),
      // Error-coloured label text rendered inside error containers.
      onErrorContainer: ColorPalette.error,
      // Deepest brand colour — the app scaffold background behind all screens.
      background: ColorPalette.brandDeep,
      // Near-white body text on the dark background — readable incident descriptions.
      onBackground: ColorPalette.neutral50,
      // Card/panel surface — one step lighter than the scaffold background.
      surface: ColorPalette.brandSurface,
      // Primary text colour on card surfaces for incident titles and user names.
      onSurface: ColorPalette.neutral100,
      // Mid-brand tone used for nav bars, bottom sheets, and dialog fills.
      surfaceVariant: ColorPalette.brandMid,
      // Secondary text on variant surfaces — subtitles, timestamps, metadata.
      onSurfaceVariant: ColorPalette.neutral300,
      // Border colour for dividers separating incident list items.
      outline: ColorPalette.neutral600,
      // Lighter border variant for subtle UI separators and input field edges.
      outlineVariant: ColorPalette.neutral700,
      // Drop-shadow tint — pure black so elevation depth reads clearly at night.
      shadow: Colors.black,
      // Semi-transparent dark overlay for modal backdrops during alert dialogs.
      scrim: ColorPalette.overlayDark,
      // Inverse surface for toast/snackbar fills drawn over the dark background.
      inverseSurface: ColorPalette.neutral100,
      // Text colour on inverse surfaces — dark for readability on light toasts.
      onInverseSurface: ColorPalette.neutral900,
      // Admin-specific dark primary used in inverse contexts (e.g. role badges).
      inversePrimary: ColorPalette.adminDark,
    );

    return ThemeData(
      // Opt into Material Design 3 component styles and colour roles.
      useMaterial3: true,
      // Instruct the framework to use dark-variant defaults where not overridden.
      brightness: Brightness.dark,
      // Apply the full dark colour scheme defined above.
      colorScheme: cs,
      // Apply Rajdhani globally — overridden per-style only where needed.
      fontFamily: _fontFamily,
      // Match scaffold background to the deepest brand colour for seamless immersion.
      scaffoldBackgroundColor: ColorPalette.brandDeep,

      // AppBar styling: transparent so incident map backgrounds bleed through.
      appBarTheme: AppBarTheme(
        // No shadow line under the app bar — keeps the UI clean in dark mode.
        elevation: 0,
        // Suppress the Material 3 tonal elevation tint that appears on scroll.
        scrolledUnderElevation: 0,
        // Transparent background lets hero/map imagery show through the title area.
        backgroundColor: Colors.transparent,
        // White icons (back arrow, overflow menu) for contrast on dark backgrounds.
        foregroundColor: ColorPalette.neutral0,
        // Tell the OS to render status-bar time/battery icons in light (white) colour.
        systemOverlayStyle: SystemUiOverlayStyle.light,
        // Centre the screen title (e.g. "Incident Details", "Alert Dashboard").
        centerTitle: true,
        // Bold condensed title text — quickly readable during an emergency.
        titleTextStyle: TextStyle(
          fontFamily: _fontFamily,
          color: ColorPalette.neutral0,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          // Slight letter-spacing improves legibility of all-caps section titles.
          letterSpacing: 1.2,
        ),
      ),

      // Input field styling used across login forms, incident submission, and search.
      inputDecorationTheme: InputDecorationTheme(
        // Glass-morphism fill gives depth to fields on the dark scaffold.
        filled: true,
        fillColor: ColorPalette.glassLight,
        // Comfortable tap target with generous horizontal padding for field labels.
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        // Default border — visible but subtle on dark backgrounds.
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.neutral600, width: 1),
        ),
        // Idle (enabled, unfocused) border matches the default border.
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.neutral600, width: 1),
        ),
        // Focused border glows with the role primary colour to guide the user.
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          // Thicker border signals active editing state (e.g. typing incident title).
          borderSide: BorderSide(color: primaryColor, width: 2),
        ),
        // Red border clearly marks invalid fields (e.g. empty required location).
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.error, width: 1.5),
        ),
        // Focused error border — user is correcting the validation failure.
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.error, width: 2),
        ),
        // Muted label colour so it recedes when the field is populated.
        labelStyle: const TextStyle(color: ColorPalette.neutral300, fontSize: 14),
        // Even more muted hint text for placeholder copy (e.g. "Describe the incident…").
        hintStyle: const TextStyle(color: ColorPalette.neutral400, fontSize: 14),
        // Neutral icon tint for leading icons like search magnifier or location pin.
        prefixIconColor: ColorPalette.neutral400,
        // Neutral tint for trailing icons like clear (×) or calendar picker.
        suffixIconColor: ColorPalette.neutral400,
      ),

      // Primary call-to-action buttons: "Submit Incident", "Confirm Assignment", etc.
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          // Solid role-colour fill makes primary actions unmissable.
          backgroundColor: primaryColor,
          // White label text for maximum contrast on the role colour.
          foregroundColor: ColorPalette.neutral0,
          // No elevation shadow — flat style keeps the dark UI clean.
          elevation: 0,
          // Comfortable vertical padding for easy tapping in urgent situations.
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          // Rounded corners soften the button while keeping it distinguishable.
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          // Bold Rajdhani label text — quickly readable under stress.
          textStyle: const TextStyle(
            fontFamily: _fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
      ),

      // Secondary stroke buttons: "Cancel", "View Details", "Back to Map".
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          // Role-coloured label and border signals secondary (non-destructive) action.
          foregroundColor: primaryColor,
          side: BorderSide(color: primaryColor, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),

      // Tertiary text-only buttons: "Forgot Password?", "Skip for now".
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          // Coloured text is the only decoration — no fill or border.
          foregroundColor: primaryColor,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        ),
      ),

      // Cards hold individual incident summaries, resource items, and alert panels.
      cardTheme: CardThemeData(
        // Flat card — depth comes from the surface colour contrast, not shadow.
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        // Card fill is one step lighter than the scaffold to create visual hierarchy.
        color: ColorPalette.brandSurface,
        // Zero margin lets the calling widget control card spacing precisely.
        margin: EdgeInsets.zero,
        // Clip children (e.g. incident thumbnail images) to the rounded corners.
        clipBehavior: Clip.antiAlias,
      ),

      // Chips display inline metadata: incident types, severity levels, resource tags.
      chipTheme: ChipThemeData(
        // Glass-light fill blends with the dark surface while remaining distinct.
        backgroundColor: ColorPalette.glassLight,
        // Selected chip (e.g. active incident filter) shows a tinted role colour fill.
        selectedColor: primaryColor.withOpacity(0.25),
        // Disabled chips (e.g. unavailable resource category) appear de-emphasised.
        disabledColor: ColorPalette.neutral700,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        // Rounded-rect chip shape with a subtle border for clarity on dark backgrounds.
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: ColorPalette.neutral600),
        ),
      ),

      // Section dividers in incident detail screens and user profile lists.
      dividerTheme: const DividerThemeData(
        // Dark neutral divider that is visible but not distracting.
        color: ColorPalette.neutral700,
        thickness: 1,
      ),

      // FAB used for quick incident reporting — always prominent on the map screen.
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        // Role colour fill ensures the FAB is the most salient element on screen.
        backgroundColor: primaryColor,
        foregroundColor: ColorPalette.neutral0,
        // Elevated shadow helps the FAB stand above map tile content.
        elevation: 8,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),

      // Legacy bottom nav bar (used on screens not yet migrated to NavigationBar).
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        // Mid-brand background lifts the bar off the deep scaffold.
        backgroundColor: ColorPalette.brandMid,
        // Active tab (e.g. "Map", "Incidents") glows with the role colour.
        selectedItemColor: primaryColor,
        // Inactive tabs are muted so the active section is clear at a glance.
        unselectedItemColor: ColorPalette.neutral500,
        elevation: 0,
        // Fixed type prevents tabs from shifting when one is selected.
        type: BottomNavigationBarType.fixed,
        // Bold label on selected tab reinforces the active section.
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
      ),

      // Material 3 NavigationBar — primary bottom nav component in newer screens.
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: ColorPalette.brandMid,
        // Pill indicator behind the active icon uses a translucent role colour.
        indicatorColor: primaryColor.withOpacity(0.2),
        // Resolve icon colour based on selection state at render time.
        iconTheme: MaterialStateProperty.resolveWith((states) {
          // Selected icon (e.g. active "Alerts" tab) uses the full role colour.
          if (states.contains(MaterialState.selected)) {
            return IconThemeData(color: primaryColor, size: 24);
          }
          // Unselected icons are neutral so attention flows to the active tab.
          return const IconThemeData(color: ColorPalette.neutral500, size: 24);
        }),
        // Resolve label text style based on selection state at render time.
        labelTextStyle: MaterialStateProperty.resolveWith((states) {
          // Selected label is bold and role-coloured to match its icon.
          if (states.contains(MaterialState.selected)) {
            return TextStyle(
              color: primaryColor,
              fontWeight: FontWeight.w700,
              fontSize: 11,
              fontFamily: _fontFamily,
            );
          }
          // Unselected label is smaller and muted — de-emphasised but still legible.
          return const TextStyle(
            color: ColorPalette.neutral500,
            fontWeight: FontWeight.w500,
            fontSize: 11,
          );
        }),
      ),

      // Loading spinners shown while fetching incident data or uploading media.
      progressIndicatorTheme: ProgressIndicatorThemeData(color: primaryColor),

      // Snackbar notifications for success/error feedback (e.g. "Incident submitted").
      snackBarTheme: SnackBarThemeData(
        // Surface fill keeps the snackbar visually integrated with the dark UI.
        backgroundColor: ColorPalette.brandSurface,
        contentTextStyle: const TextStyle(color: ColorPalette.neutral100),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        // Floating snackbar avoids covering the bottom nav bar.
        behavior: SnackBarBehavior.floating,
      ),

      // Dialogs used for confirmation prompts (e.g. "Delete incident?", "Assign officer?").
      dialogTheme: DialogTheme(
        // Mid-brand background lifts the dialog above the scrim overlay.
        backgroundColor: ColorPalette.brandMid,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        // Bold white dialog title for immediate comprehension in urgent contexts.
        titleTextStyle: const TextStyle(
          fontFamily: _fontFamily,
          color: ColorPalette.neutral0,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),

      // Bottom sheets for contextual actions: incident filter panel, resource picker.
      bottomSheetTheme: const BottomSheetThemeData(
        // Consistent mid-brand fill for both persistent and modal bottom sheets.
        backgroundColor: ColorPalette.brandMid,
        modalBackgroundColor: ColorPalette.brandMid,
        // Rounded top corners signal that this is a draggable overlay sheet.
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),

      // Apply the complete dark text theme using near-white as the primary text colour.
      // [primary] is for headings; [secondary] is for body/metadata copy.
      textTheme: _buildTextTheme(ColorPalette.neutral0, ColorPalette.neutral200),
    );
  }

  // ── Light theme ────────────────────────────────────────────────────────────

  /// Builds the light Material 3 theme for daytime or accessibility use.
  ///
  /// Mirrors [buildDarkTheme] in structure but maps every colour role to a
  /// light-mode equivalent — white surfaces, dark text, subtle shadows.
  /// [primaryColor] is the same role-specific accent injected at runtime.
  static ThemeData buildLightTheme({required Color primaryColor}) {
    // Full Material 3 ColorScheme for the light variant.
    final cs = ColorScheme(
      // Tells Material widgets that this scheme is light-mode.
      brightness: Brightness.light,
      // Role-specific primary accent — same value as the dark theme for brand consistency.
      primary: primaryColor,
      // White text/icons on filled primary elements (buttons, FAB, chips).
      onPrimary: ColorPalette.neutral0,
      // Very light tinted container — used for selected state backgrounds in light mode.
      primaryContainer: primaryColor.withOpacity(0.1),
      // Role-coloured content inside primary containers (e.g. filter chip labels).
      onPrimaryContainer: primaryColor,
      // Cyan secondary accent — same semantic meaning as dark theme (map/action buttons).
      secondary: ColorPalette.accentCyan,
      // Dark text on cyan fills for legibility in daylight.
      onSecondary: ColorPalette.neutral900,
      // Pale cyan container for secondary tag backgrounds.
      secondaryContainer: ColorPalette.accentCyan.withOpacity(0.1),
      // Teal text inside secondary containers — darker tint for light-mode contrast.
      onSecondaryContainer: const Color(0xFF006070),
      // Warm amber tertiary for caution states (pending resources, unverified incidents).
      tertiary: ColorPalette.accentWarm,
      // White text on amber fills — sufficient contrast in light conditions.
      onTertiary: ColorPalette.neutral0,
      // Semantic error red — unchanged from dark theme for universal recognition.
      error: ColorPalette.error,
      // White text on error fills.
      onError: ColorPalette.neutral0,
      // Very light pink error container for inline validation backgrounds.
      errorContainer: const Color(0xFFFFE5E8),
      // Deep red label text inside the light error container — WCAG AA compliant.
      onErrorContainer: const Color(0xFFB00020),
      // Cool blue-tinted white app background — softer than pure white for eye comfort.
      background: const Color(0xFFF0F4FF),
      // Near-black text on the light background for incident titles and descriptions.
      onBackground: ColorPalette.neutral900,
      // Pure white card/panel surface — maximum contrast against the tinted background.
      surface: ColorPalette.neutral0,
      // Near-black text on white surfaces (incident list items, form labels).
      onSurface: ColorPalette.neutral900,
      // Pale blue-grey variant surface for subtle section backgrounds.
      surfaceVariant: const Color(0xFFE8EEFF),
      // Dark grey text on variant surfaces — body copy, secondary metadata.
      onSurfaceVariant: ColorPalette.neutral700,
      // Light grey outline for input field borders and list dividers.
      outline: ColorPalette.neutral300,
      // Lighter grey outline variant for subtle separators.
      outlineVariant: ColorPalette.neutral200,
      // Black drop-shadow tint — heavier shadows show better on light backgrounds.
      shadow: Colors.black,
      // Semi-transparent black overlay for modal dialogs and bottom-sheet scrims.
      scrim: const Color(0x80000000),
      // Dark inverse surface for toast/snackbar fills (reversed from the light surface).
      inverseSurface: ColorPalette.neutral800,
      // Light text on the dark inverse surface for snackbar notifications.
      onInverseSurface: ColorPalette.neutral100,
      // Role primary colour used as the inverse-primary token in light mode.
      inversePrimary: primaryColor,
    );

    return ThemeData(
      // Material Design 3 component styles.
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: cs,
      fontFamily: _fontFamily,
      // Match scaffold to the cool-tinted background defined in the colour scheme.
      scaffoldBackgroundColor: const Color(0xFFF0F4FF),

      // AppBar styling for light mode: solid role colour fill (not transparent).
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        // Solid primary colour fill anchors the bar visually on the light background.
        backgroundColor: primaryColor,
        // White foreground icons and title for contrast on the coloured app bar.
        foregroundColor: ColorPalette.neutral0,
        // Light status-bar icons — appropriate when the app bar fill is dark/coloured.
        systemOverlayStyle: SystemUiOverlayStyle.light,
        centerTitle: true,
        // Bold Rajdhani title — consistent with the dark theme for brand cohesion.
        titleTextStyle: TextStyle(
          fontFamily: _fontFamily,
          color: ColorPalette.neutral0,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),

      // Input field styling for light-mode forms (login, incident submission, search).
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        // White fill makes input fields pop against the blue-grey background.
        fillColor: ColorPalette.neutral0,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        // Default border uses a light grey — visible but unobtrusive in daylight.
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.neutral200),
        ),
        // Enabled (idle) border matches the default.
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.neutral200),
        ),
        // Role-coloured focused border guides the user to the active field.
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: primaryColor, width: 2),
        ),
        // Red error border for invalid incident form fields.
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ColorPalette.error),
        ),
        // Neutral label colour — recedes when the field is populated.
        labelStyle: const TextStyle(color: ColorPalette.neutral500, fontSize: 14),
        // Even more muted hint text for placeholder copy.
        hintStyle: const TextStyle(color: ColorPalette.neutral400, fontSize: 14),
      ),

      // Primary action buttons in light mode — same semantics as dark theme.
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: ColorPalette.neutral0,
          // Slight elevation shadow gives the button depth on the white surface.
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(
            fontFamily: _fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
      ),

      // Cards for incident summaries and resource panels in light mode.
      cardTheme: CardThemeData(
        // Subtle elevation with a role-tinted shadow for gentle depth cues.
        elevation: 2,
        shadowColor: primaryColor.withOpacity(0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        // White card surface contrasts cleanly against the blue-grey background.
        color: ColorPalette.neutral0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
      ),

      // FAB for quick incident reporting — same role and sizing as dark theme.
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: primaryColor,
        foregroundColor: ColorPalette.neutral0,
        // Slightly lower elevation than dark theme — sufficient on the lighter surface.
        elevation: 6,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),

      // Bottom nav bar in light mode — white background, elevated shadow.
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        // White background separates the bar from the blue-grey scaffold.
        backgroundColor: ColorPalette.neutral0,
        selectedItemColor: primaryColor,
        // Neutral grey for unselected tabs — less prominent than dark-mode neutral.
        unselectedItemColor: ColorPalette.neutral400,
        // Visible drop shadow lifts the bar off the page content.
        elevation: 8,
        type: BottomNavigationBarType.fixed,
      ),

      // Snackbar in light mode uses a dark fill for contrast against light screens.
      snackBarTheme: SnackBarThemeData(
        // Dark background ensures the snackbar stands out on white surfaces.
        backgroundColor: ColorPalette.neutral800,
        contentTextStyle: const TextStyle(color: ColorPalette.neutral0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),

      // Dialogs in light mode: white background, dark title text.
      dialogTheme: DialogTheme(
        // White background matches the card surface for visual consistency.
        backgroundColor: ColorPalette.neutral0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        // Near-black title — maximum legibility for confirmation prompts.
        titleTextStyle: const TextStyle(
          fontFamily: _fontFamily,
          color: ColorPalette.neutral900,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),

      // Apply light text theme with near-black primary and dark-grey secondary colours.
      textTheme: _buildTextTheme(ColorPalette.neutral900, ColorPalette.neutral700),
    );
  }

  /// Builds a complete [TextTheme] for both dark and light DMS screens.
  ///
  /// [primary] is the main heading/body text colour for the current brightness.
  /// [secondary] is used for supporting text such as timestamps, subtitles,
  /// and metadata labels on incident cards and resource lists.
  ///
  /// All display and headline styles use Rajdhani for a uniform brand feel.
  /// Body styles intentionally omit [fontFamily] to fall back to the system
  /// font, which improves readability for long-form incident descriptions.
  static TextTheme _buildTextTheme(Color primary, Color secondary) {
    return TextTheme(
      // Largest display style — used for hero statistics (e.g. active incident count on dashboard).
      displayLarge:  TextStyle(fontFamily: _fontFamily, fontSize: 36, fontWeight: FontWeight.w800, color: primary, letterSpacing: -0.5),
      // Medium display — section headers on the admin analytics screen.
      displayMedium: TextStyle(fontFamily: _fontFamily, fontSize: 30, fontWeight: FontWeight.w700, color: primary),
      // Small display — prominent numeric KPIs (e.g. "12 Alerts").
      displaySmall:  TextStyle(fontFamily: _fontFamily, fontSize: 26, fontWeight: FontWeight.w700, color: primary),
      // Large headline — screen titles such as "Incident Map" or "Resource Overview".
      headlineLarge: TextStyle(fontFamily: _fontFamily, fontSize: 22, fontWeight: FontWeight.w700, color: primary, letterSpacing: 0.5),
      // Medium headline — card section headers and dialog titles.
      headlineMedium:TextStyle(fontFamily: _fontFamily, fontSize: 20, fontWeight: FontWeight.w700, color: primary),
      // Small headline — sub-section labels within detail screens.
      headlineSmall: TextStyle(fontFamily: _fontFamily, fontSize: 18, fontWeight: FontWeight.w600, color: primary),
      // Large title — incident list item titles and form field group labels.
      titleLarge:    TextStyle(fontFamily: _fontFamily, fontSize: 16, fontWeight: FontWeight.w600, color: primary, letterSpacing: 0.3),
      // Medium title — secondary item titles using the muted secondary colour.
      titleMedium:   TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w600, color: secondary),
      // Small title — compact labels (e.g. chip text, table column headers).
      titleSmall:    TextStyle(fontFamily: _fontFamily, fontSize: 12, fontWeight: FontWeight.w600, color: secondary, letterSpacing: 0.5),
      // Large body — primary reading text for incident descriptions and user bios.
      bodyLarge:     TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: primary),
      // Medium body — standard list item subtitles and form helper text.
      bodyMedium:    TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: secondary),
      // Small body — fine-print: timestamps, coordinate values, API response metadata.
      bodySmall:     TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: secondary),
      // Large label — button text and prominent action labels (uses Rajdhani for brand).
      labelLarge:    TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w600, color: primary, letterSpacing: 0.3),
      // Medium label — secondary action labels and tab bar text.
      labelMedium:   TextStyle(fontFamily: _fontFamily, fontSize: 12, fontWeight: FontWeight.w600, color: secondary),
      // Small label — badge text, notification counts, version strings.
      labelSmall:    TextStyle(fontFamily: _fontFamily, fontSize: 11, fontWeight: FontWeight.w500, color: secondary, letterSpacing: 0.5),
    );
  }
}