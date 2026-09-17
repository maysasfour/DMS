/// ---------------------------------------------------------------------------
/// settings_screen.dart
///
/// DMS (Disaster Management System) — Settings Screen
///
/// This screen provides a comprehensive configuration hub for the mobile DMS
/// application. It allows users to:
///   - Open and sync with the DMS web portal (dms-maysas.duckdns.org)
///   - Switch between dark / light / system themes
///   - Change the app UI language (8 supported locales)
///   - Navigate quickly to key DMS features (SOS, weather, shelters, guides)
///   - Dial emergency contacts (police, civil defense, ambulance, Red Crescent)
///   - View inline safety tips for disaster preparedness
///   - Adjust accessibility options (large text)
///   - View app version / contact support
///   - Sign out of the authenticated DMS session
///
/// The screen is a [ConsumerWidget] powered by Riverpod so that theme and
/// locale changes propagate instantly across the entire app without a restart.
/// ---------------------------------------------------------------------------

// Flutter core UI toolkit — provides Material widgets, theming, and layout
import 'package:flutter/material.dart';
// Riverpod state-management — allows this screen to read and mutate global providers
import 'package:flutter_riverpod/flutter_riverpod.dart';
// go_router navigation — declarative routing used to push/pop DMS feature screens
import 'package:go_router/go_router.dart';
// Google Fonts — loads Rajdhani (app-bar titles) and Inter (body text) from the DMS design system
import 'package:google_fonts/google_fonts.dart';
// url_launcher — opens external URLs (DMS portal) and tel: / mailto: intents from device
import 'package:url_launcher/url_launcher.dart';

// DMS design tokens — centralised colour palette (primary, secondary, status colours, etc.)
import '../../../core/constants/app_colors.dart';
// DMS localisation helper — the `t()` function resolves localised strings by key
import '../../../core/l10n/app_strings.dart';
// Riverpod locale provider — holds the currently active [Locale] and exposes setLocale()
import '../../../providers/locale_provider.dart';
// Riverpod theme provider — holds [ThemeMode] (dark/light/system) and exposes setMode()
import '../../../providers/theme_provider.dart';
// Auth provider — exposes logout() to invalidate the current DMS user session
import '../../auth/providers/auth_provider.dart';

/// Main settings screen for the DMS mobile app.
///
/// Extends [ConsumerWidget] so it can watch Riverpod providers (theme, locale)
/// and rebuild automatically when those values change — e.g. when the user
/// switches language mid-session, the entire screen re-renders in the new locale.
class SettingsScreen extends ConsumerWidget {
  /// Standard const constructor; [super.key] wires into Flutter's widget identity system.
  const SettingsScreen({super.key});

  /// The public URL of the DMS web portal — used by the "Open Portal" tile.
  static const _portalUrl = 'https://dms-maysas.duckdns.org';

  /// Supported UI languages as (locale code, flag emoji, display name) records.
  /// Adding a language here automatically renders a new chip in the Language section.
  static const _langs = [
    ('en', '🇬🇧', 'English'), ('ar', '🇸🇦', 'العربية'), ('fr', '🇫🇷', 'Français'),
    ('es', '🇪🇸', 'Español'), ('tr', '🇹🇷', 'Türkçe'), ('de', '🇩🇪', 'Deutsch'),
    ('zh', '🇨🇳', '中文'), ('ru', '🇷🇺', 'Русский'),
  ];

  /// Pre-defined emergency service contacts shown in the Emergency Contacts section.
  /// Each record is (icon, l10n key, phone number, brand colour).
  /// Phone numbers follow local Jordanian / regional emergency standards.
  static const _contacts = [
    (Icons.local_police_outlined,        'police',        '911',             Color(0xFF1D4ED8)), // Police — blue
    (Icons.fire_truck_outlined,          'civil_defense', '199',             Color(0xFFD97706)), // Civil Defence — amber
    (Icons.local_hospital_outlined,      'ambulance',     '911',             Color(0xFF16A34A)), // Ambulance — green
    (Icons.health_and_safety_outlined,   'red_crescent',  '0096265930111',   Color(0xFFDC2626)), // Red Crescent — red
  ];

  /// Builds the entire settings screen.
  ///
  /// [context] — standard Flutter build context for theme / media queries.
  /// [ref]     — Riverpod [WidgetRef] used to watch theme and locale providers.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Determine if the device is currently rendering in dark mode
    final isDark    = Theme.of(context).brightness == Brightness.dark;
    // Watch the global ThemeMode so the SegmentedButton reflects the current selection
    final themeMode = ref.watch(themeModeProvider);
    // Watch the active locale so language chips show the currently selected language
    final locale    = ref.watch(localeProvider);

