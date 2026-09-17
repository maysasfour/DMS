/**
 * ResourceList.jsx
 *
 * Displays the full inventory of disaster response resources in the DMS system.
 * Resources include emergency vehicles (ambulances, fire trucks, police), rescue teams,
 * medical teams, facilities (hospitals, shelters, supply centers), and more.
 *
 * Features:
 * - Grid view with animated resource cards showing type icon, status badge, and location
 * - Map view via ResourceMap component for geographic situational awareness
 * - Status filtering (AVAILABLE, ASSIGNED, BUSY, OFFLINE) to quickly find deployable assets
 * - Role-gated create/edit/delete actions — only ADMIN, RESPONDER, and OFFICIAL can modify
 * - Skeleton loading placeholders while fetching from the resource API
 * - Multilingual labels via react-i18next
 *
 * Used by: dispatchers, incident commanders, and admins to manage and deploy resources
 * during active disaster response operations.
 */

// React core hooks for side-effects and local state management
import React, { useEffect, useState } from 'react';

// Link enables client-side navigation to resource detail/edit and creation routes
import { Link } from 'react-router-dom';

// motion and AnimatePresence provide staggered entrance animations for resource cards
import { motion, AnimatePresence } from 'framer-motion';

// useTranslation provides multilingual support for all UI labels in the DMS
import { useTranslation } from 'react-i18next';

// resourceAPI wraps all REST calls to the backend /resources endpoints
import { resourceAPI } from '../services/api';

// useAuthStore provides the current user's role to gate create/edit/delete actions
import { useAuthStore } from '../store';

// showNotification triggers toast alerts for async operation results (success/error)
import { showNotification } from '../components/NotificationHub';

// ResourceMap renders resources geographically on a map for situational awareness
import ResourceMap from '../components/maps/ResourceMap';

/**
 * STATUS_COLOR maps each resource operational status to a semantic color.
 * Green = deployable, orange = in use or deployed, red = unavailable/busy,
 * gray = offline or out of service. Used for badges and card icon backgrounds.
 */
const STATUS_COLOR = {
  AVAILABLE: '#059669',     // Green — resource is ready to be dispatched to an incident
  ASSIGNED: '#FF7A00',      // Orange — resource has been assigned to an active incident
  BUSY: '#E63946',          // Red — resource is currently occupied and cannot be redirected
  OFFLINE: '#6b7280',       // Gray — resource is unreachable or powered down
  DEPLOYED: '#FF7A00',      // Orange — resource is physically on-site at an incident
  OUT_OF_SERVICE: '#6b7280',// Gray — resource is under maintenance or otherwise unavailable
};

/**
 * TYPE_ICON maps each resource type to an emoji icon for quick visual identification.
 * Icons allow dispatchers to instantly recognize resource categories at a glance
 * without reading text labels in the grid view.
 */
const TYPE_ICON = {
  AMBULANCE: '🚑',       // Emergency medical vehicle for patient transport
  FIRE_TRUCK: '🚒',      // Fire suppression and rescue vehicle
  POLICE: '🚓',          // Law enforcement vehicle for crowd/scene control
  HELICOPTER: '🚁',      // Aerial asset for search, rescue, or medical evacuation
  RESCUE_TEAM: '👷',     // Ground team for search and rescue operations
  MEDICAL_TEAM: '⚕️',    // Mobile medical personnel unit
  HOSPITAL: '🏥',        // Fixed medical facility for patient reception
  FIRE_STATION: '🚒',    // Fire station base (facility type)
  POLICE_STATION: '🚓',  // Police station base (facility type)
  SHELTER: '🏕️',         // Emergency shelter for displaced disaster victims
  SUPPLY_CENTER: '📦',   // Logistics hub for distributing emergency supplies
};

/**
 * ResourceList — main page component for viewing and managing DMS resources.
 * Renders either a grid of resource cards or a map view depending on viewMode.
 */
