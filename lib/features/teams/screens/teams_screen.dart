// =============================================================================
// teams_screen.dart
//
// Rescue Teams Management Screen for the Disaster Management System (DMS).
//
// This screen provides a full CRUD interface for managing rescue teams —
// specialized response units that are dispatched during disaster incidents.
// Administrators can view all registered teams, add new teams, edit existing
// team details (name, specialization, contact, location), and delete teams.
//
// The screen uses Riverpod for reactive state management and fetches team
// data asynchronously from the backend via [TeamRepository].
//
// Part of the DMS mobile app's team coordination module.
// =============================================================================

// Flutter Material UI toolkit — provides Scaffold, AppBar, ListView, dialogs, etc.
import 'package:flutter/material.dart';
// Riverpod state management — enables reactive, provider-based data fetching
import 'package:flutter_riverpod/flutter_riverpod.dart';
// DMS color palette — neon cyberpunk theme tokens (primary, success, border, etc.)
import '../../../core/constants/app_colors.dart';
// Shared navigation drawer widget — consistent sidebar menu across DMS screens
import '../../../shared/widgets/app_drawer.dart';
// Data model representing a rescue team entity (name, specialization, contact, etc.)
import '../data/team_model.dart';
// Repository layer for REST API calls to the DMS backend team endpoints
import '../data/team_repository.dart';
// Localization helper — resolves translated strings based on the active locale
import '../../../core/l10n/app_strings.dart';

/// A Riverpod [FutureProvider] that fetches the full list of rescue teams
/// from the DMS backend. Automatically re-fetches when invalidated (e.g.,
/// after a create, update, or delete operation).
final _teamsProvider = FutureProvider<List<TeamModel>>((ref) {
  // Delegate the HTTP call to the injected [TeamRepository] instance
  return ref.watch(teamRepositoryProvider).getTeams();
});

/// The main screen for viewing and managing rescue teams in the DMS.
///
/// Displays a scrollable list of [_TeamCard] widgets, one per team.
/// Provides toolbar actions to refresh the list or open the add-team form.
/// Uses [ConsumerWidget] so it can reactively watch Riverpod providers.
class TeamsScreen extends ConsumerWidget {
  // Constant constructor — widget is immutable and safe to cache
  const TeamsScreen({super.key});

  /// Builds the rescue teams screen UI.
  ///
  /// [context] — the current widget's build context for theming and navigation.
  /// [ref] — Riverpod's widget reference for reading/watching providers.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch the async teams list — triggers a rebuild whenever data, loading, or error state changes
    final teamsAsync = ref.watch(_teamsProvider);

