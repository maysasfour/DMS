// ============================================================
// notification_provider.dart
//
// Riverpod state management layer for the DMS notification system.
// Manages the lifecycle of push/in-app notifications delivered to
// disaster responders and citizens — including incident alerts,
// resource updates, and system messages.
//
// Architecture:
//   NotificationState        — immutable snapshot of current UI state
//   NotificationNotifier     — StateNotifier that drives state transitions
//   notificationProvider     — global Riverpod provider consumed by widgets
//
// The notifier delegates all network/persistence work to
// NotificationRepository and exposes clean async actions that widgets
// can call (load, markRead, markAllRead, delete).
// ============================================================

// Riverpod: reactive state management framework used across the DMS Flutter app
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Data model representing a single DMS notification (incident alert, update, etc.)
import '../data/notification_model.dart';
// Repository abstraction that handles API calls to the DMS backend notification endpoints
import '../data/notification_repository.dart';

/// Immutable value object representing the complete notification UI state.
/// Widgets rebuild whenever a new [NotificationState] instance is emitted by
/// [NotificationNotifier], ensuring the notification list stays in sync with
/// the DMS backend.
class NotificationState {
  /// Ordered list of notifications fetched from the DMS backend.
  /// May contain incident alerts, resource-change notices, or admin broadcasts.
  final List<NotificationModel> notifications;

  /// True while an async operation (fetch, mark-read, etc.) is in flight;
  /// used by widgets to show a loading indicator.
  final bool isLoading;

  /// Non-null when the last async operation failed (e.g., network error
  /// reaching the DMS API). Displayed to the user as an error message.
  final String? error;

  /// Creates an immutable notification state snapshot.
  /// Defaults to an empty notification list with no loading or error state,
  /// which represents the initial state before any data is fetched.
  const NotificationState({
    this.notifications = const [],
    this.isLoading = false,
    this.error,
  });

  /// Returns a new [NotificationState] with only the specified fields replaced.
  /// All other fields are carried over from the current instance, preserving
  /// the rest of the notification UI state unchanged.
  NotificationState copyWith({
    List<NotificationModel>? notifications,
    bool? isLoading,
    String? error,
  }) => NotificationState(
    // Use the provided list or fall back to the existing notifications
    notifications: notifications ?? this.notifications,
    // Use the provided loading flag or keep the current one
    isLoading: isLoading ?? this.isLoading,
    // Always replace error (null clears a previous error message)
    error: error,
  );
}

/// Riverpod [StateNotifier] that manages notification state for the DMS app.
/// Provides async actions consumed by Flutter widgets to load notifications
/// from the backend, mark them as read, and delete them locally.
class NotificationNotifier extends StateNotifier<NotificationState> {
  /// Repository dependency — abstracts HTTP calls to the DMS notification API.
  final NotificationRepository _repo;

  /// Initializes the notifier with an empty/default [NotificationState].
  /// The [_repo] is injected by the Riverpod provider (see [notificationProvider]).
  NotificationNotifier(this._repo) : super(const NotificationState());

  /// Fetches all notifications for the current DMS user from the backend.
  /// Sets [isLoading] during the request and populates [notifications] on
  /// success, or sets [error] if the API call fails.
  Future<void> load() async {
    // Signal loading state so widgets can show a spinner
    state = state.copyWith(isLoading: true);
    try {
      // Retrieve notification list from the DMS backend via repository
      final list = await _repo.getNotifications();
      // Populate state with fetched notifications and clear loading flag
      state = state.copyWith(notifications: list, isLoading: false);
    } catch (e) {
      // On error, clear loading and store the error message for display
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Marks a single notification as read, both on the DMS backend and
  /// optimistically in local state, so the UI reflects the change immediately.
  /// [id] is the unique identifier of the notification to mark as read.
  Future<void> markRead(int id) async {
    // Persist the read status to the DMS backend
    await _repo.markRead(id);
    // Optimistically update local state: replace the matching notification
    // with a copy that has isRead = true, leaving all other fields intact
    state = state.copyWith(
      notifications: state.notifications
          .map((n) => n.id == id
              // Rebuild the matching notification with isRead flipped to true
              ? NotificationModel(
                  id: n.id, title: n.title, message: n.message,
                  type: n.type, isRead: true, createdAt: n.createdAt,
                  incidentId: n.incidentId)
              // All other notifications pass through unchanged
              : n)
          .toList(),
    );
  }

  /// Marks every notification in the current list as read on the DMS backend
  /// and updates local state in a single pass, clearing all unread badges.
  Future<void> markAllRead() async {
    // Persist the bulk read status to the DMS backend
    await _repo.markAllRead();
    // Rebuild every notification in state with isRead = true
    state = state.copyWith(
      notifications: state.notifications
          .map((n) => NotificationModel(
              id: n.id, title: n.title, message: n.message,
              type: n.type, isRead: true, createdAt: n.createdAt,
              incidentId: n.incidentId))
          .toList(),
    );
  }

  /// Removes a notification from local state by [id].
  /// Note: this is a local-only removal — no backend DELETE call is made,
  /// so the notification will reappear if [load] is called again.
  Future<void> delete(int id) async {
    // Filter out the notification with the matching id from the in-memory list
    state = state.copyWith(
      notifications: state.notifications.where((n) => n.id != id).toList(),
    );
  }
}

/// Global Riverpod provider that exposes [NotificationNotifier] and its
/// [NotificationState] to the entire DMS widget tree.
/// Widgets read this provider to display notification lists and badges;
/// they call methods on the notifier to trigger async actions.
/// The [notificationRepositoryProvider] is resolved from the Riverpod container,
/// keeping the notifier decoupled from concrete HTTP implementation details.
final notificationProvider =
    StateNotifierProvider<NotificationNotifier, NotificationState>(
  // Resolve the repository from the Riverpod container and inject it into the notifier
  (ref) => NotificationNotifier(ref.read(notificationRepositoryProvider)),
);