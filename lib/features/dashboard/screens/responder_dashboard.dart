// ─────────────────────────────────────────────────────────────────────────────
// File: responder_dashboard.dart
//
// Purpose:
//   Defines the main dashboard screen shown to first-responder users in the
//   Disaster Management System (DMS). This screen gives responders a real-time
//   operational overview, including live incident statistics (total, active,
//   resolved), quick-access action cards for navigating to incidents, the
//   interactive map, and resource management, as well as a scrollable feed of
//   the five most recent incident reports. The UI adapts to the device's
//   light/dark theme and the user's selected language.
// ─────────────────────────────────────────────────────────────────────────────

// Flutter core UI framework — provides Material widgets, theming, and layout.
import 'package:flutter/material.dart';

// flutter_animate — declarative animation library used for fade-in and
// slide-in entrance effects on dashboard sections.
import 'package:flutter_animate/flutter_animate.dart';

// flutter_riverpod — state-management library; ConsumerStatefulWidget and
// ConsumerState give this widget reactive access to all Riverpod providers.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// go_router — declarative routing; used to navigate to incidents, map,
// resources, and notification screens via context.push / context.go.
import 'package:go_router/go_router.dart';

// google_fonts — provides Rajdhani (headings) and Inter (body) typefaces
// consistent with the DMS neon-cyberpunk design system.
import 'package:google_fonts/google_fonts.dart';

// DMS brand colour constants (primary, warning, success, info, border, etc.).
import '../../../core/constants/app_colors.dart';

// Localisation helper — t(context, ref, key) resolves the active language string.
import '../../../core/l10n/app_strings.dart';

// authProvider — exposes the currently authenticated responder's User object.
import '../../../features/auth/providers/auth_provider.dart';

// incidentProvider — manages loading, pagination, and state of the incident list.
import '../../../features/incidents/providers/incident_provider.dart';

// localeProvider — tracks the user's active locale so the UI re-renders on change.
import '../../../providers/locale_provider.dart';

// themeModeProvider — tracks and toggles between dark, light, and system themes.
import '../../../providers/theme_provider.dart';

// AppDrawer — shared side-navigation drawer used across all authenticated screens.
import '../../../shared/widgets/app_drawer.dart';

// IncidentCard — shared card widget that renders a single incident summary row.
import '../../../shared/widgets/incident_card.dart';

// LangPill — compact language-switcher badge shown in the app bar.
import '../../../shared/widgets/lang_pill.dart';

// StatCard — generic KPI tile used to display numeric incident statistics.
import '../../../shared/widgets/stat_card.dart';

// dashboardStatsProvider — async provider that fetches aggregate incident counts
// (total, in-progress, resolved) from the backend for the stats row.
import '../providers/dashboard_provider.dart';

/// The main dashboard widget for first-responder users.
///
/// Uses [ConsumerStatefulWidget] so it can both watch reactive Riverpod providers
/// and execute side-effects (e.g. loading incidents) in [initState].
class ResponderDashboard extends ConsumerStatefulWidget {
  const ResponderDashboard({super.key});

  /// Creates the mutable state object that drives this widget's build lifecycle.
  @override
  ConsumerState<ResponderDashboard> createState() => _ResponderDashboardState();
}

/// Private state class for [ResponderDashboard].
///
/// Responsible for triggering the initial incident data fetch and building
/// the full dashboard layout.
class _ResponderDashboardState extends ConsumerState<ResponderDashboard> {