    return Scaffold(
      // Match the scaffold background to the active DMS theme (dark/light)
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      // Side navigation drawer shared across all DMS screens
      drawer: const AppDrawer(),
      appBar: AppBar(
        // Keep the AppBar background consistent with the page background
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Use the DMS primary text color for the back arrow and title
        foregroundColor: AppColors.textPrimary,
        // Localized title — resolves to "Rescue Teams" in the active language
        title: Text(t(context, ref, 'rescue_teams')),
        actions: [
          // Refresh button — invalidates the provider to trigger a fresh API call
          IconButton(
            icon: const Icon(Icons.refresh),
            // Invalidating _teamsProvider causes Riverpod to re-run the FutureProvider
            onPressed: () => ref.invalidate(_teamsProvider),
          ),
          // Add team button — opens the create-team dialog form
          IconButton(
            icon: const Icon(Icons.add),
            // No team passed means the form opens in "create" mode
            onPressed: () => _showTeamForm(context, ref),
          ),
        ],
      ),
      // Render different UI depending on the async state of the teams fetch
      body: teamsAsync.when(
        // Show a branded loading spinner while the API request is in flight
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        // Show the error message in the DMS primary accent color if the fetch fails
        error: (e, _) => Center(
            child: Text(e.toString(),
                style: const TextStyle(color: AppColors.primary))),
        // On success, render the list or an empty-state message
        data: (teams) => teams.isEmpty
            // Empty state — shown when no rescue teams are registered in the system
            ? Center(
                child: Text(t(context, ref, 'no_teams'),
                    style: const TextStyle(color: AppColors.textSecondary)))
            // Build a scrollable list of team cards
            : ListView.builder(
                itemCount: teams.length,
                itemBuilder: (context, index) {
                  // Extract the current team for this list position
                  final t = teams[index];
                  // Render each team as a card with edit and delete actions
                  return _TeamCard(
                    team: t,
                    // Edit action — opens form pre-populated with this team's data
                    onEdit: () => _showTeamForm(context, ref, team: t),
                    // Delete action — shows a confirmation dialog before removing
                    onDelete: () => _confirmDelete(context, ref, t.id),
                  );
                },
              ),
      ),
    );
  }

  /// Opens a modal dialog form for creating or editing a rescue team.
  ///
  /// If [team] is provided, the form pre-fills with that team's existing data
  /// and submits an update request. If [team] is null, the form is blank and
  /// submits a create request to register a new rescue team in the DMS.
  ///
  /// [context] — used to display the dialog and show error snackbars.
  /// [ref] — used to access the repository and invalidate the teams list.
  /// [team] — optional existing team to edit; null when creating a new team.
  Future<void> _showTeamForm(BuildContext context, WidgetRef ref,
      {TeamModel? team}) async {
    // Pre-populate controllers with existing data when editing, otherwise start empty
    final nameCtrl = TextEditingController(text: team?.name ?? '');
    // Specialization describes the team's disaster response capability (e.g., "Search & Rescue")
    final specCtrl =
        TextEditingController(text: team?.specialization ?? '');
    // Contact number for reaching the team lead during an active incident
    final phoneCtrl =
        TextEditingController(text: team?.contactNumber ?? '');
    // Base location or deployment zone of the rescue team
    final locationCtrl =
        TextEditingController(text: team?.location ?? '');

    // Show a modal dialog and await the user's save/cancel decision
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        // Adapt the dialog background to the active DMS theme (dark card vs. light grey)
        backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.cardDark : Colors.grey.shade100,
        // Title changes based on whether we are editing an existing team or adding a new one
        title: Text(team != null ? t(context, ref, 'edit_team') : t(context, ref, 'add_team'),
            style: const TextStyle(color: AppColors.textPrimary)),
        // Scrollable form content in case content overflows on small screens
        content: SingleChildScrollView(
          child: Column(
            // Shrink-wrap the column to only take the space needed by the fields
            mainAxisSize: MainAxisSize.min,
            children: [
              // Team name field — required; used to identify the team in incident dispatch
              _dialogField(nameCtrl, t(context, ref, 'team_name')),
              const SizedBox(height: 12),
              // Specialization field — describes the team's expertise (e.g., medical, fire, flood)
              _dialogField(specCtrl, t(context, ref, 'specialization_label')),
              const SizedBox(height: 12),
              // Contact number field — phone keyboard is shown for easier numeric input
              _dialogField(phoneCtrl, t(context, ref, 'contact_number'),
                  type: TextInputType.phone),
              const SizedBox(height: 12),
              // Location field — team's base or assigned operational area
              _dialogField(locationCtrl, t(context, ref, 'location')),
            ],
          ),
        ),
        actions: [
          // Cancel button — dismisses the dialog without saving any changes
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(t(context, ref, 'cancel'),
                  style: const TextStyle(color: AppColors.textSecondary))),
          // Save button — signals the dialog to commit the form data
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(t(context, ref, 'save'),
                  style: const TextStyle(color: AppColors.primary))),
        ],
      ),
    );

    // Only proceed if the user confirmed and the team name is not empty
    if (saved == true && nameCtrl.text.isNotEmpty) {
      // Assemble the request body from the form field values
      final body = {
        'name': nameCtrl.text.trim(),
        'specialization': specCtrl.text.trim(),
        // camelCase key matches the DMS backend REST API contract
        'contactNumber': phoneCtrl.text.trim(),
        'location': locationCtrl.text.trim(),
      };
      try {
        // Read the repository once (not watched) since we only need it for a single action
        final repo = ref.read(teamRepositoryProvider);
        if (team != null) {
          // Update the existing team record on the backend using its unique ID
          await repo.updateTeam(team.id, body);
        } else {
          // Create a brand-new rescue team entry in the DMS
          await repo.createTeam(body);
        }
        // Invalidate the cached teams list so the UI reflects the latest server state
        ref.invalidate(_teamsProvider);
      } catch (e) {
        // Guard against using a disposed context after an async gap
        if (context.mounted) {
          // Show the backend error (e.g., validation failure) as a snackbar
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(e.toString()), backgroundColor: AppColors.primary));
        }
      }
    }
  }

  /// Prompts the user with a confirmation dialog before permanently deleting
  /// a rescue team from the DMS.
  ///
  /// Deletion is irreversible — the team's assignment history and member
  /// associations may be affected, so explicit confirmation is required.
  ///
  /// [context] — used to show the dialog and error snackbar.
  /// [ref] — used to invoke the delete API and refresh the list.
  /// [id] — the unique database identifier of the team to be deleted.
  Future<void> _confirmDelete(
      BuildContext context, WidgetRef ref, int id) async {
    // Show a confirmation dialog before making the destructive API call
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        // Theme-aware background consistent with the rest of the DMS UI
        backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppColors.cardDark : Colors.grey.shade100,
        // Localized delete confirmation title
        title: Text(t(context, ref, 'delete_team'),
            style: const TextStyle(color: AppColors.textPrimary)),
        // Secondary-color body text to de-emphasize vs. the destructive action button
        content: Text(t(context, ref, 'confirm_delete'),
            style: const TextStyle(color: AppColors.textSecondary)),
        actions: [
          // Cancel — abort the deletion without any API call
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(t(context, ref, 'cancel'),
                  style: const TextStyle(color: AppColors.textSecondary))),
          // Delete — confirm the irreversible removal of this rescue team
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(t(context, ref, 'delete'),
                  style: const TextStyle(color: AppColors.primary))),
        ],
      ),
    );
    // Only call the backend if the user explicitly confirmed deletion
    if (confirmed == true) {
      try {
        // Send the DELETE request to the DMS backend for this team ID
        await ref.read(teamRepositoryProvider).deleteTeam(id);
        // Refresh the teams list so the deleted team is removed from the UI
        ref.invalidate(_teamsProvider);
      } catch (e) {
        // Ensure the context is still valid after the async delete operation
        if (context.mounted) {
          // Display any server-side error (e.g., team has active incident assignments)
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(e.toString()), backgroundColor: AppColors.primary));
        }
      }
    }
  }

  /// Builds a styled [TextField] for use inside the team create/edit dialog.
  ///
  /// Applies the DMS dark-fill input decoration with neon-accent focus border,
  /// ensuring visual consistency across all form fields in the dialog.
  ///
  /// [ctrl] — the controller that holds and reads the field's text value.
  /// [label] — localized placeholder/label shown inside the input field.
  /// [type] — optional keyboard type (e.g., [TextInputType.phone] for contact number).
  static Widget _dialogField(TextEditingController ctrl, String label,
      {TextInputType? type}) {
    return TextField(
      // Bind the field value to the external controller for read-back after save
      controller: ctrl,
      // Use the provided keyboard type, or default to standard text keyboard
      keyboardType: type,
      // Render typed text in the primary DMS text color for readability on dark fill
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        // Floating label shown above the field when focused or filled
        labelText: label,
        // De-emphasized label color — secondary tone from DMS design system
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        // Fill the field background to visually distinguish it from the dialog surface
        filled: true,
        // Dark background fill matching the DMS card/input color token
        fillColor: AppColors.bgDark,
        // Default border with DMS border color token and rounded corners
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.border)),
        // Idle (non-focused) border — same styling as the default border
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.border)),
        // Active (focused) border — switches to DMS primary neon accent to draw attention
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.primary)),
      ),
    );
  }
}

