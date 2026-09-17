// =============================================================================
// user_management_screen.dart
//
// Admin-facing screen for the Disaster Management System (DMS) that allows
// privileged administrators to view, manage, and moderate all registered users.
//
// Responsibilities:
//   - Fetches and displays the full list of DMS users (citizens, responders,
//     officials, and other admins) from the backend via [UserManagementRepository].
//   - Allows admins to reassign a user's system role (e.g., promote a CITIZEN
//     to RESPONDER so they can manage incident responses).
//   - Allows admins to permanently delete a user account from the DMS.
//
// Architecture:
//   - Built with Flutter + Riverpod for reactive state management.
//   - Uses [FutureProvider] for async data fetching with loading/error/data states.
//   - Delegates data operations to [UserManagementRepository].
// =============================================================================

// Flutter UI framework — provides Material widgets (Scaffold, AppBar, ListView, etc.)
import 'package:flutter/material.dart';

// Riverpod state management — provides ConsumerWidget, FutureProvider, and WidgetRef
// for reactive, testable state outside the widget tree
import 'package:flutter_riverpod/flutter_riverpod.dart';

// DMS color palette — neon cyberpunk theme tokens (primary, warning, info, cardDark, etc.)
import '../../../core/constants/app_colors.dart';

// Shared navigation drawer — provides consistent sidebar navigation across DMS screens
import '../../../shared/widgets/app_drawer.dart';

// Data model representing a single DMS user's management-relevant fields
// (id, name, email, phone, role)
import '../data/user_management_model.dart';

// Repository providing CRUD operations for user management against the DMS backend API
import '../data/user_management_repository.dart';

// Localization helper — provides the [t()] function for translating string keys
// into the active locale (supports Arabic, English, French, Spanish, Turkish)
import '../../../core/l10n/app_strings.dart';

/// Riverpod [FutureProvider] that asynchronously fetches the full list of DMS users.
///
/// Declared at file-level (private) so it is scoped to this screen only.
/// Calling [ref.invalidate(_usersProvider)] forces a fresh network fetch,
/// which is used after role updates and deletions to keep the UI in sync.
final _usersProvider = FutureProvider<List<UserManagementModel>>((ref) {
  // Delegate to the repository layer; [ref.watch] ensures the provider
  // re-evaluates if the repository itself ever changes.
  return ref.watch(userManagementRepositoryProvider).getUsers();
});

/// Admin screen for managing all registered users in the DMS.
///
/// Only accessible to users with the ADMIN role. Displays a scrollable list
/// of all accounts and exposes role-change and delete actions for each.
///
/// Extends [ConsumerWidget] so the widget can reactively read Riverpod providers.
class UserManagementScreen extends ConsumerWidget {
  /// Creates the [UserManagementScreen]; [key] is forwarded to [ConsumerWidget].
  const UserManagementScreen({super.key});

  /// Builds the full admin user management UI.
  ///
  /// Watches [_usersProvider] and renders one of three states:
  ///   - Loading spinner while the backend request is in flight.
  ///   - Error message if the request fails (e.g., network issue, 403 Forbidden).
  ///   - Scrollable [ListView] of [_UserCard] widgets when data is available.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Subscribe to the async user list; rebuilds whenever the provider state changes
    final usersAsync = ref.watch(_usersProvider);

    return Scaffold(
      // Use theme-aware scaffold background to support DMS light/dark modes
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,

      // Shared DMS navigation drawer — allows admin to switch between screens
      drawer: const AppDrawer(),

      appBar: AppBar(
        // Match scaffold background so the app bar blends into the dark theme
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,

        // Use the DMS primary text color for icons and the back button
        foregroundColor: AppColors.textPrimary,

        // Localised title — resolves the 'users' key from the active locale file
        title: Text(t(context, ref, 'users')),

        actions: [
          // Refresh button — invalidates the provider to trigger a fresh API call,
          // useful after external changes to the user list (e.g., new registrations)
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(_usersProvider),
          ),
        ],
      ),

