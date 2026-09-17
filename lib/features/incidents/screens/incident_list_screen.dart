/// ============================================================
/// File: incident_list_screen.dart
/// Feature: Incidents — List View
///
/// Displays a scrollable, filterable list of disaster incidents
/// reported within the DMS. The screen adapts its data-loading
/// strategy based on the authenticated user's role:
///   - CITIZEN users see only the incidents they personally filed.
///   - ADMIN / RESCUE_TEAM users see all system-wide incidents and
///     can filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
///     and severity (LOW, MEDIUM, HIGH, CRITICAL).
///
/// Supports infinite-scroll pagination, pull-to-refresh, keyword
/// search, and role-gated delete actions. Navigation to incident
/// creation and detail screens is handled via GoRouter.
/// ============================================================

// Flutter UI framework — provides Material widgets used throughout
import 'package:flutter/material.dart';
// Riverpod state management — ConsumerWidget/ConsumerState give
// reactive access to providers without manual setState boilerplate
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Declarative routing library — context.push() navigates without
// tight coupling to specific widget trees
import 'package:go_router/go_router.dart';

// DMS-specific color palette and severity-color mappings
import '../../../core/constants/app_colors.dart';
// Auth provider — exposes the currently signed-in user and their role
import '../../../features/auth/providers/auth_provider.dart';
// Side-drawer widget shared across all main DMS screens
import '../../../shared/widgets/app_drawer.dart';
// Reusable card widget that renders a single incident summary row
import '../../../shared/widgets/incident_card.dart';
// Widget shown when the incident list is empty, prompting a refresh
import '../../../shared/widgets/empty_state.dart';
// Riverpod provider and notifier that manages incident state, pagination,
// filtering, and CRUD operations against the DMS REST API
import '../providers/incident_provider.dart';
// Localisation helper — t(context, ref, key) resolves translated strings
import '../../../core/l10n/app_strings.dart';

/// [IncidentListScreen] is a stateful Riverpod consumer widget so that
/// it can both watch reactive providers (for rebuilds) and hold local
/// UI state such as scroll position, search text, and active filters.
class IncidentListScreen extends ConsumerStatefulWidget {
  // Standard const constructor; key is forwarded to the framework for
  // widget identity tracking during tree diffing
  const IncidentListScreen({super.key});

  @override
  // Creates the mutable state object associated with this widget
  ConsumerState<IncidentListScreen> createState() => _IncidentListScreenState();
}

/// Private state class for [IncidentListScreen].
/// Manages scroll-driven pagination, search, and status/severity filters.
class _IncidentListScreenState extends ConsumerState<IncidentListScreen> {
  // Controls the ListView so we can listen for scroll position changes
  // and trigger the next page load when the user nears the bottom
  final _scrollController = ScrollController();

  // Holds the text the user types in the search box; used when
  // submitting a keyword query to the incident provider
  final _searchCtrl = TextEditingController();

  // Currently selected status filter; empty string means "all statuses"
  String _filterStatus = '';

  // Currently selected severity filter; empty string means "all severities"
  String _filterSeverity = '';

  // Ordered list of incident lifecycle statuses available as filter chips.
  // Empty string represents the "All" / no-filter option shown first.
  static const _statuses = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  // Ordered list of incident severity levels used for colour-coded filter chips.
  // Empty string is included so that the index offset matches _statuses,
  // but it is skipped when rendering severity chips (see skip(1) below).
  static const _severities = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  @override
  void initState() {
    super.initState();
    // Defer the initial data load until after the first frame so that
    // the widget tree is fully built and providers are readable
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    // Register the scroll listener that drives infinite pagination
    _scrollController.addListener(_onScroll);
  }

  /// Loads incidents from the DMS backend.
  ///
  /// Role-based branching ensures CITIZEN users only ever retrieve
  /// their own reports, while privileged roles (ADMIN, RESCUE_TEAM,
  /// OFFICER) retrieve the full system-wide incident feed.
  /// [refresh] = true resets pagination and re-fetches from page 1.
  void _load({bool refresh = false}) {
    // Read the current user's role from the auth provider (non-reactive
    // read is sufficient here since we don't need to rebuild on change)
    final role = ref.read(authProvider).user?.role ?? '';
    // Obtain the incident notifier which exposes data-loading methods
    final notifier = ref.read(incidentProvider.notifier);
    if (role == 'CITIZEN') {
      // Citizens are restricted to their own filed incidents for privacy
      notifier.loadMyIncidents();
    } else {
      // Admin/rescue/officer roles load the complete incident registry
      notifier.loadIncidents(refresh: refresh);
    }
  }