  /// Called once after the widget is first inserted into the tree.
  ///
  /// Uses [addPostFrameCallback] to defer the incident refresh until after the
  /// first frame, avoiding "setState during build" errors in Riverpod.
  @override
  void initState() {
    super.initState();
    // Defer data loading to post-frame so the widget tree is fully mounted first.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Force a fresh fetch of all incidents from the backend on dashboard entry.
      ref.read(incidentProvider.notifier).loadIncidents(refresh: true);
    });
  }

  /// Builds the full responder dashboard UI.
  ///
  /// Watches multiple providers so the screen re-renders automatically when
  /// the locale, theme, auth state, incidents, or dashboard stats change.
  @override
  Widget build(BuildContext context) {
    // Watch locale so the entire UI re-renders when the language is switched.
    ref.watch(localeProvider);

    // The currently logged-in responder — used to personalise the welcome banner.
    final user          = ref.watch(authProvider).user;

    // Incident list state — contains the loaded incidents and loading flags.
    final incidentState = ref.watch(incidentProvider);

    // Async dashboard statistics (total, in-progress, resolved incident counts).
    final statsAsync    = ref.watch(dashboardStatsProvider);

    // True when the device/app is in dark mode; drives colour selection below.
    final isDark        = Theme.of(context).brightness == Brightness.dark;

    // Current ThemeMode enum value — used to pick the correct theme-toggle icon.
    final mode          = ref.watch(themeModeProvider);

    // Active locale language code (e.g. 'en', 'ar') — available for RTL logic.
    final lang          = ref.watch(localeProvider).languageCode;

    // Background colour: very dark navy in dark mode, light grey-blue in light.
    final bg      = isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F2F8);

    // Card/surface colour: deep charcoal in dark mode, plain white in light.
    final cardBg  = isDark ? const Color(0xFF111827) : Colors.white;

    // Primary text colour adapts to the active theme for WCAG contrast.
    final textCol = isDark ? Colors.white : Colors.black87;

    // Secondary/subtitle text colour — muted relative to [textCol].
    final subCol  = isDark ? Colors.white54 : Colors.black45;

    // Card border colour: uses the DMS brand border token in dark, soft grey in light.
    final borderCol = isDark ? AppColors.border : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: bg, // Apply the theme-aware page background.
      drawer: const AppDrawer(), // Side drawer for global DMS navigation.
      appBar: AppBar(
        backgroundColor: cardBg, // Match app bar surface to card background.
        elevation: 0,            // Flat design — no drop shadow on the bar.

        // Hamburger menu button that opens the AppDrawer.
        leading: Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.menu_rounded, color: textCol),
          onPressed: () => Scaffold.of(ctx).openDrawer(), // Open the side nav drawer.
        )),

        // App name localised string styled with the responder accent colour (amber).
        title: Text(t(context, ref, 'app_name'), style: GoogleFonts.rajdhani(
          color: AppColors.responderColor, fontSize: 18, fontWeight: FontWeight.w800)),

        actions: [
          // Language switcher pill — lets responders change UI language inline.
          LangPill(isDark: isDark, textCol: textCol),

          // Theme toggle button cycles: dark → light → system → dark.
          IconButton(
            icon: Icon(
              // Choose the icon that reflects the currently active theme mode.
              mode == ThemeMode.dark ? Icons.dark_mode_rounded
              : mode == ThemeMode.light ? Icons.light_mode_rounded : Icons.brightness_auto_rounded,
              color: textCol, size: 20),
            onPressed: () {
              // Cycle to the next theme mode in the rotation.
              final next = mode == ThemeMode.dark ? ThemeMode.light
                         : mode == ThemeMode.light ? ThemeMode.system : ThemeMode.dark;
              ref.read(themeModeProvider.notifier).setMode(next);
            },
          ),

          // Notification bell — navigates to the system-wide notifications screen.
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: textCol),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),

      // RefreshIndicator enables pull-to-refresh to re-fetch stats and incidents.
      body: RefreshIndicator(
        onRefresh: () async {
          // Invalidate cached stats so dashboardStatsProvider re-fetches from API.
          ref.invalidate(dashboardStatsProvider);
          // Reload the full incident list from the backend with a forced refresh.
          await ref.read(incidentProvider.notifier).loadIncidents(refresh: true);
        },
        child: SingleChildScrollView(
          // AlwaysScrollableScrollPhysics ensures pull-to-refresh works even when
          // content is shorter than the viewport.
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              // ── Welcome banner ─────────────────────────────────────────
              // Amber gradient banner that greets the responder by first name
              // and confirms they are viewing the responder dashboard.
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  // Amber-to-dark-amber gradient represents the responder role colour.
                  gradient: const LinearGradient(
                    colors: [Color(0xFFD97706), Color(0xFFB45309)],
                    begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(16),
                  // Subtle amber glow shadow to reinforce the neon-cyberpunk aesthetic.
                  boxShadow: [const BoxShadow(color: Color(0x44D97706), blurRadius: 12, offset: Offset(0, 4))]),
                child: Row(children: [
                  // Emergency-share icon container — visually signals the responder role.
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      // Semi-transparent white background for the icon badge.
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.emergency_share_rounded, color: Colors.white, size: 28)),
                  const SizedBox(width: 14),
                  // Text column: greeting + role subtitle.
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Personalised greeting using the responder's first name.
                    Text('${t(context, ref, 'welcome')}, ${user?.name.split(' ').first ?? ''}!',
                      style: GoogleFonts.rajdhani(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                    // Subtitle clarifying this is the responder-specific view.
                    Text(t(context, ref, 'responder_dash'), style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                  ])),
                ]),
              // Entrance animation: fade in and slide up slightly over 400 ms.
              ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0),
              const SizedBox(height: 20),

              // ── Stats ──────────────────────────────────────────────────
              // Three KPI stat tiles: total incidents, active (in-progress), resolved.
              // Uses AsyncValue.when to handle loading, error, and data states.
              statsAsync.when(
                // While stats are loading, show three shimmer placeholder boxes.
                loading: () => Row(children: [
                  Expanded(child: _shimmerBox(80, isDark)), const SizedBox(width: 12),
                  Expanded(child: _shimmerBox(80, isDark)), const SizedBox(width: 12),
                  Expanded(child: _shimmerBox(80, isDark)),
                ]),
                // On error, render nothing — avoids breaking the layout on API failure.
                error: (e, _) => const SizedBox.shrink(),
                // On success, render three StatCard widgets with live counts.
                data: (stats) => Row(children: [
                  // Total incidents reported across the system.
                  Expanded(child: StatCard(title: t(context, ref, 'incidents'),   value: stats.total.toString(),      icon: Icons.warning_amber_rounded, color: AppColors.info)),
                  const SizedBox(width: 12),
                  // Incidents currently being handled / in-progress.
                  Expanded(child: StatCard(title: t(context, ref, 'active'), value: stats.inProgress.toString(), icon: Icons.pending_actions, color: AppColors.warning)),
                  const SizedBox(width: 12),
                  // Incidents that have been closed / resolved by responders.
                  Expanded(child: StatCard(title: t(context, ref, 'resolved'),    value: stats.resolved.toString(),   icon: Icons.check_circle_outline,  color: AppColors.success)),
                ]),
              // Delay the stats row animation by 200 ms so it appears after the banner.
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 20),

              // ── Quick actions ──────────────────────────────────────────
              // Section header for the three quick-navigation action cards.
              Text(t(context, ref, 'quick_actions'), style: TextStyle(
                color: textCol, fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),

              // Row of three tappable action cards for the most common responder tasks.
              Row(children: [
                // Incidents — navigates to the full incident list for triage / response.
                _ActionCard(
                  label: t(context, ref, 'incidents'),
                  icon: Icons.warning_amber_rounded,
                  color: AppColors.warning,
                  isDark: isDark, cardBg: cardBg, borderCol: borderCol,
                  onTap: () => context.push('/incidents')),
                const SizedBox(width: 12),
                // Map — navigates to the incident map for geographic situational awareness.
                _ActionCard(
                  label: t(context, ref, 'map'),
                  icon: Icons.map_rounded,
                  color: AppColors.secondary,
                  isDark: isDark, cardBg: cardBg, borderCol: borderCol,
                  onTap: () => context.go('/map')),
                const SizedBox(width: 12),
                // Resources — navigates to the resource management screen (equipment, teams).
                _ActionCard(
                  label: t(context, ref, 'resources'),
                  icon: Icons.inventory_2_rounded,
                  color: AppColors.success,
                  isDark: isDark, cardBg: cardBg, borderCol: borderCol,
                  onTap: () => context.push('/resources')),
              // Delay the action cards animation so they appear after the stats row.
              ]).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 20),

              // ── Active incidents ───────────────────────────────────────
              // Section header row with a "View all" link to the full incident list.
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Section title — shows the most recently reported incidents.
                  Text(t(context, ref, 'recent_reports'), style: TextStyle(
                    color: textCol, fontSize: 16, fontWeight: FontWeight.w700)),
                  // "View all" text button — navigates to the paginated incident list.
                  TextButton(
                    onPressed: () => context.push('/incidents'),
                    child: Text(t(context, ref, 'view_all'), style: TextStyle(color: AppColors.primary))),
                ],
              ),

              // Render up to 5 most-recent incidents as tappable IncidentCard widgets.
              // Tapping a card navigates to the full incident detail screen.
              ...incidentState.incidents.take(5).map((inc) => IncidentCard(
                incident: inc, onTap: () => context.push('/incidents/${inc.id}'))),

              // Show a loading spinner at the bottom while the incident list is fetching.
              if (incidentState.isLoading)
                const Center(child: Padding(
                  padding: EdgeInsets.all(16),
                  child: CircularProgressIndicator(color: AppColors.primary))),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds a plain rounded rectangle placeholder used during stats loading.
  ///
  /// [h] is the box height in logical pixels; [isDark] selects the shimmer colour
  /// so it blends with the current theme instead of clashing.
  Widget _shimmerBox(double h, bool isDark) => Container(
    height: h,
    decoration: BoxDecoration(
      // Dark-mode shimmer is a dark slate; light-mode shimmer is a light grey.
      color: isDark ? const Color(0xFF1C2333) : Colors.grey.shade200,
      borderRadius: BorderRadius.circular(12)));
}