      // Render the appropriate UI based on the async provider state
      body: usersAsync.when(
        // Show a branded circular spinner while the user list is loading
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppColors.primary)),

        // Show the raw error message if the backend call fails;
        // uses primary (neon) color so it stands out on the dark background
        error: (e, _) => Center(
            child: Text(e.toString(),
                style: const TextStyle(color: AppColors.primary))),

        // Data received — render empty-state message or the scrollable user list
        data: (users) => users.isEmpty
            // Empty state: no users registered in the DMS yet
            ? Center(
                child: Text(t(context, ref, 'no_users'),
                    style: const TextStyle(color: AppColors.textSecondary)))
            // Non-empty: build a card for each user account
            : ListView.builder(
                itemCount: users.length,
                itemBuilder: (context, index) {
                  // Alias for the current user model in the iteration
                  final u = users[index];
                  return _UserCard(
                    user: u,
                    // Callback: open the role-assignment dialog for this user
                    onChangeRole: () => _showRoleDialog(context, ref, u),
                    // Callback: open the delete-confirmation dialog for this user
                    onDelete: () => _confirmDelete(context, ref, u.id),
                  );
                },
              ),
      ),
    );
  }

  /// Shows a modal dialog allowing the admin to reassign the [user]'s DMS role.
  ///
  /// Presents all valid DMS roles as radio buttons. On confirmation, calls the
  /// repository to persist the change and refreshes the user list provider.
  ///
  /// Roles available in the DMS:
  ///   - ADMIN     — full system access, can manage users and resources
  ///   - RESPONDER — field personnel who respond to disaster incidents
  ///   - OFFICIAL  — government/agency officials who oversee operations
  ///   - CITIZEN   — general public who can report incidents and view alerts
  Future<void> _showRoleDialog(
      BuildContext context, WidgetRef ref, UserManagementModel user) async {
    // Complete list of assignable roles in the DMS permission model
    final roles = ['ADMIN', 'RESPONDER', 'OFFICIAL', 'CITIZEN'];

    // Pre-select the user's current role so the dialog opens in a valid state
    String selected = user.role;

    // Display a [StatefulBuilder]-based dialog so radio selection updates in place
    // without rebuilding the entire parent widget tree
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        // [setState] here is local to the dialog — updates only the radio buttons
        builder: (ctx, setState) => AlertDialog(
          // Use the DMS dark card background to match the neon cyberpunk theme
          backgroundColor: AppColors.cardDark,

          // Dialog title shows which user's role is being changed
          title: Text('${t(context, ref, 'change_role')}: ${user.name}',
              style: const TextStyle(color: AppColors.textPrimary)),

          // Build one radio tile per available DMS role
          content: Column(
            // Shrink column height to fit only the radio tiles — no wasted space
            mainAxisSize: MainAxisSize.min,
            children: roles
                .map((r) => RadioListTile<String>(
                      // Display the role name as-is (already human-readable enum value)
                      title: Text(r,
                          style: const TextStyle(color: AppColors.textPrimary)),
                      value: r,
                      // [groupValue] drives which radio is currently selected
                      groupValue: selected,
                      // Highlight the selected radio in the DMS primary neon color
                      activeColor: AppColors.primary,
                      // Update local [selected] state when the admin taps a radio
                      onChanged: (v) => setState(() => selected = v!),
                    ))
                .toList(),
          ),

          actions: [
            // Cancel — dismisses the dialog without making any API call
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: Text(t(context, ref, 'cancel'),
                    style: const TextStyle(color: AppColors.textSecondary))),
            // Save — confirms the role change and closes the dialog with [true]
            TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(t(context, ref, 'save'),
                    style: const TextStyle(color: AppColors.primary))),
          ],
        ),
      ),
    );

    // Only call the API if the admin confirmed AND actually selected a different role
    if (confirmed == true && selected != user.role) {
      try {
        // Persist the new role assignment to the DMS backend
        await ref
            .read(userManagementRepositoryProvider)
            .updateRole(user.id, selected);

        // Invalidate the provider to refresh the user list with the updated role
        ref.invalidate(_usersProvider);
      } catch (e) {
        // Guard against showing a SnackBar on an unmounted context (e.g., screen popped)
        if (context.mounted) {
          // Display the backend error (e.g., "Insufficient permissions") in a SnackBar
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(e.toString()), backgroundColor: AppColors.primary));
        }
      }
    }
  }

  /// Shows a confirmation dialog before permanently deleting the user with [id].
  ///
  /// Deletion is irreversible — it removes the user account and all associated
  /// data from the DMS backend. The dialog requires explicit admin confirmation
  /// to prevent accidental removal of responders or officials during an incident.
  Future<void> _confirmDelete(
      BuildContext context, WidgetRef ref, int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        // Dark card background consistent with the DMS cyberpunk design system
        backgroundColor: AppColors.cardDark,

        // Localised title for the delete action
        title: Text(t(context, ref, 'delete_user'),
            style: const TextStyle(color: AppColors.textPrimary)),

        // Warning body text prompting the admin to confirm the irreversible action
        content: Text(t(context, ref, 'confirm_delete'),
            style: const TextStyle(color: AppColors.textSecondary)),

        actions: [
          // Cancel — dismiss without deleting; safe default
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(t(context, ref, 'cancel'),
                  style: const TextStyle(color: AppColors.textSecondary))),
          // Delete — confirms the destructive action; uses primary neon to signal danger
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(t(context, ref, 'delete'),
                  style: const TextStyle(color: AppColors.primary))),
        ],
      ),
    );

    // Proceed only if the admin explicitly confirmed the deletion
    if (confirmed == true) {
      try {
        // Call the repository to remove the user by their unique DMS user ID
        await ref.read(userManagementRepositoryProvider).deleteUser(id);

        // Refresh the provider so the deleted user no longer appears in the list
        ref.invalidate(_usersProvider);
      } catch (e) {
        // Guard against SnackBar on an unmounted context after async gap
        if (context.mounted) {
          // Show the error returned by the backend (e.g., "User not found")
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(e.toString()), backgroundColor: AppColors.primary));
        }
      }
    }
  }
}

