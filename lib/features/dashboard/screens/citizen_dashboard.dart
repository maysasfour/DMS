/// ─────────────────────────────────────────────────────────────────────────────
/// citizen_dashboard.dart
///
/// The main home screen for authenticated citizen users in the Disaster
/// Management System (DMS). This dashboard aggregates the most critical
/// citizen-facing features onto one screen: a rotating hero awareness banner,
/// flippable incident-count stat cards, an SOS emergency shortcut, a quick-
/// action grid for navigating to maps/weather/shelters/alerts/news/guide, a
/// horizontally scrollable disaster-awareness card strip, and a live feed of
/// the citizen's own reported incidents pulled from the backend.
///
/// State management is handled by Riverpod (flutter_riverpod). Navigation
/// uses GoRouter (go_router). Animations use flutter_animate. The UI honours
/// both dark and light themes defined in AppColors.
/// ─────────────────────────────────────────────────────────────────────────────

// dart:math is imported for math.pi used in the 3-D card-flip transformation.
import 'dart:math' as math;

// Core Flutter material widgets – Scaffold, AppBar, GridView, etc.
import 'package:flutter/material.dart';

// Declarative animation extensions (.animate(), .fadeIn(), .slideY(), etc.)
// that wrap Flutter's implicit animation system with a concise API.
import 'package:flutter_animate/flutter_animate.dart';

// Riverpod state-management: ConsumerWidget / ConsumerStatefulWidget /
// WidgetRef give this screen reactive access to global providers.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// GoRouter context extensions (.push()) for type-safe, URL-based navigation
// across citizen-facing routes (map, incidents, guide, emergency, etc.).
import 'package:go_router/go_router.dart';

// Google Fonts: Rajdhani (display headings) and Inter (body / labels) match
// the DMS neon-cyberpunk design system.
import 'package:google_fonts/google_fonts.dart';

// DMS-specific colour palette (border colours, accent colours, etc.)
import '../../../core/constants/app_colors.dart';

// Localisation helper: t(context, ref, key) returns the translated string for
// the given key from the active locale's JSON file.
import '../../../core/l10n/app_strings.dart';

// Authentication provider – exposes the currently signed-in user's profile
// so the dashboard can display a personalised greeting.
import '../../../features/auth/providers/auth_provider.dart';

// Incident provider – handles fetching and caching the citizen's own incident
// reports from the DMS backend REST API.
import '../../../features/incidents/providers/incident_provider.dart';

// Locale provider – watched so that the UI rebuilds when the user switches
// the app language (Arabic, English, French, Spanish, Turkish, etc.).
import '../../../providers/locale_provider.dart';

// Side-drawer widget shared across all authenticated screens, containing
// profile info and navigation links.
import '../../../shared/widgets/app_drawer.dart';

// Reusable card widget that displays a single incident's type, status,
// severity, and location in a compact tile format.
import '../../../shared/widgets/incident_card.dart';
// math.max used via dart:math

// ─── Unsplash CDN images for each disaster category ──────────────────────────
// Maps each DMS incident category (as stored in the backend) to a relevant
// Unsplash thumbnail. Used by the disaster-awareness horizontal card strip to
// give citizens a visual context for each hazard type.
const _categoryImages = {
  'FIRE':       'https://images.unsplash.com/photo-1544027661-63b9d85e7f39?w=400&q=80',
  'FLOOD':      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&q=80',
  'EARTHQUAKE': 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=400&q=80',
  'STORM':      'https://images.unsplash.com/photo-1527482937786-6608f6e14c15?w=400&q=80',
  'MEDICAL':    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&q=80',
  'ACCIDENT':   'https://images.unsplash.com/photo-1503751071777-d2918b21bbd9?w=400&q=80',
  'HAZMAT':     'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=400&q=80',
};

// Banner image URLs (titles come from translations)
// Three rotating hero banner backgrounds shown at the top of the dashboard.
// Each banner pairs with a localised title/subtitle key to deliver safety
// messaging (stay safe, report fast, community solidarity).
const _heroBannerImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
];

// Gradient colour pairs that overlay each banner image for readability.
// Index-aligned with _heroBannerImages – blue/navy, red/dark-red, green/forest.
const _heroBannerGrads = [
  [Color(0xFF1565C0), Color(0xFF0D47A1)],
  [Color(0xFFC62828), Color(0xFFB71C1C)],
  [Color(0xFF2E7D32), Color(0xFF1B5E20)],
];

// i18n keys for each banner's primary headline (e.g. "Stay Safe", "Report Fast").
const _heroBannerTitleKeys = ['stay_safe', 'report_fast', 'community'];

