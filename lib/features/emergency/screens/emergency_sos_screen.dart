// ============================================================
// emergency_sos_screen.dart
//
// Emergency SOS Screen for the Disaster Management System (DMS)
// mobile application.
//
// This screen provides citizens with an immediate, one-tap SOS
// interface during disaster or emergency situations. Key features:
//   - A large, pulsing SOS button that initiates a 5-second
//     countdown before dialing emergency services (e.g. 911),
//     giving the user a chance to cancel an accidental press.
//   - Quick-dial buttons for Police, Ambulance, Fire, and
//     Civil Defense services with their respective numbers.
//   - GPS-based location acquisition and one-tap sharing via
//     SMS or the system share sheet, so responders receive
//     precise coordinates without the victim needing to type.
//   - Pre-composed quick SMS templates for medical, fire, and
//     security emergencies, sent directly to 911.
//   - A contextual safety-tips panel with actionable guidance
//     (stay calm, share location, evacuate, save battery) that
//     is displayed below the action area.
//
// The screen is fully localised via AppStrings / the `t()` helper
// and respects the app's dark/light theme through AppColors tokens.
// ============================================================

// Async timer support — used for the SOS countdown mechanism.
import 'dart:async';

// Core Flutter UI toolkit.
import 'package:flutter/material.dart';

// Declarative animation helpers — drives fade-in, slide, and
// scale entry animations on each card/button as they appear.
import 'package:flutter_animate/flutter_animate.dart';

// State management: ConsumerStatefulWidget gives this screen
// access to Riverpod providers (locale, theme, user session, etc.).
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Device GPS access — used to fetch the victim's coordinates
// so they can be shared with emergency responders.
import 'package:geolocator/geolocator.dart';

// System share sheet — lets the user broadcast their location
// link to contacts or messaging apps with a single tap.
import 'package:share_plus/share_plus.dart' show Share;

// Deep-link / phone-call and SMS URL launcher — opens the
// native dialer and SMS composer without leaving the app.
import 'package:url_launcher/url_launcher.dart';

// DMS design-system colour tokens (primary alert red, secondary
// cyan accent, dark background, border colours, etc.).
import '../../../core/constants/app_colors.dart';

// Centralised localisation helper — `t(context, ref, key)`
// resolves translated strings for the current locale.
import '../../../core/l10n/app_strings.dart';

/// The primary SOS screen widget.
///
/// Declared as a [ConsumerStatefulWidget] so it can both hold
/// mutable animation/timer state AND read Riverpod providers
/// (e.g. locale) through the inherited [WidgetRef].
class EmergencySOSScreen extends ConsumerStatefulWidget {
  const EmergencySOSScreen({super.key});

  @override
  ConsumerState<EmergencySOSScreen> createState() => _EmergencySOSScreenState();
}

