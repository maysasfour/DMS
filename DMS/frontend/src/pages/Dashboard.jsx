/**
 * Dashboard.jsx
 *
 * Main dashboard page for the Disaster Management System (DMS).
 * Renders a role-aware overview screen that adapts its content and KPI
 * cards based on the authenticated user's role:
 *   - ADMIN / OFFICIAL  — full analytics: trends, severity, type/status
 *                         breakdowns, resource utilization, resolution rate,
 *                         week-over-week comparison, live incident map.
 *   - RESPONDER / RESCUE_TEAM — operational view: active assignments,
 *                         available resources, area map, activity bar chart.
 *   - CITIZEN           — personal view: own reports, status overview,
 *                         emergency report CTA when no reports exist.
 *
 * Data is fetched in parallel from dashboardAPI, incidentAPI, and
 * resourceAPI on mount and whenever the user's role changes.
 * All text is internationalised via react-i18next (t()).
 * Charts are rendered with Recharts; the incident map is lazy-loaded.
 */

import React, { useEffect, useState } from 'react';
// React Router link used for navigating to incident list, detail, and create pages
import { Link } from 'react-router-dom';
// Framer Motion used for entrance animations and hover effects on cards and sections
import { motion } from 'framer-motion';
// i18next hook for translating all user-facing strings (supports multilingual DMS users)
import { useTranslation } from 'react-i18next';
// Recharts components for rendering KPI charts: bar, line, pie, area, radial
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, Legend,
} from 'recharts';
// DMS API service modules for fetching dashboard stats, incidents, and emergency resources
import { dashboardAPI, incidentAPI, resourceAPI } from '../services/api';
// Zustand stores: auth state (current user + role), UI state (accent color theme)
import { useAuthStore, useUIStore } from '../store';
// Wraps the lazy-loaded IncidentMap so map render errors don't crash the whole page
import ErrorBoundary from '../components/ErrorBoundary';

// Lazy-load the interactive incident map to reduce the initial JS bundle size;
// the map is only needed once the dashboard is visible
const IncidentMap = React.lazy(() => import('../components/maps/IncidentMap'));

// Role-specific hero background images shown in the dashboard banner.
// Each image visually represents the professional context of the user's role.
const HERO_IMAGES = {
  ADMIN:       'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=1400&q=80&auto=format&fit=crop',
  RESPONDER:   'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1400&q=80&auto=format&fit=crop',
  RESCUE_TEAM: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1400&q=80&auto=format&fit=crop',
  OFFICIAL:    'https://images.unsplash.com/photo-1508345228704-935cc84bf5e2?w=1400&q=80&auto=format&fit=crop',
  CITIZEN:     'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1400&q=80&auto=format&fit=crop',
};

// Color map for incident severity levels; used in pie charts and severity badges
const SEV_COLORS   = { CRITICAL: '#E63946', HIGH: '#FF7A00', MEDIUM: '#f59e0b', LOW: '#22c55e' };
// Color map for incident lifecycle statuses; drives status pill backgrounds and chart fills
const STATUS_COLORS = { OPEN: '#E63946', REPORTED: '#E63946', IN_PROGRESS: '#FF7A00', RESOLVED: '#059669', CLOSED: '#6b7280' };
// Color map for disaster/incident types (fire, flood, earthquake, etc.)
const TYPE_COLORS  = { FIRE:'#E63946', FLOOD:'#3b82f6', EARTHQUAKE:'#8b5cf6', STORM:'#06b6d4', ACCIDENT:'#f59e0b', MEDICAL:'#10b981', HAZMAT:'#ec4899', OTHER:'#6b7280' };
// Emoji icons paired with each incident type for axis labels and chart tick formatters
const TYPE_ICONS   = { FIRE:'🔥', FLOOD:'🌊', EARTHQUAKE:'🌍', STORM:'⛈️', ACCIDENT:'🚗', MEDICAL:'🏥', HAZMAT:'☣️', OTHER:'⚠️' };

// Shared card style object applied to every panel/section container in the dashboard
const card = {
  background: 'var(--bg-secondary)',    // uses CSS variable for dark/light theme support
  border: '1px solid var(--border-primary)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-md)',
};
// Shared Recharts tooltip style object so all charts have a consistent themed tooltip
const ttStyle = {
  contentStyle: { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 },
};

/* ── Tiny helpers ─────────────────────────────────────────────────────────── */

/**
 * StatCard — animated KPI tile used across all role dashboards.
 * Displays a single metric (e.g., total incidents, available resources)
 * with an icon, numeric value, label, and optional sub-text.
 *
 * @param {ReactNode} icon  — SVG icon rendered inside the colored badge
 * @param {string}    label — Metric label (translated)
 * @param {*}         value — Numeric or formatted metric value to display
 * @param {string}    sub   — Optional secondary text (e.g., "▲ 12% vs last week")
 * @param {string}    color — Accent hex color for gradient badge and glow shadow
 * @param {number}    delay — Framer Motion entrance animation delay in seconds
 */