/// A private quick-action card widget used in the responder dashboard.
///
/// Renders a tappable card with a coloured circular icon and a label beneath it.
/// Used for Incidents, Map, and Resources shortcuts to keep navigation one tap away.
class _ActionCard extends StatelessWidget {
  /// The localised label displayed below the icon (e.g. "Incidents", "Map").
  final String label;

  /// The Material icon representing the action category.
  final IconData icon;

  /// The accent colour applied to the icon and its background circle.
  final Color color;

  /// Whether the app is in dark mode — controls text and shadow colours.
  final bool isDark;

  /// The card surface colour, derived from the parent's theme-aware [cardBg].
  final Color cardBg;

  /// The card border colour, derived from the parent's theme-aware [borderCol].
  final Color borderCol;

  /// Callback invoked when the user taps the card — typically a navigation call.
  final VoidCallback onTap;

  const _ActionCard({required this.label, required this.icon, required this.color,
    required this.isDark, required this.cardBg, required this.borderCol, required this.onTap});

  /// Builds the tappable card layout: icon circle on top, label text below.
  @override
  Widget build(BuildContext context) => Expanded(
    // GestureDetector wraps the entire card so any tap triggers navigation.
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: cardBg,                        // Theme-aware card background.
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderCol), // Subtle border for card definition.
          // Soft shadow — stronger in dark mode to lift the card off the background.
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05), blurRadius: 8)]),
        child: Column(children: [
          // Circular icon container with a low-opacity tinted background.
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              // 12% opacity of the action colour creates a subtle tinted badge.
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle),
            // Icon uses full accent colour for clear visual affordance.
            child: Icon(icon, color: color, size: 22)),
          const SizedBox(height: 8),
          // Action label — small, bold, centred below the icon.
          Text(label, style: TextStyle(
            color: isDark ? Colors.white : Colors.black87,
            fontSize: 11, fontWeight: FontWeight.w600),
            textAlign: TextAlign.center),
        ]),
      ),
    ),
  );
}