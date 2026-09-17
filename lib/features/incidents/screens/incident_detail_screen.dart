// =============================================================================
// incident_detail_screen.dart
//
// Displays the full details of a single disaster incident in the DMS mobile app.
// This screen is accessible to all authenticated users, but management actions
// (status updates, team assignment, editing) are restricted to ADMIN and RESPONDER
// roles. It pulls incident data via Riverpod's incidentDetailProvider and
// supports real-time status updates that persist back to the DMS backend.
// =============================================================================

// --- Third-party package imports ---
import 'package:cached_network_image/cached_network_image.dart'; // Efficiently loads and caches incident media images from the DMS server
import 'package:flutter/material.dart'; // Core Flutter UI framework
import 'package:flutter_riverpod/flutter_riverpod.dart'; // State management — watches auth state and incident data reactively
import 'package:go_router/go_router.dart'; // Declarative routing — used to navigate to edit screen and teams screen
import 'package:url_launcher/url_launcher.dart'; // Opens external Google Maps link with incident coordinates

// --- Internal core imports ---
import '../../../core/constants/app_colors.dart'; // DMS design system color tokens (neon cyberpunk palette)

// --- Feature-level imports ---
import '../../../features/auth/providers/auth_provider.dart'; // Provides current user's role to gate management UI

// --- Shared widget imports ---
import '../../../shared/widgets/severity_badge.dart'; // Colored badge showing incident severity (LOW/MEDIUM/HIGH/CRITICAL)
import '../../../shared/widgets/status_badge.dart'; // Colored badge showing lifecycle status (OPEN, IN_PROGRESS, etc.)

// --- Incident feature-local imports ---
import '../data/models/incident_model.dart'; // Data model representing a DMS incident with all its fields
import '../providers/incident_provider.dart'; // Riverpod providers for fetching and mutating incident data
import '../../../core/l10n/app_strings.dart'; // Localization helper — resolves translated strings by key for multilingual support

/// Top-level screen widget for displaying a single incident's full detail view.
/// Uses [ConsumerStatefulWidget] so it can watch Riverpod providers for
/// reactive data fetching and role-based UI rendering.
class IncidentDetailScreen extends ConsumerStatefulWidget {
  /// The unique DMS incident ID, passed via the route (e.g. /incidents/:id).
  final int id;

  /// Requires [id] to identify which incident to load from the backend.
  const IncidentDetailScreen({super.key, required this.id});

  @override
  ConsumerState<IncidentDetailScreen> createState() =>
      _IncidentDetailScreenState();
}

/// Private state class for [IncidentDetailScreen].
/// Builds the scaffold and delegates the body to [_DetailBody] once data loads.
class _IncidentDetailScreenState extends ConsumerState<IncidentDetailScreen> {
  @override
  Widget build(BuildContext context) {
    // Watch the async incident detail provider — triggers rebuild on load/error/data transitions
    final incidentAsync = ref.watch(incidentDetailProvider(widget.id));

    // Read the current user's role from auth state; default to empty string if not authenticated
    final role = ref.watch(authProvider).user?.role ?? '';

    // Only ADMIN and RESPONDER roles can update status, assign teams, or edit incidents
    final canManage = role == 'ADMIN' || role == 'RESPONDER';

    return Scaffold(
      // Use theme's scaffold background to support light/dark mode switching
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Match app bar background to scaffold for a seamless look in both themes
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        foregroundColor: AppColors.textPrimary, // Ensures back arrow and title use DMS text color
        // Localized title key resolves to "Incident Detail" in the active language
        title: Text(t(context, ref, 'incident_detail')),
        actions: [
          // Show edit button only if the current user has management privileges
          if (canManage)
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              // Navigate to the incident edit screen using the incident's ID in the route
              onPressed: () => context.push('/incidents/${widget.id}/edit'),
            ),
        ],
      ),
      // Handle the three async states: loading spinner, error message, or populated detail body
      body: incidentAsync.when(
        // Show a branded loading spinner while the incident data is being fetched
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        // Display the error message in DMS primary color if the fetch fails
        error: (e, _) => Center(
            child: Text(e.toString(),
                style: const TextStyle(color: AppColors.primary))),
        // Pass the loaded incident and role flags to the detail body widget
        data: (incident) => _DetailBody(
          incident: incident,
          canManage: canManage,
          isAdmin: role == 'ADMIN', // Extra admin-only flag for team assignment action
        ),
      ),
    );
  }
}