function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  return (
    // Entrance slide-up animation with a hover lift effect and dynamic glow shadow
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -4, boxShadow: `0 12px 40px ${color}25` }}
      style={{ ...card, transition: 'all 0.2s' }}
      className="rounded-2xl p-5 flex items-center gap-4"
    >
      {/* Colored icon badge with gradient and glow matching the metric's accent color */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg,${color},${color}aa)`, boxShadow: `0 4px 16px ${color}40` }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        {/* Large bold numeric value; falls back to em dash when data is not yet loaded */}
        <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
        {/* Truncated metric label so long translations don't break layout */}
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {/* Optional sub-text (e.g., week-over-week delta, resolution percentage) */}
        {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

/**
 * SectionHeader — consistent heading row used above each chart or list panel.
 * Shows an emoji icon, section title, and an optional action element (e.g., "View All" link).
 *
 * @param {string}    icon   — Emoji prefix for visual category cue
 * @param {string}    title  — Section heading text
 * @param {string}    accent — Role accent color applied to the icon
 * @param {ReactNode} action — Optional right-aligned element (link, badge, etc.)
 */
function SectionHeader({ icon, title, accent, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        {/* Icon colored with the role's accent color for quick visual grouping */}
        <span style={{ color: accent }}>{icon}</span>
        {title}
      </h2>
      {/* Slot for an optional right-aligned action (e.g., "View All →" navigation link) */}
      {action}
    </div>
  );
}

/* ── SVG icons ──────────────────────────────────────────────────────────────── */

/**
 * Ico — lightweight inline SVG icon wrapper.
 * Renders one or two SVG path shapes as a 20×20 stroked icon.
 * Used instead of an icon library to keep the bundle small.
 *
 * @param {string} d  — Primary SVG path data string
 * @param {string} d2 — Optional secondary path (for compound icons)
 * @param {string} vb — SVG viewBox attribute (defaults to "0 0 24 24")
 */
const Ico = ({ d, d2, vb = '0 0 24 24' }) => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {/* Primary path — always rendered */}
    <path d={d} />{d2 && <path d={d2} />}
  </svg>
);

/* ── Reusable incident list ──────────────────────────────────────────────── */

/**
 * IncidentRow — a single clickable row representing one incident in a list.
 * Navigates to the incident detail page on click.
 * Displays the incident's status color bar, title, location, status pill, and severity badge.
 *
 * @param {object} inc — Incident object from the API (id, title, city, status, severity)
 * @param {function} t — i18next translation function for "unknown location" fallback
 */
function IncidentRow({ inc, t }) {
  return (
    // Link navigates to the individual incident detail page for full information
    <Link to={`/layout/incidents/${inc.id}`}
      className="flex items-center gap-3 p-3 rounded-xl transition"
      style={{ border: '1px solid var(--border-primary)' }}
      // Highlight row on hover using CSS variable for theme-aware background
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Vertical color bar indicating incident lifecycle status (red=open, orange=in-progress, green=resolved) */}
      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[inc.status] || '#6b7280' }} />
      <div className="flex-1 min-w-0">
        {/* Incident title truncated to prevent layout overflow on long descriptions */}
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{inc.title}</p>
        {/* Location: prefers city name, then locationName, then raw address, then "unknown" fallback */}
        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
          📍 {inc.city || inc.locationName || inc.address || t('common.unknown_location')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {/* Status pill with color-coded background matching the incident's current workflow state */}
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: STATUS_COLORS[inc.status] || '#6b7280' }}>
          {/* Replace underscore so "IN_PROGRESS" displays as "IN PROGRESS" */}
          {inc.status?.replace('_', ' ')}
        </span>
        {/* Severity label shown only when the incident has a severity level set */}
        {inc.severity && (
          <span className="text-xs font-bold" style={{ color: SEV_COLORS[inc.severity] || '#6b7280' }}>{inc.severity}</span>
        )}
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN / OFFICIAL DASHBOARD
   Full analytics view for administrators and government officials.
   Shows system-wide incident metrics, trends, resource utilization,
   resolution rates, type/status breakdowns, and a live incident map.
═══════════════════════════════════════════════════════════════════════════ */

/**
 * AdminDashboard — analytics dashboard for ADMIN and OFFICIAL roles.
 * Provides a comprehensive operational picture of the entire DMS:
 * incident KPIs, 14-day trend area chart, severity/type/status pie charts,
 * resource utilization donut, resolution rate gauge, week-over-week comparison,
 * recent incidents list, and a live incident map.
 *
 * @param {object}   stats     — Aggregated statistics from dashboardAPI
 * @param {Array}    recent    — Most recent incidents from incidentAPI
 * @param {Array}    trends    — Daily incident count series (14 days) from dashboardAPI
 * @param {Array}    resources — All emergency resources from resourceAPI
 * @param {function} t         — i18next translation function
 * @param {string}   accent    — Role-specific accent hex color
 */
function AdminDashboard({ stats, recent, trends, resources, t, accent }) {
  // Build severity distribution data for the pie chart from aggregated stats counters
  const severityData = [
    { name: 'Critical', value: stats?.criticalIncidents || 0, color: '#E63946' },
    { name: 'High',     value: stats?.highIncidents    || 0, color: '#FF7A00' },
    { name: 'Medium',   value: stats?.mediumIncidents  || 0, color: '#f59e0b' },
    { name: 'Low',      value: stats?.lowIncidents     || 0, color: '#22c55e' },
  ];

  // Build type breakdown from recent incidents (since API stats may not include per-type counts)
  const typeCounts = {};
  // Tally each incident's type (or category if type is absent), defaulting to 'OTHER'
  recent.forEach(i => { const t = i.type || i.category || 'OTHER'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  // Map to Recharts-compatible array with matching type colors for the horizontal bar chart
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] || '#6b7280' }));

  // Build status breakdown from recent incidents for the status pie chart
  const statusCounts = {};
  recent.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });
  // Replace underscore in status names for readable pie chart labels
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace('_',' '), value, color: STATUS_COLORS[name] || '#6b7280' }));

  // Compute resource utilization counts by filtering the resources array by status groups
  const totalRes = resources.length;                                                                              // total resources registered in the system
  const availRes = resources.filter(r => r.status === 'AVAILABLE').length;                                       // ready to be dispatched
  const busyRes  = resources.filter(r => ['ASSIGNED','BUSY','DEPLOYED'].includes(r.status)).length;              // currently engaged at an incident
  const offRes   = resources.filter(r => ['OFFLINE','OUT_OF_SERVICE'].includes(r.status)).length;               // unavailable due to maintenance or downtime
  // Filter out zero-value segments so the donut chart doesn't show empty arcs
  const resUtilData = [
    { name: 'Available', value: availRes, fill: '#22c55e' },
    { name: 'Deployed',  value: busyRes,  fill: '#FF7A00' },
    { name: 'Offline',   value: offRes,   fill: '#6b7280' },
  ].filter(d => d.value > 0);

  // Compute resolution rate as a percentage of resolved vs total incidents
  const total    = stats?.totalIncidents || recent.length || 1; // guard against divide-by-zero
  const resolved = stats?.resolvedIncidents || 0;
  const resRate  = Math.round((resolved / total) * 100);

  // Weekly comparison: sum incident counts from the last 7 days vs the previous 7 days
  const last7  = trends.slice(-7).reduce((s, d) => s + (d.count || 0), 0);
  const prev7  = trends.slice(-14, -7).reduce((s, d) => s + (d.count || 0), 0);
  // Percentage change; skip division if prev7 is 0 (no prior data)
  const weekDelta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  return (
    <>
      {/* ── Row 1: KPI cards ── */}
      {/* Four top-level stat cards: total incidents, active, resolved, resource availability */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total incidents card with week-over-week delta as sub-text */}
        <StatCard icon={<Ico d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>}
          label={t('dashboard.total_incidents')} value={stats?.totalIncidents ?? recent.length} color="#E63946"
          sub={weekDelta !== 0 ? `${weekDelta > 0 ? '▲' : '▼'} ${Math.abs(weekDelta)}% vs last week` : null} delay={0} />
        {/* Active/open incidents card — shows current workload pressure */}
        <StatCard icon={<Ico d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" d2="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>}
          label={t('dashboard.active')} value={stats?.activeIncidents ?? stats?.openIncidents ?? 0} color="#FF7A00" delay={0.05} />
        {/* Resolved incidents card with resolution rate percentage as sub-text */}
        <StatCard icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          label={t('dashboard.resolved')} value={stats?.resolvedIncidents ?? 0} color="#059669"
          sub={`${resRate}% resolution rate`} delay={0.1} />
        {/* Resource availability card: shows available/total ratio and percentage */}
        <StatCard icon={<Ico d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" d2="M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>}
          label={t('dashboard.available_resources')} value={`${availRes}/${totalRes}`} color="#7c3aed"
          sub={totalRes > 0 ? `${Math.round((availRes/totalRes)*100)}% available` : null} delay={0.15} />
      </div>

      {/* ── Row 2: Trend + Severity ── */}
      {/* 14-day incident area trend chart (left, 2/3 width) + severity donut chart (right, 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 14-day area chart: visualises daily incident volume over the past two weeks */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={card} className="p-5 lg:col-span-2">
          <SectionHeader icon="📈" title={t('dashboard.incident_trends')} accent={accent}
            action={<span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accent}15`, color: accent }}>14 days</span>} />
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trends}>
                <defs>
                  {/* Vertical gradient fill under the area line — fades to transparent at bottom */}
                  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accent} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                {/* Trim date to MM-DD for compact axis labels */}
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                <Tooltip {...ttStyle} />
                {/* Area stroke uses role accent color; gradient fill is defined above */}
                <Area type="monotone" dataKey="count" stroke={accent} strokeWidth={2.5} fill="url(#tg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            // Graceful empty state when no trend data is available from the API
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.no_data')}</div>
          )}
        </motion.div>

        {/* Severity donut chart: proportions of CRITICAL / HIGH / MEDIUM / LOW incidents */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={card} className="p-5">
          <SectionHeader icon="🥧" title={t('dashboard.severity_distribution')} accent={accent} />
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              {/* Inner radius creates donut shape; paddingAngle separates segments */}
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip {...ttStyle} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend below the chart: color dot + severity name + count */}
          <div className="grid grid-cols-2 gap-1 mt-1">
            {severityData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span>{name}: <strong style={{ color: 'var(--text-primary)' }}>{value}</strong></span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Type breakdown + Status breakdown ── */}
      {/* Side-by-side charts: incident type horizontal bar chart and status pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Horizontal bar chart showing count of each disaster/incident type (fire, flood, etc.) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="📊" title="Incidents by Type" accent={accent} />
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              {/* layout="vertical" makes bars horizontal so long type names fit on Y axis */}
              <BarChart data={typeData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                {/* Prepend type emoji icon to each Y-axis label for quick visual scanning */}
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} width={70}
                  tickFormatter={v => `${TYPE_ICONS[v] || '⚠️'} ${v}`} />
                <Tooltip {...ttStyle} />
                {/* Each bar colored by its incident type color */}
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            // Empty state when no incidents have been recorded yet
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No type data</div>
          )}
        </motion.div>

        {/* Full pie chart (no donut) showing status breakdown with inline percentage labels */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card} className="p-5">
          <SectionHeader icon="📋" title="Incidents by Status" accent={accent} />
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                {/* Labels rendered directly on slices; labelLine disabled for cleaner look */}
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip {...ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No status data</div>
          )}
        </motion.div>
      </div>

      {/* ── Row 4: Resource utilization + Resolution rate + Week-over-Week ── */}
      {/* Three equal-width panels giving operational and performance KPI details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Resource utilization donut: available vs deployed vs offline emergency resources */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="🚑" title="Resource Utilization" accent={accent} />
          {resUtilData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  {/* Donut chart for resource utilization; smaller radius keeps it compact */}
                  <Pie data={resUtilData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={4}>
                    {resUtilData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip {...ttStyle} />
                </PieChart>
              </ResponsiveContainer>
              {/* Compact legend below donut showing name + count for each resource status */}
              <div className="space-y-1 mt-1">
                {resUtilData.map(({ name, value, fill }) => (
                  <div key={name} className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: fill }} />{name}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No resource data</div>
          )}
        </motion.div>

        {/* Circular SVG gauge showing what percentage of incidents have been resolved */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card} className="p-5">
          <SectionHeader icon="✅" title="Resolution Rate" accent={accent} />
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-28 h-28">
              {/* Custom SVG circular progress gauge (not a chart lib — for precise control) */}
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                {/* Background track ring */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
                {/* Foreground arc: strokeDashoffset controls how much of the arc is visible */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - resRate / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              {/* Centered percentage label overlaid on the gauge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#059669' }}>{resRate}%</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>resolved</span>
              </div>
            </div>
            {/* Two mini tiles below the gauge showing absolute resolved and active counts */}
            <div className="mt-3 grid grid-cols-2 gap-3 w-full">
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-lg font-black" style={{ color: '#059669' }}>{resolved}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Resolved</p>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                {/* Fall back to openIncidents if activeIncidents is not in stats object */}
                <p className="text-lg font-black" style={{ color: '#E63946' }}>{(stats?.activeIncidents ?? stats?.openIncidents) || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Active</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Week-over-week comparison panel: percentage change and raw counts for both weeks */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card} className="p-5">
          <SectionHeader icon="📅" title="Week-over-Week" accent={accent} />
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div className="text-center">
              {/* Red for increase (more incidents = worse), green for decrease */}
              <p className="text-3xl font-black" style={{ color: weekDelta >= 0 ? '#E63946' : '#059669' }}>
                {weekDelta >= 0 ? '▲' : '▼'} {Math.abs(weekDelta)}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>vs previous 7 days</p>
            </div>
            {/* Side-by-side raw counts for this week and last week */}
            <div className="w-full grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{last7}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This week</p>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-lg font-black" style={{ color: 'var(--text-secondary)' }}>{prev7}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Last week</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 5: Recent incidents + Live map ── */}
      {/* Side-by-side: scrollable list of the 5 most recent incidents and a live incident map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent incidents list with link to full incident management page */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="🕐" title={t('dashboard.recent_incidents')} accent={accent}
            action={<Link to="/layout/incidents" className="text-xs font-semibold" style={{ color: accent }}>{t('dashboard.view_all')} →</Link>} />
          {recent.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.no_incidents')}</p>
            // Show only the 5 most recent incidents to keep the panel compact
            : <div className="space-y-2">{recent.slice(0,5).map(inc => <IncidentRow key={inc.id} inc={inc} t={t} />)}</div>}
        </motion.div>

        {/* Live incident map panel: lazy-loaded with ErrorBoundary and Suspense spinner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden" style={{ ...card, padding: 0 }}>
          {/* Map panel header with a pulsing green dot to indicate live data */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: accent }}>🗺️</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Live Incident Map</span>
            {/* Animated pulse dot signals that the map reflects real-time incident data */}
            <span className="ms-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          {/* ErrorBoundary prevents a map rendering failure from breaking the whole dashboard */}
          <ErrorBoundary fallback={<div className="h-64 flex items-center justify-center text-sm" style={{color:'var(--text-tertiary)'}}>Map unavailable</div>}>
            {/* Suspense shows a spinner while the IncidentMap chunk is being downloaded */}
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>}>
              {/* Pass all recent incidents to plot pins; filters and legend disabled for dashboard compactness */}
              <IncidentMap incidents={recent} height="280px" showFilters={false} showLegend={false} />
            </React.Suspense>
          </ErrorBoundary>
        </motion.div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RESPONDER / RESCUE_TEAM DASHBOARD
   Operational dashboard for first responders and rescue team members.
   Focuses on active assignments, available resources, area map,
   and weekly activity bar chart — the information most relevant
   when managing field response to live incidents.
═══════════════════════════════════════════════════════════════════════════ */

/**
 * ResponderDashboard — operational dashboard for RESPONDER and RESCUE_TEAM roles.
 * Highlights the responder's active assignments (open/in-progress incidents),
 * available resource count, weekly incident volume, and an area map.
 *
 * @param {object}   stats     — Aggregated statistics from dashboardAPI
 * @param {Array}    recent    — Incidents visible to this responder from incidentAPI
 * @param {Array}    trends    — Daily incident count series (14 days) from dashboardAPI
 * @param {Array}    resources — All emergency resources from resourceAPI
 * @param {function} t         — i18next translation function
 * @param {string}   accent    — Role-specific accent hex color (orange for responders)
 */
function ResponderDashboard({ stats, recent, trends, resources, t, accent }) {
  // Filter incidents to those the responder needs to action: open, in-progress, or reported
  const myAssignments = recent.filter(i => ['OPEN','IN_PROGRESS','REPORTED'].includes(i.status));
  // Count resources that are ready to be dispatched to a new incident
  const availRes = resources.filter(r => r.status === 'AVAILABLE').length;

  // Total incidents reported in the past 7 days for the "This week" KPI card
  const last7 = trends.slice(-7).reduce((s, d) => s + (d.count || 0), 0);

  return (
    <>
      {/* KPI row: assignments, resolved, available resources, weekly incident volume */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* My Assignments — how many incidents need the responder's attention right now */}
        <StatCard icon={<Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}
          label={t('dashboard.my_assignments')} value={myAssignments.length} color={accent} delay={0} />
        {/* Resolved incidents — gives responder a sense of completed workload */}
        <StatCard icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          label={t('dashboard.resolved')} value={stats?.resolvedIncidents ?? 0} color="#059669" delay={0.05} />
        {/* Available resources — how many units can be dispatched immediately */}
        <StatCard icon={<Ico d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" d2="M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>}
          label={t('dashboard.available_resources')} value={availRes} color="#7c3aed" delay={0.1} />
        {/* This week — total incidents in the last 7 days showing current demand */}
        <StatCard icon={<Ico d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>}
          label="This week" value={last7} color="#f59e0b" sub="incidents reported" delay={0.15} />
      </div>

      {/* Assignments list + area map row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* List of active assignments; empty state shown when no incidents need attention */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="🚨" title={t('dashboard.my_assignments')} accent={accent}
            action={<Link to="/layout/incidents" className="text-xs font-semibold" style={{ color: accent }}>{t('dashboard.view_all')} →</Link>} />
          {myAssignments.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No active assignments</p>
            // Show up to 5 assignments in the panel; link to full list for more
            : <div className="space-y-2">{myAssignments.slice(0,5).map(inc => <IncidentRow key={inc.id} inc={inc} t={t} />)}</div>}
        </motion.div>

        {/* Area map showing incident locations relevant to the responder's operational zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl overflow-hidden" style={{ ...card, padding: 0 }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: accent }}>🗺️</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>My Area Map</span>
          </div>
          {/* ErrorBoundary prevents a map failure from crashing the responder dashboard */}
          <ErrorBoundary fallback={<div className="h-64 flex items-center justify-center text-sm" style={{color:'var(--text-tertiary)'}}>Map unavailable</div>}>
            {/* Suspense spinner uses the role's accent color for brand consistency */}
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor: accent, borderTopColor:'transparent'}} /></div>}>
              <IncidentMap incidents={recent} height="280px" showFilters={false} showLegend={false} />
            </React.Suspense>
          </ErrorBoundary>
        </motion.div>
      </div>

      {/* Response activity bar chart: daily incident counts over the last 14 days */}
      {/* Only rendered if trend data is available from the API */}
      {trends.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="📊" title={t('dashboard.response_activity')} accent={accent} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trends}>
              {/* Trim date to MM-DD for compact X-axis labels */}
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
              <Tooltip {...ttStyle} />
              {/* Bars colored with the responder's accent color (orange) */}
              <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CITIZEN DASHBOARD
   Community member view focused on their own submitted incident reports.
   Shows personal stats, a list of their reports, a type breakdown chart,
   and a prominent emergency "Report Incident" CTA when no reports exist.
═══════════════════════════════════════════════════════════════════════════ */

/**
 * CitizenDashboard — personal dashboard for CITIZEN role users.
 * Displays only the incidents the citizen has personally reported,
 * their active/resolved counts, a type breakdown chart, and a
 * call-to-action button to report a new emergency when no reports exist.
 *
 * @param {object}   stats  — Aggregated statistics from dashboardAPI (may be limited for citizens)
 * @param {Array}    recent — The citizen's own incidents fetched via getMyIncidents
 * @param {function} t      — i18next translation function
 * @param {string}   accent — Role-specific accent hex color (green for citizens)
 */
function CitizenDashboard({ stats, recent, t, accent }) {
  // Total number of incidents this citizen has ever submitted
  const myReports = recent.length;
  // Count reports that are still open and need responder attention
  const active = recent.filter(i => ['OPEN','IN_PROGRESS','REPORTED'].includes(i.status)).length;
  // Count reports that have been fully resolved or closed by responders
  const resolved = recent.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  // Type breakdown of user's reports (only their own incidents, not system-wide)
  const typeCounts = {};
  recent.forEach(i => { const tp = i.type || i.category || 'OTHER'; typeCounts[tp] = (typeCounts[tp] || 0) + 1; });
  // Prepare Recharts data array with per-type colors matching the global TYPE_COLORS map
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] || '#6b7280' }));

  return (
    <>
      {/* KPI row: three cards showing the citizen's personal report counts */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* My Reports — total reports submitted by this citizen */}
        <StatCard icon={<Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}
          label={t('dashboard.my_reports')} value={myReports} color={accent} delay={0} />
        {/* Active Near Me — reports still being handled by responders */}
        <StatCard icon={<Ico d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" d2="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>}
          label={t('dashboard.active_near_me')} value={active} color="#E63946" delay={0.05} />
        {/* Resolved — reports that have been successfully closed */}
        <StatCard icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          label={t('dashboard.resolved')} value={resolved} color="#059669" delay={0.1} />
      </div>

      {/* Reports list + type breakdown chart (or emergency CTA if no reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* List of the citizen's own incident reports with links to detail pages */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="📋" title={t('dashboard.my_reports')} accent={accent}
            action={<Link to="/layout/incidents" className="text-xs font-semibold" style={{ color: accent }}>{t('dashboard.view_all')} →</Link>} />
          {recent.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.no_incidents')}</p>
            // Slice to 5 most recent to keep the panel height manageable
            : <div className="space-y-2">{recent.slice(0,5).map(inc => <IncidentRow key={inc.id} inc={inc} t={t} />)}</div>}
        </motion.div>

        {/* Conditional: show type bar chart if citizen has reports, otherwise show emergency CTA */}
        {typeData.length > 0 ? (
          // Bar chart showing breakdown of the citizen's reports by disaster/incident type
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card} className="p-5">
            <SectionHeader icon="📊" title="My Reports by Type" accent={accent} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} barSize={20}>
                {/* Prepend emoji icon to type name on X axis for visual clarity */}
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => `${TYPE_ICONS[v] || '⚠️'} ${v}`} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                <Tooltip {...ttStyle} />
                {/* Each bar gets its incident type color applied via Cell */}
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          /* Emergency CTA panel shown when the citizen has no submitted reports yet.
             Encourages engagement and incident reporting to improve DMS coverage. */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={card} className="p-6 flex flex-col items-center justify-center text-center">
            {/* Icon badge in the role's accent color to draw attention */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg"
              style={{ background: `linear-gradient(135deg,${accent},${accent}aa)` }}>
              {/* Phone/emergency icon suggesting the citizen should call for help */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M9 9a3 3 0 116 0v9H9V9zm3-9v2M3 9h2m1.3-5.7l1.4 1.4M21 21H3"/>
              </svg>
            </div>
            {/* Translated emergency heading and descriptive text for first-time users */}
            <h2 className="text-base font-black mb-2" style={{ color: 'var(--text-primary)' }}>{t('dashboard.emergency')}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)', maxWidth: 220 }}>{t('dashboard.emergency_desc')}</p>
            {/* Primary CTA button linking to the incident creation form */}
            <Link to="/layout/incidents/create"
              className="px-6 py-3 rounded-xl font-bold text-white shadow-lg text-sm"
              style={{ background: `linear-gradient(135deg,${accent},${accent}cc)` }}>
              🚨 {t('dashboard.report_new')}
            </Link>
          </motion.div>
        )}
      </div>

      {/* Status breakdown: three mini tiles summarizing open, resolved, and total report counts */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
        <SectionHeader icon="📈" title="Report Status Overview" accent={accent} />
        <div className="grid grid-cols-3 gap-4">
          {/* Iterate over the three status summary items to keep JSX DRY */}
          {[
            { label: 'Open / Active', value: active,    color: '#E63946', icon: '🔴' },
            { label: 'Resolved',      value: resolved,  color: '#059669', icon: '✅' },
            { label: 'Total Reports', value: myReports, color: accent,    icon: '📋' },
          ].map(({ label, value, color, icon }) => (
            // Each tile has an emoji, large colored number, and small label
            <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
   Entry point rendered by the router for the /dashboard route.
   Handles data fetching, role detection, loading skeleton, and
   conditional rendering of the correct role-specific sub-dashboard.
═══════════════════════════════════════════════════════════════════════════ */

// Maps each user role to its theme accent color used across cards, charts, and highlights
const ROLE_ACCENT  = { ADMIN:'#E63946', RESPONDER:'#FF7A00', RESCUE_TEAM:'#FF7A00', OFFICIAL:'#7c3aed', CITIZEN:'#059669' };
// Maps each user role to a dark gradient overlay applied over the hero banner background image
const ROLE_OVERLAY = {
  ADMIN:       'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(230,57,70,0.85))',
  RESPONDER:   'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(255,122,0,0.85))',
  RESCUE_TEAM: 'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(255,122,0,0.85))',
  OFFICIAL:    'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(124,58,237,0.85))',
  CITIZEN:     'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(5,150,105,0.85))',
};
// Human-readable role labels shown in the hero banner subtitle above the user's name
const ROLE_LABELS  = { ADMIN:'System Administrator', RESPONDER:'Emergency Responder', RESCUE_TEAM:'Emergency Responder', OFFICIAL:'Government Official', CITIZEN:'Community Member' };

/**
 * Dashboard — root page component for the DMS dashboard route.
 * Fetches statistics, recent incidents, 14-day trends, and resources in
 * parallel on mount, then renders the appropriate role-specific dashboard
 * variant with animated skeleton loading states while data is in flight.
 */
export default function Dashboard() {
  // Authenticated user object (contains role, firstName, etc.) from Zustand auth store
  const { user }    = useAuthStore();
  // UI accent color override set by the user in their profile/settings
  const { accentColor } = useUIStore();
  // Translation function — all user-visible strings pass through this for i18n
  const { t }       = useTranslation();

  // Aggregated incident and resource statistics from the dashboardAPI
  const [stats,     setStats]     = useState(null);
  // Array of recent incidents; citizens get only their own, others get all
  const [recent,    setRecent]    = useState([]);
  // Daily incident count series for the 14-day trend chart
  const [trends,    setTrends]    = useState([]);
  // All emergency resources (vehicles, personnel, equipment) for utilization display
  const [resources, setResources] = useState([]);
  // Controls the skeleton loading state shown before API calls resolve
  const [loading,   setLoading]   = useState(true);

  // Fetch all dashboard data in parallel when the component mounts or the user's role changes
  useEffect(() => {
    const isCitizen = (user?.role || 'CITIZEN') === 'CITIZEN';
    // Citizens only see their own reports; admins/responders see all
    const incidentFetch = isCitizen
      ? incidentAPI.getMyIncidents({ page: 0, size: 10 })  // scoped to the citizen's own reports
      : incidentAPI.getIncidents({ page: 0, size: 10 });   // full system-wide incident list

    // Run all four API calls concurrently to minimize dashboard load time
    Promise.all([
      dashboardAPI.getStatistics().catch(() => ({ data: null })),               // aggregate KPIs; gracefully degrade on failure
      incidentFetch,                                                             // recent incidents (role-scoped)
      dashboardAPI.getIncidentTrends(14).catch(() => ({ data: [] })),           // 14-day daily counts for trend chart
      resourceAPI.getResources({ page: 0, size: 100 }).catch(() => ({ data: { data: [] } })), // all resources for utilization panel
    ]).then(([sRes, iRes, tRes, rRes]) => {
      // Normalise stats: API may return data nested under .data.data or .data
      setStats(sRes.data?.data || sRes.data);
      // Extract the paged content array from the incidents response
      const paged = iRes.data?.data || iRes.data;
      setRecent(paged?.content || []);
      // Trends may be nested under .data.daily for some API versions
      const raw = tRes.data?.data ?? tRes.data ?? [];
      setTrends(Array.isArray(raw) ? (raw[0]?.daily ?? raw) : []);
      // Resources may come paginated or as a flat array depending on API version
      const rd = rRes.data?.data?.content ?? rRes.data?.data ?? rRes.data ?? [];
      setResources(Array.isArray(rd) ? rd : []);
    }).catch(err => console.error('[Dashboard]', err))  // log unexpected errors without crashing
      .finally(() => setLoading(false));               // always hide skeleton when done
  }, [user?.role]); // re-fetch if the user's role changes (e.g., after an admin role update)

  // Determine the current user's role, defaulting to CITIZEN for unauthenticated edge cases
  const role    = user?.role || 'CITIZEN';
  // Use saved accent color from settings if set, otherwise use role default
  const accent  = accentColor || ROLE_ACCENT[role] || '#E63946';
  // Role-specific gradient overlay for the hero banner image
  const overlay = ROLE_OVERLAY[role];

  return (
    <div className="min-h-full pb-8">
      {/* Hero banner: role-specific background image with gradient overlay, welcome text, and top-level stats */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl mb-6 relative overflow-hidden" style={{ minHeight: 140 }}>
        {/* Background image stretched to fill the banner */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGES[role]})` }} />
        {/* Dark gradient overlay applied over the image for text legibility */}
        <div className="absolute inset-0" style={{ background: overlay }} />
        {/* Scan beam on hero — animated horizontal line that sweeps downward for a cyberpunk effect */}
        <motion.div className="absolute left-0 right-0 pointer-events-none z-0"
          style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }}
          animate={{ top: ['-1px', '100%'] }}
          // Continuous 4-second linear loop — never stops while the dashboard is visible
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }} />
        {/* Banner content: left side has role label + greeting; right side has summary stats */}
        <div className="relative z-10 p-6 flex items-center justify-between">
          <div>
            {/* Role subtitle in small monospace uppercase above the welcome message */}
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1 font-mono">{ROLE_LABELS[role]}</p>
            {/* Personalised welcome heading using the user's first name */}
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.04em' }}>
              {t('dashboard.welcome')}, {user?.firstName || 'User'}
            </h1>
            {/* Current date with an animated pulsing dot indicator */}
            <p className="mt-1 text-white/50 text-xs flex items-center gap-2">
              {/* Pulsing dot in the role's accent color indicates live/active status */}
              <motion.span style={{ color: accent }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>●</motion.span>
              {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          {/* Summary stat trio on the right side — hidden on mobile to conserve space */}
          <div className="hidden md:flex items-center gap-4">
            {/* Three top-level counters: Total, Active, Resolved incidents */}
            {[
              { label: 'Total',    value: stats?.totalIncidents ?? recent.length ?? '—' },
              { label: 'Active',   value: stats?.activeIncidents ?? stats?.openIncidents ?? '—' },
              { label: 'Resolved', value: stats?.resolvedIncidents ?? '—' },
            ].map(({ label, value }, i, arr) => (
              <React.Fragment key={label}>
                {/* Each stat fades in slightly after the banner for a staggered entrance */}
                <motion.div className="text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                  <div className="text-2xl font-black text-white" style={{ fontFamily: "'Rajdhani','Inter',sans-serif" }}>{value}</div>
                  <div className="text-white/50 text-xs font-mono uppercase tracking-wider">{label}</div>
                </motion.div>
                {/* Vertical divider between stat items; not rendered after the last item */}
                {i < arr.length - 1 && <div className="w-px h-10 bg-white/15" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Gradient fade at the bottom of the banner to blend into the page background */}
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to top,var(--bg-primary),transparent)' }} />
      </motion.div>

      {/* Conditional render: show animated skeleton while API data is loading */}
      {loading ? (
        <div className="space-y-6">
          {/* Stat card skeletons — four placeholder tiles matching the KPI card grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                {/* Skeleton icon badge placeholder */}
                <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  {/* Skeleton value placeholder */}
                  <div className="skeleton h-6 w-16 rounded" />
                  {/* Skeleton label placeholder */}
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
          {/* Chart skeleton — two placeholder panels mimicking trend + severity row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wide chart skeleton (2/3 width) for the trend area chart */}
            <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div className="skeleton h-4 w-40 rounded mb-4" />
              <div className="skeleton h-44 w-full rounded-xl" />
            </div>
            {/* Narrow chart skeleton (1/3 width) for the severity donut chart */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div className="skeleton h-4 w-32 rounded mb-4" />
              <div className="skeleton h-36 rounded-full mx-auto w-36" />
            </div>
          </div>
          {/* List skeleton — placeholder for the recent incidents list panel */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="skeleton h-4 w-36 rounded mb-4" />
            {/* Four placeholder incident rows with status bar, title, and status pill */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="skeleton w-2 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-3/4 rounded" />
                  <div className="skeleton h-2.5 w-1/2 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Render AdminDashboard for system administrators and government officials */}
          {(role === 'ADMIN' || role === 'OFFICIAL') && (
            <AdminDashboard stats={stats} recent={recent} trends={trends} resources={resources} t={t} accent={accent} />
          )}
          {/* Render ResponderDashboard for field responders and rescue team members */}
          {(role === 'RESPONDER' || role === 'RESCUE_TEAM') && (
            <ResponderDashboard stats={stats} recent={recent} trends={trends} resources={resources} t={t} accent={accent} />
          )}
          {/* Render CitizenDashboard for community members reporting incidents */}
          {role === 'CITIZEN' && (
            <CitizenDashboard stats={stats} recent={recent} t={t} accent={accent} />
          )}
          {/* Fallback to AdminDashboard for any unrecognised or future role values */}
          {!['ADMIN','OFFICIAL','RESPONDER','RESCUE_TEAM','CITIZEN'].includes(role) && (
            <AdminDashboard stats={stats} recent={recent} trends={trends} resources={resources} t={t} accent={accent} />
          )}
        </>
      )}
    </div>
  );
}