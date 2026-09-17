/**
 * Reports.jsx — Incident Analytics & Reporting Dashboard
 *
 * This page provides administrators and dispatchers with a comprehensive
 * view of all disaster incidents recorded in the DMS. It supports:
 *   - Multi-dimensional filtering (year, month, type, severity, status)
 *   - Four analytical views: Overview, Analytics Charts, Incident Log, Heatmap
 *   - Data export in CSV, Excel (TSV), JSON, and print-to-PDF formats
 *   - Real-time summary stats (total, open, in-progress, resolved, critical)
 *   - Interactive Recharts visualisations (area, bar, line, pie)
 *   - A geographic heatmap powered by HeatmapView for spatial analysis
 *
 * Data is fetched once from incidentAPI (up to 500 records) and all
 * filtering/aggregation is performed client-side using memoised selectors.
 */

// React core hooks for state management, side effects, and memoised computation
import React, { useEffect, useState, useMemo } from 'react';
// Framer Motion for smooth entrance/hover animations on cards and panels
import { motion } from 'framer-motion';
// i18next hook providing the t() translation function for multilingual UI
import { useTranslation } from 'react-i18next';
// DMS incident API service — wraps backend REST calls for incident data
import { incidentAPI } from '../services/api';
// Recharts components used across the four chart types rendered in this page
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
// Geographic heatmap component that renders incident density on a map
import HeatmapView from '../components/maps/HeatmapView';

/**
 * BI — Thin wrapper around Bootstrap Icons via the `bi` CSS class.
 * Accepts a Bootstrap icon name (e.g. "bar-chart-fill") and optional className/style.
 * Using a wrapper avoids repetitive className strings throughout the file.
 */
const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

/* ── colour palette ────────────────────────────────────────────────────────── */
// Maps incident severity levels to traffic-light colours used in charts and badges
const SEVERITY_COLORS = { CRITICAL: '#E63946', HIGH: '#FF7A00', MEDIUM: '#f59e0b', LOW: '#22c55e' };
// Maps incident workflow statuses to intuitive colours (red = open danger, green = resolved)
const STATUS_COLORS   = { OPEN: '#E63946', IN_PROGRESS: '#FF7A00', RESOLVED: '#059669', CLOSED: '#6b7280' };
// Rotating palette for incident-type slices/bars where count may exceed four categories
const TYPE_COLORS     = ['#E63946','#FF7A00','#f59e0b','#22c55e','#3b82f6','#7c3aed','#ec4899','#14b8a6'];

/* ── helpers ───────────────────────────────────────────────────────────────── */
/**
 * toCsv — Converts an array of incident objects into RFC-4180 CSV text.
 * @param {Object[]} rows - Incident records to serialise
 * @param {string[]} cols - Field names to include as columns (in order)
 * @returns {string} CSV text with a header row followed by data rows
 */
const toCsv = (rows, cols) => {
  // Build the header row from the requested column names
  const header = cols.join(',');
  // Escape double-quotes inside cell values and wrap each cell in quotes
  const body   = rows.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g,'""')}"`).join(','));
  // Join header and all data rows with newlines to produce complete CSV
  return [header, ...body].join('\n');
};

/**
 * downloadBlob — Triggers a browser file download for a given Blob.
 * Creates a temporary anchor element, clicks it programmatically, then
 * revokes the object URL to free memory.
 * @param {Blob} blob - File content as a Blob
 * @param {string} name - Suggested filename for the download
 */
const downloadBlob = (blob, name) => {
  // Create a temporary object URL pointing to the blob data
  const url = URL.createObjectURL(blob);
  // Build and click a hidden anchor to trigger the browser's save dialog
  const a   = document.createElement('a');
  a.href = url; a.download = name; a.click();
  // Release the object URL to prevent memory leaks
  URL.revokeObjectURL(url);
};

/**
 * fmtDate — Formats an ISO date string into a human-readable "DD MMM YYYY" string.
 * Returns an em-dash when the date is falsy (e.g. missing updatedAt on open incidents).
 * @param {string|null} d - ISO 8601 date string or null/undefined
 * @returns {string} Formatted date or '—'
 */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/* ── Chart tooltip ─────────────────────────────────────────────────────────── */
