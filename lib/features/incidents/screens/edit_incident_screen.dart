/// edit_incident_screen.dart
///
/// Provides the Edit Incident screen for the Disaster Management System (DMS)
/// mobile application. This screen allows authorized users (e.g., officers,
/// admins) to modify the details of an existing disaster incident, including
/// its title, type, severity, status, description, and location.
///
/// The screen fetches the current incident data via [incidentDetailProvider],
/// pre-populates all editable fields, and submits the updated payload to the
/// backend through [IncidentRepository.updateIncident]. On success, the
/// incident detail cache is invalidated so the caller screen reflects the
/// latest data immediately.

// Flutter UI framework — provides Material widgets used throughout this screen
import 'package:flutter/material.dart';
// Riverpod state management — ConsumerStatefulWidget enables reactive
// access to providers without manual subscription boilerplate
import 'package:flutter_riverpod/flutter_riverpod.dart';
// GoRouter navigation — used to pop back to the incident detail screen
// after a successful update
import 'package:go_router/go_router.dart';
// DMS design token colours (primary neon accent, success green, text colours, etc.)
import '../../../core/constants/app_colors.dart';
// Localisation helper that resolves translated strings for the active locale
import '../../../core/l10n/app_strings.dart';
// Data layer that performs REST calls to the DMS backend incident endpoints
import '../data/incident_repository.dart';
// Riverpod providers that expose incident detail state to the widget tree
import '../providers/incident_provider.dart';

/// A stateful widget that renders the "Edit Incident" form.
///
/// Accepts the [id] of the incident to edit so it can load the correct
/// record from the backend and target the correct update endpoint.
class EditIncidentScreen extends ConsumerStatefulWidget {
  /// The unique numeric identifier of the incident being edited.
  /// Passed in via the route parameter from the incident detail screen.
  final int id;

  /// Creates an [EditIncidentScreen] for the incident identified by [id].
  const EditIncidentScreen({super.key, required this.id});

  @override
  // Creates the mutable state object that manages form controllers and
  // submission logic for this screen
  ConsumerState<EditIncidentScreen> createState() => _EditIncidentScreenState();
}

/// Private state class for [EditIncidentScreen].
///
/// Owns all form controllers, dropdown selections, and loading/init flags.
/// Handles pre-population from the fetched incident and submits changes to
/// the DMS backend.
class _EditIncidentScreenState extends ConsumerState<EditIncidentScreen> {
  // Global key used by Flutter's Form widget to trigger validation across
  // all child TextFormField and DropdownButtonFormField widgets at once
  final _formKey = GlobalKey<FormState>();

  // Controller for the incident title text field (e.g. "Building Fire on Main St")
  final _titleCtrl = TextEditingController();

  // Controller for the free-text description field that elaborates on the incident
  final _descCtrl = TextEditingController();

  // Controller for the human-readable location/address field of the incident
  final _locationCtrl = TextEditingController();

  // Currently selected incident category; defaults to 'OTHER' until pre-populated
  String _type = 'OTHER';

  // Currently selected severity level; defaults to 'LOW' until pre-populated
  String _severity = 'LOW';

  // Currently selected incident lifecycle status; defaults to 'REPORTED'
  String _status = 'REPORTED';

  // Tracks whether the PATCH request is in-flight to disable the save button
  // and show an inline progress indicator
  bool _loading = false;

  // Guards against re-initialising form fields when the provider rebuilds
  // (e.g. after cache invalidation), preserving any unsaved edits the user
  // has already made
  bool _initialized = false;

  // Exhaustive list of incident category codes recognised by the DMS backend.
  // Matches the backend enum so the dropdown value is always API-compatible.
  static const _types = ['FIRE', 'FLOOD', 'EARTHQUAKE', 'STORM', 'ACCIDENT', 'MEDICAL', 'HAZMAT', 'OTHER'];

