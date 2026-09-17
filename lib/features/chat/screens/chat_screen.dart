// =============================================================================
// chat_screen.dart
//
// Emergency Coordination Chat Screen for the Disaster Management System (DMS).
//
// This file implements a real-time-style group messaging interface used by
// field officers, response teams, and system administrators to coordinate
// during active disaster incidents. It provides a scrollable message list,
// a text input bar, and a send button — all styled with the DMS neon cyberpunk
// design system. Messages are managed in local Riverpod state (no persistent
// backend in this version) and displayed as chat bubbles differentiated by
// sender identity (current user vs. other responders or system alerts).
// =============================================================================

// Flutter material UI framework — provides Scaffold, AppBar, ListView, etc.
import 'package:flutter/material.dart';
// Riverpod state management — used to hold and mutate the live message list
import 'package:flutter_riverpod/flutter_riverpod.dart';
// DMS brand colors: primary accent, card backgrounds, text hierarchy colors
import '../../../core/constants/app_colors.dart';
// Auth provider — supplies the currently authenticated user's name for outgoing messages
import '../../auth/providers/auth_provider.dart';
// Localization helper — provides translated strings for UI labels (e.g., channel title, hints)
import '../../../core/l10n/app_strings.dart';

/// Represents a single message in the emergency coordination chat channel.
///
/// Used to encapsulate all display data for one chat bubble, including
/// who sent it (a responder, team, or the system), the message body,
/// the timestamp, and whether it originated from the current user.
class ChatMessage {
  /// Display name of the sender — e.g., "Alpha Team", "System", or the logged-in officer's name.
  final String sender;

  /// The body text of the coordination message or system alert.
  final String text;

  /// The timestamp when the message was sent, used to display HH:mm in the bubble.
  final DateTime time;

  /// True if this message was sent by the currently authenticated user;
  /// controls right-vs-left alignment and bubble color in the UI.
  final bool isMe;

  /// Constructs a [ChatMessage] with all required display fields.
  ChatMessage({
    required this.sender,
    required this.text,
    required this.time,
    required this.isMe,
  });
}

/// Riverpod [StateProvider] holding the live list of [ChatMessage] objects
/// for the emergency coordination channel.
///
/// Pre-seeded with two initial messages to simulate an active channel:
/// a system welcome notice and a standby report from Alpha Team.
/// In production, this would be backed by a WebSocket or polling service
/// connected to the DMS backend.
final _chatMessagesProvider = StateProvider<List<ChatMessage>>((ref) => [
      // System-generated welcome message pinned to the channel on join
      ChatMessage(
        sender: 'System',
        // Instructs all responders to keep comms on-topic for active incidents
        text: 'Welcome to the Emergency Coordination Channel. Please keep messages relevant to active incidents.',
        // Simulated 30-minute-old timestamp to indicate prior activity
        time: DateTime.now().subtract(const Duration(minutes: 30)),
        // Not sent by the current user — renders on the left as an inbound message
        isMe: false,
      ),
      // Simulated status report from Alpha Team indicating readiness
      ChatMessage(
        sender: 'Alpha Team',
        text: 'Team Alpha on standby. Awaiting deployment orders.',
        // Simulated 15-minute-old timestamp, more recent than the system message
        time: DateTime.now().subtract(const Duration(minutes: 15)),
        // Inbound message from another responder — left-aligned bubble
        isMe: false,
      ),
    ]);

/// The main chat screen widget for the DMS emergency coordination channel.
///
/// Extends [ConsumerStatefulWidget] to read and write Riverpod providers
/// (message list and auth state) while maintaining local controller state.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  // Creates the mutable state object that manages controllers and scroll behavior
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

/// Private state class for [ChatScreen].
///
/// Manages the text input controller, scroll position, and message dispatch
/// logic for the emergency coordination chat interface.
class _ChatScreenState extends ConsumerState<ChatScreen> {
  // Controls the message composition TextField; cleared after each send
  final _controller = TextEditingController();

  // Drives programmatic scrolling to keep the latest message visible after send
  final _scrollController = ScrollController();

