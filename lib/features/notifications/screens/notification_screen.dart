/// notification_screen.dart
/// ---------------------------------------------------------------------------
/// Notification inbox screen for the Disaster Management System (DMS) mobile app.
///
/// Displays a chronological list of system notifications sent to the current user,
/// including disaster alerts, incident status updates, and informational messages
/// from DMS administrators or automated workflows. Users can mark notifications
/// as read individually (on tap) or in bulk, delete individual notifications via
/// swipe-to-dismiss, and pull-to-refresh to fetch the latest entries from the backend.
/// ---------------------------------------------------------------------------

// Flutter UI framework — provides Material widgets used throughout the screen.
import 'package:flutter/material.dart';

// Riverpod state management — ConsumerStatefulWidget watches reactive providers
// so the UI rebuilds automatically when notification state changes.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// timeago package — converts raw ISO-8601 timestamps into human-readable
// relative strings (e.g. "3 minutes ago") for each notification entry.
import 'package:timeago/timeago.dart' as timeago;

// DMS design-system colours (neon cyberpunk palette) shared across the app.
import '../../../core/constants/app_colors.dart';

// Riverpod provider that holds the NotificationState (list of notifications,
// loading flag) and exposes load / markRead / markAllRead / delete actions.
import '../providers/notification_provider.dart';

// Localisation helper — t(context, ref, key) resolves a string key into the
// active locale translation so the screen supports all DMS languages.
import '../../../core/l10n/app_strings.dart';

/// [NotificationScreen] is a stateful Riverpod consumer widget that renders
/// the DMS notification inbox. It is stateful so it can trigger the initial
/// data load via [initState] once the widget tree is fully mounted.
class NotificationScreen extends ConsumerStatefulWidget {
  // Standard const constructor; key forwarded to super for widget identity.
  const NotificationScreen({super.key});

  @override
  // Creates the mutable state object that drives the build lifecycle.
  ConsumerState<NotificationScreen> createState() => _NotificationScreenState();
}

