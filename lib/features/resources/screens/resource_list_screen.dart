// =============================================================================
// resource_list_screen.dart
//
// Displays the full list of disaster management resources (e.g., ambulances,
// generators, rescue equipment) available in the DMS system. Provides admin
// users with the ability to create, edit, and delete resources. Regular users
// (officers, team members) can view and refresh the resource inventory.
//
// This screen is part of the Resources feature module and integrates with the
// resource repository to fetch live data from the DMS backend API.
// =============================================================================

// Flutter UI framework — provides Material widgets used throughout this screen
import 'package:flutter/material.dart';
// Riverpod state management — used to watch async resource data and auth state
import 'package:flutter_riverpod/flutter_riverpod.dart';
// GoRouter navigation — used to push create/edit resource routes declaratively
import 'package:go_router/go_router.dart';

// DMS colour palette — neon cyberpunk theme tokens (primary, success, warning, etc.)
import '../../../core/constants/app_colors.dart';
// Auth provider — exposes the currently signed-in user and their DMS role
import '../../../features/auth/providers/auth_provider.dart';
// Shared side-drawer — provides navigation across the DMS app
import '../../../shared/widgets/app_drawer.dart';
// ResourceModel — data class representing a single DMS resource entity
import '../data/resource_model.dart';
// ResourceRepository — handles HTTP calls to the DMS resource API endpoints
import '../data/resource_repository.dart';
// Localisation helper — resolves translated strings by key for multi-language support
import '../../../core/l10n/app_strings.dart';

/// A Riverpod [FutureProvider] that fetches the full list of DMS resources.
/// Watching this provider causes the UI to rebuild whenever the resource list
/// changes or is explicitly invalidated (e.g., after a create/delete action).
final _resourcesProvider = FutureProvider<List<ResourceModel>>((ref) {
  // Delegate to the repository which calls the backend /resources endpoint
  return ref.watch(resourceRepositoryProvider).getResources();
});

/// Main screen that lists all resources registered in the DMS (vehicles,
/// equipment, supplies, etc.). Admins see edit/delete controls and a FAB to
/// add new resources; other roles see a read-only view.
class ResourceListScreen extends ConsumerWidget {
  // Const constructor enables Flutter widget tree optimisation
  const ResourceListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Subscribe to the async resource list; rebuilds on loading/error/data states
    final resourcesAsync = ref.watch(_resourcesProvider);

    // Read the authenticated user's DMS role (ADMIN, OFFICER, TEAM, etc.)
    final role = ref.watch(authProvider).user?.role ?? '';

    // Gate admin-only UI controls (FAB, edit/delete icons) on the ADMIN role
    final isAdmin = role == 'ADMIN';

    return Scaffold(
      // Use the theme's scaffold background so dark/light mode is respected
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,

      // Global side-drawer for navigating between DMS sections
      drawer: const AppDrawer(),

      appBar: AppBar(
        // Match app bar background to scaffold so the neon border stands out
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // Use the primary text colour from the DMS design system
        foregroundColor: AppColors.textPrimary,
        // Localised page title — key 'resources' resolves to the active locale
        title: Text(t(context, ref, 'resources')),
        actions: [
          // Manual refresh button — invalidates the provider to re-fetch from API
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(_resourcesProvider),
          ),
        ],
      ),

      // Only ADMIN users may create new resources; hide FAB for other roles
      floatingActionButton: isAdmin
          ? FloatingActionButton(
              // Use DMS primary accent colour (neon) for the FAB background
              backgroundColor: AppColors.primary,
              // Navigate to the resource creation form screen
              onPressed: () => context.push('/resources/create'),
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null, // Non-admin users see no FAB

      // Render the resource list based on the async provider state
      body: resourcesAsync.when(
        // Show a branded spinner while the API call is in progress
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppColors.primary)),

        // Display the error message if the repository throws (network, auth, etc.)
        error: (e, _) => Center(
            child: Text(e.toString(),
                style: const TextStyle(color: AppColors.primary))),

        // Render the fetched resource list (or an empty-state message)
        data: (resources) => resources.isEmpty
            // Empty state — shown when the DMS has no resources registered yet
            ? Center(
                child: Text(t(context, ref, 'no_resources'),
                    style: const TextStyle(color: AppColors.textSecondary)))
            // Pull-to-refresh wrapper so field users can sync the latest data
            : RefreshIndicator(
                // Invalidate the provider to trigger a fresh API fetch on pull
                onRefresh: () async => ref.invalidate(_resourcesProvider),
                child: ListView.builder(
                  // Always-scrollable physics ensures pull-to-refresh works even
                  // when the list is shorter than the screen height
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: resources.length,
                  itemBuilder: (context, index) {
                    // Current resource at this list position
                    final r = resources[index];

                    // Render an individual resource card with role-aware controls
                    return _ResourceCard(
                      resource: r,
                      // Pass admin flag so the card shows edit/delete icons only for admins
                      isAdmin: isAdmin,
                      // Navigate to the resource edit form pre-populated with this resource's data
                      onEdit: () => context.push('/resources/${r.id}/edit'),
                      // Delete handler — shows a confirmation dialog before calling the API
                      onDelete: () async {
                        // Present a modal dialog to prevent accidental resource deletion
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            // Use DMS dark card colour so the dialog fits the theme
                            backgroundColor: AppColors.cardDark,
                            // Localised dialog title — reuses the 'delete_incident' key
                            title: Text(t(context, ref, 'delete_incident'),
                                style: const TextStyle(color: AppColors.textPrimary)),
                            // Ask for explicit confirmation before destroying the resource record
                            content: Text(t(context, ref, 'confirm_delete'),
                                style: const TextStyle(color: AppColors.textSecondary)),
                            actions: [
                              // Cancel — dismisses dialog without making any API call
                              TextButton(
                                  onPressed: () => Navigator.pop(ctx, false),
                                  child: Text(t(context, ref, 'cancel'),
                                      style: const TextStyle(color: AppColors.textSecondary))),
                              // Confirm delete — returns true to proceed with API deletion
                              TextButton(
                                  onPressed: () => Navigator.pop(ctx, true),
                                  child: Text(t(context, ref, 'delete'),
                                      style: const TextStyle(color: AppColors.primary))),
                            ],
                          ),
                        );

                        // Only call the delete API if the admin explicitly confirmed
                        if (confirmed == true) {
                          try {
                            // Call the repository to DELETE /resources/{id} on the backend
                            await ref.read(resourceRepositoryProvider).deleteResource(r.id);
                            // Refresh the list so the deleted resource disappears immediately
                            ref.invalidate(_resourcesProvider);
                          } catch (e) {
                            // Guard against using context after async gap if widget unmounted
                            if (context.mounted) {
                              // Show error snackbar in DMS primary colour so it's visible
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(e.toString()),
                                  backgroundColor: AppColors.primary));
                            }
                          }
                        }
                      },
                    );
                  },
                ),
              ),
      ),
    );
  }
}