// i18n keys for each banner's supporting subtitle shown below the headline.
const _heroBannerSubKeys   = ['banner_sub_1', 'banner_sub_2', 'banner_sub_3'];

/// Root widget for the citizen dashboard screen.
/// Extends [ConsumerStatefulWidget] so it can listen to Riverpod providers
/// and maintain local UI state (banner rotation index).
class CitizenDashboard extends ConsumerStatefulWidget {
  const CitizenDashboard({super.key});

  @override
  ConsumerState<CitizenDashboard> createState() => _CitizenDashboardState();
}

/// Private state class for [CitizenDashboard].
/// Holds [_bannerIndex] to track which hero banner is currently displayed.
class _CitizenDashboardState extends ConsumerState<CitizenDashboard> {
  /// Index (0–2) of the currently displayed hero banner.
  /// Increments cyclically when the citizen taps the banner.
  int _bannerIndex = 0;

  @override
  void initState() {
    super.initState();
    // Defer incident loading until the first frame is rendered to avoid
    // calling provider mutations during the build phase (Flutter constraint).
    // loadMyIncidents() hits the DMS backend and populates incidentProvider
    // with the citizen's submitted reports.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(incidentProvider.notifier).loadMyIncidents();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Re-build whenever the locale changes so that all translated strings
    // (banner titles, section headers, button labels) update immediately.
    ref.watch(localeProvider);

    // The authenticated citizen's profile; falls back to 'Citizen' if null.
    final user          = ref.watch(authProvider).user;

    // Full incident provider state, including loading flag and data list.
    final incidentState = ref.watch(incidentProvider);

    // The flat list of incident models returned by the backend for this citizen.
    final incidents     = incidentState.incidents;

    // Total number of incidents this citizen has ever reported.
    final myCount       = incidents.length;

    // Count of incidents that have been fully resolved by the DMS team.
    final resolvedCount = incidents.where((i) => i.status == 'RESOLVED').length;

    // Count of incidents still requiring attention: newly reported, open, or
    // actively being handled by a response team.
    final pendingCount  = incidents.where((i) =>
        i.status == 'REPORTED' || i.status == 'OPEN' || i.status == 'IN_PROGRESS').length;

    // Determine current theme brightness to swap surface/text colours.
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      // Deep navy background in dark mode; soft grey-blue in light mode – both
      // from the DMS design system.
      backgroundColor: isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F2F8),

      // Side navigation drawer shared with officer and admin portals.
      drawer: const AppDrawer(),

