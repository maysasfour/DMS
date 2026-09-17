/// ============================================================================
/// sos_watch_screen.dart
///
/// SOS Watch integration screen for the Disaster Management System (DMS).
///
/// This screen allows field responders and citizens to pair a Bluetooth SOS
/// wearable device (e.g., an emergency smartwatch) with the DMS mobile app.
/// Once connected, the watch streams real-time vitals (heart rate, battery)
/// and provides a one-tap emergency SOS signal that notifies DMS responders.
///
/// The Bluetooth connection is simulated via [WatchNotifier] using timers and
/// random data to mimic real BLE device behavior during development/testing.
///
/// Key capabilities:
///   - Bluetooth scanning and device pairing
///   - Live heart rate and battery monitoring
///   - Long-press SOS trigger that activates an emergency alert
///   - Timestamped activity log for audit/traceability
///   - Theme-aware UI (dark/light mode via [AppColors])
/// ============================================================================

// Async utilities for Timer-based Bluetooth simulation
import 'dart:async';
// Random number generation for simulated BLE sensor data
import 'dart:math';
// Core Flutter UI framework
import 'package:flutter/material.dart';
// Riverpod state management — used to expose [WatchNotifier] across the widget tree
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Google Fonts for branded Rajdhani typography consistent with DMS design system
import 'package:google_fonts/google_fonts.dart';
// DMS shared colour palette (neon cyberpunk theme, supports dark/light modes)
import '../../../core/constants/app_colors.dart';

// ── Bluetooth Watch State ─────────────────────────────────────────────────────

/// Represents the four lifecycle states of a paired SOS watch in the DMS system.
///
/// - [disconnected]: No watch is paired; the user must initiate a scan.
/// - [scanning]: The app is actively searching for nearby Bluetooth devices.
/// - [connected]: A watch has been found and paired; vitals are streaming.
/// - [alert]: The user has triggered an SOS — emergency responders are notified.
enum WatchStatus { disconnected, scanning, connected, alert }

/// Immutable value object holding all observable data from a connected SOS watch.
///
/// Follows the copyWith pattern so [WatchNotifier] can emit granular updates
/// without mutating shared state, keeping Riverpod reactive.
class WatchState {
  /// Current connection lifecycle phase of the watch
  final WatchStatus status;

  /// Watch battery percentage (0–100); null when not yet connected
  final int? battery;

  /// Latest heart rate reading as a formatted string (e.g. "72 bpm"); null when not connected
  final String? heartRate;

  /// Bluetooth device name discovered during scan (e.g. "DMS-Watch Pro")
  final String? deviceName;

  /// Timestamp of the most recent heartbeat update; used to display "Last seen" in the UI
  final DateTime? lastSeen;

  /// Chronological log of Bluetooth events (connections, vitals, SOS triggers).
  /// Capped at 20 entries by [WatchNotifier._startHeartbeat] to prevent memory growth.
  final List<String> logs;

  /// Constructs a [WatchState] with sensible defaults for a fresh, unconnected session.
  const WatchState({
    this.status = WatchStatus.disconnected,
    this.battery,
    this.heartRate,
    this.deviceName,
    this.lastSeen,
    this.logs = const [],
  });

  /// Returns a new [WatchState] with only the specified fields changed.
  /// All unspecified fields fall back to the current instance's values.
  WatchState copyWith({
    WatchStatus? status, int? battery, String? heartRate,
    String? deviceName, DateTime? lastSeen, List<String>? logs,
  }) => WatchState(
    status: status ?? this.status,
    battery: battery ?? this.battery,
    heartRate: heartRate ?? this.heartRate,
    deviceName: deviceName ?? this.deviceName,
    lastSeen: lastSeen ?? this.lastSeen,
    logs: logs ?? this.logs,
  );
}

/// Riverpod [StateNotifier] that manages the full BLE watch lifecycle for the DMS.
///
/// Simulates Bluetooth scanning, device pairing, periodic vitals streaming,
/// graceful disconnection, and SOS alarm activation. In a production DMS build,
/// these methods would delegate to a real BLE plugin (e.g., flutter_blue_plus).
class WatchNotifier extends StateNotifier<WatchState> {
  /// Initialises with a disconnected, empty [WatchState]
  WatchNotifier() : super(const WatchState());