/// Private card widget that displays a single DMS resource's key details:
/// name, type, optional location, and availability status badge.
/// Admin users additionally see inline edit and delete icon controls.
class _ResourceCard extends StatelessWidget {
  /// The resource data model containing name, type, status, and location info
  final ResourceModel resource;

  /// Whether the current user is an ADMIN — controls visibility of edit/delete icons
  final bool isAdmin;

  /// Callback invoked when the admin taps the edit icon for this resource
  final VoidCallback onEdit;

  /// Callback invoked when the admin taps the delete icon for this resource
  final VoidCallback onDelete;

  // All fields are required so the card is always fully populated
  const _ResourceCard({
    required this.resource,
    required this.isAdmin,
    required this.onEdit,
    required this.onDelete,
  });

  /// Maps a resource status string to the appropriate DMS theme colour so
  /// field responders can instantly assess resource availability at a glance.
  ///   AVAILABLE     → green  (ready to deploy to an incident)
  ///   ASSIGNED      → amber  (currently committed to an active incident)
  ///   OUT_OF_SERVICE→ red/primary (unavailable — maintenance or damaged)
  Color _statusColor(String s) {
    switch (s.toUpperCase()) {
      case 'AVAILABLE':
        // Green signals the resource is ready for immediate deployment
        return AppColors.success;
      case 'ASSIGNED':
        // Amber indicates the resource is already committed to an incident
        return AppColors.warning;
      case 'OUT_OF_SERVICE':
        // Primary (neon red) flags the resource as unavailable / out of action
        return AppColors.primary;
      default:
        // Fallback for unknown or future status values
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Outer container provides the card shape, dark background, and border
    return Container(
      // Consistent horizontal gutters and vertical spacing between cards
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        // Dark card surface from the DMS neon cyberpunk design system
        color: AppColors.cardDark,
        // Rounded corners match the overall DMS card style
        borderRadius: BorderRadius.circular(16),
        // Subtle border to separate the card from the scaffold background
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          // Left icon badge — visually identifies the item as a resource/inventory item
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              // Translucent info-colour background behind the icon for depth
              color: AppColors.info.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            // Inventory icon represents physical assets (vehicles, equipment, supplies)
            child: const Icon(Icons.inventory_2_outlined,
                color: AppColors.info, size: 24),
          ),

          // Horizontal gap between icon and text content
          const SizedBox(width: 12),

          // Expanded column fills remaining width with resource text details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Resource name in bold — primary identifier for field responders
                Text(resource.name,
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600)),
                // Resource type (e.g., "Ambulance", "Generator") as secondary info
                Text(resource.type,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),
                // Optional deployment location — shown only when set on the resource
                if (resource.locationName != null)
                  Text(resource.locationName!,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),

          // Right column holds the status badge and optional admin action icons
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Status badge — colour-coded pill indicating current availability
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  // Translucent fill uses the status colour for a subtle glow effect
                  color: _statusColor(resource.status).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  // Solid border in the status colour makes the state unmistakable
                  border: Border.all(color: _statusColor(resource.status)),
                ),
                // Status label text — e.g., "AVAILABLE", "ASSIGNED", "OUT_OF_SERVICE"
                child: Text(resource.status,
                    style: TextStyle(
                        color: _statusColor(resource.status),
                        fontSize: 11,
                        fontWeight: FontWeight.w600)),
              ),

              // Admin-only section: edit and delete icons below the status badge
              if (isAdmin) ...[
                // Small gap between status badge and action icons
                const SizedBox(height: 4),
                Row(
                  children: [
                    // Edit icon — tapping navigates to the resource edit form
                    GestureDetector(
                      onTap: onEdit,
                      child: const Icon(Icons.edit_outlined,
                          color: AppColors.info, size: 18),
                    ),
                    // Spacing between edit and delete icons
                    const SizedBox(width: 8),
                    // Delete icon — tapping triggers the confirmation dialog flow
                    GestureDetector(
                      onTap: onDelete,
                      child: const Icon(Icons.delete_outline,
                          color: AppColors.primary, size: 18),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}