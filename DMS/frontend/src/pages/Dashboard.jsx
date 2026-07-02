import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { dashboardAPI, incidentAPI, resourceAPI } from '../services/api';
import { useAuthStore, useUIStore } from '../store';
import ErrorBoundary from '../components/ErrorBoundary';

const IncidentMap = React.lazy(() => import('../components/maps/IncidentMap'));

const HERO_IMAGES = {
  ADMIN:       'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=1400&q=80&auto=format&fit=crop',
  RESPONDER:   'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1400&q=80&auto=format&fit=crop',
  RESCUE_TEAM: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1400&q=80&auto=format&fit=crop',
  OFFICIAL:    'https://images.unsplash.com/photo-1508345228704-935cc84bf5e2?w=1400&q=80&auto=format&fit=crop',
  CITIZEN:     'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1400&q=80&auto=format&fit=crop',
};

const SEV_COLORS   = { CRITICAL: '#E63946', HIGH: '#FF7A00', MEDIUM: '#f59e0b', LOW: '#22c55e' };
const STATUS_COLORS = { OPEN: '#E63946', REPORTED: '#E63946', IN_PROGRESS: '#FF7A00', RESOLVED: '#059669', CLOSED: '#6b7280' };
const TYPE_COLORS  = { FIRE:'#E63946', FLOOD:'#3b82f6', EARTHQUAKE:'#8b5cf6', STORM:'#06b6d4', ACCIDENT:'#f59e0b', MEDICAL:'#10b981', HAZMAT:'#ec4899', OTHER:'#6b7280' };
const TYPE_ICONS   = { FIRE:'🔥', FLOOD:'🌊', EARTHQUAKE:'🌍', STORM:'⛈️', ACCIDENT:'🚗', MEDICAL:'🏥', HAZMAT:'☣️', OTHER:'⚠️' };

const card = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-md)',
};
const ttStyle = {
  contentStyle: { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 },
};

/* ── Tiny helpers ─────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -4, boxShadow: `0 12px 40px ${color}25` }}
      style={{ ...card, transition: 'all 0.2s' }}
      className="rounded-2xl p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg,${color},${color}aa)`, boxShadow: `0 4px 16px ${color}40` }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

function SectionHeader({ icon, title, accent, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span style={{ color: accent }}>{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ── SVG icons ──────────────────────────────────────────────────────────────── */
const Ico = ({ d, d2, vb = '0 0 24 24' }) => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d={d} />{d2 && <path d={d2} />}
  </svg>
);