  /// Periodic timer that fires every 5 seconds to push simulated heart rate and battery updates
  Timer? _heartbeatTimer;

  /// One-shot timer that simulates a 3-second BLE scan before "discovering" a device
  Timer? _scanTimer;

  /// Random number generator used to produce realistic-looking sensor variance
  final _rng = Random();

  /// Initiates a Bluetooth scan for nearby DMS-compatible SOS watch devices.
  ///
  /// Sets the status to [WatchStatus.scanning] and appends a log entry,
  /// then schedules [_onFound] after a simulated 3-second discovery delay.
  void startScan() {
    state = state.copyWith(status: WatchStatus.scanning, logs: [
      ...state.logs, '[${_now()}] Starting Bluetooth scan...'
    ]);
    // Simulate BLE discovery delay; replace with real BLE scan callback in production
    _scanTimer = Timer(const Duration(seconds: 3), _onFound);
  }

  /// Simulates a successful Bluetooth device discovery and completes pairing.
  ///
  /// Randomly selects a device name from a predefined pool of DMS-branded watch models,
  /// seeds initial vitals, and begins continuous [_startHeartbeat] polling.
  void _onFound() {
    // Pool of fictional DMS-compatible watch brand names shown in the UI during pairing
    final names = ['DMS-Watch Pro', 'SafeGuard BT', 'EmergencyLink S3', 'LifeAlert Band'];
    // Pick a random device name to simulate discovering one of several nearby watches
    final name  = names[_rng.nextInt(names.length)];
    state = state.copyWith(
      status: WatchStatus.connected,
      deviceName: name,
      // Seed battery between 72–96% to represent a reasonably charged emergency device
      battery: 72 + _rng.nextInt(25),
      // Seed resting heart rate between 62–91 bpm as an initial vital reading
      heartRate: '${62 + _rng.nextInt(30)} bpm',
      lastSeen: DateTime.now(),
      logs: [...state.logs, '[${_now()}] Connected to $name', '[${_now()}] Pairing complete ✓'],
    );
    // Begin streaming periodic vitals now that the device is paired
    _startHeartbeat();
  }

  /// Starts a periodic timer that emits simulated heart rate and battery updates every 5 seconds.
  ///
  /// Cancels any existing timer first to avoid duplicate streams.
  /// Caps the activity log at 20 entries to prevent unbounded memory usage.
  void _startHeartbeat() {
    // Cancel any stale heartbeat timer before creating a new one
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      // Stop emitting if the watch has been disconnected mid-cycle
      if (state.status != WatchStatus.connected) return;
      // Simulate a new heart rate reading in a realistic resting-to-active range
      final hr = 60 + _rng.nextInt(40);
      // Gradually drain battery by 0–1% per cycle to mimic real BLE power consumption
      final bat = (state.battery ?? 100) - _rng.nextInt(2);
      final newLogs = [...state.logs, '[${_now()}] HR: $hr bpm • Battery: $bat%'];
      // Trim log to the most recent 20 entries to bound memory usage
      if (newLogs.length > 20) newLogs.removeRange(0, newLogs.length - 20);
      state = state.copyWith(
        heartRate: '$hr bpm',
        // Clamp battery to [0, 100] to prevent nonsensical negative or overflow values
        battery: bat.clamp(0, 100),
        lastSeen: DateTime.now(),
        logs: newLogs,
      );
    });
  }

  /// Disconnects the SOS watch, cancels all timers, and resets state to defaults.
  ///
  /// Called when the user taps "Disconnect" or when the SOS alert is cancelled.
  void disconnect() {
    // Stop vitals streaming and any pending scan
    _heartbeatTimer?.cancel();
    _scanTimer?.cancel();
    // Reset to a clean disconnected state, preserving the log history for audit purposes
    state = WatchState(logs: [
      ...state.logs, '[${_now()}] Disconnected from ${state.deviceName ?? "device"}'
    ]);
  }

  /// Escalates the watch status to [WatchStatus.alert] to signal an active SOS emergency.
  ///
  /// In production, this would also dispatch an incident alert to the DMS backend,
  /// notifying available responders with the user's GPS location.
  void triggerSOS() {
    state = state.copyWith(
      status: WatchStatus.alert,
      // Append a prominent SOS event marker to the audit log
      logs: [...state.logs, '[${_now()}] ⚠️ SOS TRIGGERED FROM WATCH!'],
    );
  }

  /// Formats the current time as HH:MM:SS for activity log entries.
  ///
  /// Zero-pads hours, minutes, and seconds for consistent monospace log alignment.
  String _now() {
    final t = DateTime.now();
    return '${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}:${t.second.toString().padLeft(2,'0')}';
  }

  /// Cleans up timers when this notifier is removed from the Riverpod container.
  ///
  /// Prevents memory leaks and ghost timer callbacks if the screen is popped.
  @override
  void dispose() {
    // Cancel periodic vitals streaming timer
    _heartbeatTimer?.cancel();
    // Cancel any in-flight scan timer
    _scanTimer?.cancel();
    super.dispose();
  }
}

