/// create_incident_screen.dart
///
/// Disaster Management System — Incident Reporting Screen
///
/// This screen is the primary citizen-facing interface for submitting new disaster
/// incidents into the DMS. It guides the reporter through a three-step wizard:
///   Step 0 — Select the incident type (FIRE, FLOOD, EARTHQUAKE, etc.)
///   Step 1 — Enter incident details: title, severity, description, and location
///   Step 2 — Attach photographic evidence and run AI credibility verification
///
/// On submission, the incident is persisted via [IncidentRepository], optional
/// media files are uploaded to the backend, and the Riverpod incident provider
/// is refreshed so dashboards and officer views reflect the new entry immediately.
///
/// The local AI agent ([LocalAiAgent]) operates fully offline — it requires no
/// API key or network connection — and is used for two purposes:
///   • Suggesting field values (title, description, location) based on type/severity
///   • Scoring the report's credibility before the user submits it

// ── Dart I/O for reading image files from disk during AI image validation
import 'dart:io';
// ── Flutter material widgets used throughout the form
import 'package:flutter/material.dart';
// ── Declarative entrance animations applied to each step card on first render
import 'package:flutter_animate/flutter_animate.dart';
// ── Riverpod state management: ConsumerStatefulWidget + ref for reading providers
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ── GPS coordinate retrieval for automatic location stamping on incidents
import 'package:geolocator/geolocator.dart';
// ── Type-safe navigation: context.go() to push the new incident detail route
import 'package:go_router/go_router.dart';
// ── Rajdhani (headings) and Inter (body) fonts matching the DMS neon design system
import 'package:google_fonts/google_fonts.dart';
// ── Device gallery and camera access for collecting incident photo evidence
import 'package:image_picker/image_picker.dart';
// ── Offline local AI agent for report suggestion and credibility scoring
import '../../../core/ai/local_ai_agent.dart';
// ── DMS brand colour constants (primary danger red, success green, border tokens)
import '../../../core/constants/app_colors.dart';
// ── Repository that wraps the DMS REST API for incident creation and media upload
import '../data/incident_repository.dart';
// ── Riverpod provider exposing the incident list state; refreshed after submit
import '../providers/incident_provider.dart';

// ── Type metadata ─────────────────────────────────────────────────────────────

/// Maps each supported incident category to a two-stop gradient used on cards,
/// type selector tiles, and the app-bar background so the UI visually signals
/// the hazard type at a glance (e.g. red tones for FIRE, blue for FLOOD).
const _typeGradients = {
  'FIRE':       [Color(0xFFDC2626), Color(0xFF991B1B)],
  'FLOOD':      [Color(0xFF1D4ED8), Color(0xFF0E7490)],
  'EARTHQUAKE': [Color(0xFFB45309), Color(0xFF78350F)],
  'STORM':      [Color(0xFF7C3AED), Color(0xFF5B21B6)],
  'ACCIDENT':   [Color(0xFFBE185D), Color(0xFF9D174D)],
  'MEDICAL':    [Color(0xFF15803D), Color(0xFF065F46)],
  'HAZMAT':     [Color(0xFFD97706), Color(0xFF92400E)],
  'OTHER':      [Color(0xFF374151), Color(0xFF1F2937)],
};

/// Maps each incident category to a Material icon displayed on the type-selector
/// grid so responders can recognise the hazard class without reading text.
const _typeIcons = {
  'FIRE':       Icons.local_fire_department_rounded,
  'FLOOD':      Icons.water_rounded,
  'EARTHQUAKE': Icons.vibration_rounded,
  'STORM':      Icons.thunderstorm_rounded,
  'ACCIDENT':   Icons.car_crash_rounded,
  'MEDICAL':    Icons.medical_services_rounded,
  'HAZMAT':     Icons.warning_amber_rounded,
  'OTHER':      Icons.report_problem_rounded,
};

/// Unicode emoji representations for each incident type displayed alongside the
/// icon for quick visual recognition, particularly in the collapsed app-bar title.
const _typeEmojis = {
  'FIRE': '🔥', 'FLOOD': '🌊', 'EARTHQUAKE': '🏚️',
  'STORM': '⛈️', 'ACCIDENT': '🚗', 'MEDICAL': '🚑',
  'HAZMAT': '☢️', 'OTHER': '⚠️',
};

// ─────────────────────────────────────────────────────────────────────────────

/// Root widget for the Create Incident screen.
/// Extends [ConsumerStatefulWidget] so the stateful child can read and watch
/// Riverpod providers (e.g. [incidentRepositoryProvider], [incidentProvider]).
class CreateIncidentScreen extends ConsumerStatefulWidget {
  const CreateIncidentScreen({super.key});
  @override
  ConsumerState<CreateIncidentScreen> createState() => _CreateIncidentScreenState();
}

/// State class that owns the multi-step form, GPS, AI, and submission logic.
class _CreateIncidentScreenState extends ConsumerState<CreateIncidentScreen> {
  /// Global key used to trigger form validation before submission.
  final _formKey   = GlobalKey<FormState>();

  /// Controller for the incident title field (e.g. "Structure fire at Main St.").
  final _titleCtrl = TextEditingController();

  /// Controller for the free-text description field describing observable details.
  final _descCtrl  = TextEditingController();

  /// Controller for the location field; populated either by GPS or AI suggestion.
  final _locCtrl   = TextEditingController();

