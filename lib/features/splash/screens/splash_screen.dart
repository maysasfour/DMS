// ============================================================
// splash_screen.dart
//
// Splash Screen for the Disaster Management System (DMS) mobile app.
// Displayed at app startup before routing to login or home.
//
// Responsibilities:
//   - Plays a cinematic boot sequence with animated concentric rings,
//     a pulsing crisis-alert logo, and a stepped progress bar that
//     mirrors real DMS initialization phases (connecting to servers,
//     loading emergency data, checking alert status, etc.).
//   - After the animation completes (~4.2 s), reads the current auth
//     state via [authProvider] and navigates to '/home' if the user
//     already has a valid session token, or '/login' otherwise.
//   - Purely presentational — contains no business logic beyond the
//     auth-based routing decision.
//
// Design: neon cyberpunk theme (deep-black background, red/cyan/purple
// accent rings) consistent with the DMS design system.
// ============================================================

// Dart math library — used by the particle painter for pseudo-random dot placement.
import 'dart:math' as math;

// Flutter material widgets and theming primitives.
import 'package:flutter/material.dart';

// Riverpod state management — ConsumerStatefulWidget lets us read
// providers (e.g. authProvider) inside a stateful widget.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// go_router navigation — context.go() performs declarative route pushes.
import 'package:go_router/go_router.dart';

// DMS brand color tokens (primary = red, secondary = cyan, warning = amber, success = green).
import '../../../core/constants/app_colors.dart';

// Auth state provider — exposes the JWT token so we know whether the
// responder / citizen is already authenticated.
import '../../../features/auth/providers/auth_provider.dart';

/// Top-level splash widget. Declared as [ConsumerStatefulWidget] so that
/// Riverpod's [ref] is accessible inside the corresponding State class,
/// allowing auth checks without additional context extensions.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  /// Creates the mutable state object that drives all animations and routing.
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

/// Private state class for [SplashScreen].
/// Mixes in [TickerProviderStateMixin] to supply vsync tickers for
/// multiple simultaneous [AnimationController]s.
class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {

  // ---------------------------------------------------------------------------
  // Animation controllers — one per independently timed animation track.
  // ---------------------------------------------------------------------------

  /// Controllers for the three concentric expanding alert rings.
  /// Each ring loops continuously to create a radar-pulse effect that
  /// evokes live signal detection — appropriate for an emergency system.
  late AnimationController _ring1, _ring2, _ring3;

  /// Controller for the center crisis-alert logo entrance (scale + fade).
  late AnimationController _logo;

  /// Controller for the bottom loading-progress bar that fills over 3.2 s.
  late AnimationController _bar;

  // ---------------------------------------------------------------------------
  // Derived animations — computed from the controllers above.
  // ---------------------------------------------------------------------------

  /// Scale animations that expand each ring from 30 % to 250 % of its base
  /// size, simulating an outward pressure wave from the epicenter.
  late Animation<double> _ring1Scale, _ring2Scale, _ring3Scale;

  /// Opacity animations that fade each ring to transparent as it expands,
  /// reinforcing the dissipating-wave metaphor.
  late Animation<double> _ring1Opacity, _ring2Opacity, _ring3Opacity;

  /// Logo entrance scale — bounces from 50 % to 100 % with an elastic curve
  /// for a satisfying "lock-in" feel once the DMS icon appears.
  late Animation<double> _logoScale;

  /// Logo entrance fade — transitions from fully transparent to fully opaque.
  late Animation<double> _logoFade;

  /// Progress bar fill — drives a [FractionallySizedBox] from 0 to 1 (0–100 %).
  late Animation<double> _barProgress;

  // ---------------------------------------------------------------------------
  // Loading step state
  // ---------------------------------------------------------------------------

  /// Index into [_steps] tracking which boot-phase label is currently shown.
  int _step = 0;