/// Private state class for [EmergencySOSScreen].
///
/// Mixes in [SingleTickerProviderStateMixin] to supply the vsync
/// ticker required by [AnimationController] for the pulse animation.
class _EmergencySOSScreenState extends ConsumerState<EmergencySOSScreen>
    with SingleTickerProviderStateMixin {

  /// Drives the continuous pulsing glow effect on the SOS button.
  /// Repeats with reverse so the glow breathes in and out.
  late AnimationController _pulseCtrl;

  /// True while an async GPS fix is in progress — shows a loading
  /// indicator inside the location card.
  bool _locating = false;

  /// Human-readable coordinates string once a GPS fix is obtained,
  /// e.g. "21.38512, 39.85742". Null until the user requests location.
  String? _locationText;

  /// Remaining seconds in the SOS auto-dial countdown (0 = idle).
  /// Counts down from 5 and triggers [_call] when it reaches 0.
  int _sosCountdown = 0;

  /// Periodic timer that decrements [_sosCountdown] every second.
  /// Cancelled either when the countdown reaches 0 or the user taps Cancel.
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    // Initialise the pulse animation controller with a 1.2-second cycle,
    // then start it immediately in a looping reverse-repeat pattern
    // to create a continuous breathing glow on the SOS button.
    _pulseCtrl = AnimationController(
      vsync: this, // Provided by SingleTickerProviderStateMixin.
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true); // Pulse in → out → in continuously.
  }

  @override
  void dispose() {
    // Release the animation controller to avoid memory leaks
    // when the screen is popped off the navigation stack.
    _pulseCtrl.dispose();
    // Cancel any active countdown timer so it does not fire after
    // the widget is disposed (which would cause setState on an
    // unmounted widget).
    _countdownTimer?.cancel();
    super.dispose();
  }

  /// Launches the native phone dialer for [number].
  ///
  /// Uses a `tel:` URI scheme which Android and iOS both handle.
  /// No-ops silently if the platform cannot launch the URI
  /// (e.g. an emulator without telephony support).
  Future<void> _call(String number) async {
    final uri = Uri.parse('tel:$number'); // Build a tel: deep-link URI.
    if (await canLaunchUrl(uri)) await launchUrl(uri); // Open dialer only if supported.
  }

  /// Opens the native SMS composer pre-filled with [number] and [body].
  ///
  /// The message body is URL-encoded so special characters (spaces,
  /// emoji, coordinates) survive the SMS URI encoding rules.
  /// Useful for sending a pre-composed emergency message without
  /// the victim having to type anything under stress.
  Future<void> _sendSMS(String number, String body) async {
    // Build an sms: URI with the recipient number and encoded body.
    final uri = Uri.parse('sms:$number?body=${Uri.encodeComponent(body)}');
    if (await canLaunchUrl(uri)) await launchUrl(uri); // Open SMS app only if available.
  }

  /// Acquires the device's current GPS position and stores it as
  /// a latitude/longitude string in [_locationText].
  ///
  /// Handles the full Geolocator permission lifecycle:
  ///   1. Checks whether location services are enabled at the OS level.
  ///   2. Requests runtime permission if not yet granted.
  ///   3. Falls back gracefully with a user-visible error message
  ///      if services are disabled or permission is permanently denied.
  Future<void> _getLocation() async {
    // Show a loading indicator in the location card while fetching.
    setState(() => _locating = true);
    try {
      // Step 1: Verify the device's location service (GPS/Network) is on.
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // Inform the user that they need to enable location services
        // in device settings — we cannot proceed without them.
        setState(() { _locating = false; _locationText = 'Location services disabled'; });
        return;
      }

      // Step 2: Check the current runtime permission status.
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        // Permission not yet granted — trigger the system permission dialog.
        perm = await Geolocator.requestPermission();
      }

      // Step 3: If the user has permanently denied location access,
      // show an error and abort — we cannot re-prompt in this state.
      if (perm == LocationPermission.deniedForever) {
        setState(() { _locating = false; _locationText = 'Location permission denied'; });
        return;
      }

      // Step 4: All clear — request a high-accuracy GPS fix.
      // High accuracy uses GPS hardware for the best possible precision,
      // which is critical when guiding first responders to a victim.
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Store coordinates formatted to 5 decimal places (~1 m accuracy).
      setState(() {
        _locationText = '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
        _locating = false; // Hide the loading indicator.
      });
    } catch (e) {
      // Any unexpected GPS error (timeout, hardware failure, etc.)
      // — surface a generic message so the UI stays responsive.
      setState(() { _locating = false; _locationText = 'Could not get location'; });
    }
  }

  /// Shares the victim's current GPS location via the system share sheet.
  ///
  /// If location has not been fetched yet, it triggers [_getLocation]
  /// first. The shared text includes a Google Maps deep-link so
  /// recipients can open the pin directly in a mapping app.
  /// Only proceeds if a valid (non-error) location string is available.
  Future<void> _shareLocation() async {
    // Auto-fetch location if not yet obtained.
    if (_locationText == null) await _getLocation();
    // Guard: only share if we have real coordinates, not an error message.
    if (_locationText != null && !_locationText!.contains('denied') && !_locationText!.contains('disabled')) {
      // Share an SOS message with a Google Maps URL embedding the coordinates.
      await Share.share('🆘 EMERGENCY — My location: https://maps.google.com/?q=$_locationText');
    }
  }

  /// Starts the 5-second countdown before auto-dialling [number].
  ///
  /// The countdown gives the user a chance to cancel if the SOS
  /// button was pressed accidentally — a critical UX safety net
  /// that avoids nuisance calls to emergency services.
  void _startSOSCountdown(String number) {
    setState(() => _sosCountdown = 5); // Initialise countdown display to 5.
    _countdownTimer?.cancel(); // Cancel any previously running countdown.
    // Decrement the counter every second; call when it reaches zero.
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() => _sosCountdown--); // Update the UI counter each tick.
      if (_sosCountdown <= 0) {
        t.cancel(); // Stop the timer once the countdown is complete.
        _call(number); // Automatically dial the emergency number.
      }
    });
  }

  /// Cancels an in-progress SOS countdown.
  ///
  /// Called when the user taps the Cancel button, preventing an
  /// accidental or test press from placing a real emergency call.
  void _cancelCountdown() {
    _countdownTimer?.cancel(); // Stop the periodic timer immediately.
    setState(() => _sosCountdown = 0); // Reset the display to idle state.
  }

  @override
  Widget build(BuildContext context) {
    // Determine whether the current app theme is dark — used to
    // select the appropriate background colour token.
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Background colour: dark theme uses the design-system dark token;
    // light theme falls back to near-black for the emergency aesthetic.
    final bg = isDark ? AppColors.bgDark : const Color(0xFF0A0A0A);

    // Convenience alias for the localisation helper scoped to this
    // build context and Riverpod ref — keeps call sites concise.
    final tr = (String k) => t(context, ref, k);

    return Scaffold(
      backgroundColor: bg, // Apply the contextual background to the screen.
      appBar: AppBar(
        backgroundColor: bg, // Match the app bar background to the screen.
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(), // Navigate back to caller.
        ),
        // Localised screen title (e.g. "SOS / EMERGENCY") rendered
        // in bold caps with letter spacing for a high-alert visual tone.
        title: Text(tr('sos_title'),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 2)),
        centerTitle: true,
        actions: [
          // "Skip" button allows users to dismiss the SOS screen
          // without triggering any action — useful after accidental navigation.
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(tr('skip'), style: const TextStyle(color: AppColors.secondary, fontSize: 12)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        // Allow the content to scroll on smaller screens so every
        // section (SOS button, contacts, location, tips) is reachable.
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // -- Warning Banner ------------------------------------------
            // Prominently reminds the user that pressing the SOS button
            // contacts real emergency services, deterring misuse.
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                // Translucent primary-red background reinforces urgency.
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                // Subtle red border to frame the warning visually.
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
              ),
              child: Row(
                children: [
                  // Warning icon — amber to distinguish from the full-red SOS button.
                  const Icon(Icons.warning_amber_rounded, color: AppColors.primary, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      tr('sos_sub'), // Localised warning subtitle text.
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms), // Fade in the banner on screen entry.

            const SizedBox(height: 28),

            // -- SOS Button / Countdown Display --------------------------
            // When a countdown is active, replace the SOS button with
            // the countdown widget; otherwise show the tappable SOS button.
            if (_sosCountdown > 0)
              // Show a circular progress indicator counting down to auto-dial,
              // plus a Cancel button to abort the call if pressed by mistake.
              _CountdownCancel(
                countdown: _sosCountdown,
                label: '${tr('sos_calling')} $_sosCountdown...',
                cancelLabel: tr('sos_cancel'),
                onCancel: _cancelCountdown,
              )
            else
              // The main pulsing SOS button — tapping starts the 5-second
              // countdown before dialling emergency services (911).
              _PulsingSOSButton(
                pulseCtrl: _pulseCtrl, // Pass the controller so the button animates.
                label: tr('sos_press'), // Localised call-to-action label.
                onTap: () => _startSOSCountdown('911'), // Begin countdown for 911.
              ).animate().scale(delay: 200.ms), // Scale-in animation on first render.

            const SizedBox(height: 32),

            // -- Emergency Contacts Section ------------------------------
            // A row of colour-coded quick-dial buttons for the four main
            // emergency services, each with its national number.
            _SectionTitle(tr('emergency_contacts')),
            const SizedBox(height: 12),
            _EmergencyCallRow(
              calls: [
                // Police — blue icon, 911.
                _ECall(tr('police'), '911', Icons.local_police, const Color(0xFF3B82F6)),
                // Ambulance / Medical — primary red, 110.
                _ECall(tr('ambulance'), '110', Icons.emergency, AppColors.primary),
                // Fire Department — orange icon, 193.
                _ECall(tr('fire'), '193', Icons.local_fire_department, const Color(0xFFFF7A00)),
                // Civil Defence — secondary cyan, 199.
                _ECall('Civil Def', '199', Icons.security, AppColors.secondary),
              ],
              onCall: _call, // Delegate the actual dialling to the state method.
            ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

            const SizedBox(height: 24),

            // -- Location Sharing Section --------------------------------
            // Shows the user's coordinates once fetched and provides
            // buttons to share via the system sheet or send a pre-written
            // SMS to 911 with a Google Maps link.
            _SectionTitle(tr('my_location')),
            const SizedBox(height: 12),
            _LocationCard(
              locationText: _locationText, // Current coordinates or null.
              locating: _locating, // Whether a GPS fix is in progress.
              shareLabel: tr('share'),
              smsLabel: 'SMS 999',
              gettingLabel: tr('getting_location'),
              tapLabel: tr('tap_location'), // Placeholder shown before fetch.
              onGetLocation: _getLocation, // Tap the GPS icon to fetch.
              onShare: _shareLocation,     // Share via share sheet.
              onSMS: () {
                // Build a structured SOS SMS including coordinates and a
                // clickable map link — critical when the victim cannot speak.
                final loc = _locationText ?? 'Unknown location';
                _sendSMS('911', '🆘 EMERGENCY! I need help. Location: $loc Map: https://maps.google.com/?q=$loc');
              },
            ).animate().fadeIn(delay: 400.ms, duration: 400.ms),

            const SizedBox(height: 24),

            // -- Quick SOS Messages Section ------------------------------
            // Pre-composed SMS templates covering the three most common
            // disaster scenarios: medical emergency, fire, and security.
            // The victim taps "Send" to open the SMS composer pre-filled,
            // removing the need to type under stress or in poor conditions.
            _SectionTitle(tr('quick_sos')),
            const SizedBox(height: 12),
            // Medical emergency quick message tile.
            _QuickMessageTile(
              label: tr('sos_msg_1'),
              text: tr('sos_msg_1'), // Localised SMS body text.
              icon: Icons.medical_services,
              color: AppColors.primary, // Red — denotes medical urgency.
              sendLabel: tr('send'),
              onSend: () => _sendSMS('911', tr('sos_msg_1')), // Send directly to 911.
            ).animate().slideX(begin: 0.1, delay: 400.ms), // Slide in from right.

            // Fire emergency quick message tile.
            _QuickMessageTile(
              label: tr('sos_msg_2'),
              text: tr('sos_msg_2'),
              icon: Icons.local_fire_department,
              color: const Color(0xFFFF7A00), // Orange — fire/heat connotation.
              sendLabel: tr('send'),
              onSend: () => _sendSMS('911', tr('sos_msg_2')),
            ).animate().slideX(begin: 0.1, delay: 480.ms), // Slightly delayed slide-in.

            // Security/police emergency quick message tile.
            _QuickMessageTile(
              label: tr('sos_msg_3'),
              text: tr('sos_msg_3'),
              icon: Icons.local_police,
              color: const Color(0xFF3B82F6), // Blue — police/security connotation.
              sendLabel: tr('send'),
              onSend: () => _sendSMS('911', tr('sos_msg_3')),
            ).animate().slideX(begin: 0.1, delay: 560.ms), // Last tile slides in last.

            const SizedBox(height: 24),

            // -- Safety Tips Section -------------------------------------
            // Actionable, emoji-headed guidance displayed at the bottom
            // of the screen to coach citizens on best-practice emergency
            // behaviour while they wait for help to arrive.
            _SectionTitle(tr('safety_tips_title')),
            const SizedBox(height: 12),
            // Tip 1: Stay calm — panic impairs decision-making.
            _SafetyTip(emoji: '🧘', title: tr('tip_calm'), body: tr('tip_calm_body')),
            // Tip 2: Share your location — helps responders find you.
            _SafetyTip(emoji: '📍', title: tr('tip_location'), body: tr('tip_location_body')),
            // Tip 3: Evacuate if safe to do so — leave danger zones.
            _SafetyTip(emoji: '🏃', title: tr('tip_evacuate'), body: tr('tip_evacuate_body')),
            // Tip 4: Conserve battery — keep the phone available for calls.
            _SafetyTip(emoji: '📱', title: tr('tip_battery'), body: tr('tip_battery_body')),
            const SizedBox(height: 32), // Bottom breathing room.
          ],
        ),
      ),
    );
  }
}