  /// Sends the currently typed message to the coordination channel.
  ///
  /// Reads the authenticated user's name from [authProvider] to label the
  /// outgoing bubble, appends the new [ChatMessage] to the Riverpod state,
  /// clears the input field, and smoothly scrolls to the bottom of the list
  /// so the latest coordination update is immediately visible.
  void _sendMessage() {
    // Strip leading/trailing whitespace to avoid sending blank messages
    final text = _controller.text.trim();
    // Guard: do nothing if the user submitted an empty or whitespace-only string
    if (text.isEmpty) return;

    // Retrieve the currently authenticated DMS user to label the outgoing message
    final user = ref.read(authProvider).user;

    // Build the outgoing ChatMessage; fallback sender name is 'Me' if user is null
    final msg = ChatMessage(
      sender: user?.name ?? 'Me',
      text: text,
      // Stamp the message with the current wall-clock time for the HH:mm display
      time: DateTime.now(),
      // Mark as sent by the current user — renders as a right-aligned primary-colored bubble
      isMe: true,
    );

    // Append the new message to the immutable list via Riverpod state update
    ref.read(_chatMessagesProvider.notifier).update((msgs) => [...msgs, msg]);

    // Clear the composition field so the user can type the next coordination update
    _controller.clear();

    // Defer scrolling until after the new bubble has been laid out in the widget tree
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Only scroll if the ListView is currently attached to a scroll position
      if (_scrollController.hasClients) {
        // Animate to the very bottom so the just-sent message is fully visible
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          // Short animation keeps the UX snappy during active incident coordination
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  /// Releases the text and scroll controllers when the screen is removed from
  /// the widget tree to prevent memory leaks during navigation.
  @override
  void dispose() {
    // Dispose the TextField controller to free its listener registrations
    _controller.dispose();
    // Dispose the scroll controller to release its position listener
    _scrollController.dispose();
    super.dispose();
  }

  /// Builds the full chat screen layout: AppBar with channel identity and
  /// live status badge, a scrollable message list, and a bottom input bar.
  @override
  Widget build(BuildContext context) {
    // Reactively read the current list of coordination messages from Riverpod
    final messages = ref.watch(_chatMessagesProvider);

    return Scaffold(
      // Use the theme's scaffold color so the screen adapts to light/dark mode
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Match AppBar background to scaffold for a seamless full-bleed look
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // DMS primary text color for back arrow and icon tints
        foregroundColor: AppColors.textPrimary,
        // Two-line title: channel name + subtitle label for context
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Primary title: localized "Emergency Channel" label
            Text(t(context, ref, 'emergency_channel')),
            // Subtitle clarifies this is coordination chat, not a personal DM
            Text(t(context, ref, 'coord_chat'),
                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
        actions: [
          // "Live" badge indicates the channel is active — would reflect real-time
          // connection status in a production WebSocket implementation
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              // Subtle green tint background for the live status pill
              color: AppColors.success.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                // Small filled circle acts as an online/active indicator dot
                Icon(Icons.circle, size: 8, color: AppColors.success),
                SizedBox(width: 4),
                // "Live" label confirms the channel is actively monitored
                Text('Live', style: TextStyle(color: AppColors.success, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Message list takes all available vertical space above the input bar
          Expanded(
            child: messages.isEmpty
                // Empty state: shown when no coordination messages exist yet
                ? Center(
                    child: Text(t(context, ref, 'no_messages'),
                        style: const TextStyle(color: AppColors.textSecondary)))
                // Render each ChatMessage as a positioned bubble via _MessageBubble
                : ListView.builder(
                    // Attach scroll controller so _sendMessage can auto-scroll
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    // Build a bubble widget for each coordination message
                    itemBuilder: (_, i) => _MessageBubble(msg: messages[i]),
                  ),
          ),
          // Bottom input bar: dark card background separates it from the message list
          Container(
            color: AppColors.cardDark,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            // SafeArea prevents the input bar from being obscured by device home indicators
            child: SafeArea(
              child: Row(
                children: [
                  // Text field expands to fill the row, leaving room for the send button
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      // Ensure typed text is readable against the dark fill color
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        // Localized placeholder prompts responders to type their update
                        hintText: t(context, ref, 'type_message'),
                        hintStyle: const TextStyle(color: AppColors.textSecondary),
                        // Filled style gives the input a distinct inset container look
                        filled: true,
                        // Match scaffold background so the field recesses into the bar
                        fillColor: Theme.of(context).scaffoldBackgroundColor,
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        // Pill-shaped border with no visible border line for a clean look
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      // Allow keyboard "send" / "done" action to dispatch the message
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Circular send button — triggers _sendMessage on tap
                  GestureDetector(
                    onTap: _sendMessage,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        // DMS primary accent color makes the send button prominent
                        color: AppColors.primary,
                        // Perfect circle shape for the send action affordance
                        shape: BoxShape.circle,
                      ),
                      // Paper-plane send icon — universally recognized for message dispatch
                      child: const Icon(Icons.send, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Private widget that renders a single chat bubble for one [ChatMessage].
///
/// Handles both outgoing (current user, right-aligned, primary color) and
/// incoming (other responders/system, left-aligned, card color) layouts,
/// including sender avatar initials for inbound messages to help responders
/// quickly identify which team or officer sent a coordination update.
class _MessageBubble extends StatelessWidget {
  /// The coordination message data to display in this bubble.
  final ChatMessage msg;

  const _MessageBubble({required this.msg});

  /// Builds the bubble row: optional sender avatar on the left for inbound
  /// messages, and a flexible container with the message text and timestamp.
  @override
  Widget build(BuildContext context) {
    return Padding(
      // Bottom spacing separates consecutive bubbles for readability
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        // Outgoing messages align to the right; incoming messages to the left
        mainAxisAlignment:
            msg.isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        // Align avatar and bubble bottom edges for a natural chat appearance
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Only render the sender avatar for inbound messages (teams, system, other officers)
          if (!msg.isMe) ...[
            // Circle avatar showing the first letter of the sender's name/team
            CircleAvatar(
              radius: 16,
              // Subtle primary-tinted background for the avatar circle
              backgroundColor: AppColors.primary.withValues(alpha: 0.2),
              // First character of sender name (e.g., "A" for "Alpha Team")
              child: Text(msg.sender[0],
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold)),
            ),
            // Gap between avatar and bubble body
            const SizedBox(width: 8),
          ],
          // Flexible prevents the bubble from overflowing on long incident messages
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                // Outgoing: primary accent color; Incoming: dark card background
                color: msg.isMe ? AppColors.primary : AppColors.cardDark,
                // Asymmetric corner radius creates the classic chat bubble tail effect:
                // outgoing bubbles have a sharp bottom-right corner pointing right,
                // incoming bubbles have a sharp bottom-left corner pointing left.
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  // Outgoing: flat bottom-left, sharp bottom-right (tail on sender side)
                  bottomLeft: Radius.circular(msg.isMe ? 16 : 4),
                  // Incoming: sharp bottom-left (tail), flat bottom-right
                  bottomRight: Radius.circular(msg.isMe ? 4 : 16),
                ),
              ),
              child: Column(
                // Align text content to match the bubble's side (right for me, left for others)
                crossAxisAlignment: msg.isMe
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  // Sender name label — only shown for inbound messages so responders
                  // know which team or officer sent the coordination update
                  if (!msg.isMe)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(msg.sender,
                          style: TextStyle(
                              // Slightly transparent primary color for the name label
                              color: AppColors.primary.withValues(alpha: 0.9),
                              fontSize: 11,
                              fontWeight: FontWeight.bold)),
                    ),
                  // The actual coordination message or system alert text
                  Text(msg.text,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 14)),
                  // Spacing between message body and timestamp
                  const SizedBox(height: 4),
                  // HH:mm timestamp so responders can correlate messages with incident timelines
                  Text(
                    // Zero-pad hours and minutes for consistent two-digit display
                    '${msg.time.hour.toString().padLeft(2, '0')}:${msg.time.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(
                        // Outgoing: white at 70% opacity; Incoming: secondary text color
                        color: msg.isMe
                            ? Colors.white70
                            : AppColors.textSecondary,
                        fontSize: 10),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}