      appBar: AppBar(
        // Transparent bar – visual weight comes from the hero banner below.
        backgroundColor: Colors.transparent,
        elevation: 0,

        // Hamburger menu that opens AppDrawer for navigation to other sections.
        leading: Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.menu_rounded, color: isDark ? Colors.white : Colors.black87),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        )),

        // "DMS" wordmark with a blue-to-red gradient shader, matching the
        // brand identity defined in the design system.
        title: ShaderMask(
          shaderCallback: (r) => const LinearGradient(
            colors: [Color(0xFF4A90E2), Color(0xFFDC2626)],
          ).createShader(r),
          child: Text('DMS', style: GoogleFonts.rajdhani(
            fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 4, color: Colors.white)),
        ),

        actions: [
          // Notifications bell navigates to the DMS alert/notification feed,
          // showing system broadcasts and status updates for the citizen's
          // active incidents.
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                // Red pill background highlights the notification icon as urgent.
                gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFF991B1B)]),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.notifications_outlined, color: Colors.white, size: 18),
            ),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
        ],
      ),

      body: RefreshIndicator(
        // Pull-to-refresh reloads the citizen's incident list from the backend.
        color: AppColors.secondary,
        onRefresh: () async => ref.read(incidentProvider.notifier).loadMyIncidents(),

        child: CustomScrollView(
          // Bouncing physics ensures pull-to-refresh works even when the list
          // is shorter than the viewport.
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                // ── Hero Banner ──────────────────────────────────────────
                // Displays rotating safety-awareness messaging with the
                // citizen's first name for personalisation. Tapping cycles
                // to the next banner slide.
                _HeroBanner(
                  bannerIndex: _bannerIndex,
                  userName: user?.name ?? 'Citizen',
                  onNext: () => setState(() => _bannerIndex = (_bannerIndex + 1) % _heroBannerImages.length),
                ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.08, end: 0),
                const SizedBox(height: 20),

                // ── Flip Stat Cards ────────────────────────────────────
                // Three tappable cards showing the citizen's total reports,
                // resolved count, and pending count. Tapping flips the card
                // to reveal the category icon on the reverse face.
                _FlipStatsRow(my: myCount, resolved: resolvedCount, pending: pendingCount)
                  .animate().fadeIn(delay: 150.ms, duration: 400.ms).slideY(begin: 0.1, end: 0),
                const SizedBox(height: 24),

                // ── SOS Quick Button ────────────────────────────────────
                // A high-visibility pulsing red banner that shortcuts directly
                // to the emergency SOS screen, allowing a citizen to raise an
                // immediate distress signal.
                _SOSBanner()
                  .animate().fadeIn(delay: 200.ms, duration: 400.ms).scale(begin: const Offset(0.95, 0.95)),
                const SizedBox(height: 24),

                // ── Quick Actions Gradient Grid ─────────────────────────
                // 4-column icon grid giving one-tap access to the eight most
                // frequently used citizen features: report, map, weather,
                // shelters, alerts, news, safety guide, and my reports.
                _GradientActionsGrid()
                  .animate().fadeIn(delay: 280.ms, duration: 400.ms),
                const SizedBox(height: 24),

                // ── Disaster Awareness Cards ────────────────────────────
                // Horizontally scrollable educational cards for fire, flood,
                // earthquake, storm, and medical emergencies, each showing a
                // quick safety tip sourced from localisation files.
                _DisasterCards()
                  .animate().fadeIn(delay: 350.ms, duration: 400.ms),
                const SizedBox(height: 24),

                // ── Recent Reports header ───────────────────────────────
                // Section label and a "View All" pill button that navigates
                // to the full incident list screen (/incidents).
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(t(context, ref, 'recent_reports').toUpperCase(), style: GoogleFonts.rajdhani(
                    color: isDark ? Colors.white70 : Colors.black54,
                    fontSize: 12, letterSpacing: 2, fontWeight: FontWeight.w700)),
                  GestureDetector(
                    // Navigate to the paginated full incident history page.
                    onTap: () => context.push('/incidents'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        // Blue pill matches the DMS primary action colour.
                        gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF1E40AF)]),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(t(context, ref, 'view_all'), style: GoogleFonts.inter(
                        color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ]).animate().fadeIn(delay: 400.ms, duration: 400.ms),
                const SizedBox(height: 12),
              ]),
            )),

            // ── Incident cards in sliver ─────────────────────────────
            // Three mutually exclusive states for the recent-reports section:
            // 1) Loading spinner while the backend call is in flight.
            // 2) Empty-state widget encouraging the citizen to file a report.
            // 3) Sliver list showing up to 5 most recent incident cards.
            if (incidentState.isLoading)
              // Show a centred spinner while loadMyIncidents() is pending.
              const SliverToBoxAdapter(child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ))
            else if (incidents.isEmpty)
              // No incidents found for this citizen – prompt them to report.
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _EmptyState(),
              ))
            else
              // Render up to 5 recent incident cards in a scrollable sliver.
              // Each card animates in with a staggered slide from the right.
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      // IncidentCard renders incident type, severity badge,
                      // status chip, and timestamp; tapping opens the detail view.
                      child: IncidentCard(
                        incident: incidents[i],
                        onTap: () => context.push('/incidents/${incidents[i].id}'),
                      ).animate()
                        // Stagger each card's entrance by 60 ms so they cascade in.
                        .fadeIn(delay: Duration(milliseconds: 60 * i), duration: 350.ms)
                        .slideX(begin: 0.06, end: 0, curve: Curves.easeOut),
                    ),
                    // Limit preview to the 5 most recent incidents to keep the
                    // dashboard scrollable without overwhelming the citizen.
                    childCount: incidents.take(5).length,
                  ),
                ),
              ),
          ],
        ),
      ),

      // ── FAB Report Incident ────────────────────────────────────────────
      // Prominent floating action button anchored bottom-right, allowing the
      // citizen to begin filing a new incident report at any time from this
      // screen. Red colour signals urgency consistent with the DMS palette.
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/incidents/create'),
        backgroundColor: const Color(0xFFDC2626),
        icon: const Icon(Icons.add_alert_rounded, color: Colors.white),
        label: Text(t(context, ref, 'report_incident').toUpperCase(), style: GoogleFonts.rajdhani(
          color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 2)),
      // Elastic spring-in animation draws attention after the rest of the UI loads.
      ).animate().scale(delay: 600.ms, duration: 400.ms, curve: Curves.elasticOut),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Banner with gradient overlay + network image
