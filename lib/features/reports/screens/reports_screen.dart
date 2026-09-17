// =============================================================================
// reports_screen.dart
//
// Reports & Analytics Screen for the Disaster Management System (DMS).
//
// This screen provides field officers and administrators with a high-level
// statistical overview of all incidents recorded in the system. It displays:
//   - Aggregated incident counts (total, resolved, active/in-progress, critical)
//   - A 14-day rolling trend chart showing incident frequency over time
//
// Data is sourced from the shared [dashboardStatsProvider], ensuring reports
// stay consistent with the main dashboard view. The screen supports both light
// and dark themes and is fully localised via [AppStrings]/[t()].
// =============================================================================

// Third-party chart library used to render the 14-day incident trend line chart.
import 'package:fl_chart/fl_chart.dart';
// Core Flutter UI framework for widgets, theming, and layout primitives.
import 'package:flutter/material.dart';
// Riverpod state management — provides reactive data watching across the widget tree.
import 'package:flutter_riverpod/flutter_riverpod.dart';
// DMS design-system colour tokens (primary, success, warning, info, border, text variants).
import '../../../core/constants/app_colors.dart';
// Provider that fetches aggregated dashboard statistics (totals, trends) from the backend.
import '../../../features/dashboard/providers/dashboard_provider.dart';
// Shared navigation drawer used across all authenticated screens.
import '../../../shared/widgets/app_drawer.dart';
// Localisation helper — [t()] resolves a translation key to the active locale string.
import '../../../core/l10n/app_strings.dart';

/// Top-level reports screen widget for the DMS mobile application.
///
/// Extends [ConsumerWidget] so it can reactively watch Riverpod providers
/// without needing a separate [StateNotifier] or [StatefulWidget].
class ReportsScreen extends ConsumerWidget {
  /// Const constructor — allows Flutter to cache the widget across rebuilds.
  const ReportsScreen({super.key});

  /// Builds the full reports UI, watching live dashboard statistics.
  ///
  /// [ref] is the Riverpod [WidgetRef] used to read/watch providers.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch the async dashboard stats provider; rebuilds automatically when data changes.
    final statsAsync = ref.watch(dashboardStatsProvider);

    // Detect the current theme brightness to conditionally apply dark/light colours.
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Card background: deep navy in dark mode, plain white in light mode.
    final cardBg = isDark ? const Color(0xFF111827) : Colors.white;

    // Border colour: DMS border token in dark mode, soft grey in light mode.
    final borderCol = isDark ? AppColors.border : Colors.grey.shade200;

    // Primary text colour for values and headings.
    final textCol = isDark ? AppColors.textPrimary : Colors.black87;

    // Subdued text colour for labels and secondary information.
    final subCol = isDark ? AppColors.textSecondary : Colors.black54;

    return Scaffold(
      // Use the theme's scaffold background so the screen adapts to system theme changes.
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,

      // Shared DMS navigation drawer — provides access to all major app sections.
      drawer: const AppDrawer(),

      appBar: AppBar(
        // Match the app bar background to the scaffold so the header blends seamlessly.
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Foreground (icons, back arrow) adapts to the active theme.
        foregroundColor: isDark ? AppColors.textPrimary : Colors.black87,

        // Localised screen title resolved from the active locale ('reports' key).
        title: Text(t(context, ref, 'reports'),
            style: TextStyle(color: isDark ? AppColors.textPrimary : Colors.black87)),

        actions: [
          // Refresh button — invalidates the stats provider to force a fresh API fetch.
          IconButton(
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimary : Colors.black54),
            // Invalidating the provider clears cached data and triggers a network reload.
            onPressed: () => ref.invalidate(dashboardStatsProvider),
          ),
        ],
      ),

      // Use AsyncValue.when() to handle all three async states declaratively.
      body: statsAsync.when(
        // Loading state — display a branded spinner while the backend responds.
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),

