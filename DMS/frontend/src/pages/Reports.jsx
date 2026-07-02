import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { incidentAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import HeatmapView from '../components/maps/HeatmapView';

const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

/* ── colour palette ────────────────────────────────────────────────────────── */
const SEVERITY_COLORS = { CRITICAL: '#E63946', HIGH: '#FF7A00', MEDIUM: '#f59e0b', LOW: '#22c55e' };
const STATUS_COLORS   = { OPEN: '#E63946', IN_PROGRESS: '#FF7A00', RESOLVED: '#059669', CLOSED: '#6b7280' };
const TYPE_COLORS     = ['#E63946','#FF7A00','#f59e0b','#22c55e','#3b82f6','#7c3aed','#ec4899','#14b8a6'];

/* ── helpers ───────────────────────────────────────────────────────────────── */
const toCsv = (rows, cols) => {
  const header = cols.join(',');
  const body   = rows.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g,'""')}"`).join(','));
  return [header, ...body].join('\n');
};
const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/* ── Chart tooltip ─────────────────────────────────────────────────────────── */
const TT = {
  contentStyle: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
};

function FilterSelect({ label, icon, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: 'var(--text-tertiary)' }}>
        <BI name={icon} /> {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl text-sm font-medium outline-none"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)', minWidth: 130 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, sub }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="p-4 rounded-2xl flex items-center gap-4"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <BI name={icon} className="text-xl" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</div>
        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

const MONTHS_LIST = ['ALL','January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Reports() {
  const { t } = useTranslation();

  /* raw data */
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);

  /* filters */
  const [yearFilter,     setYearFilter]     = useState('ALL');
  const [monthFilter,    setMonthFilter]    = useState('ALL');
  const [typeFilter,     setTypeFilter]     = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  const [view,           setView]           = useState('overview');

  const [downloading, setDownloading] = useState(null);

  /* fetch */
  useEffect(() => {
    incidentAPI.getIncidents({ size: 500 })
      .then(({ data }) => {
        const paged = data?.data || data;
        setIncidents(Array.isArray(paged) ? paged : paged?.content || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* filter options */
  const years = useMemo(() => {
    const set = new Set(incidents.map(i => i.createdAt ? new Date(i.createdAt).getFullYear() : null).filter(Boolean));
    return ['ALL', ...Array.from(set).sort((a,b) => b - a)];
  }, [incidents]);

  const types = useMemo(() => ['ALL', ...new Set(incidents.map(i => i.type || i.category).filter(Boolean))], [incidents]);

  /* filtered */
  const filtered = useMemo(() => incidents.filter(inc => {
    const d = inc.createdAt ? new Date(inc.createdAt) : null;
    if (yearFilter     !== 'ALL' && d?.getFullYear()  !== Number(yearFilter))           return false;
    if (monthFilter    !== 'ALL' && d?.getMonth() + 1 !== MONTHS_LIST.indexOf(monthFilter)) return false;
    if (typeFilter     !== 'ALL' && (inc.type || inc.category) !== typeFilter)          return false;
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter)                    return false;
    if (statusFilter   !== 'ALL' && inc.status   !== statusFilter)                      return false;
    return true;
  }), [incidents, yearFilter, monthFilter, typeFilter, severityFilter, statusFilter]);

  /* stats */
  const stats = useMemo(() => ({
    total:      filtered.length,
    open:       filtered.filter(i => i.status === 'OPEN').length,
    resolved:   filtered.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    critical:   filtered.filter(i => i.severity === 'CRITICAL').length,
    inProgress: filtered.filter(i => i.status === 'IN_PROGRESS').length,
  }), [filtered]);

  /* chart data */
  const byMonth = useMemo(() => {
    const map = {};
    filtered.forEach(i => {
      if (!i.createdAt) return;
      const key = new Date(i.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([month, count]) => ({ month, count }));
  }, [filtered]);

  const bySeverity = useMemo(() => {
    const m = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filtered.forEach(i => { if (i.severity && m[i.severity] !== undefined) m[i.severity]++; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byStatus = useMemo(() => {
    const m = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
    filtered.forEach(i => { if (i.status && m[i.status] !== undefined) m[i.status]++; });
    return Object.entries(m).map(([name, value]) => ({ name: name.replace('_',' '), value, key: name }));
  }, [filtered]);

  const byType = useMemo(() => {
    const m = {};
    filtered.forEach(i => { const k = i.type || i.category || 'OTHER'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  /* downloads */
  const downloadCSV = () => {
    setDownloading('csv');
    const cols = ['id','title','type','severity','status','city','address','createdAt','updatedAt'];
    const csv  = toCsv(filtered, cols);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `dms-incidents-${Date.now()}.csv`);
    setTimeout(() => setDownloading(null), 500);
  };

  const downloadJSON = () => {
    setDownloading('json');
    const json = JSON.stringify({ exported: new Date().toISOString(), total: filtered.length, incidents: filtered }, null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), `dms-incidents-${Date.now()}.json`);
    setTimeout(() => setDownloading(null), 500);
  };

  const downloadExcel = () => {
    setDownloading('excel');
    const cols = ['id','title','type','severity','status','city','address','createdAt'];
    const header = cols.join('\t');
    const rows   = filtered.map(r => cols.map(c => r[c] ?? '').join('\t'));
    downloadBlob(new Blob(['﻿' + [header,...rows].join('\n')], { type: 'text/tab-separated-values;charset=utf-8;' }), `dms-incidents-${Date.now()}.xls`);
    setTimeout(() => setDownloading(null), 500);
  };

  const downloadPDF = () => {
    setDownloading('pdf');
    /* Build simple printable HTML page and trigger print dialog */
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
    const html = `<!DOCTYPE html><html><head><title>DMS Incident Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px} h1{font-size:20px;color:#0E2A47} table{width:100%;border-collapse:collapse} th{background:#0E2A47;color:#fff;padding:6px 8px;font-size:11px;text-align:left} p{font-size:11px;color:#666}</style></head><body>
      <h1>DMS — Incident Report</h1>
      <p>Generated: ${new Date().toLocaleString()} | Filters: Year=${yearFilter}, Month=${monthFilter}, Type=${typeFilter}, Severity=${severityFilter}, Status=${statusFilter}</p>
      <p><strong>Total: ${stats.total} &nbsp;|&nbsp; Open: ${stats.open} &nbsp;|&nbsp; In Progress: ${stats.inProgress} &nbsp;|&nbsp; Resolved: ${stats.resolved} &nbsp;|&nbsp; Critical: ${stats.critical}</strong></p>
      <table><thead><tr><th>#</th><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>City</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); setDownloading(null); }, 400);
  };

  const resetFilters = () => { setYearFilter('ALL'); setMonthFilter('ALL'); setTypeFilter('ALL'); setSeverityFilter('ALL'); setStatusFilter('ALL'); };

  const TABS = [
    { key: 'overview',  labelKey: 'tab_overview',  icon: 'speedometer2' },
    { key: 'charts',    labelKey: 'tab_analytics',  icon: 'bar-chart-fill' },
    { key: 'incidents', labelKey: 'tab_log',        icon: 'table' },
    { key: 'map',       labelKey: 'tab_map',        icon: 'geo-alt-fill' },
  ];

  const cardBg = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 16, boxShadow: 'var(--shadow-md)' };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <BI name="bar-chart-fill" className="text-white text-sm" />
            </div>
            {t('reports.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('reports.subtitle')}
          </p>
        </div>

        {/* Download toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { fmt: 'csv',   icon: 'filetype-csv',              labelKey: 'download_csv',   fn: downloadCSV   },
            { fmt: 'excel', icon: 'file-earmark-spreadsheet',  labelKey: 'download_excel', fn: downloadExcel },
            { fmt: 'json',  icon: 'filetype-json',             labelKey: 'download_json',  fn: downloadJSON  },
            { fmt: 'pdf',   icon: 'filetype-pdf',              labelKey: 'download_pdf',   fn: downloadPDF   },
          ].map(({ fmt, icon, labelKey, fn }) => (
            <button key={fmt} onClick={fn}
              disabled={!!downloading || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = '#7c3aed'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              {downloading === fmt
                ? <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <BI name={icon} className="text-sm" />}
              {t(`reports.${labelKey}`)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 mb-4">
          <BI name="funnel-fill" className="text-sm" style={{ color: '#7c3aed' }} />
          <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{t('reports.filters')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold ms-auto"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
            {filtered.length} {filtered.length !== 1 ? t('reports.results_plural') : t('reports.results')}
          </span>
          <button onClick={resetFilters} className="text-xs font-semibold ms-2 flex items-center gap-1"
            style={{ color: 'var(--text-tertiary)' }}>
            <BI name="arrow-counterclockwise" /> {t('reports.reset')}
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <FilterSelect label={t('reports.filter_year')}     icon="calendar3"                    value={yearFilter}     onChange={setYearFilter}
            options={years.map(y  => ({ value: y,  label: y  === 'ALL' ? t('reports.all_years')    : String(y) }))} />
          <FilterSelect label={t('reports.filter_month')}    icon="calendar-month"               value={monthFilter}    onChange={setMonthFilter}
            options={MONTHS_LIST.map(m => ({ value: m,  label: m  === 'ALL' ? t('reports.all_months')   : m }))} />
          <FilterSelect label={t('reports.filter_type')}     icon="tag-fill"                     value={typeFilter}     onChange={setTypeFilter}
            options={types.map(tp => ({ value: tp, label: tp === 'ALL' ? t('reports.all_types')    : tp }))} />
          <FilterSelect label={t('reports.filter_severity')} icon="exclamation-triangle-fill"    value={severityFilter} onChange={setSeverityFilter}
            options={['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(s => ({ value: s, label: s === 'ALL' ? t('reports.all_severity') : s }))} />
          <FilterSelect label={t('reports.filter_status')}   icon="circle-fill"                  value={statusFilter}   onChange={setStatusFilter}
            options={['ALL','OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => ({ value: s, label: s === 'ALL' ? t('reports.all_status') : s.replace('_',' ') }))} />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: view === tab.key ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
              color: view === tab.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: view === tab.key ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
            }}>
            <BI name={tab.icon} className="text-sm" />
            <span className="hidden sm:inline">{t(`reports.${tab.labelKey}`)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {view === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard label={t('reports.card_total')}       value={stats.total}      icon="clipboard-data"          color="#7c3aed" />
                <SummaryCard label={t('reports.card_open')}        value={stats.open}       icon="exclamation-circle-fill" color="#E63946" />
                <SummaryCard label={t('reports.card_in_progress')} value={stats.inProgress} icon="arrow-repeat"           color="#FF7A00" />
                <SummaryCard label={t('reports.card_resolved')}    value={stats.resolved}   icon="check-circle-fill"       color="#059669" />
                <SummaryCard label={t('reports.card_critical')}    value={stats.critical}   icon="exclamation-octagon-fill" color="#7f1d1d"
                  sub={stats.total ? `${Math.round(stats.critical/stats.total*100)}${t('reports.of_total')}` : ''} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div style={cardBg} className="p-5 lg:col-span-2">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="graph-up" style={{ color: '#7c3aed' }} /> {t('reports.chart_over_time')}
                  </h3>
                  {byMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={byMonth}>
                        <defs><linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient></defs>
                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        <Tooltip {...TT} />
                        <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gPurple)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                      <BI name="inbox" className="text-3xl" />
                      <span className="text-sm">{t('reports.no_data')}</span>
                    </div>
                  )}
                </div>
                <div style={cardBg} className="p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="pie-chart-fill" style={{ color: '#E63946' }} /> {t('reports.chart_by_severity')}
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={bySeverity} cx="50%" cy="50%" innerRadius={40} outerRadius={64} dataKey="value" paddingAngle={3}>
                        {bySeverity.map(e => <Cell key={e.name} fill={SEVERITY_COLORS[e.name] || '#6b7280'} />)}
                      </Pie>
                      <Tooltip {...TT} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {bySeverity.map(({ name, value }) => (
                      <div key={name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
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
          {view === 'charts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div style={cardBg} className="p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="tags-fill" style={{ color: '#FF7A00' }} /> {t('reports.chart_by_type')}
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byType} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} width={70} />
                      <Tooltip {...TT} />
                      <Bar dataKey="value" radius={[0,6,6,0]}>
                        {byType.map((_,i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={cardBg} className="p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="circle-half" style={{ color: '#059669' }} /> {t('reports.chart_by_status')}
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {byStatus.map(e => <Cell key={e.key} fill={STATUS_COLORS[e.key] || '#6b7280'} />)}
                      </Pie>
                      <Tooltip {...TT} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={cardBg} className="p-5 lg:col-span-2">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="graph-up-arrow" style={{ color: '#7c3aed' }} /> {t('reports.chart_monthly_trend')}
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={byMonth}>
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                      <Tooltip {...TT} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="count" name={t('reports.incidents_label')} stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {/* INCIDENT LOG */}
          {view === 'incidents' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={cardBg} className="overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BI name="table" style={{ color: '#7c3aed' }} /> {t('reports.log_title')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                    {filtered.length} {t('reports.records')}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)' }}>
                        {['#', t('reports.col_title'), t('reports.col_type'), t('reports.col_severity'), t('reports.col_status'), t('reports.col_city'), t('reports.col_date'), t('reports.col_updated')].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wide"
                            style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                          <BI name="inbox" className="text-3xl block mb-2" />
                          {t('reports.no_data_filters')}
                        </td></tr>
                      ) : filtered.map((inc, i) => (
                        <tr key={inc.id}
                          className="transition"
                          style={{ borderBottom: '1px solid var(--border-primary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--text-tertiary)' }}>{i+1}</td>
                          <td className="px-4 py-3 font-semibold max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {inc.title || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                              {inc.type || inc.category || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-bold text-white"
                              style={{ background: SEVERITY_COLORS[inc.severity] || '#6b7280' }}>
                              {inc.severity || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-bold text-white"
                              style={{ background: STATUS_COLORS[inc.status] || '#6b7280' }}>
                              {inc.status?.replace('_',' ') || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {inc.city || inc.locationName || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {fmtDate(inc.createdAt)}
                          </td>
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
          {view === 'map' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <HeatmapView incidents={filtered} height="500px" />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