  /// Human-readable boot-phase labels shown beneath the progress bar.
  /// They mirror the real DMS startup sequence: connecting to the Spring Boot
  /// backend, fetching emergency incident data, and verifying server readiness.
  static const _steps = [
    'INITIALIZING SYSTEM',       // Phase 0: app framework booting
    'LOADING EMERGENCY DATA',    // Phase 1: incident/resource cache warm-up
    'CONNECTING TO SERVERS',     // Phase 2: establishing backend API connection
    'CHECKING ALERT STATUS',     // Phase 3: querying active disaster alerts
    'SYSTEM READY ✓',            // Phase 4: all systems go, about to navigate
  ];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /// Sets up all animation controllers, schedules staggered starts via
  /// [Future.delayed], and queues the post-animation navigation.
  @override
  void initState() {
    super.initState();

    // Three expanding ring animations staggered
    // Each ring loops with a 2-second period; they are started at different
    // offsets in [initState] to create a staggered radar-pulse effect.
    _ring1 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat();
    _ring2 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat();
    _ring3 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat();

    // Ring scale: expands outward using an ease-out curve so the pulse
    // accelerates quickly and then slows near the edge.
    _ring1Scale = Tween(begin: 0.3, end: 2.5).animate(CurvedAnimation(parent: _ring1, curve: Curves.easeOut));
    // Ring opacity: linear fade to zero so the ring disappears as it expands.
    _ring1Opacity = Tween(begin: 0.6, end: 0.0).animate(_ring1);

    // Ring 2 — colored amber (warning) to differentiate from ring 1.
    _ring2Scale = Tween(begin: 0.3, end: 2.5).animate(CurvedAnimation(parent: _ring2, curve: Curves.easeOut));
    _ring2Opacity = Tween(begin: 0.6, end: 0.0).animate(_ring2);

    // Ring 3 (outermost) — colored with the DMS secondary (cyan) accent.
    _ring3Scale = Tween(begin: 0.3, end: 2.5).animate(CurvedAnimation(parent: _ring3, curve: Curves.easeOut));
    _ring3Opacity = Tween(begin: 0.6, end: 0.0).animate(_ring3);

    // Logo controller: 600 ms one-shot entrance animation.
    _logo = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));

    // Elastic-out scale gives the icon a physical "pop" as it settles at full size.
    _logoScale = Tween(begin: 0.5, end: 1.0).animate(CurvedAnimation(parent: _logo, curve: Curves.elasticOut));

    // Simple ease-in fade ensures the icon doesn't appear abruptly.
    _logoFade  = Tween(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _logo, curve: Curves.easeIn));

    // Progress bar fills over 3.2 s with ease-in-out to feel deliberate,
    // not rushed — conveying that real DMS initialization work is happening.
    _bar = AnimationController(vsync: this, duration: const Duration(milliseconds: 3200));
    _barProgress = Tween(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _bar, curve: Curves.easeInOut));

    // Stagger ring starts
    // Ring 1 starts immediately; rings 2 and 3 are offset by 650 ms each
    // so the three pulses feel like successive outward waves, not one burst.
    Future.delayed(const Duration(milliseconds: 0),   () { if (mounted) _ring1.forward(); });
    Future.delayed(const Duration(milliseconds: 650),  () { if (mounted) _ring2.forward(); });
    Future.delayed(const Duration(milliseconds: 1300), () { if (mounted) _ring3.forward(); });

    // Logo fades in 200 ms after launch so it appears before the bar starts.
    Future.delayed(const Duration(milliseconds: 200),  () { if (mounted) _logo.forward(); });

    // Progress bar starts 400 ms in, after the logo is visibly present.
    Future.delayed(const Duration(milliseconds: 400),  () { if (mounted) _bar.forward(); });

    // Step ticker
    // Advance the boot-phase label every ~640 ms, spreading _steps[1..4]
    // evenly across the 3.2 s bar fill so text and bar stay in sync.
    for (int i = 1; i < _steps.length; i++) {
      Future.delayed(Duration(milliseconds: 600 + i * 640), () {
        // Guard with mounted check to prevent setState on a disposed widget.
        if (mounted) setState(() => _step = i);
      });
    }

    // Navigate after 4 seconds
    // After all steps finish, read the current auth state and navigate:
    // - '/home'  if a JWT token exists (user is already signed in)
    // - '/login' if no token (first launch or session expired)
    Future.delayed(const Duration(milliseconds: 4200), () {
      if (!mounted) return; // widget may have been removed from the tree
      final auth = ref.read(authProvider); // read auth state without rebuilding
      context.go(auth.token != null ? '/home' : '/login');
    });
  }

  /// Disposes all animation controllers to free GPU/ticker resources
  /// when the splash screen is removed from the widget tree.
  @override
  void dispose() {
    _ring1.dispose(); _ring2.dispose(); _ring3.dispose();
    _logo.dispose(); _bar.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  /// Builds the full-screen splash UI: background gradient, particle layer,
  /// animated logo with rings, app title, progress bar, and version footer.
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Deep near-black background matching the DMS neon-cyberpunk theme.
      backgroundColor: const Color(0xFF060A14),
      body: Stack(
        children: [
          // Background radial gradient
          // Subtle purple-tinted radial gradient centred slightly above the
          // mid-point creates depth and draws the eye to the logo.
          Positioned.fill(child: DecoratedBox(decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, -0.2), // slightly above center
              radius: 1.0,
              colors: [Color(0xFF1A0A1E), Color(0xFF060A14)], // purple core → deep black
            ),
          ))),

          // Particle dots
          // Scattered static white dots rendered via CustomPaint give the
          // background a starfield / radar-noise aesthetic without runtime cost
          // (shouldRepaint returns false — painted once, never redrawn).
          Positioned.fill(child: CustomPaint(painter: _ParticlePainter())),

          // Center content
          // Main visual column: pulsing rings + icon + app title text.
          Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              // Pulsing rings + icon
              // Fixed 200×200 bounding box so all rings and the icon share the
              // same center point; Stack alignment ensures perfect centering.
              SizedBox(
                width: 200, height: 200,
                child: Stack(alignment: Alignment.center, children: [

                  // Ring 3 (outermost)
                  // Uses AppColors.secondary (cyan) — the outermost ring starts
                  // last (1300 ms delay) so the wave travels visually outward.
                  AnimatedBuilder(animation: _ring3, builder: (_, __) => Transform.scale(
                    scale: _ring3Scale.value,
                    child: Opacity(opacity: _ring3Opacity.value.clamp(0.0, 1.0), // clamp prevents negative opacity errors
                      child: Container(
                        width: 100, height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          // Cyan border matches DMS secondary color for info/status signals.
                          border: Border.all(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                    ),
                  )),

                  // Ring 2
                  // Uses AppColors.warning (amber) — the middle ring, started at 650 ms.
                  AnimatedBuilder(animation: _ring2, builder: (_, __) => Transform.scale(
                    scale: _ring2Scale.value,
                    child: Opacity(opacity: _ring2Opacity.value.clamp(0.0, 1.0),
                      child: Container(
                        width: 100, height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          // Amber border conveys caution / active-alert state.
                          border: Border.all(color: AppColors.warning, width: 1.5),
                        ),
                      ),
                    ),
                  )),

                  // Ring 1 (innermost)
                  // Uses AppColors.secondary — starts immediately, closest to the icon.
                  AnimatedBuilder(animation: _ring1, builder: (_, __) => Transform.scale(
                    scale: _ring1Scale.value,
                    child: Opacity(opacity: _ring1Opacity.value.clamp(0.0, 1.0),
                      child: Container(
                        width: 100, height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          // Secondary color ring anchors the pulse to the logo center.
                          border: Border.all(color: AppColors.secondary, width: 1.5),
                        ),
                      ),
                    ),
                  )),

                  // Center icon
                  // The DMS crisis-alert icon — red radial gradient circle with a
                  // red glow shadow. Animates in with elastic scale + fade for impact.
                  AnimatedBuilder(animation: _logo, builder: (_, __) => Transform.scale(
                    scale: _logoScale.value, // bounces elastically to full size
                    child: Opacity(opacity: _logoFade.value, // fades in simultaneously
                      child: Container(
                        width: 90, height: 90,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          // Red radial gradient: bright center → deep crimson edge.
                          gradient: const RadialGradient(
                            colors: [Color(0xFFFF003C), Color(0xFF8B0020)],
                          ),
                          boxShadow: [
                            // Red glow spread simulates an active emergency beacon.
                            BoxShadow(color: AppColors.primary.withValues(alpha: 0.6), blurRadius: 30, spreadRadius: 5),
                          ],
                        ),
                        // Material crisis_alert icon — universally recognized symbol
                        // for emergency / disaster management contexts.
                        child: const Icon(Icons.crisis_alert, color: Colors.white, size: 44),
                      ),
                    ),
                  )),
                ]),
              ),

              const SizedBox(height: 32), // vertical gap between logo and title text

              // Title
              // Fades in together with the logo animation so text and icon
              // appear as a single cohesive unit.
              AnimatedBuilder(animation: _logo, builder: (_, __) => Opacity(
                opacity: _logoFade.value,
                child: Column(children: [
                  // Primary app name in bold wide-spaced capitals.
                  Text('DISASTER', style: TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 8, // wide tracking for an official/authority feel
                    // Subtle red text shadow reinforces the emergency color language.
                    shadows: [Shadow(color: AppColors.primary.withValues(alpha: 0.5), blurRadius: 20)],
                  )),
                  // Secondary subtitle in DMS cyan accent — "MANAGEMENT SYSTEM".
                  Text('MANAGEMENT SYSTEM', style: TextStyle(
                    color: AppColors.secondary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 5,
                    // Cyan glow echo maintains visual consistency with the ring pulses.
                    shadows: [Shadow(color: AppColors.secondary.withValues(alpha: 0.5), blurRadius: 12)],
                  )),
                  const SizedBox(height: 6), // small gap before the region label
                  // Region / deployment identifier for the Jordan Emergency Response Network.
                  // Low opacity so it reads as metadata, not primary branding.
                  Text('Emergency Response Network — Jordan', style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.35),
                    fontSize: 11,
                    letterSpacing: 1.5,
                  )),
                ]),
              )),
            ]),
          ),

          // Bottom loading section
          // Pinned to the bottom of the screen with 60 px clearance for the
          // version footer below. Contains the step label + progress bar.
          Positioned(
            left: 32, right: 32, bottom: 60,
            child: Column(children: [

              // Step text
              // [AnimatedSwitcher] crossfades between step labels (300 ms) as
              // _step advances, giving the feel of a real console boot sequence.
              // ValueKey(_step) forces a new child widget on each step change.
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: Text(
                  _steps[_step],
                  key: ValueKey(_step), // unique key per step to trigger the crossfade
                  style: TextStyle(
                    // Final "SYSTEM READY ✓" step turns green to signal success;
                    // all prior steps use a low-opacity white for a processing look.
                    color: _step == _steps.length - 1 ? AppColors.success : Colors.white.withValues(alpha: 0.55),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2,
                  ),
                ),
              ),

              const SizedBox(height: 12), // gap between label and bar

              // Progress bar
              // Two-layer Stack: a dim background track + an animated foreground
              // fill that grows with _barProgress (0 → 1 over 3.2 s).
              AnimatedBuilder(animation: _bar, builder: (_, __) => Stack(children: [

                // Background track — very faint white pill shape.
                Container(
                  height: 3,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1), // almost invisible track
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Foreground fill — gradient from DMS primary (red) to secondary (cyan),
                // growing horizontally as _barProgress increases.
                FractionallySizedBox(
                  widthFactor: _barProgress.value, // 0.0 → 1.0 drives the fill width
                  child: Container(
                    height: 3,
                    decoration: BoxDecoration(
                      // Red-to-cyan gradient mirrors the DMS brand color ramp.
                      gradient: const LinearGradient(colors: [AppColors.primary, AppColors.secondary]),
                      borderRadius: BorderRadius.circular(2),
                      // Cyan glow on the bar tip creates a "laser scan" effect.
                      boxShadow: [BoxShadow(color: AppColors.secondary.withValues(alpha: 0.5), blurRadius: 8)],
                    ),
                  ),
                ),
              ])),
            ]),
          ),

          // Version
          // Minimal version stamp at the very bottom — low opacity so it does
          // not distract from the animation while still providing build info.
          Positioned(
            bottom: 20, left: 0, right: 0,
            child: Center(child: Text('v1.0.0 • Powered by Spring Boot',
              // Near-invisible white text; visible on close inspection only.
              style: TextStyle(color: Colors.white.withValues(alpha: 0.2), fontSize: 10, letterSpacing: 1))),
          ),
        ],
      ),
    );
  }
}