  /// Currently selected incident category; defaults to OTHER until user chooses.
  String _type     = 'OTHER';

  /// Currently selected severity level; defaults to MEDIUM.
  String _severity = 'MEDIUM';

  /// GPS latitude and longitude captured via Geolocator; null until user taps GPS.
  double? _lat, _lng;

  /// [_loading] — true while the submit API call is in flight (disables button).
  /// [_gettingLoc] — true while awaiting GPS fix (shows spinner in location button).
  /// [_verifying] — true while the local AI agent is scoring the report.
  bool _loading = false, _gettingLoc = false, _verifying = false;

  /// Per-field AI suggestion loading flags; prevent multiple concurrent requests.
  bool _aiTitleLoading = false, _aiDescLoading = false, _aiLocLoading = false;

  /// Credibility score (0–100) returned by the local AI after verification.
  /// Null means the user has not yet run AI verification on this report.
  double? _aiScore;

  /// Human-readable signal strings explaining the AI credibility score
  /// (e.g. "Keyword match: FIRE detected", "2 valid images detected").
  List<String>? _aiElements;

  /// Accumulates photo evidence files selected from gallery or camera.
  /// Up to 6 images can be attached per incident report.
  final List<XFile> _mediaFiles = [];

  /// Wizard step tracker: 0 = type selection, 1 = details, 2 = media & submit.
  /// Advances automatically when the user interacts with each section.
  int _step = 0; // 0=type, 1=details, 2=media+submit

  /// Ordered list of all supported DMS incident categories used to render the
  /// type-selection grid and populate the submitted incident payload.
  static const _types = ['FIRE','FLOOD','EARTHQUAKE','STORM','ACCIDENT','MEDICAL','HAZMAT','OTHER'];

  /// Ordered severity tiers aligned with DMS priority definitions:
  /// LOW → routine, MEDIUM → standard response, HIGH → urgent, CRITICAL → mass casualty.
  static const _severities = ['LOW','MEDIUM','HIGH','CRITICAL'];

  /// Disposes text controllers to free memory when the screen is removed from tree.
  @override
  void dispose() {
    _titleCtrl.dispose(); _descCtrl.dispose(); _locCtrl.dispose(); super.dispose();
  }

  /// Returns the two-stop gradient for the currently selected incident type,
  /// falling back to the DMS primary/danger colours if the type is unrecognised.
  List<Color> get _currentGrad => (_typeGradients[_type] ?? [AppColors.primary, AppColors.danger])
    .map((c) => c).toList();

  /// Requests device GPS permission and obtains the current position.
  /// On success, sets [_lat]/[_lng] and formats the location text field.
  /// Shows a snackbar error if permission is permanently denied or GPS fails.
  Future<void> _getLocation() async {
    setState(() => _gettingLoc = true);
    try {
      // Check current permission state before requesting to avoid redundant dialogs.
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      // Permanently denied means the user must re-enable in device settings.
      if (perm == LocationPermission.deniedForever) throw Exception('Location permission permanently denied');
      // High accuracy (GPS chip) improves incident pin placement on the map.
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      setState(() {
        _lat = pos.latitude; _lng = pos.longitude;
        // Display coordinates to 5 decimal places (~1 m precision).
        _locCtrl.text = '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
      });
    } catch (e) {
      if (mounted) _snack(e.toString(), error: true);
    } finally {
      // Always clear the loading flag, even on error, to re-enable the GPS button.
      if (mounted) setState(() => _gettingLoc = false);
    }
  }

  /// Opens the device photo gallery and allows selecting up to 6 images.
  /// Additional photos strengthen AI credibility scoring and officer review.
  Future<void> _pickFromGallery() async {
    final picked = await ImagePicker().pickMultiImage(limit: 6);
    if (picked.isNotEmpty) setState(() => _mediaFiles.addAll(picked));
  }

