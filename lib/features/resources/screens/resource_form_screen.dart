/// resource_form_screen.dart
///
/// Provides a form screen for creating and editing DMS resources.
/// Resources represent physical or human assets used during disaster response,
/// such as vehicles, medical supplies, personnel, equipment, and shelters.
///
/// This screen is used by DMS administrators and field officers to:
///   - Register new resources available for incident assignment
///   - Update the status or details of existing resources (e.g., marking a
///     vehicle as OUT_OF_SERVICE after use in a disaster response operation)
///
/// Navigation: Accessed from the resource list screen; pops back on success.
/// State management: Uses Riverpod (ConsumerStatefulWidget) for repository access.

// Flutter UI framework — required for widgets, theming, and material components
import 'package:flutter/material.dart';
// Riverpod state management — provides access to the resource repository provider
import 'package:flutter_riverpod/flutter_riverpod.dart';
// GoRouter navigation — used to pop back to the resource list after form submission
import 'package:go_router/go_router.dart';
// DMS design system color tokens — neon cyberpunk theme (primary, success, border, etc.)
import '../../../core/constants/app_colors.dart';
// Localization helper — retrieves translated strings for labels, buttons, and validation
import '../../../core/l10n/app_strings.dart';
// Resource repository — handles API calls to create/update resources on the DMS backend
import '../data/resource_repository.dart';

/// A [ConsumerStatefulWidget] that renders the resource create/edit form.
///
/// Accepts an optional [id]: when provided, the screen operates in edit mode
/// and will call [ResourceRepository.updateResource]; otherwise it creates a new resource.
class ResourceFormScreen extends ConsumerStatefulWidget {
  /// The ID of an existing DMS resource to edit.
  /// When null, the form is in create mode and a new resource will be registered.
  final int? id;

  /// Creates the resource form screen.
  /// [id] is optional — omit it to create a new resource, pass it to edit an existing one.
  const ResourceFormScreen({super.key, this.id});

  @override
  // Creates the mutable state for this widget, which holds form controllers and UI state
  ConsumerState<ResourceFormScreen> createState() => _ResourceFormScreenState();
}

/// Private state class for [ResourceFormScreen].
/// Manages form validation, text input controllers, dropdown selections, and API submission.
class _ResourceFormScreenState extends ConsumerState<ResourceFormScreen> {
  // GlobalKey used to trigger form validation and access form state
  final _formKey = GlobalKey<FormState>();

  // Controller for the resource name input (e.g., "Ambulance Unit 3", "Red Cross Team A")
  final _nameCtrl = TextEditingController();

  // Controller for the deployment location of this resource (e.g., "Northern District Depot")
  final _locationCtrl = TextEditingController();

  // Controller for the numeric quantity of this resource (e.g., number of personnel or units)
  final _qtyCtrl = TextEditingController();

  // Currently selected resource type; defaults to VEHICLE as the most common DMS asset
  String _type = 'VEHICLE';

  // Currently selected operational status; defaults to AVAILABLE for new resource registrations
  String _status = 'AVAILABLE';

  // Tracks whether an API request is in progress to disable the submit button and show a spinner
  bool _loading = false;

  /// All valid resource type values accepted by the DMS backend.
  /// - PERSONNEL: Human responders (e.g., rescue teams, medics)
  /// - EQUIPMENT: Tools and machinery (e.g., generators, pumps)
  /// - VEHICLE: Transport assets (e.g., ambulances, fire trucks)
  /// - MEDICAL: Medical supplies and kits
  /// - SHELTER: Temporary housing or relief stations
  static const _types = ['PERSONNEL', 'EQUIPMENT', 'VEHICLE', 'MEDICAL', 'SHELTER'];

  /// All valid operational status values for a DMS resource.
  /// - AVAILABLE: Ready for assignment to an active incident
  /// - ASSIGNED: Currently deployed to an ongoing disaster response
  /// - OUT_OF_SERVICE: Unavailable due to maintenance, damage, or depletion
  static const _statuses = ['AVAILABLE', 'ASSIGNED', 'OUT_OF_SERVICE'];