// ─────────────────────────────────────────────────────────────────────────────

/// Full-width rotating awareness banner displayed at the top of the citizen
/// dashboard. Tapping cycles to the next slide. Each slide combines a remote
/// background photo with a colour gradient overlay and a personalised greeting,
/// a bold localised headline, and a supporting subtitle.
class _HeroBanner extends ConsumerWidget {
  /// Zero-based index into [_heroBannerImages], [_heroBannerGrads], and the
  /// title/sub key arrays that determines which banner slide is shown.
  final int bannerIndex;

  /// The logged-in citizen's display name, shown in the greeting line.
  final String userName;

  /// Callback fired when the citizen taps the banner to advance to the next slide.
  final VoidCallback onNext;

  const _HeroBanner({required this.bannerIndex, required this.userName, required this.onNext});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Resolve all data for the current banner index.
    final grad  = _heroBannerGrads[bannerIndex];     // Two-stop gradient colours.
    final img   = _heroBannerImages[bannerIndex];     // Unsplash background URL.
    final title = t(context, ref, _heroBannerTitleKeys[bannerIndex]); // e.g. "Stay Safe".
    final sub   = t(context, ref, _heroBannerSubKeys[bannerIndex]);   // Supporting sentence.
    final hello = t(context, ref, 'welcome');          // Localised "Welcome" or equivalent.

    return GestureDetector(
      // Advance to the next banner slide on tap.
      onTap: onNext,
      child: ClipRRect(
        // Rounded corners consistent with the DMS card design language.
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          height: 180,
          child: Stack(fit: StackFit.expand, children: [
            // Network background photo; falls back to a solid gradient if the
            // image fails to load (e.g. no internet in the field).
            Image.network(img, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(color: grad.first)),

            // Left-biased gradient overlay ensures white text remains legible
            // against any background photo content.
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft, end: Alignment.centerRight,
                  colors: [
                    grad.first.withValues(alpha: 0.92), // Opaque on the left.
                    grad.last.withValues(alpha: 0.7),   // Semi-transparent centre.
                    Colors.transparent,                 // Fully transparent on the right.
                  ], stops: const [0, 0.6, 1]),
              ),
            ),

            // Text content layer: greeting, headline, subtitle, and dot indicators.
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Personalised greeting using first name only to save space.
                Text('$hello, ${userName.split(' ').first} 👋',
                  style: GoogleFonts.inter(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 6),

                // Main awareness headline (e.g. "Stay Safe", "Report Fast").
                Text(title, style: GoogleFonts.rajdhani(
                  color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, height: 1.15)),

                const Spacer(),

                // Supporting detail sentence below the headline.
                Text(sub, style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 10),

                // Animated dot indicators showing which banner slide is active.
                // The active dot widens to 20 px; inactive dots are 6 px circles.
                Row(children: List.generate(_heroBannerImages.length, (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.only(right: 5),
                  width: i == bannerIndex ? 20 : 6, height: 6,
                  decoration: BoxDecoration(
                    color: i == bannerIndex ? Colors.white : Colors.white38,
                    borderRadius: BorderRadius.circular(3)),
                ))),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flip stat cards
// ─────────────────────────────────────────────────────────────────────────────

/// A horizontal row of three [_FlipCard] widgets summarising the citizen's
/// incident reporting activity: total submitted, resolved by DMS, and pending.
class _FlipStatsRow extends StatelessWidget {
  /// Total number of incidents the citizen has ever submitted.
  final int my;

  /// Incidents whose status has been set to RESOLVED by a DMS officer.
  final int resolved;

  /// Incidents still open (REPORTED, OPEN, or IN_PROGRESS).
  final int pending;

  const _FlipStatsRow({required this.my, required this.resolved, required this.pending});

  @override
  Widget build(BuildContext context) => Row(children: [
    // "My Reports" card – blue gradient to indicate informational category.
    _FlipCard(value: my,       label: 'My Reports', icon: Icons.assignment_outlined,
      grad: const [Color(0xFF1D4ED8), Color(0xFF3B82F6)]),
    const SizedBox(width: 10),
    // "Resolved" card – green gradient to signal a positive/safe outcome.
    _FlipCard(value: resolved, label: 'Resolved',   icon: Icons.check_circle_outline,
      grad: const [Color(0xFF15803D), Color(0xFF22C55E)]),
    const SizedBox(width: 10),
    // "Pending" card – amber gradient to flag incidents awaiting action.
    _FlipCard(value: pending,  label: 'Pending',    icon: Icons.pending_outlined,
      grad: const [Color(0xFFB45309), Color(0xFFF59E0B)]),
  ]);
}

/// A single tappable stat card that flips on the Y-axis to reveal an icon on
/// the reverse face. Uses [AnimationController] + [Matrix4.rotateY] for the
/// 3-D perspective flip effect without third-party packages.
class _FlipCard extends StatefulWidget {
  /// The numeric count to display prominently on the front face.
  final int value;

  /// Short category label shown on both faces (e.g. "Resolved", "Pending").
  final String label;

  /// Icon shown on the back face after the card is flipped.
  final IconData icon;

  /// Two-stop gradient defining the card's colour theme (front shadow + back tint).
  final List<Color> grad;

  const _FlipCard({required this.value, required this.label, required this.icon, required this.grad});

  @override
  State<_FlipCard> createState() => _FlipCardState();
}

/// State for [_FlipCard]. Manages the flip animation lifecycle.
class _FlipCardState extends State<_FlipCard> with SingleTickerProviderStateMixin {
  /// Drives the Y-axis rotation from 0 to π radians.
  late final AnimationController _ctrl;

  /// Curved animation from 0 → π with an easeInOutBack curve for a natural
  /// "physical card" feel.
  late final Animation<double> _anim;

  /// Whether the card is currently showing the back face (icon side).
  bool _flipped = false;

  @override
  void initState() {
    super.initState();
    // 500 ms duration feels snappy but not jarring for a small card flip.
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    // Tween from 0 to π (half rotation) with easeInOutBack for a spring effect.
    _anim = Tween<double>(begin: 0, end: math.pi).animate(
        CurvedAnimation(parent: _ctrl, curve: Curves.easeInOutBack));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  /// Toggle between front (numeric stat) and back (icon) faces.
  void _toggle() {
    setState(() => _flipped = !_flipped);
    // Forward plays to the back face; reverse returns to the front.
    _flipped ? _ctrl.forward() : _ctrl.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: _toggle,
        child: AnimatedBuilder(
          animation: _anim,
          builder: (_, __) {
            final angle = _anim.value;
            // When the rotation is less than 90° (π/2), show the front face;
            // beyond that threshold render the back face (mirrored to read correctly).
            final isFront = angle < math.pi / 2;
            return Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001) // Perspective depth for realistic 3-D look.
                ..rotateY(angle),        // Rotate around Y axis by current angle.
              child: isFront ? _buildFront() : Transform(
                alignment: Alignment.center,
                // Counter-rotate the back face by π so its text/icon reads correctly
                // after the parent rotateY has already flipped it.
                transform: Matrix4.identity()..rotateY(math.pi),
                child: _buildBack(),
              ),
            );
          },
        ),
      ),
    );
  }