  /// Opens the device camera to capture a live photo of the incident scene.
  /// Quality is capped at 85% to balance fidelity against upload payload size.
  Future<void> _pickFromCamera() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 85);
    if (picked != null) setState(() => _mediaFiles.add(picked));
  }

  // ── Local AI — instant, no API key, no internet needed ──────────────────────

  /// Runs the offline [LocalAiAgent] against the current report fields and images
  /// to produce a credibility score and a list of explanatory signal strings.
  ///
  /// Images are considered "valid" only if their byte size exceeds 10 KB, which
  /// filters out blank placeholder files or broken image picks.
  Future<void> _verifyWithAI() async {
    // Require at minimum a title so the AI has meaningful text to analyse.
    if (_titleCtrl.text.trim().isEmpty) {
      _snack('Enter a title before AI verification', error: true); return;
    }
    setState(() => _verifying = true);
    try {
      // Analyze image sizes to determine if they're valid/non-empty photos
      int validImageCount = 0;
      // Collects human-readable image quality signals to surface in the UI chip list.
      final imageSignals = <String>[];
      for (final f in _mediaFiles) {
        try {
          final bytes = await f.readAsBytes();
          // Files smaller than 10 KB are likely corrupt or placeholder — skip them.
          if (bytes.lengthInBytes > 10000) {
            validImageCount++;
          }
        } catch (_) {}
      }
      // Surface a signal for each validated image so reporters understand the score.
      if (validImageCount > 0) imageSignals.add('$validImageCount valid image${validImageCount > 1 ? 's' : ''} detected');
      // Multiple corroborating photos meaningfully raise the credibility score.
      if (validImageCount >= 2) imageSignals.add('Multiple images strengthen credibility');

      // Delegate text + metadata analysis to the fully offline local AI agent.
      final result = LocalAiAgent.instance.analyzeReport(
        title:       _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        type:        _type,
        severity:    _severity,
        imageCount:  validImageCount,
      );
      setState(() {
        // Merge image signals (computed here) with keyword signals from the agent.
        _aiScore    = result.score;
        _aiElements = [...imageSignals, ...result.signals];
        _verifying  = false;
      });
    } catch (_) {
      // Silently clear verifying state if the agent throws; form remains usable.
      setState(() => _verifying = false);
    }
  }

  /// Asks the local AI to generate a concise incident title based on the currently
  /// selected type and severity, then populates the title text field.
  /// A 400 ms artificial delay makes the AI "thinking" state visible to users.
  void _aiSuggestTitle() {
    setState(() => _aiTitleLoading = true);
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      // AI derives a plausible title like "Structure Fire — HIGH Severity"
      _titleCtrl.text = LocalAiAgent.instance.suggestTitle(_type, _severity);
      setState(() => _aiTitleLoading = false);
    });
  }

  /// Asks the local AI to generate a description template for the incident type
  /// and severity, giving reporters a starting point they can customise.
  void _aiSuggestDesc() {
    setState(() => _aiDescLoading = true);
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      // Suggestion references type-specific observable details to prompt the user.
      _descCtrl.text = LocalAiAgent.instance.suggestDescription(_type, _severity);
      setState(() => _aiDescLoading = false);
    });
  }

  /// Asks the local AI to suggest a plausible location descriptor for the chosen
  /// incident type (e.g. "Near river bank" for FLOOD). Useful when GPS is unavailable.
  void _aiSuggestLocation() {
    setState(() => _aiLocLoading = true);
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      _locCtrl.text = LocalAiAgent.instance.suggestLocation(_type);
      setState(() => _aiLocLoading = false);
    });
  }

  /// Shows a floating snackbar with [msg]; red background indicates an error,
  /// green background indicates success (e.g. successful incident submission).
  void _snack(String msg, {bool error = false}) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg),
    backgroundColor: error ? AppColors.primary : AppColors.success,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
  ));

  /// Validates the form, submits the incident to the DMS backend, uploads any
  /// attached media, refreshes the incident list provider, then navigates the
  /// user to the newly created incident detail page.
  ///
  /// Media upload failure is intentionally swallowed so a transient upload error
  /// does not prevent navigation to the confirmed incident record.
  Future<void> _submit() async {
    // Abort early if required fields fail validation (e.g. missing title).
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      // Build the incident payload; lat/lng are conditional on GPS being obtained.
      final body = <String, dynamic>{
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category': _type, 'severity': _severity,
        'address': _locCtrl.text.trim(),
        // Only include coordinates when GPS was successfully obtained.
        if (_lat != null) 'latitude': _lat,
        if (_lng != null) 'longitude': _lng,
      };
      // Read repository from Riverpod without subscribing (one-time read).
      final repo = ref.read(incidentRepositoryProvider);
      // POST incident to the DMS REST API; returns the persisted incident with id.
      final incident = await repo.createIncident(body);
      // Upload images after incident created
      if (_mediaFiles.isNotEmpty) {
        try {
          // Multi-part upload associates evidence files with the incident record.
          await repo.uploadMedia(incident.id, _mediaFiles);
        } catch (_) {
          // Image upload failure shouldn't block navigation
        }
      }
      // Refresh the reporter's own incident list so the new entry appears in history.
      ref.read(incidentProvider.notifier).loadMyIncidents();
      if (mounted) {
        _snack('Incident #${incident.id} reported!');
        // Navigate directly to the incident detail so the user can monitor status.
        context.go('/incidents/${incident.id}');
      }
    } catch (e) {
      if (mounted) _snack(e.toString(), error: true);
    } finally {
      // Always re-enable the submit button regardless of outcome.
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Builds the full three-step incident report form inside a [CustomScrollView]
  /// with a collapsing gradient [SliverAppBar] that reflects the selected incident type.
  @override
  Widget build(BuildContext context) {
    // Determine theme mode to switch between dark (#0A0E1A) and light (#F0F2F8) backgrounds.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // Snapshot current gradient so all children in this build share the same colours.
    final grad   = _currentGrad;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F2F8),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ── Gradient App Bar ─────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 160,
            pinned: true, // Keeps back button visible when scrolled
            backgroundColor: grad.first, // Matches the selected incident type
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: grad)), // Full-width type-coloured header
                child: SafeArea(child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 50, 20, 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      // Large emoji gives immediate visual cue of selected incident type
                      Text(_typeEmojis[_type] ?? '⚠️', style: const TextStyle(fontSize: 32)),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        // Static screen label in the DMS tracking font
                        Text('REPORT INCIDENT', style: GoogleFonts.rajdhani(
                          color: Colors.white70, fontSize: 11, letterSpacing: 2)),
                        // Dynamic label updates to reflect the currently selected type
                        Text(_type, style: GoogleFonts.rajdhani(
                          color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 1)),
                      ])),
                    ]),
                    const SizedBox(height: 12),
                    // Step indicator — three animated progress segments (one per wizard step)
                    Row(children: List.generate(3, (i) => Expanded(child: Row(children: [
                      Expanded(child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        height: 4,
                        decoration: BoxDecoration(
                          // Filled white for completed/active steps; translucent for future steps
                          color: i <= _step ? Colors.white : Colors.white24,
                          borderRadius: BorderRadius.circular(2)),
                      )),
                      if (i < 2) const SizedBox(width: 4),
                    ])))),
                    const SizedBox(height: 6),
                    // Step label row aligned to match the three progress segments above
                    Row(children: [
                      Text('Type', style: TextStyle(color: _step >= 0 ? Colors.white : Colors.white38, fontSize: 10)),
                      const Spacer(),
                      Text('Details', style: TextStyle(color: _step >= 1 ? Colors.white : Colors.white38, fontSize: 10)),
                      const Spacer(),
                      Text('Media & Submit', style: TextStyle(color: _step >= 2 ? Colors.white : Colors.white38, fontSize: 10)),
                    ]),
                  ]),
                )),
              ),
            ),
          ),

          // Wraps the form and all step cards in a non-sliver adapter
          SliverToBoxAdapter(child: Form(
            key: _formKey,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

                // ── STEP 0: Incident Type ─────────────────────────────
                // 4-column grid lets reporters tap the hazard category quickly
                _StepCard(
                  title: '01  SELECT INCIDENT TYPE',
                  icon: Icons.category_rounded,
                  grad: grad,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: GridView.count(
                      crossAxisCount: 4, shrinkWrap: true,
                      // Disable inner scroll so the outer CustomScrollView handles it
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 0.9,
                      children: _types.map((t) {
                        // isSel drives the selected state style for this tile
                        final isSel = t == _type;
                        // Each type gets its own gradient for the selected state
                        final g = _typeGradients[t] ?? [AppColors.primary, AppColors.danger];
                        return GestureDetector(
                          // Selecting a type updates the global gradient and advances step counter
                          onTap: () => setState(() { _type = t; _step = math.max(_step, 0); }),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              // Active tile gets a full gradient fill; inactive gets a flat card look
                              gradient: isSel ? LinearGradient(
                                colors: g, begin: Alignment.topLeft, end: Alignment.bottomRight)
                                : null,
                              color: isSel ? null : (isDark ? const Color(0xFF1C2333) : Colors.grey.shade100),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSel ? g.first : (isDark ? AppColors.border : Colors.grey.shade300),
                                width: isSel ? 0 : 1),
                              // Coloured glow shadow on the active tile for neon cyberpunk effect
                              boxShadow: isSel ? [BoxShadow(
                                color: g.first.withValues(alpha: 0.4),
                                blurRadius: 10, offset: const Offset(0, 3))] : [],
                            ),
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              // Emoji for fast visual identification of the hazard type
                              Text(_typeEmojis[t] ?? '⚠️', style: const TextStyle(fontSize: 22)),
                              const SizedBox(height: 4),
                              // Type label in tiny text below the emoji
                              Text(t, textAlign: TextAlign.center, style: TextStyle(
                                color: isSel ? Colors.white : (isDark ? Colors.white54 : Colors.black54),
                                fontSize: 8, fontWeight: isSel ? FontWeight.w800 : FontWeight.w500)),
                            ]),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                // Fade the type card in with a slight delay for a staggered entrance
                ).animate().fadeIn(delay: 100.ms, duration: 400.ms),
                const SizedBox(height: 16),

                // ── STEP 1: Details ───────────────────────────────────
                _StepCard(
                  title: '02  INCIDENT DETAILS',
                  icon: Icons.edit_note_rounded,
                  grad: grad,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                      // Title with AI — label row includes an AI Fill button
                      _AiRow(label: 'TITLE *', loading: _aiTitleLoading, onAiTap: _aiSuggestTitle),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _titleCtrl,
                        // Interacting with the title field advances the wizard to step 1
                        onChanged: (_) => setState(() => _step = math.max(_step, 1)),
                        style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
                        decoration: _inputDec('Brief incident title', Icons.title_rounded, isDark),
                        // Title is the only required field for a valid incident submission
                        validator: (v) => v == null || v.isEmpty ? 'Title is required' : null,
                      ),
                      const SizedBox(height: 16),

                      // Severity selector — four animated pill buttons (LOW → CRITICAL)
                      Text('SEVERITY', style: _labelStyle),
                      const SizedBox(height: 8),
                      Row(children: _severities.map((s) {
                        // isSel tracks which severity level is currently active
                        final isSel = s == _severity;
                        // Each severity maps to a unique colour for quick visual triage
                        final col = _sevColor(s);
                        return Expanded(child: Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: GestureDetector(
                            onTap: () => setState(() => _severity = s),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                // Active severity uses a gradient fill for prominence
                                gradient: isSel ? LinearGradient(colors: [col, col.withValues(alpha: 0.7)]) : null,
                                color: isSel ? null : (isDark ? const Color(0xFF1C2333) : Colors.grey.shade100),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: isSel ? col : (isDark ? AppColors.border : Colors.grey.shade300)),
                                // Glow shadow on active severity to draw responder attention
                                boxShadow: isSel ? [BoxShadow(color: col.withValues(alpha: 0.35), blurRadius: 8)] : [],
                              ),
                              child: Text(s, textAlign: TextAlign.center, style: TextStyle(
                                color: isSel ? Colors.white : (isDark ? Colors.white54 : Colors.black45),
                                fontSize: 9, fontWeight: isSel ? FontWeight.w800 : FontWeight.w500, letterSpacing: 0.5)),
                            ),
                          ),
                        ));
                      }).toList()),
                      const SizedBox(height: 16),

                      // Description with AI — optional but raises AI credibility score
                      _AiRow(label: 'DESCRIPTION', loading: _aiDescLoading, onAiTap: _aiSuggestDesc),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _descCtrl, maxLines: 4,
                        style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
                        decoration: _inputDec('Describe what you observe...', Icons.description_outlined, isDark),
                      ),
                      const SizedBox(height: 16),

                      // Location with AI + GPS — supports manual text, AI suggestion, or GPS pin
                      _AiRow(label: 'LOCATION', loading: _aiLocLoading, onAiTap: _aiSuggestLocation),
                      const SizedBox(height: 8),
                      Row(children: [
                        // Text field accepts a free-form address or coordinate string
                        Expanded(child: TextFormField(
                          controller: _locCtrl,
                          style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 14),
                          decoration: _inputDec('Address or coordinates', Icons.location_on_rounded, isDark),
                        )),
                        const SizedBox(width: 8),
                        // GPS button — fetches device coordinates and populates the text field
                        SizedBox(
                          height: 54,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(colors: grad),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [BoxShadow(color: grad.first.withValues(alpha: 0.4), blurRadius: 8)],
                            ),
                            child: ElevatedButton(
                              // Disable while GPS fix is in progress
                              onPressed: _gettingLoc ? null : _getLocation,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent, shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                              ),
                              // Show a spinner while obtaining the GPS fix
                              child: _gettingLoc
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Icon(Icons.my_location_rounded, color: Colors.white, size: 20),
                            ),
                          ),
                        ),
                      ]),
                      // GPS confirmation chip — visible only after coordinates are obtained
                      if (_lat != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                // Green tinted chip signals a successful GPS lock
                                color: AppColors.success.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.success.withValues(alpha: 0.4))),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                const Icon(Icons.gps_fixed_rounded, color: AppColors.success, size: 14),
                                const SizedBox(width: 6),
                                // Display truncated coordinates so reporter can confirm accuracy
                                Text('GPS: ${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}',
                                  style: const TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w600)),
                              ]),
                            ),
                          ]),
                        ),
                    ]),
                  ),
                // Staggered fade-in at 200 ms after the type card
                ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                const SizedBox(height: 16),

                // ── STEP 2: Photos / Evidence ─────────────────────────
                _StepCard(
                  title: '03  PHOTOS & EVIDENCE',
                  icon: Icons.photo_camera_rounded,
                  grad: grad,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(children: [

                      // Pick buttons — two side-by-side CTAs for gallery vs. live camera
                      Row(children: [
                        Expanded(child: _PhotoBtn(
                          icon: Icons.photo_library_rounded,
                          label: 'Gallery',
                          grad: grad, // Uses current incident-type gradient
                          onTap: _pickFromGallery,
                        )),
                        const SizedBox(width: 10),
                        Expanded(child: _PhotoBtn(
                          icon: Icons.camera_alt_rounded,
                          label: 'Camera',
                          // Purple gradient differentiates camera from gallery visually
                          grad: [const Color(0xFF7C3AED), const Color(0xFF5B21B6)],
                          onTap: _pickFromCamera,
                        )),
                      ]),
                      const SizedBox(height: 12),

                      // Image preview grid (shown when files picked)
                      // Empty state placeholder encourages reporters to add evidence
                      if (_mediaFiles.isEmpty)
                        Container(
                          height: 120,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1C2333) : Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isDark ? AppColors.border : Colors.grey.shade200,
                              style: BorderStyle.solid),
                          ),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Icon(Icons.add_photo_alternate_outlined,
                              size: 40, color: isDark ? Colors.white24 : Colors.black26),
                            const SizedBox(height: 8),
                            // Prompt text is shown before any images are attached
                            Text('Add photos to strengthen your report',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: isDark ? Colors.white38 : Colors.black38, fontSize: 12)),
                          ]),
                        )
                      else ...[
                        // Count badge — gradient pill shows how many photos are attached
                        Align(alignment: Alignment.centerLeft, child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: grad),
                            borderRadius: BorderRadius.circular(20)),
                          child: Text('${_mediaFiles.length} photo${_mediaFiles.length > 1 ? "s" : ""} added',
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                        )),
                        const SizedBox(height: 12),

                        // Large first photo preview — primary evidence image shown prominently
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Stack(children: [
                            // Full-width preview of the first selected image
                            Image.file(File(_mediaFiles.first.path),
                              width: double.infinity, height: 200, fit: BoxFit.cover),
                            // Gradient overlay at bottom — provides contrast for the caption label
                            Positioned(
                              bottom: 0, left: 0, right: 0,
                              child: Container(
                                height: 60,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter, end: Alignment.bottomCenter,
                                    colors: [Colors.transparent, Colors.black.withValues(alpha: 0.7)])),
                              ),
                            ),
                            // Caption label identifies this as the primary evidence photo
                            Positioned(
                              bottom: 8, left: 12,
                              child: Text('Primary Photo', style: GoogleFonts.inter(
                                color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
                            ),
                            // Remove button for the primary image — tap to dequeue it
                            Positioned(top: 8, right: 8, child: GestureDetector(
                              onTap: () => setState(() => _mediaFiles.removeAt(0)),
                              child: Container(
                                width: 28, height: 28,
                                // Red circle delete icon consistent with DMS danger colour
                                decoration: const BoxDecoration(
                                  color: Color(0xFFDC2626), shape: BoxShape.circle),
                                child: const Icon(Icons.close_rounded, color: Colors.white, size: 16),
                              ),
                            )),
                          ]),
                        // Animate the primary preview in with a subtle scale effect
                        ).animate().fadeIn(duration: 300.ms).scale(begin: const Offset(0.95, 0.95)),

                        // Thumbnail strip for additional photos beyond the primary
                        if (_mediaFiles.length > 1) ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 78,
                            // Horizontal scroll lets reporters review all additional evidence photos
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              // Primary image (index 0) is displayed above; strip starts at index 1
                              itemCount: _mediaFiles.length - 1,
                              separatorBuilder: (_, __) => const SizedBox(width: 8),
                              itemBuilder: (_, i) => Stack(children: [
                                // Thumbnail for additional evidence image at offset index i+1
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image.file(File(_mediaFiles[i + 1].path),
                                    width: 78, height: 78, fit: BoxFit.cover),
                                ),
                                // Remove button overlay for each thumbnail in the strip
                                Positioned(top: 4, right: 4, child: GestureDetector(
                                  onTap: () => setState(() => _mediaFiles.removeAt(i + 1)),
                                  child: Container(
                                    width: 22, height: 22,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFDC2626), shape: BoxShape.circle),
                                    child: const Icon(Icons.close_rounded, color: Colors.white, size: 13),
                                  ),
                                )),
                              ]),
                            ),
                          ),
                        ],
                      ],
                    ]),
                  ),
                // Staggered entrance at 300 ms for visual hierarchy
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),
                const SizedBox(height: 16),

                // ── AI Verification ───────────────────────────────────
                // Credibility scoring card — reporters can verify before final submission
                _AIVerifyCard(
                  score: _aiScore, elements: _aiElements,
                  verifying: _verifying, onVerify: _verifyWithAI, grad: grad,
                ).animate().fadeIn(delay: 380.ms, duration: 400.ms),
                const SizedBox(height: 24),

                // ── Submit ────────────────────────────────────────────
                // Full-width gradient submit button — disabled while loading
                Container(
                  height: 58,
                  decoration: BoxDecoration(
                    // Gradient matches the selected incident type for visual coherence
                    gradient: LinearGradient(colors: grad, begin: Alignment.centerLeft, end: Alignment.centerRight),
                    borderRadius: BorderRadius.circular(16),
                    // Prominent glow shadow draws the reporter's eye to the final action
                    boxShadow: [BoxShadow(color: grad.first.withValues(alpha: 0.5), blurRadius: 16, offset: const Offset(0, 5))],
                  ),
                  child: ElevatedButton(
                    // Disabled during in-flight submission to prevent duplicate reports
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      // Transparent background defers entirely to the parent Container gradient
                      backgroundColor: Colors.transparent, shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    // Show spinner during submission; show icon+label when idle
                    child: _loading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                          const SizedBox(width: 10),
                          Text('SUBMIT REPORT', style: GoogleFonts.rajdhani(
                            fontSize: 17, fontWeight: FontWeight.w900, letterSpacing: 2, color: Colors.white)),
                        ]),
                  ),
                // Slide the submit button in from below for a natural call-to-action feel
                ).animate().fadeIn(delay: 450.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),
                const SizedBox(height: 40),
              ]),
            ),
          )),
        ],
      ),
    );
  }

  /// Shared label text style used for section headings (TITLE, SEVERITY, etc.)
  /// in Rajdhani with wide letter spacing to match the DMS neon design system.
  TextStyle get _labelStyle => GoogleFonts.rajdhani(
    color: AppColors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.w700);

  /// Builds a consistent [InputDecoration] for all text fields in the form.
  /// The focused border uses the currently selected incident-type gradient colour
  /// so the active field visually ties back to the hazard type being reported.
  InputDecoration _inputDec(String hint, IconData icon, bool isDark) => InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 13),
    prefixIcon: Icon(icon, color: isDark ? Colors.white38 : Colors.black38, size: 20),
    filled: true,
    // Dark card fill (#1C2333) separates input from the page background in dark mode
    fillColor: isDark ? const Color(0xFF1C2333) : Colors.grey.shade50,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: isDark ? AppColors.border : Colors.grey.shade200)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: isDark ? AppColors.border : Colors.grey.shade200)),
    // Focused border highlights with the incident-type colour for contextual feedback
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: _currentGrad.first, width: 2)),
    // Error state uses the DMS primary danger red to signal validation failure
    errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.primary)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  );

  /// Maps a severity string to its DMS triage colour:
  /// LOW=green (non-urgent), MEDIUM=amber (standard), HIGH=red (urgent),
  /// CRITICAL=purple (mass casualty / maximum priority).
  Color _sevColor(String s) {
    switch (s) {
      case 'LOW':      return const Color(0xFF15803D); // Green — minimal threat
      case 'MEDIUM':   return const Color(0xFFD97706); // Amber — standard response
      case 'HIGH':     return const Color(0xFFDC2626); // Red — immediate response
      case 'CRITICAL': return const Color(0xFF7C3AED); // Purple — mass casualty
      default:         return AppColors.textSecondary;
    }
  }
}

