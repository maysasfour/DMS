// Incident list card displayed in incident list screens and dashboard recent-reports sections.
// Shows title, severity badge, status badge, location name, and relative creation time
// (e.g. "3 minutes ago") using the timeago package. An optional delete button appears
// for screens where the user has permission to remove their own reports.
import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago; // Converts ISO timestamps to "X ago" strings
import '../../core/constants/app_colors.dart'; // cardDark, border, severityColor tokens
import '../../features/incidents/data/models/incident_model.dart'; // IncidentModel data class
import 'severity_badge.dart'; // Colored severity pill (LOW/MEDIUM/HIGH/CRITICAL)
import 'status_badge.dart';  // Colored status pill (REPORTED/IN_PROGRESS/RESOLVED)

// Tappable card for a single incident. Calls onTap to open the detail screen.
// onDelete is optional — only provided on screens where deletion is permitted (own reports).
class IncidentCard extends StatelessWidget {
  final IncidentModel incident; // The incident data to display
  final VoidCallback onTap;     // Navigate to incident detail on tap
  final VoidCallback? onDelete; // Show delete button only when this is non-null

  const IncidentCard({
    super.key,
    required this.incident,
    required this.onTap,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? AppColors.cardDark : Colors.white;
    final borderCol = isDark ? AppColors.border : Colors.grey.shade200;
    final titleCol = isDark ? Colors.white : Colors.black87;
    final subCol = isDark ? AppColors.textSecondary : Colors.black45;

    final createdAt = incident.createdAt != null
        ? timeago.format(DateTime.parse(incident.createdAt!))
        : '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderCol),
          boxShadow: [BoxShadow(
            color: (isDark ? Colors.black : Colors.grey).withValues(alpha: 0.06),
            blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10, height: 10,
                  decoration: BoxDecoration(
                    color: AppColors.severityColor(incident.severity),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    incident.title,
                    style: TextStyle(
                      color: titleCol,
                      fontWeight: FontWeight.w600,
                      fontSize: 15),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (onDelete != null)
                  IconButton(
                    icon: const Icon(Icons.delete_outline,
                        color: AppColors.primary, size: 20),
                    onPressed: onDelete,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                SeverityBadge(severity: incident.severity),
                const SizedBox(width: 8),
                StatusBadge(status: incident.status),
              ],
            ),
            if (incident.locationName != null || incident.city != null || createdAt.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  if (incident.locationName != null || incident.city != null) ...[
                    Icon(Icons.location_on_outlined, size: 14, color: subCol),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        incident.locationName ?? incident.city ?? '',
                        style: TextStyle(color: subCol, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ] else
                    const Spacer(),
                  if (createdAt.isNotEmpty)
                    Text(createdAt,
                      style: TextStyle(color: subCol, fontSize: 12)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