/// A private card widget that displays a single rescue team's summary in the list.
///
/// Shows the team's name, specialization (disaster type expertise), contact number,
/// and member count. Provides inline edit and delete action icons.
///
/// Used exclusively by [TeamsScreen]'s [ListView.builder].
class _TeamCard extends StatelessWidget {
  /// The rescue team data model to display on this card.
  final TeamModel team;

  /// Callback invoked when the user taps the edit icon — opens the edit form.
  final VoidCallback onEdit;

  /// Callback invoked when the user taps the delete icon — opens confirmation dialog.
  final VoidCallback onDelete;

  // Requires all three properties to be provided at construction time
  const _TeamCard({
    required this.team,
    required this.onEdit,
    required this.onDelete,
  });

  /// Builds the team card UI as a rounded, bordered container with icon, info, and actions.
  @override
  Widget build(BuildContext context) {
    return Container(
      // Horizontal padding keeps the cards from touching screen edges; vertical gap separates cards
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      // Internal padding around all card content
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        // DMS dark card surface color — distinguishes card from the page background
        color: AppColors.cardDark,
        // Rounded corners for a modern card aesthetic consistent with DMS design
        borderRadius: BorderRadius.circular(16),
        // Subtle border using the DMS border token to separate the card from its background
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          // Team icon badge — green-tinted circle with a groups icon to signal "team"
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              // 10% opacity success green gives a soft background without overpowering the icon
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            // Groups icon visually communicates that this entry represents a team unit
            child: const Icon(Icons.groups_outlined,
                color: AppColors.success, size: 24),
          ),
          // Horizontal spacer between the icon badge and the text content
          const SizedBox(width: 12),
          // Expanded column so team details fill available horizontal space
          Expanded(
            child: Column(
              // Left-align all text content within the card
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Team name — primary identifier; displayed in bold for scannability
                Text(team.name,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600)),
                // Specialization — only shown if the team has a defined expertise area
                if (team.specialization != null)
                  Text(team.specialization!,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
                // Contact number — only shown if available; used during incident dispatch
                if (team.contactNumber != null)
                  Text(team.contactNumber!,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
                // Member count — only shown if the backend provides it; useful for capacity planning
                if (team.memberCount != null)
                  Text('Members: ${team.memberCount}',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          // Action icons row — edit and delete, placed at the trailing edge of the card
          Row(
            children: [
              // Edit tap target — opens the edit form with this team's pre-filled data
              GestureDetector(
                onTap: onEdit,
                // Info blue color distinguishes the edit icon from the destructive delete
                child: const Icon(Icons.edit_outlined,
                    color: AppColors.info, size: 20),
              ),
              // Spacer between the edit and delete icons
              const SizedBox(width: 8),
              // Delete tap target — triggers confirmation before removing the team
              GestureDetector(
                onTap: onDelete,
                // Primary (neon) color used for destructive action — signals caution
                child: const Icon(Icons.delete_outline,
                    color: AppColors.primary, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
}