/// Minimal local math utility providing an integer [max] function.
/// Extracted into a class to avoid importing dart:math for a single method.
// ignore: avoid_classes_with_only_static_members
class math {
  /// Returns the greater of [a] and [b]; used to advance the wizard step counter
  /// without ever regressing to a lower step when the user re-interacts with fields.
  static int max(int a, int b) => a > b ? a : b;
}

// ─── Step card container ──────────────────────────────────────────────────────

/// Reusable card widget wrapping each wizard step (type, details, media).
/// Renders a gradient header banner containing a numbered step title and icon,
/// with the card body content supplied by the [child] parameter.
class _StepCard extends StatelessWidget {
  /// Display title shown in the card's gradient header (e.g. "01  SELECT INCIDENT TYPE").
  final String title;

  /// Icon displayed alongside the title in the gradient header for quick recognition.
  final IconData icon;

  /// Two-stop gradient list sourced from the currently selected incident type.
  final List<Color> grad;

  /// The step-specific form content rendered below the card header.
  final Widget child;
  const _StepCard({required this.title, required this.icon, required this.grad, required this.child});

  @override
  Widget build(BuildContext context) {
    // Detect theme to switch card background between dark (#111827) and white.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        // Dark or white card background contrasts with the page background
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.border.withValues(alpha: 0.5) : Colors.grey.shade200),
        // Subtle shadow lifts the card above the page background
        boxShadow: [BoxShadow(
          color: (isDark ? Colors.black : Colors.grey).withValues(alpha: 0.08),
          blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Card header with gradient — provides step identity and visual section separation
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            // Gradient runs left-to-right matching the incident type colour scheme
            gradient: LinearGradient(colors: grad, begin: Alignment.centerLeft, end: Alignment.centerRight),
            // Top corners rounded to match the outer card; bottom is flat against the body
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Row(children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            // Step title in Rajdhani bold with wide tracking for the DMS aesthetic
            Text(title, style: GoogleFonts.rajdhani(
              color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.5)),
          ]),
        ),
        // Step-specific form body content supplied by the caller
        child,
      ]),
    );
  }
}

