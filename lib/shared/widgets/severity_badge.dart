// Compact colored badge displaying an incident's severity level (LOW/MEDIUM/HIGH/CRITICAL).
// Color is driven by AppColors.severityColor() which maps severity strings to brand colors:
//   LOW → green, MEDIUM → yellow/amber, HIGH → orange, CRITICAL → red.
// Used in IncidentCard and IncidentDetail to give dispatchers instant visual triage cues.
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart'; // severityColor() mapping function

// Small pill badge with a translucent fill and solid border in the severity color.
// The subtle background (15% opacity) keeps the badge readable in both light and dark themes.
class SeverityBadge extends StatelessWidget {
  final String severity; // Raw severity string from the API, e.g. "HIGH", "CRITICAL"
  const SeverityBadge({super.key, required this.severity});

  @override
  Widget build(BuildContext context) {
    final color = AppColors.severityColor(severity); // Resolve brand color for this severity level
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), // Tight pill padding
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15), // Translucent fill — visible but not overwhelming
        borderRadius: BorderRadius.circular(6), // Rounded pill shape
        border: Border.all(color: color, width: 1), // Solid border in full severity color
      ),
      child: Text(
        severity, // Display the raw severity string (already uppercase from API)
        style: TextStyle(
            color: color, fontSize: 11, fontWeight: FontWeight.w600), // Bold text in severity color
      ),
    );
  }
}