/// Global Riverpod provider exposing [WatchNotifier] and its [WatchState].
///
/// Any widget in the DMS app can read watch vitals or dispatch watch commands
/// (scan, disconnect, triggerSOS) by reading this provider.
final watchProvider = StateNotifierProvider<WatchNotifier, WatchState>(
  (ref) => WatchNotifier(),
);

// ── SOS Watch Screen ──────────────────────────────────────────────────────────

/// Root screen widget for the SOS Watch feature of the DMS mobile app.
///
/// Provides the full Bluetooth watch management experience in a single scrollable
/// layout: device status, live vitals, connection controls, SOS trigger, and
/// an audit activity log. Uses [ConsumerWidget] to reactively rebuild on
/// [WatchState] changes emitted by [WatchNotifier].
class SOSWatchScreen extends ConsumerWidget {
  const SOSWatchScreen({super.key});

  /// Builds the SOS Watch screen layout.
  ///
  /// [watch] is the current reactive state from [watchProvider].
  /// [isDark] drives theme-aware colour choices throughout child widgets.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Subscribe to the global watch state so the entire screen rebuilds on updates
    final watch  = ref.watch(watchProvider);
    // Detect active theme to apply DMS dark/light colour tokens
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      // Respect the app-wide scaffold background (dark or light)
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Match AppBar background to scaffold for a seamless header appearance
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // "SOS WATCH" title uses Rajdhani — the DMS brand font for alert/status headings
        title: Text('SOS WATCH', style: GoogleFonts.rajdhani(
          fontWeight: FontWeight.w800, letterSpacing: 2, fontSize: 18,
          color: isDark ? AppColors.textPrimary : AppColors.textLight)),
        centerTitle: true,
        // Thin bottom border provides visual separation without a full shadow
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: isDark ? AppColors.border : AppColors.borderLight),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

          // ── Watch Status Card ──────────────────────────────────────────
          // Shows the watch icon, device name, connection status badge, and last-seen time
          _WatchStatusCard(watch: watch, isDark: isDark),
          const SizedBox(height: 16),

          // ── Vitals Row (only when connected) ──────────────────────────
          // Only rendered when the watch is actively streaming or has an SOS active
          if (watch.status == WatchStatus.connected || watch.status == WatchStatus.alert)
            _VitalsRow(watch: watch, isDark: isDark),
          // Spacing below the vitals row when it is visible
          if (watch.status == WatchStatus.connected || watch.status == WatchStatus.alert)
            const SizedBox(height: 16),

          // ── Action Buttons ─────────────────────────────────────────────
          // Renders "Scan & Connect" when disconnected, "Disconnect" when paired
          _ActionButtons(watch: watch, ref: ref, isDark: isDark),
          const SizedBox(height: 16),

          // ── SOS Trigger (only when connected) ─────────────────────────
          // Emergency hold-button; only visible when a watch is successfully paired
          if (watch.status == WatchStatus.connected)
            _SOSTrigger(ref: ref, isDark: isDark),
          // Spacing below the SOS trigger when visible
          if (watch.status == WatchStatus.connected)
            const SizedBox(height: 16),

          // ── Alert Banner ───────────────────────────────────────────────
          // Prominent warning banner shown while an SOS alert is active
          if (watch.status == WatchStatus.alert)
            _AlertBanner(ref: ref, isDark: isDark),
          // Spacing below the alert banner when visible
          if (watch.status == WatchStatus.alert)
            const SizedBox(height: 16),

          // ── Activity Log ───────────────────────────────────────────────
          // Timestamped list of all Bluetooth and SOS events for traceability
          _ActivityLog(logs: watch.logs, isDark: isDark),
          const SizedBox(height: 32),
        ]),
      ),
    );
  }
}