/// Private state class for [NotificationScreen].
/// Responsible for triggering the initial notification fetch and building
/// the reactive UI based on the current [NotificationState].
class _NotificationScreenState extends ConsumerState<NotificationScreen> {
  @override
  void initState() {
    super.initState();
    // Defer the first data load until after the first frame so that
    // [ref] is safe to use and the widget is fully mounted in the tree.
    // Calling load() here fetches unread/read notifications from the DMS backend.
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => ref.read(notificationProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    // Watch the notification provider so any state change (new notification,
    // read status update, deletion) triggers an automatic UI rebuild.
    final state = ref.watch(notificationProvider);

    return Scaffold(
      // Use the theme's scaffold background to respect light/dark mode.
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Keep the app bar background consistent with the page background.
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Primary text colour from the DMS design system for the title and back arrow.
        foregroundColor: AppColors.textPrimary,
        // Localised screen title ("Notifications" in the active DMS language).
        title: Text(t(context, ref, 'notifications')),
        actions: [
          // Show the "Mark all read" action only when there is at least one
          // unread notification — prevents a confusing no-op button.
          if (state.notifications.any((n) => !n.isRead))
            TextButton(
              // Calls the notifier action that bulk-updates all notifications
              // to read=true on the DMS backend and refreshes local state.
              onPressed: () =>
                  ref.read(notificationProvider.notifier).markAllRead(),
              child: Text(t(context, ref, 'mark_all_read'),
                  // Small primary-coloured label to keep the app bar uncluttered.
                  style: const TextStyle(color: AppColors.primary, fontSize: 12)),
            ),
        ],
      ),
      body: state.isLoading
          // Show a branded loading spinner while the initial fetch is in progress.
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : state.notifications.isEmpty
              // Empty-state message when the user has no notifications yet.
              ? Center(
                  child: Text(t(context, ref, 'no_notifications'),
                      style: const TextStyle(color: AppColors.textSecondary)))
              // Scrollable, pull-to-refresh list of notification entries.
              : RefreshIndicator(
                  // Pull-to-refresh triggers a fresh load from the DMS API.
                  onRefresh: () =>
                      ref.read(notificationProvider.notifier).load(),
                  child: ListView.separated(
                    // Always-scrollable physics ensures pull-to-refresh works
                    // even when the list is shorter than the viewport.
                    physics: const AlwaysScrollableScrollPhysics(),
                    // Total number of notification entries to render.
                    itemCount: state.notifications.length,
                    // Thin divider line (1 px) between consecutive entries.
                    separatorBuilder: (_, __) =>
                        const Divider(color: AppColors.border, height: 1),
                    itemBuilder: (context, index) {
                      // Current notification model from the sorted list.
                      final notif = state.notifications[index];

                      // Wrap each tile in a Dismissible so the user can swipe
                      // left to delete the notification from the DMS inbox.
                      return Dismissible(
                        // Unique key based on notification ID prevents
                        // Flutter from confusing tiles during list updates.
                        key: ValueKey(notif.id),
                        // Only allow right-to-left swipe (end-to-start) for deletion.
                        direction: DismissDirection.endToStart,
                        // Red delete background revealed as the user swipes left.
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 16),
                          // Primary DMS accent colour for the destructive action hint.
                          color: AppColors.primary,
                          child: const Icon(Icons.delete_outline,
                              color: Colors.white),
                        ),
                        // On confirmed swipe, remove the notification from the
                        // DMS backend and update the local Riverpod state.
                        onDismissed: (_) =>
                            ref.read(notificationProvider.notifier).delete(notif.id),
                        child: ListTile(
                          // Unread notifications use the card colour to create a
                          // subtle visual distinction from already-read entries.
                          tileColor: notif.isRead
                              ? Theme.of(context).scaffoldBackgroundColor
                              : Theme.of(context).cardColor,
                          // Circular icon badge coloured by notification type
                          // (ALERT=red, INFO=blue, SUCCESS=green, default=orange).
                          leading: CircleAvatar(
                            // Semi-transparent version of the type colour as background.
                            backgroundColor: _typeColor(notif.type)
                                .withValues(alpha: 0.2),
                            // Type-specific icon (warning, info, check, bell).
                            child: Icon(_typeIcon(notif.type),
                                color: _typeColor(notif.type), size: 20),
                          ),
                          // Notification title (e.g. "New incident reported in Zone 3").
                          title: Text(
                            notif.title,
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              // Bold weight signals an unread notification to the user.
                              fontWeight: notif.isRead
                                  ? FontWeight.normal
                                  : FontWeight.bold,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Short notification body text (e.g. incident details or
                              // resource assignment update). Capped at 2 lines to keep
                              // the list compact; full text accessible after tapping.
                              Text(notif.message,
                                  style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 12),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis),
                              // Relative timestamp shown only when createdAt is available.
                              // timeago converts ISO-8601 to e.g. "5 minutes ago".
                              if (notif.createdAt != null)
                                Text(
                                  timeago.format(
                                      DateTime.parse(notif.createdAt!)),
                                  style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11),
                                ),
                            ],
                          ),
                          // Small filled circle badge on the right edge to visually
                          // indicate an unread notification at a glance.
                          trailing: !notif.isRead
                              ? Container(
                                  width: 8,
                                  height: 8,
                                  // Circular shape styled with the DMS primary colour.
                                  decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle),
                                )
                              // No trailing widget needed for already-read notifications.
                              : null,
                          // Tapping an unread notification marks it as read on the
                          // DMS backend via the notifier, clearing the unread badge.
                          onTap: () {
                            if (!notif.isRead) {
                              ref
                                  .read(notificationProvider.notifier)
                                  .markRead(notif.id);
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  /// Returns the accent [Color] associated with a given notification [type].
  ///
  /// Used to colour both the leading avatar background and the unread-dot badge
  /// so the user can instantly recognise the severity of a DMS notification:
  /// - ALERT  → primary red/neon  (urgent disaster or safety warning)
  /// - INFO   → info blue         (general system information)
  /// - SUCCESS→ success green     (e.g. incident resolved, resource delivered)
  /// - other  → warning orange    (fallback for unknown or custom types)
  Color _typeColor(String? type) {
    switch (type?.toUpperCase()) {
      // Critical DMS alerts such as newly reported incidents or escalations.
      case 'ALERT':
        return AppColors.primary;
      // Informational messages, e.g. scheduled maintenance or policy updates.
      case 'INFO':
        return AppColors.info;
      // Positive outcomes, e.g. "Incident #42 has been resolved".
      case 'SUCCESS':
        return AppColors.success;
      // Default/fallback for unrecognised or future notification types.
      default:
        return AppColors.warning;
    }
  }

  /// Returns the [IconData] symbol that best represents a notification [type].
  ///
  /// Displayed inside the leading [CircleAvatar] on each list tile so users
  /// can scan the notification type at a glance without reading the title.
  /// Mirrors the same type-to-visual mapping used in [_typeColor].
  IconData _typeIcon(String? type) {
    switch (type?.toUpperCase()) {
      // Warning triangle for urgent DMS disaster alerts.
      case 'ALERT':
        return Icons.warning_amber_outlined;
      // Info circle for general informational notifications.
      case 'INFO':
        return Icons.info_outline;
      // Checkmark circle for successful action confirmations.
      case 'SUCCESS':
        return Icons.check_circle_outline;
      // Generic bell icon for unknown or default notification types.
      default:
        return Icons.notifications_outlined;
    }
  }
}