export default function ResourceList() {
  // t() translates UI strings using the active locale (en, ar, fr, es, tr)
  const { t } = useTranslation();

  // user object from global auth store; used to derive role-based access permissions
  const { user } = useAuthStore();

  // resources holds the full list of resources fetched from the backend API
  const [resources, setResources] = useState([]);

  // loading controls the skeleton placeholder display while the API call is in flight
  const [loading, setLoading] = useState(true);

  // viewMode toggles between 'grid' (card layout) and 'map' (geographic view)
  const [viewMode, setViewMode] = useState('grid');

  // filterStatus holds the currently selected operational status filter ('' = show all)
  const [filterStatus, setFilterStatus] = useState('');

  // Fetch resources once on component mount; re-runs if the component remounts
  useEffect(() => { fetchResources(); }, []);

  /**
   * fetchResources — loads all resources from the backend with a large page size
   * to display the complete DMS resource inventory in a single request.
   * Handles both paginated (content array) and flat array API response shapes.
   */
  const fetchResources = async () => {
    try {
      // Request up to 100 resources; page 0 = first page of results
      const { data } = await resourceAPI.getResources({ page: 0, size: 100 });

      // Unwrap nested response envelope if present (e.g., { data: { content: [...] } })
      const inner = data?.data ?? data;

      // Support both Spring-paginated (content array) and plain array responses
      const list = inner?.content ?? (Array.isArray(inner) ? inner : []);

      // Populate the resource list state for rendering
      setResources(list);
    } catch (_) {
      // Notify the user if the resource inventory could not be loaded
      showNotification(t('resources.load_failed'), 'error');
    } finally {
      // Always clear loading state so skeleton placeholders are removed
      setLoading(false);
    }
  };

  /**
   * handleDelete — removes a resource from the DMS inventory after user confirmation.
   * Optimistically updates the local list on success to avoid a full re-fetch.
   * @param {number|string} id - The unique identifier of the resource to delete
   */
  const handleDelete = async (id) => {
    // Require explicit confirmation before irreversibly removing a resource record
    if (!window.confirm(t('resources.confirm_delete'))) return;
    try {
      // Send DELETE request to the backend for the specified resource ID
      await resourceAPI.deleteResource(id);

      // Remove the deleted resource from local state without re-fetching the full list
      setResources(r => r.filter(x => x.id !== id));

      // Inform the dispatcher that the resource was successfully removed
      showNotification(t('resources.deleted'), 'success');
    } catch (_) {
      // Inform the user if the deletion failed (e.g., resource is locked to an incident)
      showNotification(t('resources.delete_failed'), 'error');
    }
  };

  /**
   * filtered — derived list of resources after applying the active status filter.
   * When filterStatus is empty, all resources are shown (no filter applied).
   */
  const filtered = filterStatus
    ? resources.filter(r => r.status === filterStatus) // Show only resources matching the selected status
    : resources; // Show all resources when no status filter is active

  /**
   * canEdit — determines whether the current user has permission to create, edit,
   * or delete resources. Only ADMIN, RESPONDER, and OFFICIAL roles can modify resources.
   */
  const canEdit = ['ADMIN', 'RESPONDER', 'OFFICIAL'].includes(user?.role);

  return (
    // Outer container uses vertical spacing utility for consistent layout rhythm
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      {/* Header row: page title + resource count on the left; view toggle + add button on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* Page title — translated to the active locale */}
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('resources.title')}
          </h1>
          {/* Total resource count gives dispatchers a quick inventory summary */}
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {resources.length} {t('resources.total')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* ── View Mode Toggle (Grid / Map) ─────────────────────────────── */}
          {/* Segmented control for switching between card grid and geographic map */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-input)' }}>
            {/* Render a button for each available view mode */}
            {['grid', 'map'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)} // Switch the active view mode on click
                className="px-3 py-2 text-xs font-semibold transition"
                style={{
                  // Highlight the active mode with the DMS brand red; inactive is muted
                  background: viewMode === mode ? '#E63946' : 'var(--bg-secondary)',
                  color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {/* Display mode-appropriate emoji label */}
                {mode === 'grid' ? `📋 ${t('resources.grid_view')}` : `🗺️ ${t('resources.map_view')}`}
              </button>
            ))}
          </div>

          {/* ── Add Resource Button (role-gated) ─────────────────────────── */}
          {/* Only ADMIN, RESPONDER, and OFFICIAL users can register new DMS resources */}
          {canEdit && (
            <Link
              to="/layout/resources/new" // Navigate to the ResourceForm page for creation
              className="px-4 py-2 rounded-xl text-white font-semibold text-xs shadow-md"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }} // DMS brand gradient
            >
              + {t('resources.new')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Status Filter Pills (grid mode only) ─────────────────────────────── */}
      {/* Filter row is hidden in map view since the map handles its own display */}
      {viewMode === 'grid' && (
        <div className="flex flex-wrap gap-2">
          {/* '' = All, then each operational status that a resource can hold */}
          {['', 'AVAILABLE', 'ASSIGNED', 'BUSY', 'OFFLINE'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)} // Apply or clear the status filter
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={{
                // Active filter pill uses the status color (or DMS red for "All")
                background: filterStatus === s ? (STATUS_COLOR[s] || '#E63946') : 'var(--bg-tertiary)',
                color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-input)',
              }}
            >
              {/* Empty string maps to the "All" translation key */}
              {s || t('common.all')}
            </button>
          ))}
        </div>
      )}

      {/* ── Main Content Area ─────────────────────────────────────────────────── */}
      {loading ? (
        // Skeleton loading state: render 6 placeholder cards while API responds
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            // Animated pulse placeholder matches the height of a real resource card
            <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        // Map view: pass resources as facilities to ResourceMap for geographic display
        // Height fills the remaining viewport below the header and filter rows
        <ResourceMap facilities={resources} height="calc(100vh - 240px)" />
      ) : filtered.length === 0 ? (
        // Empty state: shown when no resources match the active status filter
        <div className="text-center py-16 card-disaster">
          {/* Ambulance emoji provides a contextual visual cue for the resource domain */}
          <div className="text-4xl mb-3">🚑</div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('resources.none_found')}</p>
        </div>
      ) : (
        // Grid view: render a card for each resource that passes the status filter
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* AnimatePresence enables exit animations when resources are deleted */}
          <AnimatePresence>
            {filtered.map((resource, i) => (
              // Each card fades and slides in with a staggered delay for visual polish
              <motion.div
                key={resource.id} // Stable key prevents React from remounting cards on filter change
                initial={{ opacity: 0, y: 12 }} // Card starts invisible and slightly below its final position
                animate={{ opacity: 1, y: 0 }}  // Card animates to fully visible at its natural position
                transition={{ delay: i * 0.04 }} // Stagger: each subsequent card starts 40ms later
                className="card-disaster p-5 flex flex-col" // DMS themed card with flex column layout
              >
                {/* ── Resource Icon + Name Row ──────────────────────────── */}
                <div className="flex items-center gap-3 mb-3">
                  {/* Icon circle: background color tinted from the resource's status color */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${STATUS_COLOR[resource.status] || '#6b7280'}20` }} // 20 = 12% opacity hex suffix
                  >
                    {/* Emoji icon for the resource type; fallback to pin emoji for unknown types */}
                    {TYPE_ICON[resource.type] || '📍'}
                  </div>
                  <div className="min-w-0">
                    {/* Resource name; truncated to prevent overflow in the fixed-width card */}
                    <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {resource.name}
                    </h3>
                    {/* Resource type label with underscore replaced by space for readability */}
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {resource.type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* ── Status Badge + Location ───────────────────────────── */}
                <div className="flex items-center gap-2 mb-3">
                  {/* Colored pill badge showing the resource's current operational status */}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: STATUS_COLOR[resource.status] || '#6b7280' }}
                  >
                    {resource.status}
                  </span>
                  {/* Location name shown only when the resource has an assigned location */}
                  {resource.locationName && (
                    <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      📍 {resource.locationName}
                    </span>
                  )}
                </div>

                {/* ── Action Buttons (role-gated) ───────────────────────── */}
                {/* Edit and Delete actions are only shown to authorized DMS roles */}
                {canEdit && (
                  <div className="flex gap-2 mt-auto pt-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                    {/* Edit button navigates to the ResourceForm page pre-loaded with this resource */}
                    <Link
                      to={`/layout/resources/${resource.id}`} // Dynamic route to the resource edit form
                      className="flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition"
                      style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
                    >
                      {t('resources.edit')}
                    </Link>
                    {/* Delete button triggers confirmation then removes the resource from the DMS */}
                    <button
                      onClick={() => handleDelete(resource.id)} // Confirm and delete this resource
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                      style={{ background: '#E63946' }} // Red — signals a destructive action
                    >
                      {t('resources.delete')}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}