        // Error state — show the error message with an option to retry the request.
        error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              // Error icon using the DMS primary accent colour for visual consistency.
              const Icon(Icons.error_outline, color: AppColors.primary, size: 48),
              const SizedBox(height: 12),
              // Display the raw error message so operators can diagnose connectivity issues.
              Text(e.toString(),
                  style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontSize: 13),
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              // Retry button — re-invalidates the provider to attempt another API call.
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(dashboardStatsProvider),
                icon: const Icon(Icons.refresh),
                // Localised 'Retry' label.
                label: Text(t(context, ref, 'retry')),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              ),
            ])),

        // Data state — render stat cards and trend chart when statistics are available.
        data: (stats) => SingleChildScrollView(
          // Uniform 16 px padding around all content for consistent visual spacing.
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- Stat Cards Row 1: Total incidents and resolved count ---
              Row(children: [
                // Total incidents card — shows the all-time or filtered incident count.
                Expanded(child: _StatCard(
                  title: t(context, ref, 'total_incidents'),
                  value: stats.total.toString(),
                  icon: Icons.warning_amber_rounded, // Warning icon signals incident tracking.
                  color: AppColors.info,             // Blue — informational, non-alarming.
                  cardBg: cardBg, borderCol: borderCol, textCol: textCol, subCol: subCol,
                )),
                const SizedBox(width: 12),
                // Resolved incidents card — counts incidents that have been closed/resolved.
                Expanded(child: _StatCard(
                  title: t(context, ref, 'resolved'),
                  value: stats.resolved.toString(),
                  icon: Icons.check_circle_outline, // Check icon conveys successful resolution.
                  color: AppColors.success,          // Green — positive outcome colour.
                  cardBg: cardBg, borderCol: borderCol, textCol: textCol, subCol: subCol,
                )),
              ]),
              const SizedBox(height: 12),

              // --- Stat Cards Row 2: Active incidents and critical severity count ---
              Row(children: [
                // Active/in-progress incidents — incidents currently being handled by teams.
                Expanded(child: _StatCard(
                  title: t(context, ref, 'active'),
                  value: stats.inProgress.toString(),
                  icon: Icons.pending_actions,  // Pending icon signals ongoing response effort.
                  color: AppColors.warning,     // Amber — requires attention but not yet critical.
                  cardBg: cardBg, borderCol: borderCol, textCol: textCol, subCol: subCol,
                )),
                const SizedBox(width: 12),
                // Critical incidents — highest-severity events requiring immediate escalation.
                Expanded(child: _StatCard(
                  title: t(context, ref, 'critical'),
                  value: stats.critical.toString(),
                  icon: Icons.crisis_alert,   // Crisis alert icon for maximum visual urgency.
                  color: AppColors.primary,   // DMS primary accent — used for critical severity.
                  cardBg: cardBg, borderCol: borderCol, textCol: textCol, subCol: subCol,
                )),
              ]),
              const SizedBox(height: 20),

              // --- 14-Day Incident Trend Section ---

              // Section heading for the trend chart, localised to the active language.
              Text(t(context, ref, 'trend_14day'),
                style: TextStyle(
                  color: textCol, fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),

              // Only render the chart if trend data exists; avoids an empty chart container.
              if (stats.trends.isNotEmpty)
                _TrendChart(trends: stats.trends, isDark: isDark,
                  cardBg: cardBg, borderCol: borderCol),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

/// Private statistic summary card widget.
///
/// Displays a single KPI metric (e.g. total incidents, resolved count) with an
/// icon, numeric value, and label. Used in pairs within horizontal [Row]s on
/// the Reports screen to give operators an at-a-glance view of system health.
class _StatCard extends StatelessWidget {
  /// Human-readable label for the metric (e.g. "Total Incidents", "Critical").
  final String title;

  /// Formatted numeric value to display prominently (e.g. "42").
  final String value;

  /// Material icon that visually represents the metric category.
  final IconData icon;

  /// Accent colour applied to the icon, icon background, and card border.
  final Color color;

  /// Card background colour — differs between dark and light themes.
  final Color cardBg;

  /// Border colour for the card outline.
  final Color borderCol;

  /// Primary text colour for the numeric value.
  final Color textCol;

  /// Subdued colour for the metric label beneath the value.
  final Color subCol;

  /// All fields are required; no optional parameters to keep the card predictable.
  const _StatCard({
    required this.title, required this.value, required this.icon,
    required this.color, required this.cardBg, required this.borderCol,
    required this.textCol, required this.subCol,
  });

  /// Builds a rounded card with a coloured icon badge on the left and the
  /// metric value + label stacked on the right.
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        // Themed card background separates the card from the scaffold surface.
        color: cardBg,
        // Rounded corners match the DMS design system card style.
        borderRadius: BorderRadius.circular(16),
        // Subtle coloured border reinforces the metric's severity/category colour.
        border: Border.all(color: color.withValues(alpha: 0.3)),
        // Soft coloured shadow gives depth and makes the card feel elevated.
        boxShadow: [BoxShadow(
          color: color.withValues(alpha: 0.08),
          blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Row(children: [
        // Icon badge container — filled with a semi-transparent tint of the accent colour.
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            // 12 % opacity fill prevents the icon background from overpowering the layout.
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10)),
          // Metric icon coloured with the full accent for strong visual association.
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(width: 12),
        // Text column — value on top in large bold type, label below in smaller subdued text.
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Large bold value — immediately draws the operator's eye to the KPI number.
          Text(value, style: TextStyle(
            color: textCol, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          // Metric label in smaller, subdued text; truncated with ellipsis if too long.
          Text(title, style: TextStyle(
            color: subCol, fontSize: 11, fontWeight: FontWeight.w500),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        ])),
      ]),
    );
  }
}