/// A large, pulsing circular SOS button.
///
/// The glow radius and opacity are animated by [pulseCtrl] to create
/// a breathing effect that draws the eye and communicates urgency.
/// Tapping the button triggers [onTap] (starts the SOS countdown).
class _PulsingSOSButton extends StatelessWidget {
  /// Animation controller driving the glow pulse — provided by the parent state.
  final AnimationController pulseCtrl;

  /// Callback invoked when the button is tapped (starts countdown).
  final VoidCallback onTap;

  /// Localised label shown below the SOS icon (e.g. "PRESS FOR SOS").
  final String label;

  const _PulsingSOSButton({required this.pulseCtrl, required this.onTap, required this.label});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap, // Trigger the SOS countdown on tap.
      child: AnimatedBuilder(
        animation: pulseCtrl, // Rebuild the glow shadow on every animation frame.
        builder: (_, child) => Container(
          width: 160,
          height: 160,
          decoration: BoxDecoration(
            shape: BoxShape.circle, // Circular shape for the glow container.
            boxShadow: [
              BoxShadow(
                // Alpha and blur radius both scale with the controller value,
                // producing the breathing glow effect (dim → bright → dim).
                color: AppColors.primary.withValues(alpha: 0.2 + 0.3 * pulseCtrl.value),
                blurRadius: 30 + 20 * pulseCtrl.value,   // Glow size varies 30–50.
                spreadRadius: 5 + 10 * pulseCtrl.value,  // Spread varies 5–15.
              ),
            ],
          ),
          child: child, // The inner button content is rebuilt less frequently.
        ),
        // The static inner button content — only rebuilt when necessary,
        // not on every animation frame, for efficiency.
        child: Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            // Radial gradient from bright emergency-red at centre to dark red
            // at the edge, giving the button a 3-D pressable appearance.
            gradient: const RadialGradient(
              colors: [Color(0xFFFF2050), Color(0xFFAA0020)],
            ),
            // Solid red border reinforces the emergency colour coding.
            border: Border.all(color: AppColors.primary, width: 3),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Large SOS icon — universally recognised emergency symbol.
              const Icon(Icons.sos, color: Colors.white, size: 52),
              // Localised label below the icon (e.g. "PRESS FOR EMERGENCY").
              Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}

/// Displays the auto-dial countdown and a Cancel button.
///
/// Shown instead of [_PulsingSOSButton] while [_sosCountdown] > 0.
/// A circular progress indicator visualises the remaining time,
/// and the cancel button aborts the countdown to prevent an
/// accidental emergency call from connecting.
class _CountdownCancel extends StatelessWidget {
  /// Remaining seconds before auto-dial fires (counts from 5 → 0).
  final int countdown;