/// Private widget that renders a single DMS user as a styled card.
///
/// Displays the user's avatar initial, name, email, optional phone number,
/// and role badge. Provides action icons for role reassignment and deletion.
///
/// The card's color accents adapt based on the user's DMS role to give
/// admins an at-a-glance visual hierarchy (e.g., ADMINs in neon red,
/// responders/officials in warning amber, citizens in info blue).
class _UserCard extends StatelessWidget {
  /// The DMS user data to display in this card.
  final UserManagementModel user;

  /// Callback invoked when the admin taps the role-change icon.
  /// Triggers [UserManagementScreen._showRoleDialog] for this user.
  final VoidCallback onChangeRole;

  /// Callback invoked when the admin taps the delete icon.
  /// Triggers [UserManagementScreen._confirmDelete] for this user.
  final VoidCallback onDelete;

  /// Creates a [_UserCard] with required [user] data and action callbacks.
  const _UserCard({
    required this.user,
    required this.onChangeRole,
    required this.onDelete,
  });

  /// Returns a color representing the user's DMS role for visual differentiation.
  ///
  /// Color mapping follows the DMS design system:
  ///   - ADMIN     -> [AppColors.primary]  (neon red — highest authority)
  ///   - RESPONDER -> [AppColors.warning]  (amber — field personnel)
  ///   - OFFICIAL  -> [AppColors.warning]  (amber — agency/government officials)
  ///   - CITIZEN   -> [AppColors.info]     (blue — general public, default)
  Color _roleColor(String role) {
    switch (role) {
      case 'ADMIN':
        // Neon primary color signals maximum system privilege
        return AppColors.primary;
      case 'RESPONDER':
      case 'OFFICIAL':
        // Warning amber groups operational roles that interact with live incidents
        return AppColors.warning;
      default:
        // Info blue for CITIZEN and any future roles — lowest privilege level
        return AppColors.info;
    }
  }

  /// Builds the user card layout with avatar, user details, role badge, and actions.
  @override
  Widget build(BuildContext context) {
    return Container(
      // Horizontal and vertical margin creates visual separation between cards in the list
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),

      // Internal padding gives content breathing room within the card boundary
      padding: const EdgeInsets.all(16),

      decoration: BoxDecoration(
        // Dark card background from the DMS neon cyberpunk design system
        color: AppColors.cardDark,

        // Rounded corners for a modern card appearance consistent with DMS UI language
        borderRadius: BorderRadius.circular(16),

        // Subtle border using the DMS border color token to delineate cards on dark bg
        border: Border.all(color: AppColors.border),
      ),

      // Row layout: [avatar] | [user details — expands] | [role badge + actions]
      child: Row(
        children: [
          // Avatar: shows the first letter of the user's name on a role-tinted background
          CircleAvatar(
            // Semi-transparent role color background (20% opacity) for subtle tinting
            backgroundColor: _roleColor(user.role).withValues(alpha: 0.2),
            child: Text(
              // Use the first character of the name uppercased; fall back to 'U' if empty
              user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
              style: TextStyle(
                  // Letter color matches the role color for cohesive visual identity
                  color: _roleColor(user.role), fontWeight: FontWeight.bold),
            ),
          ),

          // Horizontal spacer between avatar and text details
          const SizedBox(width: 12),

          // Expanded column absorbs remaining row width for the user's text details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // User's full name — primary identifier, bold for visual prominence
                Text(user.name,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600)),

                // Email address — used for DMS login and notification delivery
                Text(user.email,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),

                // Phone number — optional; shown only if provided during registration.
                // Used for SMS alerts and emergency contact during active incidents.
                if (user.phone != null)
                  Text(user.phone!,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),

          // Right-aligned column: role badge on top, action icons below
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Role badge — pill-shaped container with role-colored border and text
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  // Very light role-color fill (15% opacity) for badge background
                  color: _roleColor(user.role).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  // Solid role-color border gives the badge a defined outline
                  border: Border.all(color: _roleColor(user.role)),
                ),
                // Display the role enum string (ADMIN / RESPONDER / OFFICIAL / CITIZEN)
                child: Text(user.role,
                    style: TextStyle(
                        color: _roleColor(user.role),
                        fontSize: 10,
                        fontWeight: FontWeight.w600)),
              ),

              // Spacer between the role badge and the action icon row
              const SizedBox(height: 6),

              // Action icons row: role-change and delete
              Row(
                children: [
                  // Role-change icon — tapping opens the role assignment dialog
                  GestureDetector(
                    onTap: onChangeRole,
                    child: const Icon(Icons.manage_accounts_outlined,
                        // Info blue signals a non-destructive management action
                        color: AppColors.info, size: 20),
                  ),

                  // Small horizontal gap between the two action icons
                  const SizedBox(width: 8),

                  // Delete icon — tapping opens the confirmation dialog before removal
                  GestureDetector(
                    onTap: onDelete,
                    child: const Icon(Icons.delete_outline,
                        // Primary neon red signals the destructive nature of this action
                        color: AppColors.primary, size: 20),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}