/// Private 14-day incident trend chart widget.
///
/// Renders a smooth line chart using the [fl_chart] library to visualise how
/// incident report volumes have changed over the past 14 days. This helps
/// disaster coordinators identify spikes (e.g. during a storm event) and
/// assess whether response capacity is keeping pace with incoming reports.
class _TrendChart extends StatelessWidget {
  /// Ordered list of daily trend data points from the backend.
  /// Each map contains at minimum a 'count' key with the daily incident count.
  final List<Map<String, dynamic>> trends;

  /// Whether the app is currently in dark mode — controls grid and label colours.
  final bool isDark;

  /// Card background colour matching the enclosing Reports screen theme.
  final Color cardBg;

  /// Border colour for the chart container outline.
  final Color borderCol;

  /// All parameters are required to ensure the chart always renders correctly.
  const _TrendChart({required this.trends, required this.isDark,
    required this.cardBg, required this.borderCol});

  /// Builds a styled [LineChart] inside a rounded card container.
  @override
  Widget build(BuildContext context) {
    // Convert the trend list into fl_chart [FlSpot] objects.
    // The x-axis index corresponds to the day offset (0 = oldest, n-1 = most recent).
    // The y-axis value is the incident count for that day.
    final spots = trends.asMap().entries.map((e) =>
      FlSpot(e.key.toDouble(), (e.value['count'] ?? 0).toDouble())).toList();

    // Horizontal grid line colour — subtle in both themes to avoid visual clutter.
    final gridColor = isDark ? AppColors.border : Colors.grey.shade200;

    // Axis label colour — dimmed so labels don't compete with the data line.
    final labelColor = isDark ? AppColors.textSecondary : Colors.black45;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        // Themed background keeps the chart visually consistent with the stat cards above.
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderCol),
        // Light shadow differentiates the chart from the page background.
        boxShadow: [BoxShadow(
          color: (isDark ? Colors.black : Colors.grey).withValues(alpha: 0.06),
          blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: SizedBox(
        // Fixed height ensures the chart has consistent proportions regardless of data volume.
        height: 160,
        child: LineChart(
          LineChartData(
            // Grid configuration — show only horizontal lines to guide the eye along the y-axis.
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false, // Vertical lines are omitted to reduce visual noise.
              // Apply the themed grid colour to all horizontal reference lines.
              getDrawingHorizontalLine: (_) => FlLine(color: gridColor, strokeWidth: 1),
            ),
            titlesData: FlTitlesData(
              // Bottom (x) axis: show day numbers (1-indexed) every 3 days to avoid crowding.
              bottomTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 20, // Reserve 20 px for bottom labels.
                interval: 3,      // Label every 3rd day — prevents overlap on small screens.
                // Convert zero-based index to a 1-based day number for human readability.
                getTitlesWidget: (v, _) => Text('${v.toInt() + 1}',
                  style: TextStyle(color: labelColor, fontSize: 10)),
              )),
              // Left (y) axis: display raw incident counts as integer labels.
              leftTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30, // Reserve 30 px to accommodate multi-digit count labels.
                getTitlesWidget: (v, _) => Text(v.toInt().toString(),
                  style: TextStyle(color: labelColor, fontSize: 10)),
              )),
              // Top and right axes are hidden — they carry no meaningful data here.
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            ),
            // Remove the outer border frame so the chart blends into the card container.
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: true,              // Smooth bezier curve for a polished appearance.
                color: AppColors.primary,    // DMS primary accent colour for brand consistency.
                barWidth: 2,                 // Thin line keeps the chart clean and readable.
                // Hide individual data-point dots to avoid clutter on 14 closely-spaced points.
                dotData: const FlDotData(show: false),
                // Fill area beneath the line with a very light primary tint for visual emphasis.
                belowBarData: BarAreaData(
                  show: true,
                  // 10 % opacity fill communicates trend direction without overwhelming the chart.
                  color: AppColors.primary.withValues(alpha: 0.1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}