  /// Builds the front face of the stat card: gradient background + large number.
  Widget _buildFront() => Container(
    height: 100,
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: widget.grad),
      borderRadius: BorderRadius.circular(16),
      // Coloured shadow tinted to match the gradient for depth perception.
      boxShadow: [BoxShadow(
        color: widget.grad.first.withValues(alpha: 0.45),
        blurRadius: 14, offset: const Offset(0, 5))],
    ),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      // Large count number – Rajdhani display font at 36 sp for maximum impact.
      Text('${widget.value}', style: GoogleFonts.rajdhani(
        color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900)),
      const SizedBox(height: 2),
      // Category label in a lighter weight below the number.
      Text(widget.label, textAlign: TextAlign.center,
        style: GoogleFonts.inter(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w500)),
    ]),
  );

  /// Builds the back face of the stat card: white background + coloured icon.
  Widget _buildBack() => Container(
    height: 100,
    decoration: BoxDecoration(
      // White back face provides contrast flip from the coloured front.
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(
        color: widget.grad.first.withValues(alpha: 0.25),
        blurRadius: 14, offset: const Offset(0, 5))],
    ),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      // Category icon coloured with the gradient's primary colour.
      Icon(widget.icon, color: widget.grad.first, size: 32),
      const SizedBox(height: 6),
      // Label repeated on the back for context after the flip.
      Text(widget.label, textAlign: TextAlign.center,
        style: GoogleFonts.inter(color: widget.grad.first, fontSize: 10, fontWeight: FontWeight.w700)),
    ]),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOS Pulse Banner
// ─────────────────────────────────────────────────────────────────────────────