/* ── Reusable incident list ──────────────────────────────────────────────── */
function IncidentRow({ inc, t }) {
  return (
    <Link to={`/layout/incidents/${inc.id}`}
      className="flex items-center gap-3 p-3 rounded-xl transition"
      style={{ border: '1px solid var(--border-primary)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[inc.status] || '#6b7280' }} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{inc.title}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
          📍 {inc.city || inc.locationName || inc.address || t('common.unknown_location')}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: STATUS_COLORS[inc.status] || '#6b7280' }}>
          {inc.status?.replace('_', ' ')}
        </span>
        {inc.severity && (
          <span className="text-xs font-bold" style={{ color: SEV_COLORS[inc.severity] || '#6b7280' }}>{inc.severity}</span>
        )}
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN / OFFICIAL DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({ stats, recent, trends, resources, t, accent }) {
  const severityData = [
    { name: 'Critical', value: stats?.criticalIncidents || 0, color: '#E63946' },
    { name: 'High',     value: stats?.highIncidents    || 0, color: '#FF7A00' },
    { name: 'Medium',   value: stats?.mediumIncidents  || 0, color: '#f59e0b' },
    { name: 'Low',      value: stats?.lowIncidents     || 0, color: '#22c55e' },
  ];

  // Build type breakdown from recent incidents
  const typeCounts = {};
  recent.forEach(i => { const t = i.type || i.category || 'OTHER'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] || '#6b7280' }));

  // Status breakdown
  const statusCounts = {};
  recent.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace('_',' '), value, color: STATUS_COLORS[name] || '#6b7280' }));

  // Resource utilization
  const totalRes = resources.length;
  const availRes = resources.filter(r => r.status === 'AVAILABLE').length;
  const busyRes  = resources.filter(r => ['ASSIGNED','BUSY','DEPLOYED'].includes(r.status)).length;
  const offRes   = resources.filter(r => ['OFFLINE','OUT_OF_SERVICE'].includes(r.status)).length;
  const resUtilData = [
    { name: 'Available', value: availRes, fill: '#22c55e' },
    { name: 'Deployed',  value: busyRes,  fill: '#FF7A00' },
    { name: 'Offline',   value: offRes,   fill: '#6b7280' },
  ].filter(d => d.value > 0);

  // Resolution rate
  const total    = stats?.totalIncidents || recent.length || 1;
  const resolved = stats?.resolvedIncidents || 0;
  const resRate  = Math.round((resolved / total) * 100);

  // Weekly comparison (last 7 vs prev 7 from trends)
  const last7  = trends.slice(-7).reduce((s, d) => s + (d.count || 0), 0);
  const prev7  = trends.slice(-14, -7).reduce((s, d) => s + (d.count || 0), 0);
  const weekDelta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  return (
    <>
      {/* ── Row 1: KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Ico d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>}
          label={t('dashboard.total_incidents')} value={stats?.totalIncidents ?? recent.length} color="#E63946"
          sub={weekDelta !== 0 ? `${weekDelta > 0 ? '▲' : '▼'} ${Math.abs(weekDelta)}% vs last week` : null} delay={0} />
        <StatCard icon={<Ico d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" d2="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>}
          label={t('dashboard.active')} value={stats?.activeIncidents ?? stats?.openIncidents ?? 0} color="#FF7A00" delay={0.05} />
        <StatCard icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          label={t('dashboard.resolved')} value={stats?.resolvedIncidents ?? 0} color="#059669"
          sub={`${resRate}% resolution rate`} delay={0.1} />
        <StatCard icon={<Ico d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" d2="M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>}
          label={t('dashboard.available_resources')} value={`${availRes}/${totalRes}`} color="#7c3aed"
          sub={totalRes > 0 ? `${Math.round((availRes/totalRes)*100)}% available` : null} delay={0.15} />
      </div>

      {/* ── Row 2: Trend + Severity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={card} className="p-5 lg:col-span-2">
          <SectionHeader icon="📈" title={t('dashboard.incident_trends')} accent={accent}
            action={<span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accent}15`, color: accent }}>14 days</span>} />
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accent} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                <Tooltip {...ttStyle} />
                <Area type="monotone" dataKey="count" stroke={accent} strokeWidth={2.5} fill="url(#tg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.no_data')}</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={card} className="p-5">
          <SectionHeader icon="🥧" title={t('dashboard.severity_distribution')} accent={accent} />
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip {...ttStyle} />
            </PieChart>
          </ResponsiveContainer>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="📊" title="Incidents by Type" accent={accent} />
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} width={70}
                  tickFormatter={v => `${TYPE_ICONS[v] || '⚠️'} ${v}`} />
                <Tooltip {...ttStyle} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No type data</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card} className="p-5">
          <SectionHeader icon="📋" title="Incidents by Status" accent={accent} />
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
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

      {/* ── Row 4: Resource utilization + Resolution rate ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="🚑" title="Resource Utilization" accent={accent} />
          {resUtilData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={resUtilData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={4}>
                    {resUtilData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip {...ttStyle} />
                </PieChart>
              </ResponsiveContainer>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card} className="p-5">
          <SectionHeader icon="✅" title="Resolution Rate" accent={accent} />
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - resRate / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#059669' }}>{resRate}%</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>resolved</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 w-full">
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-lg font-black" style={{ color: '#059669' }}>{resolved}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Resolved</p>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-lg font-black" style={{ color: '#E63946' }}>{(stats?.activeIncidents ?? stats?.openIncidents) || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Active</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card} className="p-5">
          <SectionHeader icon="📅" title="Week-over-Week" accent={accent} />
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div className="text-center">
              <p className="text-3xl font-black" style={{ color: weekDelta >= 0 ? '#E63946' : '#059669' }}>
                {weekDelta >= 0 ? '▲' : '▼'} {Math.abs(weekDelta)}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>vs previous 7 days</p>
            </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="🕐" title={t('dashboard.recent_incidents')} accent={accent}
            action={<Link to="/layout/incidents" className="text-xs font-semibold" style={{ color: accent }}>{t('dashboard.view_all')} →</Link>} />
          {recent.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.no_incidents')}</p>
            : <div className="space-y-2">{recent.slice(0,5).map(inc => <IncidentRow key={inc.id} inc={inc} t={t} />)}</div>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden" style={{ ...card, padding: 0 }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: accent }}>🗺️</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Live Incident Map</span>
            <span className="ms-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <ErrorBoundary fallback={<div className="h-64 flex items-center justify-center text-sm" style={{color:'var(--text-tertiary)'}}>Map unavailable</div>}>
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>}>
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
═══════════════════════════════════════════════════════════════════════════ */
function ResponderDashboard({ stats, recent, trends, resources, t, accent }) {
  const myAssignments = recent.filter(i => ['OPEN','IN_PROGRESS','REPORTED'].includes(i.status));
  const availRes = resources.filter(r => r.status === 'AVAILABLE').length;

  const last7 = trends.slice(-7).reduce((s, d) => s + (d.count || 0), 0);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}
          label={t('dashboard.my_assignments')} value={myAssignments.length} color={accent} delay={0} />
        <StatCard icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          label={t('dashboard.resolved')} value={stats?.resolvedIncidents ?? 0} color="#059669" delay={0.05} />
        <StatCard icon={<Ico d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" d2="M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>}
          label={t('dashboard.available_resources')} value={availRes} color="#7c3aed" delay={0.1} />
        <StatCard icon={<Ico d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>}
          label="This week" value={last7} color="#f59e0b" sub="incidents reported" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="🚨" title={t('dashboard.my_assignments')} accent={accent}
            action={<Link to="/layout/incidents" className="text-xs font-semibold" style={{ color: accent }}>{t('dashboard.view_all')} →</Link>} />
          {myAssignments.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No active assignments</p>
            : <div className="space-y-2">{myAssignments.slice(0,5).map(inc => <IncidentRow key={inc.id} inc={inc} t={t} />)}</div>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl overflow-hidden" style={{ ...card, padding: 0 }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: accent }}>🗺️</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>My Area Map</span>
          </div>
          <ErrorBoundary fallback={<div className="h-64 flex items-center justify-center text-sm" style={{color:'var(--text-tertiary)'}}>Map unavailable</div>}>
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor: accent, borderTopColor:'transparent'}} /></div>}>
              <IncidentMap incidents={recent} height="280px" showFilters={false} showLegend={false} />
            </React.Suspense>
          </ErrorBoundary>
        </motion.div>
      </div>

      {trends.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="📊" title={t('dashboard.response_activity')} accent={accent} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trends}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
              <Tooltip {...ttStyle} />
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
═══════════════════════════════════════════════════════════════════════════ */
function CitizenDashboard({ stats, recent, t, accent }) {
  const myReports = recent.length;
  const active = recent.filter(i => ['OPEN','IN_PROGRESS','REPORTED'].includes(i.status)).length;
  const resolved = recent.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  // Type breakdown of user's reports
  const typeCounts = {};
  recent.forEach(i => { const tp = i.type || i.category || 'OTHER'; typeCounts[tp] = (typeCounts[tp] || 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] || '#6b7280' }));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}
          label={t('dashboard.my_reports')} value={myReports} color={accent} delay={0} />
        <StatCard icon={<Ico d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" d2="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>}
          label={t('dashboard.active_near_me')} value={active} color="#E63946" delay={0.05} />
        <StatCard icon={<Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          label={t('dashboard.resolved')} value={resolved} color="#059669" delay={0.1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
          <SectionHeader icon="📋" title={t('dashboard.my_reports')} accent={accent}
            action={<Link to="/layout/incidents" className="text-xs font-semibold" style={{ color: accent }}>{t('dashboard.view_all')} →</Link>} />
          {recent.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.no_incidents')}</p>
            : <div className="space-y-2">{recent.slice(0,5).map(inc => <IncidentRow key={inc.id} inc={inc} t={t} />)}</div>}
        </motion.div>

        {typeData.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card} className="p-5">
            <SectionHeader icon="📊" title="My Reports by Type" accent={accent} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickFormatter={v => `${TYPE_ICONS[v] || '⚠️'} ${v}`} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                <Tooltip {...ttStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          /* Emergency CTA if no reports */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={card} className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg"
              style={{ background: `linear-gradient(135deg,${accent},${accent}aa)` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M9 9a3 3 0 116 0v9H9V9zm3-9v2M3 9h2m1.3-5.7l1.4 1.4M21 21H3"/>
              </svg>
            </div>
            <h2 className="text-base font-black mb-2" style={{ color: 'var(--text-primary)' }}>{t('dashboard.emergency')}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)', maxWidth: 220 }}>{t('dashboard.emergency_desc')}</p>
            <Link to="/layout/incidents/create"
              className="px-6 py-3 rounded-xl font-bold text-white shadow-lg text-sm"
              style={{ background: `linear-gradient(135deg,${accent},${accent}cc)` }}>
              🚨 {t('dashboard.report_new')}
            </Link>
          </motion.div>
        )}
      </div>

      {/* Status breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card} className="p-5">
        <SectionHeader icon="📈" title="Report Status Overview" accent={accent} />
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open / Active', value: active, color: '#E63946', icon: '🔴' },
            { label: 'Resolved', value: resolved, color: '#059669', icon: '✅' },
            { label: 'Total Reports', value: myReports, color: accent, icon: '📋' },
          ].map(({ label, value, color, icon }) => (
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
═══════════════════════════════════════════════════════════════════════════ */
const ROLE_ACCENT  = { ADMIN:'#E63946', RESPONDER:'#FF7A00', RESCUE_TEAM:'#FF7A00', OFFICIAL:'#7c3aed', CITIZEN:'#059669' };
const ROLE_OVERLAY = {
  ADMIN:       'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(230,57,70,0.85))',
  RESPONDER:   'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(255,122,0,0.85))',
  RESCUE_TEAM: 'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(255,122,0,0.85))',
  OFFICIAL:    'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(124,58,237,0.85))',
  CITIZEN:     'linear-gradient(135deg,rgba(14,42,71,0.95),rgba(5,150,105,0.85))',
};
const ROLE_LABELS  = { ADMIN:'System Administrator', RESPONDER:'Emergency Responder', RESCUE_TEAM:'Emergency Responder', OFFICIAL:'Government Official', CITIZEN:'Community Member' };

export default function Dashboard() {
  const { user }    = useAuthStore();
  const { accentColor } = useUIStore();
  const { t }       = useTranslation();
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [trends,    setTrends]    = useState([]);
  const [resources, setResources] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const isCitizen = (user?.role || 'CITIZEN') === 'CITIZEN';
    // Citizens only see their own reports; admins/responders see all
    const incidentFetch = isCitizen
      ? incidentAPI.getMyIncidents({ page: 0, size: 10 })
      : incidentAPI.getIncidents({ page: 0, size: 10 });

    Promise.all([
      dashboardAPI.getStatistics().catch(() => ({ data: null })),
      incidentFetch,
      dashboardAPI.getIncidentTrends(14).catch(() => ({ data: [] })),
      resourceAPI.getResources({ page: 0, size: 100 }).catch(() => ({ data: { data: [] } })),
    ]).then(([sRes, iRes, tRes, rRes]) => {
      setStats(sRes.data?.data || sRes.data);
      const paged = iRes.data?.data || iRes.data;
      setRecent(paged?.content || []);
      const raw = tRes.data?.data ?? tRes.data ?? [];
      setTrends(Array.isArray(raw) ? (raw[0]?.daily ?? raw) : []);
      const rd = rRes.data?.data?.content ?? rRes.data?.data ?? rRes.data ?? [];
      setResources(Array.isArray(rd) ? rd : []);
    }).catch(err => console.error('[Dashboard]', err))
      .finally(() => setLoading(false));
  }, [user?.role]);

  const role    = user?.role || 'CITIZEN';
  // Use saved accent color from settings if set, otherwise use role default
  const accent  = accentColor || ROLE_ACCENT[role] || '#E63946';
  const overlay = ROLE_OVERLAY[role];

  return (
    <div className="min-h-full pb-8">
      {/* Hero banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl mb-6 relative overflow-hidden" style={{ minHeight: 140 }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGES[role]})` }} />
        <div className="absolute inset-0" style={{ background: overlay }} />
        {/* Scan beam on hero */}
        <motion.div className="absolute left-0 right-0 pointer-events-none z-0"
          style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }}
          animate={{ top: ['-1px', '100%'] }}
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }} />
        <div className="relative z-10 p-6 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1 font-mono">{ROLE_LABELS[role]}</p>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.04em' }}>
              {t('dashboard.welcome')}, {user?.firstName || 'User'}
            </h1>
            <p className="mt-1 text-white/50 text-xs flex items-center gap-2">
              <motion.span style={{ color: accent }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>●</motion.span>
              {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            {[
              { label: 'Total', value: stats?.totalIncidents ?? recent.length ?? '—' },
              { label: 'Active', value: stats?.activeIncidents ?? stats?.openIncidents ?? '—' },
              { label: 'Resolved', value: stats?.resolvedIncidents ?? '—' },
            ].map(({ label, value }, i, arr) => (
              <React.Fragment key={label}>
                <motion.div className="text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                  <div className="text-2xl font-black text-white" style={{ fontFamily: "'Rajdhani','Inter',sans-serif" }}>{value}</div>
                  <div className="text-white/50 text-xs font-mono uppercase tracking-wider">{label}</div>
                </motion.div>
                {i < arr.length - 1 && <div className="w-px h-10 bg-white/15" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to top,var(--bg-primary),transparent)' }} />
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          {/* Stat card skeletons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-6 w-16 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div className="skeleton h-4 w-40 rounded mb-4" />
              <div className="skeleton h-44 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div className="skeleton h-4 w-32 rounded mb-4" />
              <div className="skeleton h-36 rounded-full mx-auto w-36" />
            </div>
          </div>
          {/* List skeleton */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="skeleton h-4 w-36 rounded mb-4" />
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
          {(role === 'ADMIN' || role === 'OFFICIAL') && (
            <AdminDashboard stats={stats} recent={recent} trends={trends} resources={resources} t={t} accent={accent} />
          )}
          {(role === 'RESPONDER' || role === 'RESCUE_TEAM') && (
            <ResponderDashboard stats={stats} recent={recent} trends={trends} resources={resources} t={t} accent={accent} />
          )}
          {role === 'CITIZEN' && (
            <CitizenDashboard stats={stats} recent={recent} t={t} accent={accent} />
          )}
          {!['ADMIN','OFFICIAL','RESPONDER','RESCUE_TEAM','CITIZEN'].includes(role) && (
            <AdminDashboard stats={stats} recent={recent} trends={trends} resources={resources} t={t} accent={accent} />
          )}
        </>
      )}
    </div>
  );
}