  // Ordered severity levels from least to most critical, matching the backend
  // severity enum used for alert escalation and resource prioritisation
  static const _severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  // Incident lifecycle statuses in typical progression order; CLOSED is the
  // terminal state where no further updates are normally expected
  static const _statuses = ['REPORTED', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  @override
  // Releases all TextEditingControllers when the widget is removed from the
  // tree to prevent memory leaks
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  /// Pre-populates form fields with data from the fetched [incident] object.
  ///
  /// The [_initialized] flag ensures this only runs once per screen lifetime,
  /// so subsequent provider rebuilds (e.g. after invalidation) do not overwrite
  /// edits the user has already made in the form.
  void _init(dynamic incident) {
    // Skip if we already populated the fields during this widget's lifetime
    if (_initialized) return;
    // Mark as initialised before any setState to prevent re-entry
    _initialized = true;

    // Populate title — fall back to empty string if the backend returns null
    _titleCtrl.text = incident.title ?? '';

    // Populate description — may be null for older incidents migrated from
    // legacy systems that did not require a description
    _descCtrl.text = incident.description ?? '';

    // Prefer the structured locationName; fall back to city for incidents
    // that were created before granular address capture was introduced
    _locationCtrl.text = incident.locationName ?? incident.city ?? '';

    // Guard against unknown type values that could break the DropdownButtonFormField
    // by validating against the known list before assignment
    _type = _types.contains(incident.type) ? incident.type : 'OTHER';

    // Guard against unknown severity values with a safe default of LOW
    _severity = _severities.contains(incident.severity) ? incident.severity : 'LOW';

    // Guard against unknown status values; REPORTED is the safest default
    _status = _statuses.contains(incident.status) ? incident.status : 'REPORTED';
  }

  /// Validates the form and submits the updated incident fields to the
  /// DMS REST API via a PATCH/PUT request.
  ///
  /// On success the [incidentDetailProvider] cache is invalidated so the
  /// detail screen re-fetches fresh data, and the user is navigated back.
  /// On failure a SnackBar displays the error message from the backend.
  Future<void> _submit() async {
    // Abort early if any required field fails validation (e.g. empty title)
    if (!_formKey.currentState!.validate()) return;

    // Show loading indicator and disable the submit button while the request
    // is in-flight to prevent duplicate submissions
    setState(() => _loading = true);
    try {
      // Build the JSON body that the DMS backend expects for an incident update.
      // 'category' maps to the backend field name even though the UI calls it 'type'.
      final body = {
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category': _type,
        'severity': _severity,
        'status': _status,
        'address': _locationCtrl.text.trim(),
      };

      // Dispatch the update to the repository which calls the backend REST endpoint
      await ref.read(incidentRepositoryProvider).updateIncident(widget.id, body);

      // Bust the detail cache so the incident detail screen immediately shows
      // the updated data without requiring a manual pull-to-refresh
      ref.invalidate(incidentDetailProvider(widget.id));

      // Guard against acting on BuildContext after the widget has been unmounted
      if (mounted) {
        // Confirm success to the user with a green SnackBar using the DMS
        // success colour token
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Incident updated'), backgroundColor: AppColors.success));

        // Navigate back to the incident detail screen
        context.pop();
      }
    } catch (e) {
      // Display backend or network error messages so the user knows what went
      // wrong and can retry or contact support
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: AppColors.primary));
      }
    } finally {
      // Always re-enable the submit button regardless of success or failure
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  /// Builds the full edit-incident UI: an AppBar, an async data loader,
  /// and a scrollable form with all editable incident fields.
  Widget build(BuildContext context) {
    // Watch the incident detail provider; rebuilds automatically when the
    // provider emits a new AsyncValue (loading / error / data)
    final incidentAsync = ref.watch(incidentDetailProvider(widget.id));

    return Scaffold(
      // Use the theme's scaffold background so the screen respects dark/light mode
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Match scaffold background so the AppBar blends into the page
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Use the DMS primary text colour for back-arrow and title
        foregroundColor: AppColors.textPrimary,
        // Localised "Edit Incident" title — resolved via the active locale
        title: Text(t(context, ref, 'edit_incident')),
      ),
      // AsyncValue.when handles the three provider states declaratively,
      // keeping loading / error UI separate from the happy-path form
      body: incidentAsync.when(
        // Show a centred spinner while the incident data is being fetched
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),

        // Show the raw error message if the fetch fails (e.g. network error,
        // 404 if the incident was deleted, or 403 if access is revoked)
        error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppColors.primary))),

        // Render the editable form once the incident data is available
        data: (incident) {
          // Pre-populate fields with existing incident data on first render
          _init(incident);

          return SingleChildScrollView(
            // Uniform 16 dp padding keeps form fields away from screen edges
            padding: const EdgeInsets.all(16),
            child: Form(
              // Associate the form with its global key so _submit() can
              // trigger validation across all fields in one call
              key: _formKey,
              child: Column(
                // Stretch children to full width so buttons and fields fill
                // the available horizontal space
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title field — required; validator rejects empty input
                  _field(_titleCtrl, t(context, ref, 'title_field'), Icons.title,
                      validator: (v) => v == null || v.isEmpty ? t(context, ref, 'required') : null),

                  const SizedBox(height: 16),

                  // Incident type dropdown — maps to the backend 'category' field
                  // (e.g. FIRE, FLOOD, EARTHQUAKE)
                  _dropdown(t(context, ref, 'incident_type'), _types, _type, (v) => setState(() => _type = v!)),

                  const SizedBox(height: 16),

                  // Severity dropdown — drives alert escalation and resource
                  // prioritisation logic on the backend (LOW -> CRITICAL)
                  _dropdown(t(context, ref, 'severity'), _severities, _severity, (v) => setState(() => _severity = v!)),

                  const SizedBox(height: 16),

                  // Status dropdown — represents the incident's position in the
                  // DMS lifecycle (REPORTED -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED)
                  _dropdown(t(context, ref, 'status_label'), _statuses, _status, (v) => setState(() => _status = v!)),

                  const SizedBox(height: 16),

                  // Multi-line description field — optional free text that provides
                  // context for responders; up to 4 visible lines before scrolling
                  TextFormField(
                    controller: _descCtrl,
                    maxLines: 4,
                    // Ensure the typed text is visible against the card background
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: _decoration(t(context, ref, 'description'), Icons.description_outlined),
                  ),

                  const SizedBox(height: 16),

                  // Location/address field — human-readable location for responders
                  // (no validation required; location may be implicit from map pin)
                  _field(_locationCtrl, t(context, ref, 'location'), Icons.location_on_outlined),

                  const SizedBox(height: 24),

                  // Fixed-height save button — disabled while _loading to prevent
                  // duplicate submissions; shows a spinner in place of the label
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      // Disable the button while the PATCH request is in-flight
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        // Use DMS primary neon accent for the save action
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      // Switch between a spinner and the localised "Save Changes"
                      // label depending on submission state
                      child: _loading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text(t(context, ref, 'save_changes'),
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// Builds a single-line [TextFormField] using the DMS input decoration style.
  ///
  /// [ctrl] is the controller that holds the field's value.
  /// [label] is the localised placeholder/label string.
  /// [icon] is the leading prefix icon that visually identifies the field.
  /// [validator] is an optional validation function; supply one for required fields.
  Widget _field(TextEditingController ctrl, String label, IconData icon,
      {String? Function(String?)? validator}) {
    return TextFormField(
      controller: ctrl,
      // Ensure text is readable against the dark card background in dark mode
      style: const TextStyle(color: AppColors.textPrimary),
      // Apply the shared DMS input decoration (borders, fill, label style)
      decoration: _decoration(label, icon),
      // Pass through the validator so required fields show inline error messages
      validator: validator,
    );
  }

  /// Builds a styled [DropdownButtonFormField] for selecting a value from a
  /// fixed list of DMS domain options (type, severity, or status).
  ///
  /// [label] is the floating label displayed above the dropdown.
  /// [items] is the ordered list of option strings (e.g. severity levels).
  /// [value] is the currently selected item, kept in state.
  /// [onChanged] updates state when the user picks a different option.
  Widget _dropdown(String label, List<String> items, String value, void Function(String?) onChanged) {
    return DropdownButtonFormField<String>(
      value: value,
      // Use the DMS dark card colour as the dropdown panel background so it
      // matches the overall dark-mode palette
      dropdownColor: AppColors.cardDark,
      // Ensure option text is readable against the dark dropdown background
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        // Secondary text colour for the floating label to reduce visual noise
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        filled: true,
        // Adapt fill colour to the active brightness: dark card in dark mode,
        // light grey in light mode for visual contrast
        fillColor: Theme.of(context).brightness == Brightness.dark ? AppColors.cardDark : Colors.grey.shade50,
        // Default border uses the DMS border colour token for consistency
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
        // Enabled (unfocused) state border — same token as default
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
        // Focused border highlights with the primary neon accent colour to
        // indicate the active field to the user
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
      ),
      // Convert the string list to DropdownMenuItems; value and display label
      // are identical because the backend codes are human-readable enough
      items: items.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
      onChanged: onChanged,
    );
  }

  /// Returns the shared [InputDecoration] used by all text fields on this screen.
  ///
  /// Centralising the decoration ensures visual consistency (rounded 12 dp
  /// corners, DMS border tokens, adaptive fill colour) across every field
  /// without duplicating style code.
  ///
  /// [label] is the floating label string.
  /// [icon] is the leading prefix icon that categorises the field at a glance.
  InputDecoration _decoration(String label, IconData icon) => InputDecoration(
        labelText: label,
        // Secondary text colour keeps labels subtle so they don't compete with
        // the user's input text
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        // Prefix icon provides a visual cue for the field's purpose (e.g. pin
        // icon for location, title icon for name)
        prefixIcon: Icon(icon, color: AppColors.textSecondary),
        filled: true,
        // Adapt fill colour to brightness: dark card background in dark mode,
        // light grey in light mode
        fillColor: Theme.of(context).brightness == Brightness.dark ? AppColors.cardDark : Colors.grey.shade50,
        // Three border variants are required by Flutter's InputDecorator to
        // style the default, enabled, and focused states independently
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
        // Primary neon accent on focus draws the user's eye to the active field
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
      );
}