/// A full-width emergency shortcut banner that navigates to the DMS SOS /
/// emergency screen. Uses a looping shimmer animation on the SOS icon to
/// convey urgency and draw the citizen's eye immediately on the dashboard.
class _SOSBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) => GestureDetector(
    // Route to the dedicated emergency / SOS reporting screen.
    onTap: () => context.push('/emergency'),
    child: Container(
      height: 64,
      decoration: BoxDecoration(
        // Deep red gradient signals critical/danger consistent with DMS alert styling.
        gradient: const LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFF7F1D1D)],
          begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(16),
        // Red glow shadow reinforces the urgency of this button.
        boxShadow: [BoxShadow(
          color: const Color(0xFFDC2626).withValues(alpha: 0.4),
          blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        // SOS icon with a continuous shimmer loop to keep it visually active
        // even when the citizen isn't interacting with the dashboard.
        const Icon(Icons.sos_rounded, color: Colors.white, size: 28)
          .animate(onPlay: (c) => c.repeat()).shimmer(duration: 1500.ms, color: Colors.white54),
        const SizedBox(width: 12),

        // Two-line label: bold title + subdued instruction text.
        Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Localised "SOS" or "Emergency" title in display font with wide tracking.
          Text(t(context, ref, 'sos_title'), style: GoogleFonts.rajdhani(
            color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 2)),
          // Subtitle instructing the citizen on what will happen when tapped.
          Text(t(context, ref, 'sos_sub'), style: GoogleFonts.inter(
            color: Colors.white70, fontSize: 11)),
        ]),
        const Spacer(),

        // Right-pointing chevron cues the citizen that this banner is tappable.
        const Padding(padding: EdgeInsets.only(right: 16),
          child: Icon(Icons.chevron_right_rounded, color: Colors.white70, size: 24)),
      ]),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradient Quick Actions 2x4 grid
// ─────────────────────────────────────────────────────────────────────────────

/// A 4-column grid of colour-coded action tiles giving the citizen one-tap
/// access to the eight core features of the DMS app. Each tile has a unique
/// gradient colour that matches its semantic category (red = report danger,
/// blue = map/navigation, amber = weather, green = medical/shelter, etc.).
class _GradientActionsGrid extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Re-build when locale changes to update all localised tile labels.
    ref.watch(localeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Define the eight quick-action tiles with their localised label, icon,
    // destination route, and gradient colours.
    final items = [
      // Report Incident – primary citizen action, red to signal emergency.
      _GItem(t(context, ref, 'report_map'), Icons.add_alert_rounded,    '/incidents/create',
        const [Color(0xFFDC2626), Color(0xFF991B1B)]),
      // Interactive map showing nearby incidents and resource locations.
      _GItem(t(context, ref, 'map'),        Icons.map_rounded,           '/map',
        const [Color(0xFF1D4ED8), Color(0xFF1E40AF)]),
      // Current weather conditions relevant to disaster planning.
      _GItem(t(context, ref, 'weather'),    Icons.wb_sunny_rounded,      '/weather',
        const [Color(0xFFD97706), Color(0xFFB45309)]),
      // Nearest emergency shelters and hospitals for evacuation.
      _GItem(t(context, ref, 'shelters'),   Icons.local_hospital_rounded,'/shelters',
        const [Color(0xFF15803D), Color(0xFF166534)]),
      // DMS system alerts and broadcast notifications.
      _GItem(t(context, ref, 'alerts'),     Icons.notifications_rounded, '/notifications',
        const [Color(0xFF7C3AED), Color(0xFF6D28D9)]),
      // Latest disaster-related news aggregated for the citizen's region.
      _GItem(t(context, ref, 'news'),       Icons.newspaper_rounded,     '/news',
        const [Color(0xFF0E7490), Color(0xFF155E75)]),
      // Safety guide with preparedness tips per disaster category.
      _GItem(t(context, ref, 'guide'),      Icons.menu_book_rounded,     '/guide',
        const [Color(0xFFBE185D), Color(0xFF9D174D)]),
      // Citizen's own incident report history list.
      _GItem(t(context, ref, 'my_reports'),  Icons.list_alt_rounded,      '/incidents',
        const [Color(0xFF1D4ED8), Color(0xFF7C3AED)]),
    ];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Section label "QUICK ACCESS" in uppercase spaced capitals.
      Text(t(context, ref, 'quick_access'), style: GoogleFonts.rajdhani(
        color: isDark ? Colors.white54 : Colors.black45,
        fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.w700)),
      const SizedBox(height: 12),

      // 4-column fixed grid; shrinkWrap prevents it from expanding infinitely
      // inside the outer CustomScrollView's Column.
      GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(), // Parent scroll handles scrolling.
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.95, // Slightly taller than square to fit label text.
        children: items.asMap().entries.map((e) =>
          _GradientActionTile(item: e.value)
            // Stagger each tile's entrance by 40 ms for a cascading wave effect.
            .animate()
            .fadeIn(delay: Duration(milliseconds: 40 * e.key), duration: 300.ms)
            .scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack)
        ).toList(),
      ),
    ]);
  }
}