// ─── AI field label with sparkle button ──────────────────────────────────────

/// Inline row placed above each text field that displays a labelled field name
/// and an "AI Fill" button. Tapping the button triggers the corresponding AI
/// suggestion callback, populating the field with a context-aware suggestion
/// generated by [LocalAiAgent] without any network call.
class _AiRow extends StatelessWidget {
  /// Uppercase field label shown on the left (e.g. "TITLE *", "DESCRIPTION").
  final String label;

  /// True while the AI suggestion request is in progress; replaces the button with a spinner.
  final bool loading;

  /// Callback invoked when the user taps "AI Fill"; triggers the relevant suggestion method.
  final VoidCallback onAiTap;
  const _AiRow({required this.label, required this.loading, required this.onAiTap});

  @override
  Widget build(BuildContext context) => Row(children: [
    // Field label in DMS secondary text style with tracked uppercase lettering
    Text(label, style: GoogleFonts.rajdhani(
      color: AppColors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: FontWeight.w700)),
    const Spacer(),
    // Tapping the button is disabled while the AI suggestion is loading
    GestureDetector(
      onTap: loading ? null : onAiTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          // Purple gradient matches the AI verification card for consistent branding
          gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)]),
          borderRadius: BorderRadius.circular(20),
          // Subtle glow indicates interactivity
          boxShadow: [BoxShadow(color: const Color(0xFF7C3AED).withValues(alpha: 0.3), blurRadius: 6)],
        ),
        // Show a compact spinner while awaiting suggestion, otherwise show sparkle + label
        child: loading
          ? const SizedBox(width: 12, height: 12,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 1.5))
          : const Row(mainAxisSize: MainAxisSize.min, children: [
              // Sparkle icon signals AI/magic functionality to reporters
              Icon(Icons.auto_awesome_rounded, size: 12, color: Colors.white),
              SizedBox(width: 4),
              Text('AI Fill', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
            ]),
      ),
    ),
  ]);
}

