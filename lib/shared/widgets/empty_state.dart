// Reusable empty-state placeholder displayed when a list or data section has no items.
// Used across incidents, resources, teams, notifications, and news screens.
// Accepts an optional subtitle and action widget (e.g., a "Report Incident" button)
// so each call site can customise the message and CTA without duplicating layout code.
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart'; // textPrimary, textSecondary colors

// Centered column with icon, title, optional subtitle, and optional action button.
// Designed to fill available space via Center so it works inside Expanded or ListView.
class EmptyState extends StatelessWidget {
  final String title;       // Main heading, e.g. "No incidents found"
  final String? subtitle;   // Supporting text, e.g. "Be the first to report one"
  final IconData icon;      // Illustrative icon; defaults to inbox for generic empty lists
  final Widget? action;     // Optional CTA widget, e.g. ElevatedButton to create first item

  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.icon = Icons.inbox_outlined, // Sensible default that reads as "nothing here"
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center( // Vertically and horizontally center within available space
      child: Padding(
        padding: const EdgeInsets.all(32), // Generous padding so text never touches edges
        child: Column(
          mainAxisSize: MainAxisSize.min, // Shrink-wraps the column to its content height
          children: [
            Icon(icon, size: 64, color: AppColors.textSecondary), // Large muted icon
            const SizedBox(height: 16),
            Text(title,
                style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600),
                textAlign: TextAlign.center), // Center-align for symmetry with icon
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!, // Conditional — only rendered when subtitle was provided
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 14),
                  textAlign: TextAlign.center),
            ],
            if (action != null) ...[
              const SizedBox(height: 24), // Extra breathing room before the CTA
              action!, // Caller-supplied button or link widget
            ],
          ],
        ),
      ),
    );
  }
}