/// Plain data class holding the properties of a single quick-action grid tile.
class _GItem {
  /// Localised display label shown below the icon.
  final String label;

  /// GoRouter route path this tile navigates to when tapped.
  final String route;

  /// Material icon representing the action category.
  final IconData icon;

  /// Two-stop gradient defining the tile's background colour theme.
  final List<Color> grad;

  const _GItem(this.label, this.icon, this.route, this.grad);
}

/// Stateful tile widget that adds a press-down scale animation on tap before
/// navigating to the associated route, providing tactile visual feedback.
class _GradientActionTile extends StatefulWidget {
  /// The action item data (label, icon, route, gradient) for this tile.
  final _GItem item;

  const _GradientActionTile({required this.item});

  @override
  State<_GradientActionTile> createState() => _GradientActionTileState();
}

/// State for [_GradientActionTile]. Tracks whether the tile is currently pressed
/// to drive the AnimatedScale shrink-on-press effect.
class _GradientActionTileState extends State<_GradientActionTile> {
  /// True while the citizen's finger is held down on this tile.
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Begin shrink animation as soon as the citizen presses the tile.
      onTapDown: (_) => setState(() => _pressed = true),
      // Release the shrink and navigate to the destination route.
      onTapUp: (_) { setState(() => _pressed = false); context.push(widget.item.route); },
      // Restore normal scale if the gesture is cancelled (e.g. finger slides away).
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        // Shrink to 92% on press; return to 100% on release.
        scale: _pressed ? 0.92 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: widget.item.grad),
            borderRadius: BorderRadius.circular(16),
            // Coloured drop-shadow that matches the tile's gradient for depth.
            boxShadow: [BoxShadow(
              color: widget.item.grad.first.withValues(alpha: 0.35),
              blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            // Frosted-glass pill behind the icon adds visual separation from the
            // gradient background without losing the colour-coding.
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(widget.item.icon, color: Colors.white, size: 22),
            ),
            const SizedBox(height: 6),
            // Short label text centred beneath the icon; 10 sp keeps it readable
            // within the small 4-column grid cell.
            Text(widget.item.label, textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal scrollable Disaster Awareness cards with images
// ─────────────────────────────────────────────────────────────────────────────

/// Horizontally scrollable strip of educational disaster-awareness cards shown
/// on the citizen dashboard. Each card covers one DMS incident category (fire,
/// flood, earthquake, storm, medical) with a photo, emoji, localised title, and
/// a one-sentence safety tip.
class _DisasterCards extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Build the awareness card list with localised strings and category images.
    final cards = [
      // Fire safety card – red gradient, fire emoji, local tip from i18n.
      _DCard(t(context, ref, 'fire_safe'), '🔥', _categoryImages['FIRE']!,
        const [Color(0xFFDC2626), Color(0xFF991B1B)], t(context, ref, 'fire_tip')),
      // Flood alert card – blue/teal gradient for water-related hazard.
      _DCard(t(context, ref, 'flood_alert'), '🌊', _categoryImages['FLOOD']!,
        const [Color(0xFF1D4ED8), Color(0xFF0E7490)], t(context, ref, 'flood_tip')),
      // Earthquake card – amber gradient to indicate structural danger.
      _DCard(t(context, ref, 'quake_card'), '🏚️', _categoryImages['EARTHQUAKE']!,
        const [Color(0xFFB45309), Color(0xFF92400E)], t(context, ref, 'quake_tip')),
      // Storm card – purple gradient to distinguish from flood hazard.
      _DCard(t(context, ref, 'storm_card'), '⛈️', _categoryImages['STORM']!,
        const [Color(0xFF7C3AED), Color(0xFF5B21B6)], t(context, ref, 'storm_tip')),
      // Medical emergency card – green gradient for health/first-aid context.
      _DCard(t(context, ref, 'medical_card'), '🚑', _categoryImages['MEDICAL']!,
        const [Color(0xFF15803D), Color(0xFF065F46)], t(context, ref, 'medical_tip')),
    ];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Section label "DISASTER AWARENESS" in spaced caps.
      Text(t(context, ref, 'disaster_awareness'), style: GoogleFonts.rajdhani(
        color: isDark ? Colors.white54 : Colors.black45,
        fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.w700)),
      const SizedBox(height: 12),

      // Fixed-height horizontal ListView; bouncing physics for a native feel.
      SizedBox(
        height: 170,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          itemCount: cards.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (_, i) => cards[i],
        ),
      ),
    ]);
  }
}