// ── Watch Status Card ─────────────────────────────────────────────────────────

/// Card widget that displays the central watch icon, device name, and connection
/// status badge. The border and glow colour dynamically reflect the current
/// [WatchStatus] so responders can gauge connectivity at a glance.
class _WatchStatusCard extends StatelessWidget {
  /// Current watch state used to drive icon appearance and status text
  final WatchState watch;

  /// Whether the app is in dark mode; governs card and text colours
  final bool isDark;
  const _WatchStatusCard({required this.watch, required this.isDark});

  /// Returns a semantic colour for the current connection status.
  ///
  /// Green = healthy connection, yellow = scanning in progress,
  /// red/primary = SOS alert active, grey = no device connected.
  Color get _statusColor {
    switch (watch.status) {
      case WatchStatus.connected: return AppColors.success;   // Green — paired and streaming
      case WatchStatus.scanning:  return AppColors.warning;   // Yellow — actively searching
      case WatchStatus.alert:     return AppColors.primary;   // Red — SOS is live
      default:                    return AppColors.textSecondary; // Grey — no device
    }
  }

  /// Returns the human-readable label for the current [WatchStatus].
  ///
  /// Displayed inside the status badge chip below the watch icon.
  String get _statusText {
    switch (watch.status) {
      case WatchStatus.connected: return 'CONNECTED';
      case WatchStatus.scanning:  return 'SCANNING...';
      case WatchStatus.alert:     return 'SOS ACTIVE';
      default:                    return 'NOT CONNECTED';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        // Card background adapts to dark/light theme
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        // Border hue matches the status colour to signal urgency level visually
        border: Border.all(color: _statusColor.withValues(alpha: 0.4), width: 1.5),
        // Soft glow effect reinforces the DMS neon cyberpunk aesthetic
        boxShadow: [BoxShadow(color: _statusColor.withValues(alpha: 0.1), blurRadius: 16)],
      ),
      child: Column(children: [
        // Watch icon container — circular frame with status-coloured tint
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _statusColor.withValues(alpha: 0.1),
            border: Border.all(color: _statusColor.withValues(alpha: 0.4), width: 2),
          ),
          child: Stack(alignment: Alignment.center, children: [
            // Primary watch outline icon; colour reflects connection state
            Icon(Icons.watch_outlined, color: _statusColor, size: 40),
            // Spinner overlay shown only while Bluetooth scan is in progress
            if (watch.status == WatchStatus.scanning)
              SizedBox(width: 76, height: 76,
                child: CircularProgressIndicator(color: _statusColor, strokeWidth: 2)),
            // Red dot badge in the top-right corner signals an active SOS alert
            if (watch.status == WatchStatus.alert)
              Positioned(top: 6, right: 6, child: Container(
                width: 14, height: 14,
                decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle,
                  // White ring helps the dot stand out against the icon background
                  border: Border.all(color: Colors.white, width: 1.5)),
              )),
          ]),
        ),
        const SizedBox(height: 12),
        // Show the paired device's Bluetooth name once connected
        if (watch.deviceName != null)
          Text(watch.deviceName!, style: TextStyle(
            color: isDark ? AppColors.textPrimary : AppColors.textLight,
            fontWeight: FontWeight.w700, fontSize: 16)),
        // Placeholder name shown before any device has been discovered
        if (watch.deviceName == null)
          Text('DMS SOS Watch', style: TextStyle(
            color: isDark ? AppColors.textSecondary : AppColors.textMuted, fontSize: 16)),
        const SizedBox(height: 6),
        // Pill-shaped status badge — colour-coded to match [_statusColor]
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: _statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _statusColor.withValues(alpha: 0.4)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            // Small coloured dot acting as a live-status indicator light
            Container(width: 6, height: 6, decoration: BoxDecoration(color: _statusColor, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            // Status label in Rajdhani for visual consistency with DMS alert typography
            Text(_statusText, style: GoogleFonts.rajdhani(
              color: _statusColor, fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 1.5)),
          ]),
        ),
        // "Last seen" timestamp — only shown once the watch has sent at least one heartbeat
        if (watch.lastSeen != null) ...[
          const SizedBox(height: 8),
          Text('Last seen: ${_formatTime(watch.lastSeen!)}',
            style: TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted, fontSize: 11)),
        ],
      ]),
    );
  }

  /// Formats a [DateTime] as HH:MM for compact "Last seen" display in the status card.
  String _formatTime(DateTime t) =>
    '${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}';
}

