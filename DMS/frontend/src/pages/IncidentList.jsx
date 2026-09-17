import group comments, constant explanations, hook/state annotations, function documentation, and JSX block comments. No additions are needed — returning the complete file as-is:

/**
 * IncidentList.jsx
 *
 * Main incident listing page for the Disaster Management System (DMS).
 * Renders a role-aware, paginated list of emergency incidents with filtering,
 * searching, and delete capabilities. Supports two view modes:
 *   - Card view: visual cards with colored left borders per incident type
 *   - Table view: compact data grid suited for RESCUE_TEAM and ADMIN roles
 *
 * Access control is enforced by role:
 *   - CITIZEN: sees only their own submitted reports
 *   - RESPONDER / RESCUE_TEAM / ADMIN / OFFICIAL: see all system incidents
 *   - Only ADMIN and RESPONDER may delete incidents
 *   - CITIZEN, ADMIN, RESPONDER, and RESCUE_TEAM may report new incidents
 *
 * Integrates with the incidentAPI service for paginated data fetching,
 * uses Framer Motion for animated transitions, and supports i18n via react-i18next.
 */

// React core hooks for side effects, local state, and memoized callbacks
import React, { useEffect, useState, useCallback } from 'react';
// React Router: Link for navigation anchors, useNavigate for programmatic routing to incident details
import { Link, useNavigate } from 'react-router-dom';
// Framer Motion: motion for animated elements, AnimatePresence for exit animations on list items
import { motion, AnimatePresence } from 'framer-motion';
// i18n hook providing the t() translation function for multi-language support
import { useTranslation } from 'react-i18next';
// DMS incident API service: getIncidents (all), getMyIncidents (citizen), deleteIncident
import { incidentAPI } from '../services/api';
// Global auth store providing the authenticated user object (role, id, etc.)
import { useAuthStore } from '../store';
// Toast notification utility for success/error feedback after API actions
import { showNotification } from '../components/NotificationHub';
// Renders an icon badge representing the emergency type (fire, flood, earthquake, etc.)
import { EmergencyTypeIcon } from '../components/EmergencyIcons';

// Reusable Bootstrap Icons helper — renders <i class="bi bi-{name}"> with optional class and style
const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

// Severity level display configuration mapping — color, background, and label for each DMS severity tier
const SEVERITY_CFG = {
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  label: 'Low'      },   // Green: non-urgent incidents
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Medium'   },   // Amber: moderate risk incidents
  HIGH:     { color: '#E63946', bg: 'rgba(230,57,70,0.1)',  label: 'High'     },   // Red: serious emergency incidents
  CRITICAL: { color: '#7f1d1d', bg: 'rgba(127,29,29,0.15)', label: 'Critical' },   // Dark red: life-threatening incidents
};

// Status badge configuration — visual style and icon for each incident lifecycle stage
const STATUS_CFG = {
  OPEN:        { color: '#E63946', bg: 'rgba(230,57,70,0.1)',   icon: 'exclamation-circle-fill', pulse: true  }, // Pulsing red — awaiting response
  IN_PROGRESS: { color: '#FF7A00', bg: 'rgba(255,122,0,0.1)',   icon: 'arrow-repeat',            pulse: false }, // Orange — actively being handled
  RESOLVED:    { color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: 'check-circle-fill',       pulse: false }, // Green — incident resolved
  CLOSED:      { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: 'x-circle-fill',           pulse: false }, // Gray — archived/closed
};

// Accent colors per incident type, used for card left-border and type label styling
const TYPE_COLOR = {
  FIRE:'#E63946', FLOOD:'#3b82f6', EARTHQUAKE:'#92400e',
  STORM:'#6366f1', ACCIDENT:'#FF7A00', MEDICAL:'#10b981',
  HAZMAT:'#8b5cf6', OTHER:'#6b7280',
};

// Roles that have system-wide visibility — can see all incidents, not just their own reports
const SEES_ALL = ['ADMIN', 'RESPONDER', 'RESCUE_TEAM', 'OFFICIAL'];
// Roles permitted to permanently delete incident records from the system
const CAN_DELETE = ['ADMIN', 'RESPONDER'];
// Roles permitted to submit new incident reports into the DMS
const CAN_REPORT = ['CITIZEN', 'ADMIN', 'RESPONDER', 'RESCUE_TEAM'];