  /// Localised text shown below the countdown circle (e.g. "Calling 911 in 3...").
  final String label;

  /// Localised label for the cancel button (e.g. "Cancel").
  final String cancelLabel;

  /// Callback invoked when the user taps Cancel to abort the countdown.
  final VoidCallback onCancel;

  const _CountdownCancel({required this.countdown, required this.label, required this.cancelLabel, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center, // Overlay the digit on the progress ring.
          children: [
            SizedBox(
              width: 160, height: 160,
              child: CircularProgressIndicator(
                // Progress fraction: starts at 1.0 (full) and drains to 0
                // as the countdown decrements from 5 → 0.
                value: countdown / 5,
                strokeWidth: 6,
                color: AppColors.primary, // Red ring to reinforce urgency.
                // Dimmed track behind the progress arc.
                backgroundColor: AppColors.primary.withValues(alpha: 0.2),
              ),
            ),
            // Large countdown digit rendered over the progress ring.
            Text(
              '$countdown',
              style: const TextStyle(color: AppColors.primary, fontSize: 56, fontWeight: FontWeight.w900),
            ),
          ],
        ),
        const SizedBox(height: 8),
        // Secondary label explaining what will happen when the counter hits 0.
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)),
        const SizedBox(height: 16),
        // Outlined cancel button — white border on dark background keeps it
        // visible but visually subordinate to the countdown itself.
        OutlinedButton.icon(
          onPressed: onCancel, // Abort the countdown and reset to idle.
          icon: const Icon(Icons.close, color: Colors.white),
          label: Text(cancelLabel, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white54)),
        ),
      ],
    );
  }
}