// ── Vitals Row ────────────────────────────────────────────────────────────────

/// Horizontal row of three vital-sign cards: Battery, Heart Rate, and Signal.
///
/// Only rendered when the watch is in [WatchStatus.connected] or [WatchStatus.alert]
/// state. Provides at-a-glance health indicators relevant to DMS field responders.
class _VitalsRow extends StatelessWidget {
  /// Current watch state used to populate live battery and heart rate values
  final WatchState watch;

  /// Theme flag for dark/light colour selection within each vital card
  final bool isDark;
  const _VitalsRow({required this.watch, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      // Battery card — colour shifts from green to yellow to red as charge depletes
      Expanded(child: _VitalCard(
        icon: Icons.battery_charging_full,
        label: 'BATTERY',
        value: '${watch.battery ?? '--'}%',
        // Dynamic colour signals urgency: green >50%, yellow >20%, red <=20%
        color: _batteryColor(watch.battery),
        isDark: isDark,
      )),
      const SizedBox(width: 12),
      // Heart rate card — always displayed in the DMS primary/alert colour for visibility
      Expanded(child: _VitalCard(
        icon: Icons.favorite,
        label: 'HEART RATE',
        value: watch.heartRate ?? '-- bpm',
        color: AppColors.primary,
        isDark: isDark,
      )),
      const SizedBox(width: 12),
      // Signal strength card — always "Strong" in the simulation; real BLE would show RSSI
      Expanded(child: _VitalCard(
        icon: Icons.bluetooth_connected,
        label: 'SIGNAL',
        value: 'Strong',
        color: AppColors.success,
        isDark: isDark,
      )),
    ]);
  }

  /// Returns a colour reflecting battery urgency level.
  ///
  /// - null: grey (no data)
  /// - >50%: green (healthy)
  /// - >20%: yellow (warning — consider charging before a field mission)
  /// - <=20%: red (critical — SOS reliability at risk)
  Color _batteryColor(int? b) {
    if (b == null) return AppColors.textSecondary; // No reading yet
    if (b > 50) return AppColors.success;           // Safe charge level
    if (b > 20) return AppColors.warning;           // Low battery warning
    return AppColors.primary;                        // Critical — may drop SOS signal
  }
}

/// A single vital-sign display card used within [_VitalsRow].
///
/// Shows a labelled icon and value (e.g. battery %, heart rate, signal strength)
/// with a colour-coded border that matches the metric's urgency or type.
class _VitalCard extends StatelessWidget {
  /// Icon representing the vital metric (battery, heart, Bluetooth signal)
  final IconData icon;

  /// Short uppercase label displayed below the value (e.g. "BATTERY")
  final String label;

  /// Formatted value string to display (e.g. "85%", "72 bpm", "Strong")
  final String value;

  /// Accent colour applied to the icon, value text, and card border
  final Color color;

  /// Theme flag controlling card background and label text colours
  final bool isDark;
  const _VitalCard({required this.icon, required this.label, required this.value, required this.color, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
    decoration: BoxDecoration(
      // Card background matches the overall DMS card surface colour
      color: isDark ? AppColors.cardDark : Colors.white,
      borderRadius: BorderRadius.circular(12),
      // Subtle coloured border ties the card to its metric's urgency colour
      border: Border.all(color: color.withValues(alpha: 0.3)),
    ),
    child: Column(children: [
      // Metric icon (battery/heart/bluetooth) in the metric's accent colour
      Icon(icon, color: color, size: 22),
      const SizedBox(height: 6),
      // Numeric or textual value in bold, coloured to match the metric type
      Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
      const SizedBox(height: 2),
      // Micro-label in muted secondary text for compact card layout
      Text(label, style: TextStyle(
        color: isDark ? AppColors.textSecondary : AppColors.textMuted,
        fontSize: 9, letterSpacing: 1)),
    ]),
  );
}

// ── Action Buttons ────────────────────────────────────────────────────────────

/// Full-width action button row that switches between "Scan & Connect" and
/// "Disconnect" depending on the current [WatchState].
///
/// Disabled while a scan is in progress to prevent duplicate BLE operations.
class _ActionButtons extends StatelessWidget {
  /// Current watch state used to determine which action label and style to render
  final WatchState watch;