    // Adaptive background colour — charcoal in dark mode, soft blue-grey in light mode
    final bg        = isDark ? AppColors.bgDark : const Color(0xFFF0F2F8);
    // Card surfaces are near-black in dark mode and pure white in light mode
    final cardBg    = isDark ? const Color(0xFF111827) : Colors.white;
    // Primary text colour adapts to avoid low contrast on either background
    final textCol   = isDark ? Colors.white : Colors.black87;
    // Secondary / subtitle text is muted in both themes
    final subCol    = isDark ? Colors.white54 : Colors.black45;
    // Divider and card border colour — subtle in both themes
    final borderCol = isDark ? AppColors.border : Colors.grey.shade200;

    return Scaffold(
      // Apply adaptive background that matches the DMS neon-cyberpunk dark theme
      backgroundColor: bg,
      appBar: AppBar(
        // Match the app-bar surface to the card background for a seamless look
        backgroundColor: cardBg,
        // Remove default Material elevation shadow so the bar blends with content
        elevation: 0,
        // "Settings" title uses Rajdhani — the DMS brand display font — styled with the accent colour
        title: Text(t(context, ref, 'settings'), style: GoogleFonts.rajdhani(
          color: AppColors.secondary, fontWeight: FontWeight.w800, letterSpacing: 2, fontSize: 20)),
        centerTitle: true,
        // Back button pops the settings route and returns to the previous DMS screen
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textCol),
          onPressed: () => context.pop(), // go_router pop — returns to caller screen
        ),
      ),
      // Scrollable list so the many sections don't overflow on small devices
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [

          // ── WEB PORTAL ──────────────────────────────────────────────────
          // Section: Links to the DMS web portal for cross-platform data access
          _SectionHeader(t(context, ref, 'settings_portal'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Column(children: [
            // Tile: Opens the DMS web portal in the device's default browser
            _SettingTile(
              icon: Icons.open_in_browser_rounded, color: AppColors.secondary,
              title: t(context, ref, 'portal_open'), subtitle: 'dms-maysas.duckdns.org',
              isDark: isDark, textCol: textCol, subCol: subCol,
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.secondary),
              onTap: () async {
                // Parse the static portal URL and launch it externally (not in a WebView)
                final uri = Uri.parse(_portalUrl);
                // canLaunchUrl guards against environments where no browser is available
                if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
              },
            ),
            Divider(color: borderCol, height: 1),
            // Tile: Informs the user that incident reports are synced live with the web portal
            _SettingTile(
              icon: Icons.sync_alt_rounded, color: AppColors.success,
              title: t(context, ref, 'portal_sync'), subtitle: 'Your reports are shared with the web app',
              isDark: isDark, textCol: textCol, subCol: subCol,
              // "LIVE" badge communicates real-time data sync status to the responder
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  // Translucent success-green tint for the badge background
                  color: AppColors.success.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6)),
                child: Text(t(context, ref, 'portal_live'), style: const TextStyle(
                  color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w800)),
              ),
            ),
          ])),
          const SizedBox(height: 20),

          // ── APPEARANCE ──────────────────────────────────────────────────
          // Section: Theme selection — important in disaster field conditions
          // where bright screens or battery-saving dark mode may be preferred
          _SectionHeader(t(context, ref, 'settings_appearance'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(children: [
              // Palette icon container with adminColor tint to denote a configuration setting
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.adminColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.palette_outlined, color: AppColors.adminColor, size: 20)),
              const SizedBox(width: 14),
              // Label column: title + hint listing available theme modes
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t(context, ref, 'theme_label'), style: TextStyle(
                  color: textCol, fontWeight: FontWeight.w700, fontSize: 13)),
                // Subtitle shows "Dark / Light / System" as quick reference for the user
                Text(t(context, ref, 'dark') + ' / ' + t(context, ref, 'light') + ' / ' + t(context, ref, 'system'),
                  style: TextStyle(color: subCol, fontSize: 11)),
              ])),
              // SegmentedButton allows selecting System / Dark / Light theme modes
              // Mutates [themeModeProvider] which propagates the change app-wide instantly
              SegmentedButton<ThemeMode>(
                segments: [
                  ButtonSegment(value: ThemeMode.system, icon: const Icon(Icons.brightness_auto, size: 14),
                    label: Text(t(context, ref, 'system'), style: const TextStyle(fontSize: 10))),
                  ButtonSegment(value: ThemeMode.dark, icon: const Icon(Icons.dark_mode, size: 14),
                    label: Text(t(context, ref, 'dark'), style: const TextStyle(fontSize: 10))),
                  ButtonSegment(value: ThemeMode.light, icon: const Icon(Icons.light_mode, size: 14),
                    label: Text(t(context, ref, 'light'), style: const TextStyle(fontSize: 10))),
                ],
                // Show the current theme as selected; wrap in Set because the API requires it
                selected: {themeMode},
                // Persist the chosen ThemeMode through the notifier so it survives hot-restart
                onSelectionChanged: (s) => ref.read(themeModeProvider.notifier).setMode(s.first),
                style: SegmentedButton.styleFrom(
                  // Highlight active segment with a translucent primary-brand tint
                  selectedBackgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  selectedForegroundColor: AppColors.primary,
                  // Unselected segments share the card border colour for visual cohesion
                  side: BorderSide(color: borderCol),
                ),
              ),
            ]),
          )),
          const SizedBox(height: 20),

          // ── LANGUAGE ────────────────────────────────────────────────────
          // Section: Locale switching — critical for a multilingual DMS serving
          // diverse populations during emergencies (Arabic, Turkish, French, etc.)
          _SectionHeader(t(context, ref, 'settings_language'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Padding(
            padding: const EdgeInsets.all(16),
            // Wrap lays chips in rows and wraps onto new lines for smaller screens
            child: Wrap(
              spacing: 8, runSpacing: 8,
              // Map each supported language record into an animated selection chip
              children: _langs.map((l) {
                // Check whether this chip represents the currently active locale
                final isSel = locale.languageCode == l.$1;
                return GestureDetector(
                  // On tap: persist the chosen locale through the provider (triggers rebuild)
                  onTap: () => ref.read(localeProvider.notifier).setLocale(l.$1),
                  child: AnimatedContainer(
                    // Smooth 200 ms transition when the chip gains or loses selection state
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      // Selected chip uses a translucent primary-brand background; unselected chips use neutral grey
                      color: isSel ? AppColors.primary.withValues(alpha: 0.12)
                           : (isDark ? const Color(0xFF1A1F2E) : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(10),
                      // Selected chip has a thicker, coloured border for clear visual feedback
                      border: Border.all(
                        color: isSel ? AppColors.primary
                             : (isDark ? AppColors.border : Colors.grey.shade300),
                        width: isSel ? 1.5 : 1),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      // Flag emoji provides instant visual recognition of the language
                      Text(l.$2, style: const TextStyle(fontSize: 16)),
                      const SizedBox(width: 6),
                      // Language name is bolded and tinted with the primary colour when selected
                      Text(l.$3, style: TextStyle(
                        color: isSel ? AppColors.primary : textCol,
                        fontSize: 12, fontWeight: isSel ? FontWeight.w700 : FontWeight.w400)),
                    ]),
                  ),
                );
              }).toList(),
            ),
          )),
          const SizedBox(height: 20),

          // ── FEATURES ────────────────────────────────────────────────────
          // Section: Quick-access shortcuts to the most important DMS tools
          // so responders can reach critical screens without navigating the bottom bar
          _SectionHeader(t(context, ref, 'settings_features'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Column(children: [
            // Tile: Navigate to the SOS Emergency screen for immediate distress alerts
            _SettingTile(
              icon: Icons.sos_rounded, color: AppColors.primary,
              title: t(context, ref, 'emer_sos'), subtitle: t(context, ref, 'emer_sos_sub'),
              isDark: isDark, textCol: textCol, subCol: subCol,
              trailing: const Icon(Icons.chevron_right, color: AppColors.primary),
              onTap: () => context.push('/emergency')), // go_router push preserves back-stack
            Divider(color: borderCol, height: 1),
            // Tile: Navigate to the SOS Watch screen (wearable-linked emergency trigger)
            _SettingTile(
              icon: Icons.watch_outlined, color: AppColors.responderColor,
              title: t(context, ref, 'sos_watch'), subtitle: t(context, ref, 'sos_watch_sub'),
              isDark: isDark, textCol: textCol, subCol: subCol,
              trailing: const Icon(Icons.chevron_right, color: AppColors.responderColor),
              onTap: () => context.push('/sos-watch')),
            Divider(color: borderCol, height: 1),
            // Tile: Open the Weather screen — situational awareness for field responders
            _SettingTile(
              icon: Icons.wb_sunny_outlined, color: AppColors.warning,
              title: t(context, ref, 'weather_title'), subtitle: t(context, ref, 'weather_sub'),
              isDark: isDark, textCol: textCol, subCol: subCol,
              trailing: const Icon(Icons.chevron_right, color: AppColors.warning),
              onTap: () => context.push('/weather')),
            Divider(color: borderCol, height: 1),
            // Tile: Open the Disaster Preparedness Guide for public education content
            _SettingTile(
              icon: Icons.menu_book_outlined, color: AppColors.success,
              title: t(context, ref, 'guide'), subtitle: t(context, ref, 'guide_title'),
              isDark: isDark, textCol: textCol, subCol: subCol,
              trailing: const Icon(Icons.chevron_right, color: AppColors.success),
              onTap: () => context.push('/guide')),
            Divider(color: borderCol, height: 1),
            // Tile: Navigate to the Shelters map screen showing nearby safe locations
            _SettingTile(
              icon: Icons.home_work_outlined, color: AppColors.info,
              title: t(context, ref, 'shelters'), subtitle: t(context, ref, 'shelters_title'),
              isDark: isDark, textCol: textCol, subCol: subCol,
              trailing: const Icon(Icons.chevron_right, color: AppColors.info),
              onTap: () => context.push('/shelters')),
          ])),
          const SizedBox(height: 20),

          // ── EMERGENCY CONTACTS ──────────────────────────────────────────
          // Section: One-tap dialling to critical emergency services.
          // Tapping a tile fires a tel: intent so the device places the call immediately.
          _SectionHeader(t(context, ref, 'emergency_contacts'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Column(
            // Generate a tile for each emergency contact defined in _contacts
            children: List.generate(_contacts.length, (i) {
              final c = _contacts[i]; // Unpack the (icon, l10n key, number, colour) record
              return Column(children: [
                _SettingTile(
                  icon: c.$1, color: c.$4, // Use service-specific icon and brand colour
                  title: t(context, ref, c.$2), subtitle: c.$3, // Localised service name + number
                  isDark: isDark, textCol: textCol, subCol: subCol,
                  // Trailing badge repeats the phone number in the service's brand colour
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      // Translucent version of the service colour for the badge background
                      color: c.$4.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8)),
                    child: Text(c.$3, style: TextStyle(
                      color: c.$4, fontSize: 12, fontWeight: FontWeight.w800))),
                  onTap: () async {
                    // Construct a tel: URI and launch it — triggers the native phone dialler
                    final uri = Uri.parse('tel:${c.$3}');
                    if (await canLaunchUrl(uri)) launchUrl(uri);
                  },
                ),
                // Draw a divider between contacts but not after the last one
                if (i < _contacts.length - 1) Divider(color: borderCol, height: 1),
              ]);
            }),
          )),
          const SizedBox(height: 20),

          // ── SAFETY TIPS ─────────────────────────────────────────────────
          // Section: Static safety reminders that educate the public on
          // disaster preparedness (evacuation routes, emergency kits, etc.)
          _SectionHeader(t(context, ref, 'safety_tips_title'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Column(children: [
            // Tip 1: General preparedness advice (e.g. keep an emergency kit ready)
            _SettingTile(
              icon: Icons.tips_and_updates_outlined, color: AppColors.warning,
              title: t(context, ref, 'tip_1'), subtitle: '',
              isDark: isDark, textCol: textCol, subCol: subCol),
            Divider(color: borderCol, height: 1),
            // Tip 2: Evacuation route awareness (e.g. know your exit routes in advance)
            _SettingTile(
              icon: Icons.route_outlined, color: AppColors.secondary,
              title: t(context, ref, 'tip_2'), subtitle: '',
              isDark: isDark, textCol: textCol, subCol: subCol),
            Divider(color: borderCol, height: 1),
            // Tip 3: Communication advice (e.g. keep emergency numbers saved offline)
            _SettingTile(
              icon: Icons.phone_in_talk_outlined, color: AppColors.success,
              title: t(context, ref, 'tip_3'), subtitle: '',
              isDark: isDark, textCol: textCol, subCol: subCol),
          ])),
          const SizedBox(height: 20),

          // ── ACCESSIBILITY ───────────────────────────────────────────────
          // Section: Accessibility preferences to improve usability in field conditions
          // (e.g. responders wearing gloves or reading in bright sunlight)
          _SectionHeader(t(context, ref, 'accessibility'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(children: [
              // Icon container: represents text-size configuration using an "Aa" icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.text_fields_rounded, color: AppColors.info, size: 20)),
              const SizedBox(width: 14),
              // Label column for the large-text accessibility toggle
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t(context, ref, 'large_text'), style: TextStyle(
                  color: textCol, fontWeight: FontWeight.w700, fontSize: 13)),
                Text(t(context, ref, 'large_text_sub'), style: TextStyle(color: subCol, fontSize: 11)),
              ])),
              // Switch is currently disabled (onChanged: null) — feature is planned but not yet implemented
              Switch(
                value: false,   // Always off until the feature is fully integrated
                onChanged: null, // null disables user interaction, showing a greyed-out toggle
                activeColor: AppColors.primary,
              ),
            ]),
          )),
          const SizedBox(height: 20),

          // ── ABOUT ────────────────────────────────────────────────────────
          // Section: Application metadata and support contact for the DMS system
          _SectionHeader(t(context, ref, 'about_title'), isDark),
          const SizedBox(height: 10),
          _Card(cardBg: cardBg, isDark: isDark, borderCol: borderCol, child: Column(children: [
            // Tile: Shows the app developer name and current version number
            _SettingTile(
              icon: Icons.info_outline_rounded, color: AppColors.secondary,
              title: t(context, ref, 'app_dev'), subtitle: t(context, ref, 'app_version'),
              isDark: isDark, textCol: textCol, subCol: subCol),
            Divider(color: borderCol, height: 1),
            // Tile: Opens the default mail client addressed to the DMS support team
            _SettingTile(
              icon: Icons.email_outlined, color: AppColors.success,
              title: t(context, ref, 'app_contact'), subtitle: 'Technical support & feedback',
              isDark: isDark, textCol: textCol, subCol: subCol,
              onTap: () async {
                // Compose a mailto: intent to reach the DMS support address
                final uri = Uri.parse('mailto:support@dms-system.com');
                if (await canLaunchUrl(uri)) launchUrl(uri);
              }),
            Divider(color: borderCol, height: 1),
            // Footer row: mission statement confirming the app's public-safety purpose
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                // Verified badge icon reinforces trust in the DMS application
                const Icon(Icons.verified_outlined, color: AppColors.success, size: 16),
                const SizedBox(width: 8),
                Text('Built for public safety and emergency response',
                  style: TextStyle(color: subCol, fontSize: 11)),
              ]),
            ),
          ])),
          const SizedBox(height: 20),

          // ── SIGN OUT ────────────────────────────────────────────────────
          // Destructive action: clears the authenticated DMS session and
          // redirects to the login screen so another user can sign in
          GestureDetector(
            onTap: () async {
              // Call the auth provider's logout method to invalidate the JWT / session token
              await ref.read(authProvider.notifier).logout();
              // Guard against async gaps where the widget may have been unmounted
              if (context.mounted) context.go('/login'); // go() replaces the entire back-stack
            },
            // Red gradient container styled as a prominent, destructive call-to-action button
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                // Bold red gradient signals a destructive / high-stakes action to the user
                gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFF991B1B)]),
                borderRadius: BorderRadius.circular(14),
                // Subtle red glow shadow reinforces the urgency of the sign-out action
                boxShadow: [const BoxShadow(color: Color(0x44DC2626), blurRadius: 10, offset: Offset(0, 4))]),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                // Logout icon provides unambiguous visual meaning across all supported locales
                const Icon(Icons.logout_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                // "Sign Out" label uses Inter for body-text legibility at medium weight
                Text(t(context, ref, 'logout'), style: GoogleFonts.inter(
                  color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
          // Bottom padding so the sign-out button clears the system navigation bar
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

// ── Private Widgets ───────────────────────────────────────────────────────────

/// A labelled section divider used throughout the Settings screen.
///
/// Renders a coloured left-accent bar (red-to-blue gradient matching the DMS
/// brand) followed by an ALL-CAPS section title in muted text — e.g.
/// "APPEARANCE", "EMERGENCY CONTACTS".
class _SectionHeader extends StatelessWidget {
  /// The localised section title to display (e.g. "Language", "Features").
  final String title;

  /// Whether the host screen is in dark mode — controls text muted colour.
  final bool isDark;

  /// Creates a section header with [title] and the current [isDark] state.
  const _SectionHeader(this.title, this.isDark);

  @override
  Widget build(BuildContext context) => Row(children: [
    // 3 px wide accent bar with a vertical red-to-blue gradient — DMS brand motif
    Container(width: 3, height: 14, margin: const EdgeInsetsDirectional.only(end: 8),
      decoration: BoxDecoration(
        // Gradient runs top-to-bottom from danger red → authority blue
        gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFF1D4ED8)], begin: Alignment.topCenter, end: Alignment.bottomCenter),
        borderRadius: BorderRadius.circular(2))),
    // Section title: small, uppercase-weight, slightly muted to subordinate it to content
    Text(title, style: TextStyle(
      color: isDark ? Colors.white54 : Colors.black45,
      fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
  ]);
}

/// Reusable card container that wraps groups of [_SettingTile]s in the DMS
/// settings screen.
///
/// Applies a rounded rectangle background, adaptive border, and a soft drop
/// shadow that is heavier in dark mode to maintain contrast against the dark
/// background.
class _Card extends StatelessWidget {
  /// The content to render inside the card (typically a [Column] of tiles).
  final Widget child;

  /// The card surface colour — white in light mode, near-black in dark mode.
  final Color cardBg;

  /// The card border colour — adapts to the current theme via [AppColors.border].
  final Color borderCol;

  /// Whether the host screen is in dark mode, used to adjust shadow opacity.
  final bool isDark;

  /// Creates a [_Card] with required theme-aware colours and [child] content.
  const _Card({required this.child, required this.cardBg, required this.isDark, required this.borderCol});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      // Adaptive card surface colour (dark: near-black, light: white)
      color: cardBg,
      borderRadius: BorderRadius.circular(16),
      // Subtle outline separates the card from the page background
      border: Border.all(color: borderCol),
      // Shadow is stronger in dark mode to compensate for low luminance contrast
      boxShadow: [BoxShadow(
        color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
        blurRadius: 12, offset: const Offset(0, 3))],
    ),
    // ClipRRect ensures child content (especially dividers) respects the card's rounded corners
    child: ClipRRect(borderRadius: BorderRadius.circular(16), child: child),
  );
}