// ─── Photo button ─────────────────────────────────────────────────────────────

/// A tappable gradient button used for the Gallery and Camera evidence actions.
/// Accepts a custom [grad] so the gallery button matches the incident type colour
/// while the camera button uses a fixed purple gradient for visual differentiation.
class _PhotoBtn extends StatelessWidget {
  /// Icon displayed to the left of the label (e.g. gallery or camera icon).
  final IconData icon;

  /// Human-readable button label ("Gallery" or "Camera").
  final String label;

  /// Two-stop gradient applied as the button background.
  final List<Color> grad;

  /// Callback invoked when the user taps the button to open the picker.
  final VoidCallback onTap;
  const _PhotoBtn({required this.icon, required this.label, required this.grad, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      height: 54,
      decoration: BoxDecoration(
        // Diagonal gradient gives depth to the flat button surface
        gradient: LinearGradient(colors: grad, begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(14),
        // Drop shadow with gradient-matched colour for the neon cyberpunk glow effect
        boxShadow: [BoxShadow(color: grad.first.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(width: 8),
        Text(label, style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
      ]),
    ),
  );
}

// ─── AI Verification card ─────────────────────────────────────────────────────

/// Displays the local AI credibility score for the current incident report.
///
/// Before verification is run, shows an explanatory prompt encouraging the reporter
/// to verify before submitting. After verification, shows:
///   • An animated progress bar scaled to the 0–100 score
///   • A colour-coded verdict (green ≥70, amber ≥40, red <40)
///   • A chip-list of the signal strings that contributed to the score
///   • A re-verify button so reporters can improve the score by adding details
class _AIVerifyCard extends StatelessWidget {
  /// Credibility score from 0–100 returned by [LocalAiAgent.analyzeReport]; null before first run.
  final double? score;

  /// Human-readable signal strings explaining what raised or lowered the score.
  final List<String>? elements;

  /// True while the AI analysis is running; disables the verify button.
  final bool verifying;

  /// Async callback that triggers AI analysis; provided by the parent state.
  final Future<void> Function() onVerify;

  /// Two-stop gradient matching the currently selected incident type.
  final List<Color> grad;
  const _AIVerifyCard({required this.score, required this.elements,
    required this.verifying, required this.onVerify, required this.grad});

  /// Returns the colour used for the progress bar, icon, and verdict text
  /// based on the credibility tier: green (high), amber (moderate), red (low).
  Color get _scoreColor {
    if (score == null) return AppColors.textSecondary;
    if (score! >= 70) return const Color(0xFF15803D); // High credibility — green
    if (score! >= 40) return const Color(0xFFD97706); // Moderate — amber
    return const Color(0xFFDC2626);                   // Low — danger red
  }

  @override
  Widget build(BuildContext context) {
    // Theme check for card background colour (dark: #111827, light: white)
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        // Border colour shifts to the score colour once a result is available
        border: Border.all(
          color: score != null ? _scoreColor.withValues(alpha: 0.4) : (isDark ? AppColors.border.withValues(alpha: 0.5) : Colors.grey.shade200)),
        // Box shadow picks up the score colour for visual feedback on result state
        boxShadow: [BoxShadow(
          color: (score != null ? _scoreColor : (isDark ? Colors.black : Colors.grey)).withValues(alpha: 0.1),
          blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Column(children: [
        // Header — always purple gradient to distinguish AI functionality from step cards
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)]),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Row(children: [
            // Brain icon reinforces the AI/ML nature of this section
            const Icon(Icons.psychology_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Text('AI VERIFICATION', style: GoogleFonts.rajdhani(
              color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.5)),
            const Spacer(),
            // Score badge in header — only visible after a verification run
            if (score != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  // Semi-transparent white pill badge keeps score readable on purple
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('${score!.round()}% Credibility',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            // Score result section — visible only after AI has analysed the report
            if (score != null) ...[
              // Horizontal progress bar visually encodes the 0–100 score
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: score! / 100, minHeight: 8,
                  backgroundColor: isDark ? AppColors.border : Colors.grey.shade200,
                  // Bar colour communicates credibility tier at a glance
                  valueColor: AlwaysStoppedAnimation<Color>(_scoreColor),
                ),
              ),
              const SizedBox(height: 10),
              // Verdict row — icon + text describes the credibility tier in plain language
              Row(children: [
                Icon(_scoreIcon, color: _scoreColor, size: 16),
                const SizedBox(width: 6),
                Expanded(child: Text(_scoreText, style: TextStyle(color: _scoreColor, fontSize: 12, fontWeight: FontWeight.w600))),
              ]),
              // Signal chips — each chip names a factor that influenced the score
              if (elements != null && elements!.isNotEmpty) ...[
                const SizedBox(height: 12),
                // Wrap allows chips to flow to a second line if many signals are present
                Wrap(spacing: 6, runSpacing: 6, children: elements!.map((e) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    // Light purple tinted chip matching the AI card colour scheme
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF7C3AED).withValues(alpha: 0.3))),
                  child: Text(e, style: const TextStyle(color: Color(0xFF7C3AED), fontSize: 10, fontWeight: FontWeight.w600)),
                )).toList()),
              ],
              const SizedBox(height: 12),
            ] else ...[
              // Pre-verification prompt — displayed before the reporter runs AI check
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text('Verify your report with AI before submitting to boost credibility.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: isDark ? Colors.white38 : Colors.black38, fontSize: 12)),
              ),
              const SizedBox(height: 8),
            ],
            // Verify / Re-verify button — outlined style distinguishes it from the submit CTA
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton.icon(
                // Disabled while analysis is running to prevent duplicate calls
                onPressed: verifying ? null : onVerify,
                icon: verifying
                  // Spinner replaces icon during analysis to signal progress
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF7C3AED)))
                  : const Icon(Icons.verified_rounded, color: Color(0xFF7C3AED), size: 18),
                label: Text(verifying ? 'Analyzing...' : 'Verify with AI',
                  style: GoogleFonts.inter(color: const Color(0xFF7C3AED), fontSize: 13, fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  // Purple border ties the button to the AI verification colour scheme
                  side: const BorderSide(color: Color(0xFF7C3AED)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  /// Returns the appropriate status icon for the current credibility score tier.
  /// Check circle for high credibility, warning for moderate, cancel for low.
  IconData get _scoreIcon {
    if (score == null) return Icons.info_outline_rounded;
    if (score! >= 70) return Icons.check_circle_rounded;   // High — report is credible
    if (score! >= 40) return Icons.warning_amber_rounded;  // Moderate — add more info
    return Icons.cancel_rounded;                           // Low — insufficient detail
  }

  /// Returns a plain-language verdict string paired with the credibility tier.
  /// Guides reporters on whether to submit as-is or improve their report first.
  String get _scoreText {
    if (score == null) return '';
    if (score! >= 70) return 'High credibility — ready to submit';
    if (score! >= 40) return 'Moderate — add more details if possible';
    return 'Low credibility — please provide more information';
  }
}