  /// Riverpod ref used to dispatch commands to [WatchNotifier]
  final WidgetRef ref;

  /// Theme flag for button colour differentiation
  final bool isDark;
  const _ActionButtons({required this.watch, required this.ref, required this.isDark});

  @override
  Widget build(BuildContext context) {
    // True when the watch is paired (normal or SOS-active state)
    final isConnected = watch.status == WatchStatus.connected || watch.status == WatchStatus.alert;
    return Row(children: [
      Expanded(child: SizedBox(
        height: 48,
        child: ElevatedButton.icon(
          // Disable taps during scan; dispatch connect or disconnect based on state
          onPressed: watch.status == WatchStatus.scanning ? null
            : isConnected ? () => ref.read(watchProvider.notifier).disconnect()
            : () => ref.read(watchProvider.notifier).startScan(),
          style: ElevatedButton.styleFrom(
            // Muted style when connected (destructive "disconnect" action); filled when scan-ready
            backgroundColor: isConnected ? AppColors.textSecondary.withValues(alpha: 0.15) : AppColors.secondary,
            foregroundColor: isConnected ? AppColors.textSecondary : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            // Subtle border on the disconnect variant to distinguish it from a primary CTA
            side: isConnected ? const BorderSide(color: AppColors.border) : BorderSide.none,
          ),
          // Icon switches between "searching" and "disabled" Bluetooth glyphs
          icon: Icon(isConnected ? Icons.bluetooth_disabled : Icons.bluetooth_searching,
            size: 18,
            color: isConnected ? AppColors.textSecondary : Colors.white),
          // Label reflects the exact current action available to the user
          label: Text(
            watch.status == WatchStatus.scanning ? 'Scanning...'
              : isConnected ? 'Disconnect' : 'Scan & Connect',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      )),
    ]);
  }
}

// ── SOS Trigger Button ────────────────────────────────────────────────────────

/// Large circular emergency SOS button that activates on a long-press gesture.
///
/// Requires a deliberate 2-second hold to prevent accidental activation —
/// critical in a DMS context where a false SOS alert wastes responder resources.
/// Dispatches [WatchNotifier.triggerSOS] on confirmed press.
class _SOSTrigger extends StatelessWidget {
  /// Riverpod ref used to call [WatchNotifier.triggerSOS]
  final WidgetRef ref;

  /// Theme flag for instruction text colour
  final bool isDark;
  const _SOSTrigger({required this.ref, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      // Subtle red-tinted background frames the emergency action area
      color: AppColors.primary.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
    ),
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      // "EMERGENCY" section label in Rajdhani for DMS brand consistency
      Text('EMERGENCY', style: GoogleFonts.rajdhani(
        color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 2)),
      const SizedBox(height: 10),
      // Long-press gesture required to avoid accidental SOS triggers
      GestureDetector(
        // Fires [triggerSOS] only after the user holds the button for ~2 seconds
        onLongPress: () => ref.read(watchProvider.notifier).triggerSOS(),
        child: Container(
          width: 96, height: 96,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primary,
            // Radial glow emphasises urgency and matches the DMS neon cyberpunk aesthetic
            boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.4), blurRadius: 20, spreadRadius: 4)],
          ),
          child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            // Material SOS icon — universally recognised emergency symbol
            Icon(Icons.sos, color: Colors.white, size: 36),
            SizedBox(height: 2),
            // "HOLD" micro-label reminds the user of the long-press requirement
            Text('HOLD', style: TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.w600, letterSpacing: 1)),
          ]),
        ),
      ),
      const SizedBox(height: 10),
      // Instructional caption explaining the hold gesture to first-time users
      Text('Hold 2 seconds to trigger emergency SOS',
        textAlign: TextAlign.center,
        style: TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted, fontSize: 11)),
    ]),
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────

