// ─────────────────────────────────────────────────────────────────────────────
// File: lib/features/dashboard/screens/admin_dashboard.dart
//
// Purpose: Provides the main Admin Dashboard screen for the Disaster Management
// System (DMS). This screen is the central command view for system
// administrators, displaying real-time incident statistics, a 14-day trend
// chart, and a scrollable feed of the most recent incident reports.
//
// Admins can navigate to the full incident list, view notifications, switch
// the UI language, and toggle between dark/light/system themes. All data is
// loaded via Riverpod providers (incidentProvider, dashboardStatsProvider) and
// refreshed on pull-to-refresh or page entry.
// ─────────────────────────────────────────────────────────────────────────────

// Chart rendering library used to draw the 14-day incident trend line chart
import 'package:fl_chart/fl_chart.dart';
// Core Flutter material UI framework
import 'package:flutter/material.dart';
// Provides declarative entry/slide/fade animations on widgets
import 'package:flutter_animate/flutter_animate.dart';
// State management: ConsumerStatefulWidget and ref.watch/read for reactive providers
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Declarative navigation — used to push named routes (incidents, notifications)
import 'package:go_router/go_router.dart';
// Branded fonts: Rajdhani for headings, Inter for body text
import 'package:google_fonts/google_fonts.dart';

// DMS brand color palette (primary purple, warning amber, success green, etc.)
import '../../../core/constants/app_colors.dart';
// Localisation helper — t(context, ref, key) resolves the current language string
import '../../../core/l10n/app_strings.dart';
// Authentication provider exposing the currently signed-in admin user
import '../../../features/auth/providers/auth_provider.dart';
// Incident list state (loading, error, paginated incident objects)
import '../../../features/incidents/providers/incident_provider.dart';
// Locale provider — tracks the active language code (en, ar, fr, es, tr)
import '../../../providers/locale_provider.dart';
// Theme mode provider — dark / light / system toggle stored persistently
import '../../../providers/theme_provider.dart';
// Side-drawer navigation widget shared across all authenticated screens
import '../../../shared/widgets/app_drawer.dart';
// Reusable card widget that renders a single incident summary row
import '../../../shared/widgets/incident_card.dart';
// Language selector pill widget shown in the AppBar action row
import '../../../shared/widgets/lang_pill.dart';
// KPI summary card widget used for total / active / resolved / critical counts
import '../../../shared/widgets/stat_card.dart';
// Dashboard-specific Riverpod provider that fetches aggregated stats from the backend
import '../providers/dashboard_provider.dart';

/// Root widget for the Admin Dashboard screen.
/// Extends [ConsumerStatefulWidget] so it can subscribe to Riverpod providers
/// and trigger a state rebuild whenever incident or stats data changes.
class AdminDashboard extends ConsumerStatefulWidget {
  /// Default const constructor — no configuration is passed at route level.
  const AdminDashboard({super.key});

  @override
  ConsumerState<AdminDashboard> createState() => _AdminDashboardState();
}

/// Private state class that owns the lifecycle and build logic for [AdminDashboard].
class _AdminDashboardState extends ConsumerState<AdminDashboard> {