/// A single disaster-awareness card showing a remote background photo, a
/// gradient overlay, an emoji, a localised category title, and a safety tip.
class _DCard extends StatelessWidget {
  /// Localised card headline, e.g. "Fire Safety Tips".
  final String title;

  /// Emoji icon representing the disaster type, overlaid on the image.
  final String emoji;

  /// Unsplash image URL for the card's background photo.
  final String imageUrl;

  /// Short localised safety tip shown below the title (max 2 lines).
  final String tip;

  /// Two-stop gradient used both as the bottom overlay and as the image fallback.
  final List<Color> grad;

  const _DCard(this.title, this.emoji, this.imageUrl, this.grad, this.tip);

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      // Rounded corners match the rest of the DMS card design language.
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        width: 150, // Fixed width so multiple cards are partially visible on screen.
        child: Stack(fit: StackFit.expand, children: [
          // Background photo for the disaster category; if loading fails (e.g.
          // offline in the field), a solid gradient fill provides a usable fallback.
          Image.network(imageUrl, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: grad, begin: Alignment.topLeft, end: Alignment.bottomRight)))),

          // Bottom-biased gradient overlay fades from transparent at the top to
          // near-opaque at the bottom so the white text is always readable.
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
                colors: [Colors.transparent, grad.last.withValues(alpha: 0.95)],
                stops: const [0.3, 1.0], // Overlay only covers the lower 70% of the card.
              ),
            ),
          ),

          // Text content anchored to the bottom of the card.
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(mainAxisAlignment: MainAxisAlignment.end, crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Large emoji gives an immediate at-a-glance category cue.
              Text(emoji, style: const TextStyle(fontSize: 24)),
              const SizedBox(height: 4),
              // Category title in Rajdhani display font for impact.
              Text(title, style: GoogleFonts.rajdhani(
                color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              // Safety tip capped at 2 lines to keep card height fixed.
              Text(tip, maxLines: 2, style: GoogleFonts.inter(
                color: Colors.white70, fontSize: 10, height: 1.35)),
            ]),
          ),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

/// Displayed in place of the recent-reports list when the citizen has not yet
/// filed any incidents. Encourages first-time use with a prompt and a
/// prominent "Report Incident" call-to-action button.
class _EmptyState extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(32),
      margin: const EdgeInsets.only(bottom: 40),
      decoration: BoxDecoration(
        // Subtle gradient card surface adapts to dark/light theme.
        gradient: LinearGradient(
          colors: isDark
            ? [const Color(0xFF1C2333), const Color(0xFF161B22)] // Dark navy tones.
            : [Colors.white, const Color(0xFFF0F4FF)],           // Light blue-white tones.
          begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(20),
        // Border uses the DMS shared border colour token for consistency.
        border: Border.all(color: isDark ? AppColors.border : const Color(0xFFE0E7FF)),
      ),
      child: Column(children: [
        // Circular icon container with blue gradient and glow shadow acts as
        // a visual centrepiece drawing attention to the empty state.
        Container(
          width: 72, height: 72,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1D4ED8), Color(0xFF3B82F6)]),
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: const Color(0xFF1D4ED8).withValues(alpha: 0.3), blurRadius: 16)],
          ),
          child: const Icon(Icons.assignment_outlined, color: Colors.white, size: 34),
        ),
        const SizedBox(height: 16),

        // Primary empty-state message (e.g. "No reports yet").
        Text(t(context, ref, 'no_reports'), style: GoogleFonts.rajdhani(
          color: isDark ? Colors.white : Colors.black87,
          fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),

        // Supporting instruction encouraging the citizen to submit their first report.
        Text(t(context, ref, 'no_reports_sub'),
          textAlign: TextAlign.center,
          style: TextStyle(color: isDark ? Colors.white38 : Colors.black45, fontSize: 13)),
        const SizedBox(height: 20),

        // Call-to-action button that routes to the incident creation form.
        // Red colour matches the FAB and the SOS banner for action consistency.
        ElevatedButton.icon(
          onPressed: () => context.push('/incidents/create'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFDC2626),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
          icon: const Icon(Icons.add_alert_rounded, color: Colors.white, size: 18),
          label: Text(t(context, ref, 'report_incident'), style: GoogleFonts.inter(
            color: Colors.white, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}