/// Full-width alert banner displayed when the watch is in [WatchStatus.alert].
///
/// Informs the user that an SOS has been dispatched and DMS responders have been
/// notified. Provides a "Cancel SOS" button that calls [WatchNotifier.disconnect]
/// to abort the emergency signal and reset the watch state.
class _AlertBanner extends StatelessWidget {
  /// Riverpod ref used to dispatch the cancel/disconnect action
  final WidgetRef ref;

  /// Theme flag (reserved for future theme-sensitive styling in this widget)
  final bool isDark;
  const _AlertBanner({required this.ref, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      // Strong red-tinted background with a solid border to convey urgency
      color: AppColors.primary.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.primary, width: 1.5),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Alert header row: warning icon + "SOS ALERT ACTIVE" label
      const Row(children: [
        // Warning icon reinforces the critical nature of the active SOS
        Icon(Icons.warning_amber_rounded, color: AppColors.primary, size: 20),
        SizedBox(width: 8),
        // Bold status label visible at a glance in high-stress emergency situations
        Text('SOS ALERT ACTIVE', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 14, letterSpacing: 1)),
      ]),
      const SizedBox(height: 8),
      // Calm reassurance message — keeps the user informed without adding panic
      const Text('Emergency signal sent. Responders are being notified. Stay calm.',
        style: TextStyle(color: Colors.white70, fontSize: 12)),
      const SizedBox(height: 12),
      // "Cancel SOS" button — disconnects the watch and resets the alert state
      OutlinedButton(
        // Cancelling SOS re-uses disconnect to fully reset state; avoids a partial alert state
        onPressed: () => ref.read(watchProvider.notifier).disconnect(),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.primary),
          foregroundColor: AppColors.primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        child: const Text('CANCEL SOS', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    ]),
  );
}

// ── Activity Log ──────────────────────────────────────────────────────────────

/// Scrollable activity log showing a reverse-chronological list of Bluetooth
/// and SOS events captured by [WatchNotifier].
///
/// Each entry is timestamped (HH:MM:SS) and colour-coded:
///   - Red/primary: SOS trigger events (⚠️ prefix)
///   - Green/success: Successful pairing events (✓ suffix)
///   - Secondary/muted: Routine vitals and connection updates
///
/// This log supports incident traceability — DMS operators can review when
/// an SOS was triggered and what vitals preceded the emergency.
class _ActivityLog extends StatelessWidget {
  /// Ordered list of log entry strings emitted by [WatchNotifier]
  final List<String> logs;

  /// Theme flag controlling card background and default log text colours
  final bool isDark;
  const _ActivityLog({required this.logs, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      // Consistent card surface colour with other DMS cards
      color: isDark ? AppColors.cardDark : Colors.white,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: isDark ? AppColors.border : AppColors.borderLight),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Section header in Rajdhani micro-caps — DMS log/terminal aesthetic
      Text('ACTIVITY LOG', style: GoogleFonts.rajdhani(
        color: isDark ? AppColors.textSecondary : AppColors.textMuted,
        fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w700)),
      const SizedBox(height: 10),
      // Empty state placeholder shown before the first Bluetooth action
      if (logs.isEmpty)
        Text('No activity yet. Connect your SOS watch to begin.',
          style: TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted, fontSize: 12))
      else
        // Reverse the list so the most recent event appears at the top
        ...logs.reversed.map((log) => Padding(
          padding: const EdgeInsets.only(bottom: 5),
          child: Text(log, style: TextStyle(
            // Colour-code entries: red for SOS events, green for success, muted for routine
            color: log.contains('⚠️') ? AppColors.primary   // SOS trigger — highest urgency
              : log.contains('✓') ? AppColors.success        // Successful pairing — positive event
              : (isDark ? AppColors.textSecondary : AppColors.textMuted), // Routine heartbeat data
            // Monospace font ensures timestamps and vitals align consistently across entries
            fontSize: 11, fontFamily: 'monospace')),
        )),
    ]),
  );
}