  @override
  void initState() {
    super.initState();
    // Schedule incident data fetch after the first frame so the widget tree is
    // fully mounted before triggering a provider side-effect (required by Riverpod).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Force a full refresh of the incident list on dashboard entry so the
      // admin always sees the latest disaster reports without manual pull.
      ref.read(incidentProvider.notifier).loadIncidents(refresh: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    // Watch locale so the entire dashboard re-renders when the admin switches language
    ref.watch(localeProvider);

    // Currently authenticated admin user — used to personalise the welcome greeting
    final user          = ref.watch(authProvider).user;
    // Incident list state: holds the paginated list of DMS incidents and loading flags
    final incidentState = ref.watch(incidentProvider);
    // Async provider for aggregated dashboard KPIs (total, active, resolved, critical, trends)
    final statsAsync    = ref.watch(dashboardStatsProvider);
    // True when the device/user preference is dark mode — drives colour selection below
    final isDark        = Theme.of(context).brightness == Brightness.dark;
    // Current explicit theme mode (dark/light/system) — used to show the correct icon
    final mode          = ref.watch(themeModeProvider);
    // Active language code — available for any conditional RTL / locale logic
    final lang          = ref.watch(localeProvider).languageCode;

    // Page background: deep navy in dark mode, soft grey-blue in light mode
    final bg      = isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F2F8);
    // Card surface: dark charcoal in dark mode, pure white in light mode
    final cardBg  = isDark ? const Color(0xFF111827) : Colors.white;
    // Primary text colour — white on dark, near-black on light
    final textCol = isDark ? Colors.white : Colors.black87;
    // Secondary / subtitle text colour — muted on both themes
    final subCol  = isDark ? Colors.white54 : Colors.black45;

    return Scaffold(
      // Full-bleed background colour that shows between cards
      backgroundColor: bg,
      // Side navigation drawer shared with all authenticated DMS screens
      drawer: const AppDrawer(),
      appBar: AppBar(
        // Match the card surface so the AppBar blends with content below
        backgroundColor: cardBg,
        // Remove default shadow; cards provide their own depth cues
        elevation: 0,
        // Hamburger menu — opens the AppDrawer via the nearest Scaffold ancestor
        leading: Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.menu_rounded, color: textCol),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        )),
        // App name from localisation — displayed in the DMS brand font Rajdhani
        title: Text(t(context, ref, 'app_name'), style: GoogleFonts.rajdhani(
          color: AppColors.primary, fontSize: 18, fontWeight: FontWeight.w800)),
        actions: [
          // Language picker pill — lets admin switch between supported locales inline
          LangPill(isDark: isDark, textCol: textCol),
          // Theme toggle — cycles dark → light → system → dark with matching icon
          IconButton(
            icon: Icon(
              // Show sun/moon/auto icon depending on the active ThemeMode
              mode == ThemeMode.dark ? Icons.dark_mode_rounded
              : mode == ThemeMode.light ? Icons.light_mode_rounded : Icons.brightness_auto_rounded,
              color: textCol, size: 20),
            onPressed: () {
              // Cycle through the three theme modes so the admin can choose preference
              final next = mode == ThemeMode.dark ? ThemeMode.light
                         : mode == ThemeMode.light ? ThemeMode.system : ThemeMode.dark;
              ref.read(themeModeProvider.notifier).setMode(next);
            },
          ),
          // Bell icon — navigates to the notifications screen for incident alerts
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: textCol),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: RefreshIndicator(
        // Pull-to-refresh: invalidates stats cache and reloads the incident list
        onRefresh: () async {
          // Force dashboardStatsProvider to re-fetch KPIs from the backend API
          ref.invalidate(dashboardStatsProvider);
          // Reload the full incident list to surface newly created or updated reports
          await ref.read(incidentProvider.notifier).loadIncidents(refresh: true);
        },
        child: SingleChildScrollView(
          // Always-scrollable so the RefreshIndicator drag works even when content is short
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Welcome header ─────────────────────────────────────────
              // Gradient banner personalised with the admin's first name
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  // Purple gradient matches the DMS neon-cyberpunk brand palette
                  gradient: const LinearGradient(
                    colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)],
                    begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(16),
                  // Soft purple glow shadow for depth on dark backgrounds
                  boxShadow: [const BoxShadow(color: Color(0x447C3AED), blurRadius: 12, offset: Offset(0, 4))]),
                child: Row(children: [
                  // Admin shield icon inside a frosted-glass circle
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      // Semi-transparent white overlay to soften the icon background
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 28)),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Greeting line: "Welcome, <FirstName>!" pulled from the auth state
                    Text('${t(context, ref, 'welcome')}, ${user?.name.split(' ').first ?? ''}!',
                      style: GoogleFonts.rajdhani(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                    // Subtitle reminding the admin this is the system-wide overview screen
                    Text(t(context, ref, 'system_overview'), style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                  ])),
                ]),
              // Animate the header in with a short fade + upward slide on first build
              ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0),
              const SizedBox(height: 20),

              // ── Stat cards ─────────────────────────────────────────────
              // Render KPI tiles reactively: shimmer while loading, error text on failure,
              // or a 2x2 grid of StatCards plus the 14-day trend chart when data arrives
              statsAsync.when(
                // Show placeholder skeleton boxes while the stats API call is in flight
                loading: () => _statsShimmer(isDark),
                // Display the raw error message if the stats endpoint fails
                error: (e, _) => Text(e.toString(), style: TextStyle(color: AppColors.primary)),
                data: (stats) => Column(
                  children: [
                    // Top row: total incidents reported vs. currently in-progress
                    Row(children: [
                      Expanded(child: StatCard(title: t(context,ref,'total'), value: stats.total.toString(),   icon: Icons.warning_amber_rounded, color: AppColors.info)),
                      const SizedBox(width: 12),
                      Expanded(child: StatCard(title: t(context,ref,'active'), value: stats.inProgress.toString(), icon: Icons.pending_actions,        color: AppColors.warning)),
                    ]),
                    const SizedBox(height: 12),
                    // Bottom row: fully resolved incidents vs. critical-severity incidents
                    Row(children: [
                      Expanded(child: StatCard(title: t(context,ref,'resolved'), value: stats.resolved.toString(), icon: Icons.check_circle_outline, color: AppColors.success)),
                      const SizedBox(width: 12),
                      Expanded(child: StatCard(title: t(context,ref,'critical'),  value: stats.critical.toString(), icon: Icons.crisis_alert,         color: AppColors.primary)),
                    ]),
                    const SizedBox(height: 20),
                    // Only render the trend chart when backend returns trend data points
                    if (stats.trends.isNotEmpty) _trendChart(stats.trends, isDark, cardBg),
                  ],
                ),
              // Stagger the stat section in slightly after the header animation completes
              ).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 20),

              // ── Recent Incidents ───────────────────────────────────────
              // Section header with a "View All" shortcut to the full incident list
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Section label localised for the active language
                  Text(t(context, ref, 'recent_reports'), style: TextStyle(
                    color: textCol, fontSize: 16, fontWeight: FontWeight.w700)),
                  // Tapping "View All" pushes the admin to the /incidents route
                  TextButton(
                    onPressed: () => context.push('/incidents'),
                    child: Text(t(context, ref, 'view_all'), style: TextStyle(color: AppColors.primary))),
                ],
              ),
              // Render the five most recent incidents as tappable IncidentCard rows
              ...incidentState.incidents.take(5).map((inc) => IncidentCard(
                incident: inc,
                // Deep-link into the incident detail page for investigation or updates
                onTap: () => context.push('/incidents/${inc.id}'))),
              // Show a spinner below the list while additional incidents are being fetched
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

  /// Builds a 2x2 grid of grey placeholder boxes shown while dashboard KPIs load.
  /// Uses theme-aware shimmer colours to match the current dark/light surface.
  Widget _statsShimmer(bool isDark) {
    // Shimmer tile colour: dark blue-grey in dark mode, light grey in light mode
    final shimmerCol = isDark ? const Color(0xFF1C2333) : Colors.grey.shade200;
    return Column(children: [
      // First row of two placeholder stat boxes
      Row(children: [
        Expanded(child: _box(80, shimmerCol)), const SizedBox(width: 12),
        Expanded(child: _box(80, shimmerCol)),
      ]),
      const SizedBox(height: 12),
      // Second row of two placeholder stat boxes
      Row(children: [
        Expanded(child: _box(80, shimmerCol)), const SizedBox(width: 12),
        Expanded(child: _box(80, shimmerCol)),
      ]),
    ]);
  }

  /// Returns a rounded rectangle container of a given [h]eight and fill [c]olour.
  /// Used as a generic shimmer tile placeholder during stats loading.
  Widget _box(double h, Color c) => Container(
    height: h, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(12)));

  /// Builds the 14-day incident frequency trend chart using fl_chart's [LineChart].
  ///
  /// [trends] — list of maps from the backend, each with a 'count' integer per day.
  /// [isDark]  — controls border and shadow colours for the chart card.
  /// [cardBg]  — surface colour for the containing card.
  Widget _trendChart(List<Map<String, dynamic>> trends, bool isDark, Color cardBg) {
    // Convert the trends list to fl_chart FlSpot points: x = day index, y = incident count
    final spots = trends.asMap().entries.map((e) =>
      FlSpot(e.key.toDouble(), (e.value['count'] ?? 0).toDouble())).toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        // Card surface matches the rest of the dashboard card surfaces
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        // Subtle border to visually separate the chart from the page background
        border: Border.all(color: isDark ? AppColors.border : Colors.grey.shade200),
        // Soft drop shadow — deeper in dark mode for layering effect
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06), blurRadius: 12)]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Chart title label, localised for the active language
        Text(t(context, ref, 'trend_14day'), style: TextStyle(
          color: isDark ? Colors.white : Colors.black87, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        SizedBox(
          height: 150, // Fixed chart height to keep the dashboard compact
          child: LineChart(LineChartData(
            // No background grid lines — keeps the chart clean and minimal
            gridData: const FlGridData(show: false),
            // Axis labels suppressed; the y-axis values are readable from the stat cards
            titlesData: const FlTitlesData(show: false),
            // No border frame around the chart area
            borderData: FlBorderData(show: false),
            lineBarsData: [LineChartBarData(
              spots: spots,
              // Smooth curved line instead of sharp angles between data points
              isCurved: true,
              // Brand primary purple for the trend line
              color: AppColors.primary,
              // Thin 2px stroke to keep the visual light
              barWidth: 2,
              // Hide individual data-point dots to declutter the 14-day view
              dotData: const FlDotData(show: false),
              // Semi-transparent purple fill below the line to reinforce the trend shape
              belowBarData: BarAreaData(show: true, color: AppColors.primary.withValues(alpha: 0.1)),
            )],
          )),
        ),
      ]),
    );
  }
}