/// CustomPainter that renders a static field of small semi-transparent dots
/// across the full screen, emulating ambient noise / radar-background texture.
///
/// Uses a fixed seed ([math.Random(42)]) so the pattern is deterministic and
/// identical across frames — [shouldRepaint] always returns false, meaning the
/// canvas is painted exactly once and never redrawn, keeping it zero-cost.
class _ParticlePainter extends CustomPainter {

  /// Seeded random number generator — fixed seed ensures the same 40 dots
  /// appear every time the splash is shown (no jitter between builds).
  final _rng = math.Random(42);

  /// Paints 40 small white dots at pseudo-random positions and radii.
  /// Dots are very low-opacity (0.04) so they read as subtle texture,
  /// not foreground elements competing with the logo or alert rings.
  @override
  void paint(Canvas canvas, Size size) {
    // Single paint object reused for all 40 circles (no per-circle allocation).
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.04);

    for (int i = 0; i < 40; i++) {
      // Random x/y spread across the full canvas dimensions.
      final x = _rng.nextDouble() * size.width;
      final y = _rng.nextDouble() * size.height;
      // Radius between 0.5 and 2.5 px — tiny specks, not visible shapes.
      final r = _rng.nextDouble() * 2 + 0.5;
      canvas.drawCircle(Offset(x, y), r, paint);
    }
  }

  /// Returns false because the particle positions are fully deterministic
  /// (fixed seed) and never change — no need to ever repaint this layer.
  @override
  bool shouldRepaint(_) => false;
}