/** IncidentList — primary page component for listing and managing DMS incidents */
export default function IncidentList() {
  // Extract authenticated user object from global auth store
  const { user }  = useAuthStore();
  // Imperative navigation hook — used to push user to incident detail page on row/card click
  const navigate  = useNavigate();
  // Translation function for all user-visible strings; supports AR, EN, ES, FR, TR locales
  const { t }     = useTranslation();

  // Derive the current user's role, defaulting to CITIZEN if not authenticated or role is absent
  const role      = user?.role || 'CITIZEN';
  // Whether this user can see all incidents in the system (vs. only their own)
  const seesAll   = SEES_ALL.includes(role);
  // Whether this user is authorized to delete incident records
  const canDelete = CAN_DELETE.includes(role);
  // Whether this user may navigate to the incident creation form
  const canReport = CAN_REPORT.includes(role);

  // Paginated list of incident objects returned from the API
  const [incidents,   setIncidents]   = useState([]);
  // Current zero-based page index for pagination
  const [page,        setPage]        = useState(0);
  // Total number of pages available from the backend for the current query
  const [totalPages,  setTotalPages]  = useState(1);
  // Controls loading skeleton display while API call is in-flight
  const [loading,     setLoading]     = useState(true);
  // Active filter selections for status, severity, and incident type dropdowns
  const [filters,     setFilters]     = useState({ status: '', severity: '', type: '' });
  // Free-text search query entered by the user for incident title/description search
  const [search,      setSearch]      = useState('');
  // Tracks the incident ID pending deletion — first click arms, second click confirms (two-step delete)
  const [deleteId,    setDeleteId]    = useState(null);
  // Display mode: 'card' for visual grid, 'table' for compact tabular view; rescue/admin default to table
  const [viewMode,    setViewMode]    = useState('card'); // 'card' | 'table' — rescue/admin default table

  // On mount or role change: force table view for operational roles that need dense data display
  useEffect(() => {
    if (role === 'RESCUE_TEAM' || role === 'ADMIN') setViewMode('table');
  }, [role]);

  /**
   * loadIncidents — fetches the current page of incidents from the backend.
   * Citizens call getMyIncidents (returns only their own reports).
   * Privileged roles call getIncidents with optional status/severity/type/search filters.
   * Normalizes the API response to handle both paged and flat array responses.
   */
  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters, omitting empty filter values to avoid sending blank params
      const params = {
        page, size: 12,
        ...(filters.status   && { status:   filters.status   }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.type     && { type:     filters.type     }),
        ...(search           && { q: search }),
      };
      // Citizens see only their own incidents; all other privileged roles see the full list
      const { data } = !seesAll
        ? await incidentAPI.getMyIncidents({ page, size: 12 })
        : await incidentAPI.getIncidents(params);
      // Normalize API response — API may return { data: { content, totalPages } } or a flat paged object
      const paged = data?.data || data;
      // Extract the array of incidents; handle Spring Page object (content) or plain arrays
      setIncidents(paged?.content || (Array.isArray(paged) ? paged : []));
      // Update total page count for pagination controls
      setTotalPages(paged?.totalPages || 1);
    } catch (_) {} // Silently ignore fetch errors — loading spinner will stop, list stays empty
    setLoading(false);
  }, [page, filters, search, seesAll]);

  // Re-fetch incidents whenever the page or filters change (search requires explicit Enter/button press)
  useEffect(() => { loadIncidents(); }, [page, filters]);

  /**
   * handleDelete — two-step delete handler for incident records.
   * First invocation arms the delete button (sets deleteId).
   * Second invocation on the same incident calls the API and refreshes the list.
   * Uses e.stopPropagation() to prevent row click navigation from firing.
   *
   * @param {number} id - The incident ID to delete
   * @param {Event} e - Click event object
   */
  const handleDelete = async (id, e) => {
    // Prevent card/row click from navigating to incident detail while interacting with delete
    e.stopPropagation();
    // First click: arm the delete (show confirmation state) but do not yet call API
    if (deleteId !== id) { setDeleteId(id); return; }
    try {
      // Second click on same incident: perform the actual delete API call
      await incidentAPI.deleteIncident(id);
      // Notify the user of successful deletion with a toast
      showNotification(t('incidents.incident_deleted'), 'success');
      // Reset the armed delete state
      setDeleteId(null);
      // Refresh incident list to reflect the deletion
      loadIncidents();
    } catch (_) {
      // Notify the user if deletion fails (e.g., permission error, network issue)
      showNotification(t('incidents.delete_failed'), 'error');
    }
  };

  // Shared card container style — uses CSS variables for theme-aware background, border, and shadow
  const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 16, boxShadow: 'var(--shadow-sm)' };

  // Role header config — maps each DMS role to a unique page title, subtitle, accent color, and icon
  const ROLE_HEADER = {
    CITIZEN:     { title: t('incidents.my_reports', 'My Incident Reports'), subtitle: 'Track your submitted emergency reports', accent: '#059669', icon: 'list-check' },
    RESCUE_TEAM: { title: 'Active Incidents — Field View',  subtitle: 'Real-time incidents requiring response',       accent: '#f59e0b', icon: 'fire'       },
    RESPONDER:   { title: 'All Incidents — Dispatch View',  subtitle: 'Manage and assign all emergency incidents',    accent: '#FF7A00', icon: 'activity'    },
    OFFICIAL:    { title: 'Incident Overview',              subtitle: 'System-wide incident monitoring and review',   accent: '#7c3aed', icon: 'bar-chart-fill' },
    ADMIN:       { title: 'Incident Management',            subtitle: 'Full control over all system incidents',       accent: '#E63946', icon: 'exclamation-triangle-fill' },
  };
  // Resolve the header config for the current user role, defaulting to CITIZEN config if role is unknown
  const hdr = ROLE_HEADER[role] || ROLE_HEADER.CITIZEN;

  return (
    // Root container with vertical spacing and bottom padding to clear the nav bar
    <div className="space-y-5 pb-8">

      {/* ── Page Header ── Animated role-specific title, subtitle, icon, and action buttons */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {/* Page title with role-colored icon badge — identifies the operational context to the user */}
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {/* Colored icon badge using the role's accent color — visually distinguishes role dashboards */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hdr.accent}, ${hdr.accent}aa)` }}>
              <BI name={hdr.icon} className="text-white" />
            </div>
            {hdr.title}
          </h1>
          {/* Role-specific subtitle describing the purpose of this view */}
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{hdr.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View mode toggle — only visible to roles with system-wide incident access */}
          {seesAll && (
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-input)' }}>
              {/* Toggle between card and table view modes */}
              {['card','table'].map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    // Active mode gets the role accent color; inactive uses muted background
                    background: viewMode === m ? hdr.accent : 'var(--bg-tertiary)',
                    color: viewMode === m ? 'white' : 'var(--text-secondary)',
                  }}>
                  {/* Grid icon for card view, table icon for table view */}
                  <BI name={m === 'card' ? 'grid-3x3-gap-fill' : 'table'} />
                </button>
              ))}
            </div>
          )}
          {/* Report Emergency / Report Incident CTA — shown only to roles permitted to create incidents */}
          {canReport && (
            <Link to="/layout/incidents/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm"
              // Gradient button styled with role accent color and a matching glow shadow
              style={{ background: `linear-gradient(135deg, ${hdr.accent}, ${hdr.accent}cc)`, boxShadow: `0 4px 14px ${hdr.accent}40` }}>
              <BI name="plus-circle-fill" />
              {/* Citizens see "Report Emergency"; operational roles see the generic translated label */}
              {role === 'CITIZEN' ? 'Report Emergency' : t('incidents.report')}
            </Link>
          )}
        </div>
      </motion.div>

      {/* ── Filter Bar ── Search and dropdown filters — only visible to roles with full incident access */}
      {seesAll && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          style={cardStyle} className="p-4 flex flex-wrap gap-3 items-center">
          {/* Free-text search input — queries incident title/description; submits on Enter or Filter button */}
          <div className="flex-1 min-w-[160px] relative">
            {/* Search icon positioned inside the input field for visual affordance */}
            <BI name="search" className="absolute start-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder={t('incidents.search')} value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadIncidents()}
              className="w-full ps-9 pe-4 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }} />
          </div>

          {/* Dropdown filter selects — dynamically rendered for status, severity, and incident type */}
          {[
            { key: 'status',   label: t('incidents.all_status'),   options: ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'],     tKey: 'status'   },
            { key: 'severity', label: t('incidents.all_severity'), options: ['LOW','MEDIUM','HIGH','CRITICAL'],              tKey: 'severity' },
            { key: 'type',     label: 'All Types',                 options: ['FIRE','FLOOD','EARTHQUAKE','STORM','ACCIDENT','MEDICAL','HAZMAT','OTHER'], tKey: 'types' },
          ].map(({ key, label, options, tKey }) => (
            // Each select updates the corresponding filter key and resets pagination to page 0
            <select key={key} value={filters[key]}
              onChange={e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(0); }}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}>
              {/* Default "all" option shows no filter applied for this dimension */}
              <option value="">{label}</option>
              {/* Render translated options — falls back to raw value if translation key is missing */}
              {options.map(o => <option key={o} value={o}>{t(`${tKey}.${o}`, { defaultValue: o })}</option>)}
            </select>
          ))}

          {/* Apply filters button — triggers explicit API fetch with current filter state */}
          <button onClick={loadIncidents}
            className="px-4 py-2 rounded-xl text-white font-bold text-sm"
            style={{ background: hdr.accent }}>
            <BI name="funnel-fill" className="me-1" />Filter
          </button>
          {/* Clear filters button — only visible when at least one filter or search term is active */}
          {(filters.status || filters.severity || filters.type || search) && (
            <button onClick={() => { setFilters({ status:'', severity:'', type:'' }); setSearch(''); setPage(0); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
              <BI name="x-circle" className="me-1" />Clear
            </button>
          )}
        </motion.div>
      )}

      {/* ── Content Area ── Conditionally renders: loading skeletons, empty state, card view, or table view */}
      {/* Loading state: animated skeleton placeholders preserve layout while data is fetched */}
      {loading ? (
        <div className="space-y-3">
          {/* Render 5 skeleton rows to approximate the expected incident list layout */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              {/* Skeleton for the emergency type icon badge */}
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                {/* Skeleton for incident title */}
                <div className="skeleton h-4 w-2/3 rounded" />
                {/* Skeleton for incident description or secondary info */}
                <div className="skeleton h-3 w-1/2 rounded" />
                {/* Skeleton for status and severity badge chips */}
                <div className="flex gap-2 mt-1">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : incidents.length === 0 ? (
        // Empty state: shown when no incidents match the current filters or the user has no reports yet
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="py-20 text-center rounded-2xl" style={cardStyle}>
          {/* Large clipboard-x icon visually signals no incidents found */}
          <BI name="clipboard-x" style={{ fontSize: '3.5rem', color: 'var(--text-tertiary)' }} />
          <p className="mt-3 font-bold" style={{ color: 'var(--text-secondary)' }}>{t('incidents.no_incidents')}</p>
          {/* CTA to report the first incident — only shown to roles with reporting permission */}
          {canReport && (
            <Link to="/layout/incidents/create"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: hdr.accent }}>
              <BI name="plus-circle" /> {t('incidents.report_first')}
            </Link>
          )}
        </motion.div>

      ) : viewMode === 'card' ? (
        // ── CARD VIEW ── Visual incident cards with colored left-border per incident type
        <div className="space-y-3">
          {/* AnimatePresence enables exit animations when incidents are deleted from the list */}
          <AnimatePresence>
            {incidents.map((inc, idx) => {
              // Resolve display config objects for this incident's status and severity
              const statusCfg   = STATUS_CFG[inc.status]     || STATUS_CFG.OPEN;
              const severityCfg = SEVERITY_CFG[inc.severity] || SEVERITY_CFG.MEDIUM;
              // Resolve the type accent color, defaulting to gray for unknown types
              const typeColor   = TYPE_COLOR[inc.type] || '#6b7280';
              // Check whether this incident has any attached media (photos/videos) for badge display
              const hasMedia    = (inc.mediaCount || inc.media?.length || 0) > 0;

              return (
                // Animated card with staggered entrance (delay per index) and hover lift effect
                <motion.div key={inc.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  // Subtle hover animation lifts card and deepens shadow for interactivity affordance
                  whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  className="cursor-pointer"
                  // Left border color encodes incident type at a glance (fire=red, flood=blue, etc.)
                  style={{ ...cardStyle, borderLeft: `4px solid ${typeColor}` }}
                  // Clicking anywhere on the card navigates to the incident detail page
                  onClick={() => navigate(`/layout/incidents/${inc.id}`)}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* Emergency type icon badge — provides immediate visual identification of incident category */}
                    <EmergencyTypeIcon type={inc.type || 'OTHER'} size={20} badge badgeSize={42} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        {/* Incident title — primary identifier visible to responders and citizens */}
                        <h3 className="font-black text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {inc.title}
                        </h3>
                        {/* Action buttons container — stopPropagation prevents card click navigation */}
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {/* Media count badge — indicates attached evidence photos/videos for this incident */}
                          {hasMedia && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: 'rgba(255,122,0,0.1)', color: '#FF7A00' }}>
                              <BI name="images" style={{ fontSize: '0.6rem' }} />
                              {/* Show total media count from either mediaCount field or media array length */}
                              {inc.mediaCount || inc.media?.length}
                            </span>
                          )}
                          {/* View button — navigates to incident detail while stopPropagation prevents double navigation */}
                          <Link to={`/layout/incidents/${inc.id}`} onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-sm"
                            style={{ color: '#3b82f6' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <BI name="eye" />
                          </Link>
                          {/* Delete control — only rendered for ADMIN and RESPONDER roles */}
                          {canDelete && (
                            // Two-step delete: first click shows "Confirm" button; second click executes deletion
                            deleteId === inc.id ? (
                              // Confirmation state: clicking this red button executes the delete API call
                              <button onClick={e => handleDelete(inc.id, e)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-white"
                                style={{ background: '#E63946' }}>
                                Confirm
                              </button>
                            ) : (
                              // Armed state: clicking trash icon arms the delete (shows Confirm on next click)
                              <button onClick={e => { e.stopPropagation(); setDeleteId(inc.id); }}
                                className="p-1.5 rounded-lg text-sm"
                                style={{ color: '#E63946' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(230,57,70,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <BI name="trash" />
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Incident description preview — truncated to 2 lines to keep card compact */}
                      {inc.description && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {inc.description}
                        </p>
                      )}

                      {/* Tags row — colored chips showing status, severity, and location at a glance */}
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {/* Status chip — pulsing dot for OPEN incidents signals urgency to responders */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}>
                          {/* Animated pulse dot shown only for OPEN incidents to draw immediate attention */}
                          {statusCfg.pulse && (
                            <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusCfg.color }} />
                          )}
                          <BI name={statusCfg.icon} style={{ fontSize: '0.6rem' }} />
                          {/* Translate status value to current locale; fall back to raw value if key missing */}
                          {t(`status.${inc.status}`, { defaultValue: inc.status })}
                        </span>
                        {/* Severity chip — color-coded to convey urgency level (low=green, critical=dark red) */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: severityCfg.bg, color: severityCfg.color }}>
                          <BI name="lightning-charge-fill" style={{ fontSize: '0.6rem' }} />
                          {t(`severity.${inc.severity}`, { defaultValue: inc.severity })}
                        </span>
                        {/* Location chip — shows city or address if available; helps responders geo-locate quickly */}
                        {(inc.city || inc.address) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                            <BI name="geo-alt-fill" style={{ fontSize: '0.6rem' }} />
                            {/* Prefer city name; fall back to full address string */}
                            {inc.city || inc.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card footer — shows reporter identity (for privileged roles) and submission date */}
                  <div className="px-4 py-2 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border-secondary)', background: 'var(--bg-tertiary)', borderRadius: '0 0 12px 12px' }}>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {/* Reporter name only visible to privileged roles — citizens do not see this field */}
                      {seesAll && (inc.reporterName || inc.reportedByName) && (
                        <><BI name="person-fill" className="me-1" />{inc.reporterName || inc.reportedByName} · </>
                      )}
                      {/* Creation date formatted to locale string for readability */}
                      {inc.createdAt && new Date(inc.createdAt).toLocaleDateString()}
                    </span>
                    {/* Incident type label styled with the type's accent color for visual consistency */}
                    <span className="text-xs font-semibold" style={{ color: typeColor }}>
                      {t(`types.${inc.type}`, { defaultValue: inc.type })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      ) : (
        // ── TABLE VIEW (rescue team / admin) ── Dense tabular layout for operational data scanning
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...cardStyle, overflow: 'hidden' }}>
          <table className="w-full text-xs">
            <thead>
              {/* Column headers for the incident data table */}
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-primary)' }}>
                {/* Render column headers: ID, title, type, severity, status, location, date, and actions */}
                {['#','Title','Type','Severity','Status','Location','Reported','Actions'].map(h => (
                  <th key={h} className="text-start px-3 py-3 font-black uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Render one animated row per incident with staggered entrance */}
              {incidents.map((inc, idx) => {
                // Resolve status and severity display config for each row
                const statusCfg   = STATUS_CFG[inc.status]     || STATUS_CFG.OPEN;
                const severityCfg = SEVERITY_CFG[inc.severity] || SEVERITY_CFG.MEDIUM;
                // Resolve type accent color for the type column label
                const typeColor   = TYPE_COLOR[inc.type] || '#6b7280';
                return (
                  // Table row — clickable for navigation; hover background highlight for usability
                  <motion.tr key={inc.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                    className="cursor-pointer group"
                    style={{ borderBottom: '1px solid var(--border-secondary)' }}
                    // Row click navigates to incident detail page
                    onClick={() => navigate(`/layout/incidents/${inc.id}`)}
                    // Hover state highlights the row for easier scanning in dense tables
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Incident ID in monospace font for easy visual alignment and reference */}
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>#{inc.id}</td>
                    {/* Truncated incident title — max-width prevents overflow in narrow columns */}
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{inc.title}</p>
                    </td>
                    {/* Incident type label colored by TYPE_COLOR mapping for quick visual type identification */}
                    <td className="px-3 py-2.5">
                      <span className="font-semibold" style={{ color: typeColor }}>
                        {t(`types.${inc.type}`, { defaultValue: inc.type })}
                      </span>
                    </td>
                    {/* Severity badge chip with color-coded background and foreground */}
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: severityCfg.bg, color: severityCfg.color }}>
                        {t(`severity.${inc.severity}`, { defaultValue: inc.severity })}
                      </span>
                    </td>
                    {/* Status badge with icon and color — same style as card view for visual consistency */}
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                        <BI name={statusCfg.icon} style={{ fontSize: '0.6rem' }} />
                        {t(`status.${inc.status}`, { defaultValue: inc.status })}
                      </span>
                    </td>
                    {/* Location column — shows city or address; dash if neither is available */}
                    <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{inc.city || inc.address || '—'}</td>
                    {/* Report date — formatted to locale string; dash if timestamp is missing */}
                    <td className="px-3 py-2.5" style={{ color: 'var(--text-tertiary)' }}>
                      {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : '—'}
                    </td>
                    {/* Actions cell — stopPropagation isolates button clicks from row navigation */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {/* View button navigates to the full incident detail page */}
                      <Link to={`/layout/incidents/${inc.id}`}
                        className="px-2.5 py-1 rounded-lg font-semibold"
                        style={{ background: 'var(--bg-tertiary)', color: '#3b82f6', border: '1px solid var(--border-input)' }}>
                        <BI name="eye-fill" className="me-1" />View
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* ── Pagination Controls ── Only rendered when more than one page of incidents exists */}
      {totalPages > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center gap-1.5 pt-2 flex-wrap">
          {/* Previous page button — disabled on the first page (page === 0) */}
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
            style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
            <BI name="chevron-left" />
          </button>

          {/* Page number buttons — shows first, last, and pages adjacent to current; ellipsis for gaps */}
          {Array.from({ length: totalPages }, (_, i) => i)
            // Show only: first page, last page, and pages within 1 of the current page to keep pagination compact
            .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
            // Insert '...' ellipsis string wherever there is a gap of more than 1 between visible page numbers
            .reduce((acc, i, idx, arr) => {
              if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...');
              acc.push(i);
              return acc;
            }, [])
            .map((item, i) =>
              // Render ellipsis as a non-interactive span separator
              item === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>…</span>
              ) : (
                // Render page number button; active page gets role accent color and glow shadow
                <button key={item} onClick={() => setPage(item)}
                  className="w-9 h-9 rounded-xl text-sm font-bold transition-all"
                  style={{
                    // Active page: gradient accent background; inactive: standard card background
                    background: page === item ? `linear-gradient(135deg, ${hdr.accent}, ${hdr.accent}cc)` : 'var(--bg-secondary)',
                    color: page === item ? 'white' : 'var(--text-secondary)',
                    border: page === item ? 'none' : '1px solid var(--border-input)',
                    // Glow shadow on active page button reinforces current position in pagination
                    boxShadow: page === item ? `0 4px 12px ${hdr.accent}40` : 'none',
                  }}>
                  {/* Display 1-based page number to the user (API uses 0-based index internally) */}
                  {item + 1}
                </button>
              )
            )}

          {/* Next page button — disabled when already on the last page */}
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
            style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
            <BI name="chevron-right" />
          </button>
        </motion.div>
      )}
    </div>
  );
}