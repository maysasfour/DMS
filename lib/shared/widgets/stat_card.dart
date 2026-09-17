// Dashboard metric card showing a single KPI (e.g. total incidents, active resources).
// Used in a grid on citizen and responder dashboards to surface key numbers at a glance.
// The `color` parameter drives both the icon tint and the large value text,
// creating a visually distinct identity for each metric type.
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart'; // cardDark, border, textSecondary tokens

// Card with icon + numeric value on top, label below.
// Adapts background and border colors to the active theme automatically.
class StatCard extends StatelessWidget {
  final String title; // Short label beneath the value, e.g. "Total Incidents"
  final String value; // The metric to display prominently, e.g. "42" or "3"
  final IconData icon; // Illustrative icon rendered in the accent color
  final Color color;   // Accent color applied to icon and value text (per-metric)

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark; // Theme detection
    final cardBg    = isDark ? AppColors.cardDark : Colors.white;       // Card background
    final borderCol = isDark ? AppColors.border   : Colors.grey.shade200; // Subtle border
    final textCol   = isDark ? AppColors.textSecondary : Colors.black54;  // Muted label color

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16), // Rounded card corners
        border: Border.all(color: borderCol),
        boxShadow: [BoxShadow(
          color: color.withValues(alpha: 0.07), // Subtle tinted shadow from the metric color
          blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 24), // Metric-colored icon for quick recognition
              Flexible(child: Text(value, // The big number — flex prevents overflow on large values
                style: TextStyle(
                  color: color, fontSize: 26, fontWeight: FontWeight.bold), // Prominent metric value
                overflow: TextOverflow.ellipsis)), // Truncate gracefully if value is unexpectedly long
            ],
          ),
          const SizedBox(height: 8),
          Text(title,
            style: TextStyle(color: textCol, fontSize: 13), // Muted label beneath the value
            maxLines: 1, overflow: TextOverflow.ellipsis), // Prevent label from wrapping in small grid cells
        ],
      ),
    );
  }
}