  @override
  // Dispose all text controllers to free memory when the screen is removed from the widget tree
  void dispose() {
    _nameCtrl.dispose();
    _locationCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  /// Validates and submits the resource form to the DMS backend.
  ///
  /// In edit mode (when [widget.id] is set), calls [updateResource] with the resource ID.
  /// In create mode, calls [createResource] to register a new asset in the system.
  /// Displays a success snackbar and navigates back to the resource list on success.
  /// Displays an error snackbar with the exception message on failure.
  Future<void> _submit() async {
    // Abort submission if any required field fails validation (e.g., empty resource name)
    if (!_formKey.currentState!.validate()) return;

    // Show loading indicator and disable the submit button during the API call
    setState(() => _loading = true);

    // Build the request body map to send to the DMS resource API endpoint
    final body = {
      // Trim whitespace from name to avoid accidental duplicates in the resource registry
      'name': _nameCtrl.text.trim(),
      // Resource category (e.g., VEHICLE, MEDICAL) used for filtering and assignment logic
      'type': _type,
      // Operational status used by dispatchers to determine availability for incident response
      'status': _status,
      // Physical location of the resource, used to optimize dispatch routing
      'location': _locationCtrl.text.trim(),
      // Only include quantity if the field was filled in — it is optional for some resource types
      if (_qtyCtrl.text.isNotEmpty)
        // Parse as integer; fallback to 0 if input is non-numeric to avoid crashes
        'quantity': int.tryParse(_qtyCtrl.text) ?? 0,
    };

    try {
      // Obtain the resource repository from the Riverpod provider graph
      final repo = ref.read(resourceRepositoryProvider);

      // Branch between update and create based on whether an existing resource ID was passed
      if (widget.id != null) {
        // Edit mode: send updated fields to the backend for the specified resource ID
        await repo.updateResource(widget.id!, body);
      } else {
        // Create mode: register a new resource asset in the DMS resource registry
        await repo.createResource(body);
      }

      // Only update UI if the widget is still mounted (prevents setState after dispose)
      if (mounted) {
        // Show a contextual confirmation message indicating whether a resource was created or updated
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(widget.id != null ? 'Resource updated' : 'Resource created'),
              // Green success color from DMS design system signals a successful operation
              backgroundColor: AppColors.success),
        );
        // Navigate back to the resource list so the user can see the updated/new resource
        context.pop();
      }
    } catch (e) {
      // Only show error if the widget is still mounted to avoid calling setState after dispose
      if (mounted) {
        // Display the raw error message from the API or network layer to help with debugging
        ScaffoldMessenger.of(context).showSnackBar(
            // Use primary (accent) color for error snackbar per DMS design system convention
            SnackBar(content: Text(e.toString()), backgroundColor: AppColors.primary));
      }
    } finally {
      // Always reset the loading state so the button becomes interactive again after the request
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  // Builds the full resource form UI including AppBar, scrollable form fields, and submit button
  Widget build(BuildContext context) {
    return Scaffold(
      // Use the theme's scaffold background to support DMS light/dark mode switching
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Match AppBar background to scaffold for a seamless neon cyberpunk header appearance
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Use DMS primary text color for AppBar icons and title
        foregroundColor: AppColors.textPrimary,
        // Dynamically show "Edit Resource" or "Add Resource" based on form mode
        title: Text(widget.id != null ? t(context, ref, 'edit_resource') : t(context, ref, 'add_resource')),
      ),
      // SingleChildScrollView prevents overflow when the soft keyboard appears on small devices
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          // Attach the form key to enable programmatic validation via _formKey.currentState
          key: _formKey,
          child: Column(
            // Stretch children horizontally so the submit button fills the screen width
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Resource name field — required; identifies the asset in the DMS resource list
              _field(_nameCtrl, t(context, ref, 'name_label'), Icons.label_outline,
                  // Inline validator: name is mandatory for resource registration
                  validator: (v) => v == null || v.isEmpty ? t(context, ref, 'required') : null),

              const SizedBox(height: 16), // Vertical spacing between form fields

              // Resource type dropdown — categorizes the asset (e.g., VEHICLE, MEDICAL)
              _dropdown(t(context, ref, 'incident_type'), _types, _type, (v) => setState(() => _type = v!)),

              const SizedBox(height: 16), // Vertical spacing between form fields

              // Operational status dropdown — indicates if the resource is ready for dispatch
              _dropdown(t(context, ref, 'status_label'), _statuses, _status, (v) => setState(() => _status = v!)),

              const SizedBox(height: 16), // Vertical spacing between form fields

              // Optional quantity field — relevant for countable resources like medical kits or personnel
              _field(_qtyCtrl, t(context, ref, 'quantity'), Icons.numbers,
                  // Use numeric keyboard for quantity input to improve mobile UX
                  type: TextInputType.number),

              const SizedBox(height: 16), // Vertical spacing between form fields

              // Location field — stores the physical deployment point of this resource
              _field(_locationCtrl, t(context, ref, 'location'), Icons.location_on_outlined),

              const SizedBox(height: 24), // Extra spacing before the primary action button

              // Submit button — fixed height for consistent touch target size
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  // Disable button during API call to prevent duplicate resource submissions
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    // DMS primary accent color for the main call-to-action button
                    backgroundColor: AppColors.primary,
                    // Rounded corners align with DMS neon cyberpunk card design language
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  // Show spinner while awaiting the API response; show label text otherwise
                  child: _loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      // Button label changes contextually: "Save Changes" in edit mode, "Create Resource" in create mode
                      : Text(widget.id != null ? t(context, ref, 'save_changes') : t(context, ref, 'create_resource'),
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds a styled [TextFormField] consistent with the DMS form design system.
  ///
  /// [ctrl] is the controller that holds the field's text value.
  /// [label] is the localized placeholder/label shown inside the field.
  /// [icon] is the leading icon that visually categorizes the field (e.g., location pin).
  /// [type] optionally overrides the keyboard type (e.g., numeric for quantity).
  /// [validator] optionally provides inline validation logic for required fields.
  Widget _field(TextEditingController ctrl, String label, IconData icon,
      {TextInputType? type, String? Function(String?)? validator}) {
    return TextFormField(
      controller: ctrl,
      // Apply the specified keyboard type (e.g., number pad for quantity input)
      keyboardType: type,
      // Use the DMS primary text color so input is legible on dark card backgrounds
      style: const TextStyle(color: AppColors.textPrimary),
      // Attach the optional validator to enable form-level validation on submit
      validator: validator,
      // Apply DMS-themed border, label, icon, and fill styling via shared decoration helper
      decoration: _decoration(label, icon),
    );
  }

  /// Builds a styled [DropdownButtonFormField] for selecting enumerated DMS values.
  ///
  /// Used for resource type (PERSONNEL, VEHICLE, etc.) and operational status (AVAILABLE, etc.).
  /// [label] is the localized field label.
  /// [items] is the list of valid enum string values from the DMS backend.
  /// [value] is the currently selected value, held in component state.
  /// [onChanged] is the callback that updates state when a new value is selected.
  Widget _dropdown(String label, List<String> items, String value,
      void Function(String?) onChanged) {
    return DropdownButtonFormField<String>(
      value: value,
      // Use the DMS dark card color for the dropdown overlay to match the form background
      dropdownColor: AppColors.cardDark,
      // Ensure dropdown option text is visible against the dark overlay background
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        // Use secondary text color for the label so it recedes when the field is focused
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        // Fill the field with the dark card color for visual consistency with text fields
        filled: true,
        fillColor: AppColors.cardDark,
        // Default border: rounded corners with DMS border color
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border)),
        // Enabled (unfocused) border matches the default to keep consistent appearance
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border)),
        // Focused border uses DMS primary accent color to highlight the active dropdown
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary)),
      ),
      // Convert each enum string to a DropdownMenuItem; replace underscores for display readability
      items: items
          .map((v) => DropdownMenuItem(
              value: v,
              // Replace underscores with spaces for human-friendly labels (e.g., "OUT OF SERVICE")
              child: Text(v.replaceAll('_', ' '))))
          .toList(),
      // Delegate selection changes to the caller (updates _type or _status in component state)
      onChanged: onChanged,
    );
  }

  /// Returns a shared [InputDecoration] applied to all DMS text form fields.
  ///
  /// Enforces visual consistency: dark card fill, rounded 12px borders, DMS color tokens
  /// for label text, border colors, and prefix icons across the entire resource form.
  InputDecoration _decoration(String label, IconData icon) => InputDecoration(
        labelText: label,
        // Secondary color label recedes to hint state without disappearing completely
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        // Leading icon visually identifies each field's data type (name, location, quantity)
        prefixIcon: Icon(icon, color: AppColors.textSecondary),
        // Dark card fill for all form fields matches the DMS neon cyberpunk UI language
        filled: true,
        fillColor: AppColors.cardDark,
        // Default border with DMS border token (subtle outline around unfocused fields)
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border)),
        // Enabled border explicitly set to match the default border for style consistency
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border)),
        // Focused border switches to DMS primary accent to guide the user's attention
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary)),
      );
}