  /// Scroll listener that triggers pagination when the user is within
  /// 200 logical pixels of the end of the current incident list.
  /// Avoids duplicate requests by checking the loading and hasMore flags.
  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      // Read current state snapshot to check pagination readiness
      final state = ref.read(incidentProvider);
      // Only request the next page if a fetch isn't already in-flight
      // and the backend has indicated there are more records available
      if (!state.isLoading && state.hasMore) {
        ref.read(incidentProvider.notifier).loadIncidents();
      }
    }
  }

  /// Pushes the current search query and status filter into the incident
  /// provider, then refreshes the list from page 1 so results reflect
  /// the updated criteria immediately.
  void _applyFilters() {
    ref.read(incidentProvider.notifier).setFilters(
          status: _filterStatus,
          // Trim whitespace to avoid accidental empty-string queries
          query: _searchCtrl.text.trim(),
        );
    // Refresh from the start so stale results from the previous filter
    // are not mixed with the newly filtered response pages
    ref.read(incidentProvider.notifier).loadIncidents(refresh: true);
  }

  @override
  // Release controllers to prevent memory leaks when the screen is removed
  void dispose() {
    // Detach the scroll listener and free the controller's resources
    _scrollController.dispose();
    // Dispose of the search text controller to release its resources
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Watch incident state reactively — any change triggers a rebuild
    final state = ref.watch(incidentProvider);
    // Watch the auth state to derive role-dependent UI behaviour
    final role = ref.watch(authProvider).user?.role ?? '';
    // Only admins and rescue teams are permitted to delete incident records;
    // citizens and officers see cards without a delete affordance
    final canDelete = role == 'ADMIN' || role == 'RESCUE_TEAM';

    return Scaffold(
      // Use the theme's scaffold background so dark/light mode is respected
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      // Side navigation drawer shared across DMS main screens
      drawer: const AppDrawer(),
      appBar: AppBar(
        // Keep the app bar background consistent with the scaffold
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Foreground (icons, back arrow) uses the DMS primary text colour
        foregroundColor: AppColors.textPrimary,
        // Localised "Incidents" title resolved via the l10n helper
        title: Text(t(context, ref, 'incidents')),
      ),
      // FAB allows any authenticated user to report a new incident
      floatingActionButton: FloatingActionButton(
        // Brand primary colour for high visibility and brand consistency
        backgroundColor: AppColors.primary,
        // Navigate to the incident creation flow via GoRouter
        onPressed: () => context.push('/incidents/create'),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          // -- Search bar ----------------------------------------------------
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _searchCtrl,
              // Explicit text colour so it is legible in both themes
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                // Localised placeholder that hints the keyword search intent
                hintText: t(context, ref, 'search_incidents'),
                hintStyle: const TextStyle(color: AppColors.textSecondary),
                // Magnifier icon visually signals search functionality
                prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                // Filled background improves contrast against the scaffold
                filled: true,
                // Adapt fill colour to the active brightness theme
                fillColor: Theme.of(context).brightness == Brightness.dark
                    ? AppColors.cardDark
                    : Colors.grey.shade50,
                // Default rounded border for a modern card-like look
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                // Resting state border matches the DMS border token
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                // Focused border highlights with the DMS primary accent colour
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
              // Submit from the keyboard triggers filter application
              onSubmitted: (_) => _applyFilters(),
            ),
          ),

          // -- Status & severity filter chips (admin/rescue only) ------------
          // Citizens only see their own incidents, so filtering is unnecessary
          if (role != 'CITIZEN')
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: SingleChildScrollView(
                // Horizontal scroll accommodates all chips on small screens
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    // Status filter chips — "All", OPEN, IN_PROGRESS, RESOLVED, CLOSED
                    ..._statuses.map((s) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            // Empty string maps to the localised "All Status" label
                            label: Text(s.isEmpty
                                ? t(context, ref, 'all_status')
                                // Replace underscore with space for readability (e.g. IN_PROGRESS -> IN PROGRESS)
                                : s.replaceAll('_', ' ')),
                            // Chip is selected when its value matches the active filter
                            selected: _filterStatus == s,
                            onSelected: (_) {
                              // Update local filter state then re-fetch with new criteria
                              setState(() => _filterStatus = s);
                              _applyFilters();
                            },
                            // Selected chip uses the DMS primary brand colour
                            selectedColor: AppColors.primary,
                            // Unselected background adapts to current brightness
                            backgroundColor: Theme.of(context).brightness == Brightness.dark
                                ? AppColors.cardDark
                                : Colors.grey.shade100,
                            labelStyle: TextStyle(
                              // White text on selected (coloured) chip; muted on unselected
                              color: _filterStatus == s
                                  ? Colors.white
                                  : AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        )),

                    // Severity filter chips — LOW, MEDIUM, HIGH, CRITICAL
                    // skip(1) omits the empty-string placeholder included in _severities
                    ..._severities.skip(1).map((s) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(s),
                            // Chip is active when its value matches the severity filter
                            selected: _filterSeverity == s,
                            onSelected: (_) {
                              setState(() =>
                                  // Tapping the active chip again clears the filter (toggle)
                                  _filterSeverity = _filterSeverity == s ? '' : s);
                              _applyFilters();
                            },
                            // Selected colour is severity-specific (e.g. red for CRITICAL)
                            selectedColor: AppColors.severityColor(s),
                            backgroundColor: Theme.of(context).brightness == Brightness.dark
                                ? AppColors.cardDark
                                : Colors.grey.shade100,
                            labelStyle: TextStyle(
                              // White text ensures legibility on coloured severity backgrounds
                              color: _filterSeverity == s
                                  ? Colors.white
                                  : AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        )),
                  ],
                ),
              ),
            ),

          // -- Incident list / empty state -----------------------------------
          Expanded(
            child: state.incidents.isEmpty && !state.isLoading
                // Show a friendly empty state when no incidents match the criteria
                ? EmptyState(
                    icon: Icons.warning_amber_outlined,
                    title: t(context, ref, 'no_incidents'),
                    // Provide a refresh action so users can retry without navigating away
                    action: TextButton.icon(
                      onPressed: () => _load(refresh: true),
                      icon: const Icon(Icons.refresh, color: AppColors.primary),
                      label: Text(t(context, ref, 'refresh_btn'),
                          style: const TextStyle(color: AppColors.primary)),
                    ),
                  )
                // Wrap in RefreshIndicator to support pull-to-refresh gesture
                : RefreshIndicator(
                    onRefresh: () async => _load(refresh: true),
                    child: ListView.builder(
                      controller: _scrollController,
                      // AlwaysScrollableScrollPhysics ensures pull-to-refresh
                      // works even when the list content is shorter than the viewport
                      physics: const AlwaysScrollableScrollPhysics(),
                      // Reserve an extra slot at the end for the loading spinner
                      itemCount: state.incidents.length + (state.isLoading ? 1 : 0),
                      itemBuilder: (context, index) {
                        // Last slot — render a loading indicator while fetching the next page
                        if (index == state.incidents.length) {
                          return const Center(
                              child: Padding(
                            padding: EdgeInsets.all(16),
                            // DMS primary colour spinner to maintain visual consistency
                            child: CircularProgressIndicator(
                                color: AppColors.primary),
                          ));
                        }
                        // Retrieve the incident model at the current list index
                        final inc = state.incidents[index];
                        return IncidentCard(
                          incident: inc,
                          // Navigate to the full incident detail screen on tap
                          onTap: () => context.push('/incidents/${inc.id}'),
                          // Wire delete callback only for privileged roles;
                          // null disables the delete affordance inside IncidentCard
                          onDelete: canDelete
                              ? () => _confirmDelete(inc.id)
                              : null,
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  /// Shows a confirmation dialog before permanently deleting an incident
  /// from the DMS. Only reachable by ADMIN and RESCUE_TEAM roles.
  ///
  /// [id] — unique database identifier of the incident to be deleted.
  Future<void> _confirmDelete(int id) async {
    // Present a modal dialog; returns true if the user confirms, false/null otherwise
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        // Match the dialog background to the current brightness theme
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppColors.cardDark
            : Colors.grey.shade100,
        // Localised dialog title labelling the destructive action
        title: Text(t(context, ref, 'delete_incident'),
            style: const TextStyle(color: AppColors.textPrimary)),
        // Localised warning copy asking the user to confirm the deletion
        content: Text(t(context, ref, 'confirm_delete'),
            style: const TextStyle(color: AppColors.textSecondary)),
        actions: [
          // Cancel button — dismisses the dialog without taking any action
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(t(context, ref, 'cancel'),
                  style: const TextStyle(color: AppColors.textSecondary))),
          // Confirm button — returns true to proceed with deletion
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(t(context, ref, 'delete'),
                  style: const TextStyle(color: AppColors.primary))),
        ],
      ),
    );
    // Proceed only if the user explicitly confirmed and the widget is still mounted
    if (confirmed == true && mounted) {
      try {
        // Delegate the DELETE request to the incident notifier which calls the DMS API
        await ref.read(incidentProvider.notifier).deleteIncident(id);
      } catch (e) {
        // Guard against widget disposal between the async gap and the snackbar call
        if (mounted) {
          // Surface the error message to the user via a transient snack bar
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString()),
              // Use DMS primary colour to keep error snackbars on-brand
              backgroundColor: AppColors.primary,
            ),
          );
        }
      }
    }
  }
}