/// A horizontal row of quick-dial tiles for the primary emergency services.
///
/// Each tile displays a service icon, name, and phone number. Tapping
/// a tile immediately invokes [onCall] with the service's number,
/// launching the native dialler without a countdown.
class _EmergencyCallRow extends StatelessWidget {
  /// The list of emergency call definitions (label, number, icon, colour).
  final List<_ECall> calls;

  /// Callback that receives the selected phone number and opens the dialler.
  final void Function(String) onCall;

  const _EmergencyCallRow({required this.calls, required this.onCall});

  @override
  Widget build(BuildContext context) {
    return Row(
      // Map each _ECall definition to an equal-width tappable tile.
      children: calls.map((c) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4), // Spacing between tiles.
          child: GestureDetector(
            onTap: () => onCall(c.number), // Immediately dial on tap (no countdown).
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                // Each service uses its own accent colour at low opacity
                // so the tiles are visually distinct (blue=police, red=ambulance, etc.).
                color: c.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: c.color.withValues(alpha: 0.4)),
              ),
              child: Column(
                children: [
                  // Service-specific icon in the service accent colour.
                  Icon(c.icon, color: c.color, size: 26),
                  const SizedBox(height: 6),
                  // Service name (e.g. "Police", "Ambulance").
                  Text(c.label, style: TextStyle(color: c.color, fontSize: 11, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
                  // Phone number shown in muted white below the label.
                  Text(c.number, style: const TextStyle(color: Colors.white60, fontSize: 10)),
                ],
              ),
            ),
          ),
        ),
      )).toList(),
    );
  }
}