/// A single row within a settings card, combining an icon, title, optional
/// subtitle, and an optional trailing widget.
///
/// Used consistently across all DMS settings sections (portal, features,
/// emergency contacts, about) to provide a uniform, scannable list layout.
class _SettingTile extends StatelessWidget {
  /// The Material icon displayed in the coloured icon container on the left.
  final IconData icon;

  /// The brand/semantic colour applied to the icon and its background tint.
  final Color color;

  /// The primary label of the setting row (localised via [t()]).
  final String title;

  /// A secondary description shown beneath [title]; pass an empty string to hide.
  final String subtitle;

  /// Whether the host screen is in dark mode (influences no direct styling here,
  /// but kept for potential future per-tile dark overrides).
  final bool isDark;

  /// Colour applied to [title] text.
  final Color textCol;

  /// Muted colour applied to [subtitle] text.
  final Color subCol;

  /// Optional widget rendered on the trailing (right) edge — e.g. a chevron,
  /// badge, or action icon. Null means no trailing widget.
  final Widget? trailing;

  /// Optional callback invoked when the entire tile is tapped.
  /// Null makes the tile non-interactive (used for informational tiles).
  final VoidCallback? onTap;

  /// Creates a [_SettingTile] with required icon, colour, and text fields.
  const _SettingTile({
    required this.icon, required this.color,
    required this.title, required this.subtitle,
    required this.isDark, required this.textCol, required this.subCol,
    this.trailing, this.onTap,
  });

  @override
  Widget build(BuildContext context) => ListTile(
    // Wire up the optional tap handler — null disables the ink ripple effect
    onTap: onTap,
    // Horizontal padding of 16 px matches the card's own padding for visual alignment
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    // Coloured icon container: 8 px padding + translucent tint for a "chip" appearance
    leading: Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        // 12 % opacity tint of the service/feature colour for a soft, branded background
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, color: color, size: 20)),
    // Title: semi-bold, capped at 2 lines to prevent layout overflow on small screens
    title: Text(title, style: TextStyle(
      color: textCol, fontSize: 13, fontWeight: FontWeight.w600),
      maxLines: 2, overflow: TextOverflow.ellipsis),
    // Subtitle: shown only when non-empty (avoids an empty Text widget taking space)
    subtitle: subtitle.isNotEmpty
      ? Text(subtitle, style: TextStyle(color: subCol, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis)
      : null,
    // Render the caller-supplied trailing widget (chevron, badge, number chip, etc.)
    trailing: trailing,
  );
}