// Compact colored badge displaying an incident's workflow status (REPORTED/IN_PROGRESS/RESOLVED/etc.).
// Color is driven by AppColors.statusColor() which maps status strings to semantic colors:
//   REPORTED → blue, IN_PROGRESS → orange, RESOLVED → green, CLOSED → grey.
// Underscores in the status string (e.g. "IN_PROGRESS") are replaced with spaces for display.
// Used alongside SeverityBadge in IncidentCard to give a quick status snapshot in lists.
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart'; // statusColor() mapping function

// Small pill badge with translucent fill and solid border in the workflow-status color.
class StatusBadge extends StatelessWidget {
  final String status; // Raw status string from the API, e.g. "IN_PROGRESS", "RESOLVED"
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = AppColors.statusColor(status); // Resolve brand color for this workflow status
    final label = status.replaceAll('_', ' ');  // "IN_PROGRESS" → "IN PROGRESS" for readability
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), // Tight pill padding
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15), // Translucent fill — soft background indicator
        borderRadius: BorderRadius.circular(6), // Rounded pill shape matching SeverityBadge
        border: Border.all(color: color, width: 1), // Solid border in full status color
      ),
      child: Text(
        label, // Human-readable status label with spaces
        style: TextStyle(
            color: color, fontSize: 11, fontWeight: FontWeight.w600), // Bold text in status color
      ),
    );
  }
}