// Shared Recharts Tooltip style object — applies DMS theme variables so tooltips
// adapt to both light and dark mode without a separate stylesheet
const TT = {
  contentStyle: {
    background: 'var(--bg-secondary)',       // matches card backgrounds in the current theme
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
};

/**
 * FilterSelect — A labelled <select> dropdown used in the filter bar.
 * Each instance controls one dimension of the incident filter (year, month, type, etc.).
 * @param {string}   label    - Human-readable label shown above the select
 * @param {string}   icon     - Bootstrap Icons name for the label prefix icon
 * @param {string}   value    - Currently selected option value (controlled)
 * @param {Function} onChange - Callback receiving the new selected value string
 * @param {Array}    options  - Array of { value, label } objects to render as <option>s
 */
function FilterSelect({ label, icon, value, onChange, options }) {
  return (
    // Vertical flex container groups the label and select element together
    <div className="flex flex-col gap-1">
      {/* Accessible label with Bootstrap Icon prefix for quick visual identification */}
      <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: 'var(--text-tertiary)' }}>
        <BI name={icon} /> {label}
      </label>
      {/* Native <select> styled with DMS theme variables; calls onChange on every change */}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl text-sm font-medium outline-none"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)', minWidth: 130 }}>
        {/* Render one <option> per entry; value 'ALL' acts as "no filter" sentinel */}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/**
 * SummaryCard — A KPI metric card displayed in the Overview section.
 * Shows a single aggregate number (e.g. total incidents, critical count) with a
 * colour-coded icon, a primary label, and an optional sub-label (e.g. "% of total").
 * Animates upward on hover via Framer Motion to signal interactivity.
 * @param {string} label  - Primary metric name (e.g. "Open Incidents")
 * @param {number} value  - Numeric KPI value to display prominently
 * @param {string} icon   - Bootstrap Icons name for the indicator icon
 * @param {string} color  - Hex colour applied to icon and its tinted background
 * @param {string} [sub]  - Optional secondary line (e.g. percentage of total)
 */
function SummaryCard({ label, value, icon, color, sub }) {
  return (
    // motion.div lifts the card 3 px upward on hover for tactile feedback
    <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl flex items-center gap-4"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' }}>
      {/* Colour-tinted icon container — background is the accent colour at 9% opacity */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <BI name={icon} className="text-xl" style={{ color }} />
      </div>
      <div>
        {/* Large bold number — the primary KPI value */}
        <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</div>
        {/* Metric label in secondary text colour */}
        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {/* Optional sub-label, e.g. "12% of total" for critical incidents */}
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// Full ordered list of months used by the month filter dropdown.
// 'ALL' at index 0 is the default "no month filter" sentinel value.
const MONTHS_LIST = ['ALL','January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Reports — Main page component for the DMS Reporting & Analytics dashboard.
 *
 * Lifecycle:
 *   1. On mount, fetches up to 500 incidents from the backend via incidentAPI.
 *   2. Derived data (years, types, filtered set, stats, chart series) are
 *      computed lazily with useMemo and update only when their dependencies change.
 *   3. The user selects a view tab (overview / charts / incidents / map) and
 *      optionally applies filters; all computations happen client-side.
 *   4. Export buttons serialise the current filtered set to CSV/Excel/JSON/PDF.
 */
export default function Reports() {
  // t() translates keys from the active locale file (en/ar/fr/es/tr)
  const { t } = useTranslation();

  /* raw data */
  // Full list of incidents fetched from the backend (unfiltered, unprocessed)
  const [incidents, setIncidents] = useState([]);
  // Loading flag controls skeleton placeholders while the API request is in-flight
  const [loading,   setLoading]   = useState(true);

  /* filters */
  // Calendar year filter; 'ALL' means no year restriction applied
  const [yearFilter,     setYearFilter]     = useState('ALL');
  // Month filter (name string, e.g. 'March'); 'ALL' means any month
  const [monthFilter,    setMonthFilter]    = useState('ALL');
  // Incident type/category filter (e.g. 'FLOOD', 'FIRE'); 'ALL' = unfiltered
  const [typeFilter,     setTypeFilter]     = useState('ALL');
  // Incident severity filter ('CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL');
  // Workflow status filter ('OPEN'|'IN_PROGRESS'|'RESOLVED'|'CLOSED'|'ALL')
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  // Active tab key — controls which view panel is rendered below the tab bar
  const [view,           setView]           = useState('overview');

  // Tracks which export format is currently downloading to show a spinner on its button
  const [downloading, setDownloading] = useState(null);

  /* fetch */
  // On initial mount, load up to 500 incidents from the backend.
  // A large page size is intentional: all filtering happens client-side for instant UX.
  useEffect(() => {
    incidentAPI.getIncidents({ size: 500 })
      .then(({ data }) => {
        // Support both paginated (data.content) and flat-array API response shapes
        const paged = data?.data || data;
        setIncidents(Array.isArray(paged) ? paged : paged?.content || []);
      })
      .catch(() => {}) // Silently suppress errors; incidents stays empty array
      .finally(() => setLoading(false));
  }, []); // Empty dependency array — run once on component mount only

  /* filter options */
  // Derive the list of available calendar years from all incident createdAt dates.
  // Sorted descending so the most recent year appears first in the dropdown.
  const years = useMemo(() => {
    const set = new Set(incidents.map(i => i.createdAt ? new Date(i.createdAt).getFullYear() : null).filter(Boolean));
    return ['ALL', ...Array.from(set).sort((a,b) => b - a)];
  }, [incidents]);

  // Collect unique incident types/categories from the dataset for the type filter dropdown
  const types = useMemo(() => ['ALL', ...new Set(incidents.map(i => i.type || i.category).filter(Boolean))], [incidents]);

  /* filtered */
  // Apply all active filters to produce the subset of incidents shown in charts/tables.
  // Each filter is evaluated in sequence; any failing guard returns false early.
  const filtered = useMemo(() => incidents.filter(inc => {
    // Parse the incident creation date once for year/month comparisons
    const d = inc.createdAt ? new Date(inc.createdAt) : null;
    // Year guard: skip incidents not matching the selected year
    if (yearFilter     !== 'ALL' && d?.getFullYear()  !== Number(yearFilter))           return false;
    // Month guard: MONTHS_LIST.indexOf maps month name to 1-based month number
    if (monthFilter    !== 'ALL' && d?.getMonth() + 1 !== MONTHS_LIST.indexOf(monthFilter)) return false;
    // Type guard: support both 'type' and 'category' field names from the backend
    if (typeFilter     !== 'ALL' && (inc.type || inc.category) !== typeFilter)          return false;
    // Severity guard: match exact severity string
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter)                    return false;
    // Status guard: match exact status string
    if (statusFilter   !== 'ALL' && inc.status   !== statusFilter)                      return false;
    return true; // Incident passes all active filters — include it
  }), [incidents, yearFilter, monthFilter, typeFilter, severityFilter, statusFilter]);

  /* stats */
  // Aggregate KPI counts from the filtered dataset for the SummaryCard row.
  // 'resolved' includes both RESOLVED and CLOSED statuses for a holistic view.
  const stats = useMemo(() => ({
    total:      filtered.length,
    open:       filtered.filter(i => i.status === 'OPEN').length,
    resolved:   filtered.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    critical:   filtered.filter(i => i.severity === 'CRITICAL').length,
    inProgress: filtered.filter(i => i.status === 'IN_PROGRESS').length,
  }), [filtered]);

  /* chart data */
  // Aggregate incident counts by calendar month for the area/line trend charts.
  // Key format is "MMM YYYY" (e.g. "Jan 2025") which Recharts renders on the X-axis.
  const byMonth = useMemo(() => {
    const map = {};
    filtered.forEach(i => {
      if (!i.createdAt) return; // Skip incidents without a creation timestamp
      const key = new Date(i.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      map[key] = (map[key] || 0) + 1; // Increment count for this month bucket
    });
    // Convert map to array of { month, count } objects for Recharts
    return Object.entries(map).map(([month, count]) => ({ month, count }));
  }, [filtered]);

  // Count incidents per severity level for the donut/pie chart in the Overview tab.
  // Pre-seeded with all four levels so empty buckets still appear in the legend.
  const bySeverity = useMemo(() => {
    const m = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filtered.forEach(i => { if (i.severity && m[i.severity] !== undefined) m[i.severity]++; });
    // Convert to [{ name, value }] format expected by Recharts <Pie>
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Count incidents per workflow status for the status distribution pie chart.
  // 'key' is preserved as the raw API value to look up STATUS_COLORS correctly.
  const byStatus = useMemo(() => {
    const m = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
    filtered.forEach(i => { if (i.status && m[i.status] !== undefined) m[i.status]++; });
    // Replace underscore in display name (e.g. "IN_PROGRESS" → "IN PROGRESS") while keeping raw key
    return Object.entries(m).map(([name, value]) => ({ name: name.replace('_',' '), value, key: name }));
  }, [filtered]);

  // Count incidents per type/category, sorted descending by count for a ranked bar chart.
  // Falls back to 'OTHER' when both type and category are absent on an incident record.
  const byType = useMemo(() => {
    const m = {};
    filtered.forEach(i => { const k = i.type || i.category || 'OTHER'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  /* downloads */
  /**
   * downloadCSV — Exports the current filtered incident list as a UTF-8 CSV file.
   * Only a curated set of columns is included to keep the export focused and readable.
   */
  const downloadCSV = () => {
    setDownloading('csv'); // Show spinner on the CSV button during serialisation
    // Select the relevant fields for the CSV export; excludes large nested objects
    const cols = ['id','title','type','severity','status','city','address','createdAt','updatedAt'];
    const csv  = toCsv(filtered, cols);
    // Trigger browser download with a timestamped filename to avoid collisions
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `dms-incidents-${Date.now()}.csv`);
    setTimeout(() => setDownloading(null), 500); // Brief delay before clearing spinner
  };

  /**
   * downloadJSON — Exports filtered incidents as a structured JSON file.
   * Wraps the incident array in a metadata envelope (export timestamp, total count)
   * so the file is self-describing when used by external analytics tools.
   */
  const downloadJSON = () => {
    setDownloading('json');
    // Include metadata envelope so consumers know when the export was generated
    const json = JSON.stringify({ exported: new Date().toISOString(), total: filtered.length, incidents: filtered }, null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), `dms-incidents-${Date.now()}.json`);
    setTimeout(() => setDownloading(null), 500);
  };

  /**
   * downloadExcel — Exports filtered incidents as a tab-separated values file.
   * Uses a UTF-8 BOM (﻿) prefix so Excel on Windows opens the file with correct encoding.
   * The .xls extension causes Excel to auto-open it in spreadsheet view.
   */
  const downloadExcel = () => {
    setDownloading('excel');
    // Simpler column set than CSV — omits address to avoid TSV parsing issues
    const cols = ['id','title','type','severity','status','city','address','createdAt'];
    const header = cols.join('\t'); // Tab-separated header row
    const rows   = filtered.map(r => cols.map(c => r[c] ?? '').join('\t'));
    // BOM (﻿) ensures Excel reads the file as UTF-8 rather than ANSI
    downloadBlob(new Blob(['﻿' + [header,...rows].join('\n')], { type: 'text/tab-separated-values;charset=utf-8;' }), `dms-incidents-${Date.now()}.xls`);
    setTimeout(() => setDownloading(null), 500);
  };

  /**
   * downloadPDF — Generates a printable HTML incident report and opens the browser
   * print dialog so the user can save to PDF using their OS print-to-PDF feature.
   * The report includes the active filter parameters and aggregate KPIs as a header,
   * followed by a full incident table with severity colour-coding.
   */
  const downloadPDF = () => {
    setDownloading('pdf');
    /* Build simple printable HTML page and trigger print dialog */
    // Build one <tr> per filtered incident, colour-coding severity cells
    const rows = filtered.map((inc, i) =>
      `<tr style="border-bottom:1px solid #eee">
        <td style="padding:4px 8px;font-size:11px">${i+1}</td>
        <td style="padding:4px 8px;font-size:11px">${inc.title || '—'}</td>
        <td style="padding:4px 8px;font-size:11px">${inc.type || '—'}</td>
        <td style="padding:4px 8px;font-size:11px;color:${SEVERITY_COLORS[inc.severity]||'#333'}">${inc.severity || '—'}</td>
        <td style="padding:4px 8px;font-size:11px">${(inc.status||'—').replace('_',' ')}</td>
        <td style="padding:4px 8px;font-size:11px">${inc.city || inc.locationName || '—'}</td>
        <td style="padding:4px 8px;font-size:11px">${fmtDate(inc.createdAt)}</td>
      </tr>`
    ).join('');
    // Embed filter state and KPI summary in the report header for audit traceability
    const html = `<!DOCTYPE html><html><head><title>DMS Incident Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px} h1{font-size:20px;color:#0E2A47} table{width:100%;border-collapse:collapse} th{background:#0E2A47;color:#fff;padding:6px 8px;font-size:11px;text-align:left} p{font-size:11px;color:#666}</style></head><body>
      <h1>DMS — Incident Report</h1>
      <p>Generated: ${new Date().toLocaleString()} | Filters: Year=${yearFilter}, Month=${monthFilter}, Type=${typeFilter}, Severity=${severityFilter}, Status=${statusFilter}</p>
      <p><strong>Total: ${stats.total} &nbsp;|&nbsp; Open: ${stats.open} &nbsp;|&nbsp; In Progress: ${stats.inProgress} &nbsp;|&nbsp; Resolved: ${stats.resolved} &nbsp;|&nbsp; Critical: ${stats.critical}</strong></p>
      <table><thead><tr><th>#</th><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>City</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    // Open a blank tab, inject the report HTML, then trigger the system print dialog
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    // Short delay allows the new tab to render before the print dialog is invoked
    setTimeout(() => { w.print(); setDownloading(null); }, 400);
  };

  /**
   * resetFilters — Resets all five filter dropdowns to their 'ALL' default state.
   * Exposed via the "Reset" button in the filter bar so users can clear filters in one click.
   */
  const resetFilters = () => { setYearFilter('ALL'); setMonthFilter('ALL'); setTypeFilter('ALL'); setSeverityFilter('ALL'); setStatusFilter('ALL'); };

  // Tab definitions: each entry drives a button in the tab bar and guards a view panel.
  // labelKey is a dot-notation i18n key resolved via t(`reports.${labelKey}`)
  const TABS = [
    { key: 'overview',  labelKey: 'tab_overview',  icon: 'speedometer2' },    // KPI cards + area/pie charts
    { key: 'charts',    labelKey: 'tab_analytics',  icon: 'bar-chart-fill' }, // Detailed bar, pie, line charts
    { key: 'incidents', labelKey: 'tab_log',        icon: 'table' },           // Paginated incident data table
    { key: 'map',       labelKey: 'tab_map',        icon: 'geo-alt-fill' },    // Geographic heatmap of incidents
  ];

  // Shared card container style applied to each chart/table panel for visual consistency
  const cardBg = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 16, boxShadow: 'var(--shadow-md)' };

  return (
    // Outer page container with vertical spacing between sections and bottom padding
    <div className="space-y-6 pb-10">

      {/* Header */}
      {/* Page title and export button row — animates in from below on mount */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {/* Page heading with gradient icon badge matching the DMS design system */}
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <BI name="bar-chart-fill" className="text-white text-sm" />
            </div>
            {/* Page title sourced from i18n locale file */}
            {t('reports.title')}
          </h1>
          {/* Subtitle / description of the reports section */}
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('reports.subtitle')}
          </p>
        </div>

        {/* Download toolbar */}
        {/* Horizontal row of export buttons — one per supported format */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Map each export format config to a styled button with icon and label */}
          {[
            { fmt: 'csv',   icon: 'filetype-csv',              labelKey: 'download_csv',   fn: downloadCSV   },
            { fmt: 'excel', icon: 'file-earmark-spreadsheet',  labelKey: 'download_excel', fn: downloadExcel },
            { fmt: 'json',  icon: 'filetype-json',             labelKey: 'download_json',  fn: downloadJSON  },
            { fmt: 'pdf',   icon: 'filetype-pdf',              labelKey: 'download_pdf',   fn: downloadPDF   },
          ].map(({ fmt, icon, labelKey, fn }) => (
            <button key={fmt} onClick={fn}
              // Disable all export buttons while any download is in-flight or dataset is empty
              disabled={!!downloading || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
              // Hover: subtle background tint and purple accent colour for the active format
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = '#7c3aed'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              {/* Show animated spinner SVG while this specific format is downloading */}
              {downloading === fmt
                ? <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <BI name={icon} className="text-sm" />}
              {/* Translated button label (e.g. "Download CSV") */}
              {t(`reports.${labelKey}`)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      {/* Filter bar panel containing five dropdowns and a reset button */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        {/* Filter bar header with funnel icon, title, result count badge, and reset link */}
        <div className="flex items-center gap-2 mb-4">
          <BI name="funnel-fill" className="text-sm" style={{ color: '#7c3aed' }} />
          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{t('reports.filters')}</span>
          {/* Result count badge — shows how many incidents match the current filter combination */}
          <span className="text-xs px-2 py-0.5 rounded-full font-bold ms-auto"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
            {filtered.length} {filtered.length !== 1 ? t('reports.results_plural') : t('reports.results')}
          </span>
          {/* Reset all filters button — uses i18n key for multilingual support */}
          <button onClick={resetFilters} className="text-xs font-semibold ms-2 flex items-center gap-1"
            style={{ color: 'var(--text-tertiary)' }}>
            <BI name="arrow-counterclockwise" /> {t('reports.reset')}
          </button>
        </div>
        {/* Row of FilterSelect dropdowns, one per filter dimension */}
        <div className="flex flex-wrap gap-4">
          {/* Year filter — derived dynamically from incident data */}
          <FilterSelect label={t('reports.filter_year')}     icon="calendar3"                    value={yearFilter}     onChange={setYearFilter}
            options={years.map(y  => ({ value: y,  label: y  === 'ALL' ? t('reports.all_years')    : String(y) }))} />
          {/* Month filter — uses the static MONTHS_LIST constant */}
          <FilterSelect label={t('reports.filter_month')}    icon="calendar-month"               value={monthFilter}    onChange={setMonthFilter}
            options={MONTHS_LIST.map(m => ({ value: m,  label: m  === 'ALL' ? t('reports.all_months')   : m }))} />
          {/* Incident type filter — derived dynamically from incident data */}
          <FilterSelect label={t('reports.filter_type')}     icon="tag-fill"                     value={typeFilter}     onChange={setTypeFilter}
            options={types.map(tp => ({ value: tp, label: tp === 'ALL' ? t('reports.all_types')    : tp }))} />
          {/* Severity filter — fixed four-level scale plus ALL */}
          <FilterSelect label={t('reports.filter_severity')} icon="exclamation-triangle-fill"    value={severityFilter} onChange={setSeverityFilter}
            options={['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(s => ({ value: s, label: s === 'ALL' ? t('reports.all_severity') : s }))} />
          {/* Status filter — mirrors the backend IncidentStatus enum values */}
          <FilterSelect label={t('reports.filter_status')}   icon="circle-fill"                  value={statusFilter}   onChange={setStatusFilter}
            options={['ALL','OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => ({ value: s, label: s === 'ALL' ? t('reports.all_status') : s.replace('_',' ') }))} />
        </div>
      </motion.div>

      {/* Tabs */}
      {/* Tab navigation bar — active tab is highlighted with a purple gradient pill */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              // Active tab gets the brand gradient; inactive tabs are transparent
              background: view === tab.key ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
              color: view === tab.key ? '#fff' : 'var(--text-secondary)',
              // Drop-shadow on active tab reinforces its selected state
              boxShadow: view === tab.key ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
            }}>
            <BI name={tab.icon} className="text-sm" />
            {/* Tab label is hidden on small screens (mobile) to save space */}
            <span className="hidden sm:inline">{t(`reports.${tab.labelKey}`)}</span>
          </button>
        ))}
      </div>

      {/* Show skeleton placeholder grid while incidents are loading from the API */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Four animated skeleton cards match the SummaryCard layout */}
          {[...Array(4)].map((_,i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {/* Overview tab: KPI summary cards + area trend chart + severity donut */}
          {view === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* KPI row: five summary metrics spanning the full width */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total incidents in the current filtered dataset */}
                <SummaryCard label={t('reports.card_total')}       value={stats.total}      icon="clipboard-data"          color="#7c3aed" />
                {/* Incidents currently in OPEN status — requires immediate attention */}
                <SummaryCard label={t('reports.card_open')}        value={stats.open}       icon="exclamation-circle-fill" color="#E63946" />
                {/* Incidents being actively worked on by response teams */}
                <SummaryCard label={t('reports.card_in_progress')} value={stats.inProgress} icon="arrow-repeat"           color="#FF7A00" />
                {/* Incidents marked RESOLVED or CLOSED — completed response actions */}
                <SummaryCard label={t('reports.card_resolved')}    value={stats.resolved}   icon="check-circle-fill"       color="#059669" />
                {/* CRITICAL severity incidents with percentage-of-total sub-label */}
                <SummaryCard label={t('reports.card_critical')}    value={stats.critical}   icon="exclamation-octagon-fill" color="#7f1d1d"
                  sub={stats.total ? `${Math.round(stats.critical/stats.total*100)}${t('reports.of_total')}` : ''} />
              </div>
              {/* Two-column layout: wide area chart on the left, severity donut on the right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area chart — incidents over time, showing trend and seasonality */}
                <div style={cardBg} className="p-5 lg:col-span-2">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="graph-up" style={{ color: '#7c3aed' }} /> {t('reports.chart_over_time')}
                  </h3>
                  {byMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={byMonth}>
                        {/* Purple gradient fill beneath the area line for visual depth */}
                        <defs><linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient></defs>
                        {/* X-axis: month/year labels at reduced font size to avoid crowding */}
                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        {/* Y-axis: incident count scale */}
                        <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        {/* Shared tooltip style object for theme-aware rendering */}
                        <Tooltip {...TT} />
                        {/* Smooth area with no dots — keeps the chart clean for many data points */}
                        <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gPurple)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    // Empty state when no incidents fall within the selected filters
                    <div className="h-40 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                      <BI name="inbox" className="text-3xl" />
                      <span className="text-sm">{t('reports.no_data')}</span>
                    </div>
                  )}
                </div>
                {/* Severity distribution donut chart with colour-coded legend */}
                <div style={cardBg} className="p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="pie-chart-fill" style={{ color: '#E63946' }} /> {t('reports.chart_by_severity')}
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      {/* Donut shape: innerRadius creates the hollow centre */}
                      <Pie data={bySeverity} cx="50%" cy="50%" innerRadius={40} outerRadius={64} dataKey="value" paddingAngle={3}>
                        {/* Each slice is coloured by SEVERITY_COLORS; fallback to grey */}
                        {bySeverity.map(e => <Cell key={e.name} fill={SEVERITY_COLORS[e.name] || '#6b7280'} />)}
                      </Pie>
                      <Tooltip {...TT} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Manual legend grid below the chart — maps severity name to count */}
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {bySeverity.map(({ name, value }) => (
                      <div key={name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {/* Colour dot matching the pie slice */}
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLORS[name] }} />
                        {name}: <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ANALYTICS */}
          {/* Analytics tab: deeper breakdown charts — by type (bar), by status (pie), monthly trend (line) */}
          {view === 'charts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Horizontal bar chart — incident count ranked by type/category */}
                <div style={cardBg} className="p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="tags-fill" style={{ color: '#FF7A00' }} /> {t('reports.chart_by_type')}
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    {/* Vertical layout: type names on Y-axis, counts on X-axis */}
                    <BarChart data={byType} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                      {/* Y-axis width=70 accommodates longer type name labels */}
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} width={70} />
                      <Tooltip {...TT} />
                      {/* Rounded right corners on bars give a modern pill-like appearance */}
                      <Bar dataKey="value" radius={[0,6,6,0]}>
                        {/* Cycle through TYPE_COLORS so each incident type gets a distinct colour */}
                        {byType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Status distribution pie chart with percentage labels rendered inline */}
                <div style={cardBg} className="p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="circle-half" style={{ color: '#059669' }} /> {t('reports.chart_by_status')}
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      {/* Percentage labels rendered directly on slices; labelLine=false removes connecting lines */}
                      <Pie data={byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {/* Each slice coloured by STATUS_COLORS using the raw key for lookup */}
                        {byStatus.map(e => <Cell key={e.key} fill={STATUS_COLORS[e.key] || '#6b7280'} />)}
                      </Pie>
                      <Tooltip {...TT} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Full-width line chart showing monthly incident volume trend over time */}
                <div style={cardBg} className="p-5 lg:col-span-2">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="graph-up-arrow" style={{ color: '#7c3aed' }} /> {t('reports.chart_monthly_trend')}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={byMonth}>
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                      <Tooltip {...TT} />
                      {/* Legend uses the translated incidents label for the series name */}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {/* Filled circle dots at each data point make individual months easy to read */}
                      <Line type="monotone" dataKey="count" name={t('reports.incidents_label')} stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {/* INCIDENT LOG */}
          {/* Tabular view listing every filtered incident with sortable columns */}
          {view === 'incidents' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={cardBg} className="overflow-hidden">
                {/* Table header bar with title and record count badge */}
                <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="table" style={{ color: '#7c3aed' }} /> {t('reports.log_title')}
                  </span>
                  {/* Record count badge — updates reactively when filters change */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                    {filtered.length} {t('reports.records')}
                  </span>
                </div>
                {/* Horizontally scrollable wrapper prevents table overflow on narrow screens */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      {/* Column headers dynamically translated via i18n keys */}
                      <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)' }}>
                        {['#', t('reports.col_title'), t('reports.col_type'), t('reports.col_severity'), t('reports.col_status'), t('reports.col_city'), t('reports.col_date'), t('reports.col_updated')].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wide"
                            style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Empty state row shown when no incidents match the current filters */}
                      {filtered.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                          <BI name="inbox" className="text-3xl block mb-2" />
                          {t('reports.no_data_filters')}
                        </td></tr>
                      ) : filtered.map((inc, i) => (
                        // One row per incident; hover background applied via inline event handlers
                        <tr key={inc.id}
                          className="transition"
                          style={{ borderBottom: '1px solid var(--border-primary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {/* Row number for easy reference in printed reports */}
                          <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--text-tertiary)' }}>{i+1}</td>
                          {/* Incident title truncated to one line to keep rows compact */}
                          <td className="px-4 py-3 font-semibold max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                            {/* CSS line-clamp limits the title to a single visible line */}
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {inc.title || '—'}
                            </span>
                          </td>
                          {/* Incident type badge with purple tint matching the brand palette */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                              {/* Support both 'type' and 'category' field names from the API */}
                              {inc.type || inc.category || '—'}
                            </span>
                          </td>
                          {/* Severity badge with solid background colour from SEVERITY_COLORS */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-bold text-white"
                              style={{ background: SEVERITY_COLORS[inc.severity] || '#6b7280' }}>
                              {inc.severity || '—'}
                            </span>
                          </td>
                          {/* Status badge coloured by STATUS_COLORS; underscores replaced with spaces */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-bold text-white"
                              style={{ background: STATUS_COLORS[inc.status] || '#6b7280' }}>
                              {inc.status?.replace('_',' ') || '—'}
                            </span>
                          </td>
                          {/* City or location name from the incident record */}
                          <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {inc.city || inc.locationName || '—'}
                          </td>
                          {/* Formatted creation date (e.g. "15 Jan 2025") */}
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {fmtDate(inc.createdAt)}
                          </td>
                          {/* Last updated or resolved date — falls back to resolvedAt if updatedAt absent */}
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                            {fmtDate(inc.updatedAt || inc.resolvedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* DENSITY MAP */}
          {/* Geographic heatmap view — passes the filtered incident list to HeatmapView
              so spatial density reflects the current filter selections */}
          {view === 'map' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* HeatmapView renders a Leaflet/MapLibre map with incident density overlay */}
              <HeatmapView incidents={filtered} height="500px" />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}