/// Internal stateful widget that renders the full incident detail content.
/// Separated from the parent screen so state (e.g. current status) is scoped
/// to the body without rebuilding the entire scaffold.
class _DetailBody extends ConsumerStatefulWidget {
  /// The fully loaded incident model from the DMS backend.
  final IncidentModel incident;

  /// Whether the current user can perform management actions (ADMIN or RESPONDER).
  final bool canManage;

  /// Whether the current user has ADMIN-level privileges (needed for team assignment).
  final bool isAdmin;

  const _DetailBody({
    required this.incident,
    required this.canManage,
    required this.isAdmin,
  });

  @override
  ConsumerState<_DetailBody> createState() => _DetailBodyState();
}

/// Private state for [_DetailBody].
/// Manages the locally tracked status so the UI reflects optimistic updates
/// before the next provider refresh.
class _DetailBodyState extends ConsumerState<_DetailBody> {
  /// Local copy of the incident's lifecycle status — updated optimistically on change.
  late String _status;

  @override
  void initState() {
    super.initState();
    // Seed local status from the incident model so the dropdown shows the correct initial value
    _status = widget.incident.status;
  }

  /// Persists a new lifecycle status to the DMS backend via the incident notifier.
  /// On success, updates local state optimistically; on failure, shows a snackbar error.
  Future<void> _updateStatus(String newStatus) async {
    try {
      // Dispatch status update through Riverpod notifier which calls the DMS REST API
      await ref
          .read(incidentProvider.notifier)
          .updateStatus(widget.incident.id, newStatus);
      // Optimistically update local status so the badge and dropdown reflect the change immediately
      setState(() => _status = newStatus);
    } catch (e) {
      // Guard against calling context after widget disposal (async gap)
      if (mounted) {
        // Show the error from the backend (e.g. permission denied, network error)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.primary),
        );
      }
    }
  }

  /// Navigates to the Teams management screen where an admin can assign
  /// a response team to this incident.
  Future<void> _assignTeam() async {
    // Navigates to teams screen where admin can manage team assignments
    if (mounted) context.push('/teams');
  }

  /// Opens Google Maps at the incident's GPS coordinates using the device's
  /// default browser or maps app, allowing responders to navigate to the scene.
  Future<void> _openMaps() async {
    final lat = widget.incident.latitude;
    final lng = widget.incident.longitude;
    // Only attempt to open maps if valid coordinates are available on the incident
    if (lat != null && lng != null) {
      // Build a Google Maps search URL using the incident's exact coordinates
      final uri = Uri.parse(
          'https://www.google.com/maps/search/?api=1&query=$lat,$lng');
      // Verify the URL can be launched before attempting — avoids crashes on restricted devices
      if (await canLaunchUrl(uri)) await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Shorthand reference to avoid repeated widget.incident access throughout the build
    final inc = widget.incident;

    return SingleChildScrollView(
      // Vertical column layout — top-to-bottom: hero image, metadata, actions
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- Hero media section ---
          // Show the first attached image as a full-width hero if the incident has media
          if (inc.media.isNotEmpty)
            SizedBox(
              height: 220, // Fixed hero height for visual consistency across incident types
              child: CachedNetworkImage(
                imageUrl: inc.media.first.url, // Primary evidence photo uploaded with the incident report
                fit: BoxFit.cover, // Fill the hero area, cropping excess rather than letterboxing
                width: double.infinity,
                // Show a branded loading spinner while the image downloads from the DMS media server
                placeholder: (_, __) => const ColoredBox(
                    color: AppColors.cardDark,
                    child: Center(
                        child: CircularProgressIndicator(
                            color: AppColors.primary))),
                // Fallback icon if the media URL is broken or the file was deleted
                errorWidget: (_, __, ___) => Container(
                  color: AppColors.cardDark,
                  child: const Icon(Icons.image_not_supported,
                      color: AppColors.textSecondary, size: 48),
                ),
              ),
            )
          else
            // Placeholder hero when no media was attached to the incident report
            Container(
              height: 180,
              color: AppColors.cardDark,
              // Warning icon signals this is an incident even without a photo
              child: const Center(
                  child: Icon(Icons.warning_amber_rounded,
                      color: AppColors.textSecondary, size: 64)),
            ),

          // --- Incident metadata section ---
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Incident title — the primary human-readable identifier of the disaster event
                Text(inc.title,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),

                // --- Classification badges row ---
                Row(children: [
                  // Severity badge (e.g. CRITICAL in red) — helps responders triage priority
                  SeverityBadge(severity: inc.severity),
                  const SizedBox(width: 8),
                  // Status badge reflects the current lifecycle phase, using local _status for optimistic UI
                  StatusBadge(status: _status),
                  const SizedBox(width: 8),
                  // Incident type chip (e.g. FLOOD, FIRE) styled with DMS info color
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.15), // Subtle tinted background for the type label
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.info), // Outlined style matching DMS design system
                    ),
                    child: Text(inc.type,
                        style: const TextStyle(
                            color: AppColors.info,
                            fontSize: 11,
                            fontWeight: FontWeight.w600)),
                  ),
                ]),

                // --- Optional description block ---
                // Only rendered if the reporter provided a textual description of the disaster
                if (inc.description != null) ...[
                  const SizedBox(height: 16),
                  Text(inc.description!,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 14)),
                ],

                const SizedBox(height: 16),
                const Divider(color: AppColors.border), // Visual separator between description and metadata rows

                // --- Location info row ---
                // Shows location name, city, or raw GPS coordinates; tapping "Open Map" launches Google Maps
                if (inc.locationName != null || inc.city != null ||
                    (inc.latitude != null && inc.longitude != null))
                  _infoRow(
                    Icons.location_on_outlined,
                    // Prefer a named location; fall back to city, then raw lat/lng
                    inc.locationName ?? inc.city ?? '${inc.latitude}, ${inc.longitude}',
                    // Append an "Open Map" button only when GPS coordinates are available
                    trailing: (inc.latitude != null && inc.longitude != null)
                        ? TextButton(
                            onPressed: _openMaps,
                            child: Text(t(context, ref, 'open_map'),
                                style: const TextStyle(color: AppColors.info, fontSize: 12)),
                          )
                        : null,
                  ),

                // --- Reporter info row ---
                // Shows the name of the citizen or officer who originally filed the incident
                if (inc.reportedByName != null)
                  _infoRow(Icons.person_outline, '${t(context, ref, 'reported_by')}: ${inc.reportedByName}'),

                // --- Assigned team info row ---
                // Displays the response team currently assigned to handle this incident
                if (inc.assignedTeamName != null)
                  _infoRow(Icons.groups_outlined,
                      '${t(context, ref, 'assigned_to')}: ${inc.assignedTeamName}'),

                // --- Report timestamp row ---
                // Shows the date the incident was reported — first 10 chars gives YYYY-MM-DD
                if (inc.createdAt != null)
                  _infoRow(Icons.access_time_outlined,
                      'Reported: ${inc.createdAt!.substring(0, 10)}'),

                // --- Additional media gallery ---
                // If the incident has more than one attached image, show a horizontal thumbnail strip
                if (inc.media.length > 1) ...[
                  const SizedBox(height: 16),
                  Text(t(context, ref, 'media_label'),
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 90, // Fixed thumbnail row height for consistent media gallery appearance
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal, // Horizontal scroll through all attached incident photos
                      itemCount: inc.media.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8), // Gap between thumbnails
                      itemBuilder: (_, i) => ClipRRect(
                        borderRadius: BorderRadius.circular(8), // Rounded corners matching DMS card style
                        child: CachedNetworkImage(
                          imageUrl: inc.media[i].url, // Each media item's URL from the DMS file storage
                          width: 90,
                          height: 90,
                          fit: BoxFit.cover, // Square crop for uniform thumbnail grid appearance
                          // Show broken image icon if a specific media file fails to load
                          errorWidget: (_, __, ___) => const ColoredBox(
                              color: AppColors.cardDark,
                              child: Icon(Icons.broken_image,
                                  color: AppColors.textSecondary)),
                        ),
                      ),
                    ),
                  ),
                ],

                // --- Management actions section (ADMIN / RESPONDER only) ---
                if (widget.canManage) ...[
                  const SizedBox(height: 20),
                  const Divider(color: AppColors.border), // Visually separates public info from privileged actions
                  const SizedBox(height: 8),
                  Text(t(context, ref, 'change_status'),
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),

                  // Status dropdown — lets ADMIN/RESPONDER advance the incident through its lifecycle
                  DropdownButtonFormField<String>(
                    value: _status, // Controlled by local state so optimistic updates are reflected immediately
                    dropdownColor: AppColors.cardDark, // Dark dropdown background matches DMS card styling
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      labelText: t(context, ref, 'change_status'),
                      labelStyle:
                          const TextStyle(color: AppColors.textSecondary),
                      filled: true,
                      // Adapt fill color to current theme — dark card in dark mode, light grey in light mode
                      fillColor: Theme.of(context).brightness == Brightness.dark ? AppColors.cardDark : Colors.grey.shade50,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: AppColors.border)),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: AppColors.border)),
                    ),
                    // All valid DMS incident lifecycle statuses — reflects the backend enum
                    items: ['REPORTED', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
                        .map((s) => DropdownMenuItem(
                            // Replace underscores with spaces for readable display (e.g. "IN PROGRESS")
                            value: s,
                            child: Text(s.replaceAll('_', ' '))))
                        .toList(),
                    // Trigger async backend update and optimistic local state change on selection
                    onChanged: (v) {
                      if (v != null) _updateStatus(v);
                    },
                  ),

                  // --- Admin-only: Assign team button ---
                  // Only ADMIN users can assign response teams — RESPONDER role cannot
                  if (widget.isAdmin) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity, // Full-width button for easy tap target on mobile
                      child: OutlinedButton.icon(
                        onPressed: _assignTeam, // Navigates to /teams for team management
                        icon: const Icon(Icons.group_add_outlined,
                            color: AppColors.info),
                        label: Text(t(context, ref, 'assign_team'),
                            style: const TextStyle(color: AppColors.info)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.info), // Info-colored outline matches DMS design system
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ],
                const SizedBox(height: 32), // Bottom padding so last item isn't flush against screen edge
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Renders a single metadata row with a leading icon, label text, and optional trailing widget.
  /// Used throughout the detail body to display incident fields like location, reporter, and timestamps.
  ///
  /// [icon] — Material icon representing the type of metadata (location, person, time, etc.)
  /// [text] — The human-readable metadata value to display
  /// [trailing] — Optional widget appended to the right (e.g. "Open Map" button for GPS fields)
  Widget _infoRow(IconData icon, String text, {Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6), // Consistent vertical spacing between metadata rows
      child: Row(
        children: [
          // Leading icon rendered in muted secondary color to avoid competing with the text
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          // Expanded text allows long values (e.g. location names) to wrap without overflowing
          Expanded(
              child: Text(text,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 13))),
          // Render the trailing widget (e.g. map button) only when provided
          if (trailing != null) trailing,
        ],
      ),
    );
  }
}