/// Card that displays the user's GPS coordinates and provides
/// buttons to share the location or send it via SMS to 911.
///
/// While the GPS fix is in progress, shows a loading label.
/// After a successful fix, shows the latitude/longitude string
/// and enables the Share and SMS actions.
class _LocationCard extends StatelessWidget {
  /// Current coordinates string (e.g. "21.38512, 39.85742"), or
  /// a user-facing error string if location could not be obtained.
  final String? locationText;

  /// True while the GPS fix is being acquired — shows a progress label.
  final bool locating;

  /// Localised label for the share button (e.g. "Share").
  final String shareLabel;

  /// Label for the SMS button (e.g. "SMS 999").
  final String smsLabel;

  /// Localised text shown while GPS is acquiring (e.g. "Getting location...").
  final String gettingLabel;

  /// Placeholder text shown before the user requests a GPS fix.
  final String tapLabel;

  /// Triggered when the user taps the GPS refresh icon to fetch location.
  final VoidCallback onGetLocation;

  /// Triggered when the user taps the Share button — opens system share sheet.
  final VoidCallback onShare;

  /// Triggered when the user taps the SMS button — opens pre-filled SMS composer.
  final VoidCallback onSMS;

  const _LocationCard({
    required this.locationText, required this.locating,
    required this.shareLabel, required this.smsLabel,
    required this.gettingLabel, required this.tapLabel,
    required this.onGetLocation, required this.onShare, required this.onSMS,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        // Deep-dark card background for contrast on the near-black screen.
        color: const Color(0xFF0D1117),
        borderRadius: BorderRadius.circular(14),
        // Secondary cyan border links visually to the DMS map/location theme.
        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Location icon badge — teal background consistent with map UI.
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.location_on, color: AppColors.secondary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Show loading label while GPS fix is in progress;
                    // otherwise show coordinates (bright white) or the
                    // placeholder prompt (muted white) if not yet fetched.
                    if (locating)
                      Text(gettingLabel, style: const TextStyle(color: AppColors.secondary, fontSize: 13))
                    else
                      Text(
                        locationText ?? tapLabel, // Fall back to placeholder if null.
                        style: TextStyle(
                          // Bright white for real coordinates; muted for placeholder.
                          color: locationText != null ? Colors.white : Colors.white38,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                  ],
                ),
              ),
              // GPS refresh icon — only visible when not actively locating,
              // so the user can manually trigger a new fix if needed.
              if (!locating)
                IconButton(
                  onPressed: onGetLocation, // Request a fresh GPS fix.
                  icon: const Icon(Icons.my_location, color: AppColors.secondary),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Action row: Share (outlined) and SMS (filled) side-by-side.
          Row(
            children: [
              // Share button — outlined style, secondary cyan to indicate
              // a non-destructive sharing action.
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onShare,
                  icon: const Icon(Icons.share, size: 16, color: AppColors.secondary),
                  label: Text(shareLabel, style: const TextStyle(color: AppColors.secondary, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.secondary.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // SMS button — filled red (primary) to communicate urgency;
              // sends a pre-built emergency SMS with the coordinates.
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onSMS,
                  icon: const Icon(Icons.sms, size: 16),
                  label: Text(smsLabel, style: const TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary, // Red — urgency / action.
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A single quick-message tile that displays a pre-written SOS text
/// and a Send button that opens the native SMS composer.
///
/// Covers scenario-specific emergencies (medical, fire, security)
/// so the user can dispatch a structured alert without typing.
class _QuickMessageTile extends StatelessWidget {
  /// Short display label shown inside the tile (same as SMS text in this screen).
  final String label;

  /// The full SMS body text (localised) that will be pre-filled in the composer.
  final String text;

  /// Localised label for the send button (e.g. "Send").
  final String sendLabel;

  /// Scenario icon (e.g. medical cross, flame, police badge).
  final IconData icon;

  /// Accent colour matching the emergency type (red, orange, blue).
  final Color color;

  /// Callback that opens the SMS composer with the pre-written message.
  final VoidCallback onSend;

  const _QuickMessageTile({required this.label, required this.text, required this.sendLabel, required this.icon, required this.color, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8), // Space between consecutive tiles.
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117), // Dark card background.
        borderRadius: BorderRadius.circular(10),
        // Accent-coloured border subtly indicates the emergency category.
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: ListTile(
        // Category icon in the scenario accent colour.
        leading: Icon(icon, color: color, size: 22),
        // Message label truncated to two lines to keep tiles compact.
        title: Text(label, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis),
        // Tappable Send badge on the right — styled with the accent colour.
        trailing: GestureDetector(
          onTap: onSend, // Open SMS composer pre-filled with this message.
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15), // Lightly tinted background.
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: color.withValues(alpha: 0.4)),
            ),
            child: Text(sendLabel, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      ),
    );
  }
}

/// A single safety-tip card displayed in the tips section.
///
/// Each tip combines an emoji, a short title, and an explanatory body
/// to guide citizens on safe behaviour during a disaster event
/// (e.g. conserving battery, sharing location, staying calm).
class _SafetyTip extends StatelessWidget {
  /// Emoji icon that visually identifies the tip at a glance.
  final String emoji;

  /// Short tip headline (e.g. "Stay Calm").
  final String title;

  /// Longer explanation of the tip (e.g. "Panic makes it harder to think clearly...").
  final String body;

  const _SafetyTip({required this.emoji, required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8), // Vertical spacing between tips.
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117), // Dark card background.
        borderRadius: BorderRadius.circular(10),
        // Neutral border using the design-system border token.
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          // Emoji at a readable size — acts as a quick visual anchor.
          Text(emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tip headline in white for legibility on dark background.
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                // Descriptive body in muted white — secondary importance.
                Text(body, style: const TextStyle(color: Colors.white54, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A labelled section divider used throughout the SOS screen.
///
/// Renders a small all-caps heading followed by a faint horizontal rule,
/// visually grouping related widgets (contacts, location, tips, etc.)
/// without heavy visual weight so the urgent content stays prominent.
class _SectionTitle extends StatelessWidget {
  /// The localised section heading text (e.g. "EMERGENCY CONTACTS").
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const SizedBox(width: 2), // Minor left inset to align with card content.
        // All-caps spaced label — small font keeps it subordinate to content.
        Text(title, style: const TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w700)),
        const SizedBox(width: 8),
        // Faint divider line that stretches to fill remaining row width.
        Expanded(child: Divider(color: Colors.white.withValues(alpha: 0.08))),
      ],
    );
  }
}

/// Immutable data class that describes a single emergency quick-dial entry.
///
/// Used by [_EmergencyCallRow] to render a colour-coded tile for each
/// emergency service (Police, Ambulance, Fire, Civil Defence).
class _ECall {
  /// Display name of the emergency service (e.g. "Police", "Fire").
  final String label;

  /// Phone number to dial when the tile is tapped (e.g. "911", "193").
  final String number;

  /// Icon representing the service category (e.g. [Icons.local_police]).
  final IconData icon;

  /// Accent colour used for the icon, label, and tile border —
  /// chosen to match universal emergency colour conventions
  /// (blue = police, red = ambulance, orange = fire, cyan = civil defence).
  final Color color;

  const _ECall(this.label, this.number, this.icon, this.color);
}