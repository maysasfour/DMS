import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { incidentAPI } from '../services/api';
import { useAuthStore } from '../store';
import { showNotification } from '../components/NotificationHub';
import { EmergencyTypeIcon } from '../components/EmergencyIcons';

const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

const SEVERITY_CFG = {
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  label: 'Low'      },
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Medium'   },
  HIGH:     { color: '#E63946', bg: 'rgba(230,57,70,0.1)',  label: 'High'     },
  CRITICAL: { color: '#7f1d1d', bg: 'rgba(127,29,29,0.15)', label: 'Critical' },
};
const STATUS_CFG = {
  OPEN:        { color: '#E63946', bg: 'rgba(230,57,70,0.1)',   icon: 'exclamation-circle-fill', pulse: true  },
  IN_PROGRESS: { color: '#FF7A00', bg: 'rgba(255,122,0,0.1)',   icon: 'arrow-repeat',            pulse: false },
  RESOLVED:    { color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: 'check-circle-fill',       pulse: false },
  CLOSED:      { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: 'x-circle-fill',           pulse: false },
};
const TYPE_COLOR = {
  FIRE:'#E63946', FLOOD:'#3b82f6', EARTHQUAKE:'#92400e',
  STORM:'#6366f1', ACCIDENT:'#FF7A00', MEDICAL:'#10b981',
  HAZMAT:'#8b5cf6', OTHER:'#6b7280',
};

// Roles that can see all incidents (not just own)
const SEES_ALL = ['ADMIN', 'RESPONDER', 'RESCUE_TEAM', 'OFFICIAL'];
// Roles that can delete
const CAN_DELETE = ['ADMIN', 'RESPONDER'];
// Roles that can report
const CAN_REPORT = ['CITIZEN', 'ADMIN', 'RESPONDER', 'RESCUE_TEAM'];

export default function IncidentList() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const { t }     = useTranslation();

  const role      = user?.role || 'CITIZEN';
  const seesAll   = SEES_ALL.includes(role);
  const canDelete = CAN_DELETE.includes(role);
  const canReport = CAN_REPORT.includes(role);

  const [incidents,   setIncidents]   = useState([]);
  const [page,        setPage]        = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [filters,     setFilters]     = useState({ status: '', severity: '', type: '' });
  const [search,      setSearch]      = useState('');
  const [deleteId,    setDeleteId]    = useState(null);
  const [viewMode,    setViewMode]    = useState('card'); // 'card' | 'table' — rescue/admin default table

  useEffect(() => {
    if (role === 'RESCUE_TEAM' || role === 'ADMIN') setViewMode('table');
  }, [role]);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, size: 12,
        ...(filters.status   && { status:   filters.status   }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.type     && { type:     filters.type     }),
        ...(search           && { q: search }),
      };
      const { data } = !seesAll
        ? await incidentAPI.getMyIncidents({ page, size: 12 })
        : await incidentAPI.getIncidents(params);
      const paged = data?.data || data;
      setIncidents(paged?.content || (Array.isArray(paged) ? paged : []));
      setTotalPages(paged?.totalPages || 1);
    } catch (_) {}
    setLoading(false);
  }, [page, filters, search, seesAll]);

  useEffect(() => { loadIncidents(); }, [page, filters]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (deleteId !== id) { setDeleteId(id); return; }
    try {
      await incidentAPI.deleteIncident(id);
      showNotification(t('incidents.incident_deleted'), 'success');
      setDeleteId(null);
      loadIncidents();
    } catch (_) {
      showNotification(t('incidents.delete_failed'), 'error');
    }
  };

  const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 16, boxShadow: 'var(--shadow-sm)' };

  // Role header config
  const ROLE_HEADER = {
    CITIZEN:     { title: t('incidents.my_reports', 'My Incident Reports'), subtitle: 'Track your submitted emergency reports', accent: '#059669', icon: 'list-check' },
    RESCUE_TEAM: { title: 'Active Incidents — Field View',  subtitle: 'Real-time incidents requiring response',       accent: '#f59e0b', icon: 'fire'       },
    RESPONDER:   { title: 'All Incidents — Dispatch View',  subtitle: 'Manage and assign all emergency incidents',    accent: '#FF7A00', icon: 'activity'    },
    OFFICIAL:    { title: 'Incident Overview',              subtitle: 'System-wide incident monitoring and review',   accent: '#7c3aed', icon: 'bar-chart-fill' },
    ADMIN:       { title: 'Incident Management',            subtitle: 'Full control over all system incidents',       accent: '#E63946', icon: 'exclamation-triangle-fill' },
  };
  const hdr = ROLE_HEADER[role] || ROLE_HEADER.CITIZEN;

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hdr.accent}, ${hdr.accent}aa)` }}>
              <BI name={hdr.icon} className="text-white" />
            </div>
            {hdr.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{hdr.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View mode toggle — rescue team / admin */}
          {seesAll && (
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-input)' }}>
              {['card','table'].map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: viewMode === m ? hdr.accent : 'var(--bg-tertiary)',
                    color: viewMode === m ? 'white' : 'var(--text-secondary)',
                  }}>
                  <BI name={m === 'card' ? 'grid-3x3-gap-fill' : 'table'} />
                </button>
              ))}
            </div>
          )}
          {canReport && (
            <Link to="/layout/incidents/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${hdr.accent}, ${hdr.accent}cc)`, boxShadow: `0 4px 14px ${hdr.accent}40` }}>
              <BI name="plus-circle-fill" />
              {role === 'CITIZEN' ? 'Report Emergency' : t('incidents.report')}
            </Link>
          )}
        </div>
      </motion.div>

      {/* Filters — only show for roles that see all */}
      {seesAll && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          style={cardStyle} className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[160px] relative">
            <BI name="search" className="absolute start-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder={t('incidents.search')} value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadIncidents()}
              className="w-full ps-9 pe-4 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }} />
          </div>

          {[
            { key: 'status',   label: t('incidents.all_status'),   options: ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'],     tKey: 'status'   },
            { key: 'severity', label: t('incidents.all_severity'), options: ['LOW','MEDIUM','HIGH','CRITICAL'],              tKey: 'severity' },
            { key: 'type',     label: 'All Types',                 options: ['FIRE','FLOOD','EARTHQUAKE','STORM','ACCIDENT','MEDICAL','HAZMAT','OTHER'], tKey: 'types' },
          ].map(({ key, label, options, tKey }) => (
            <select key={key} value={filters[key]}
              onChange={e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(0); }}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}>
              <option value="">{label}</option>
              {options.map(o => <option key={o} value={o}>{t(`${tKey}.${o}`, { defaultValue: o })}</option>)}
            </select>
          ))}

          <button onClick={loadIncidents}
            className="px-4 py-2 rounded-xl text-white font-bold text-sm"
            style={{ background: hdr.accent }}>
            <BI name="funnel-fill" className="me-1" />Filter
          </button>
          {(filters.status || filters.severity || filters.type || search) && (
            <button onClick={() => { setFilters({ status:'', severity:'', type:'' }); setSearch(''); setPage(0); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
              <BI name="x-circle" className="me-1" />Clear
            </button>
          )}
        </motion.div>
      )}

      {/* Loading skeletons */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="flex gap-2 mt-1">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="py-20 text-center rounded-2xl" style={cardStyle}>
          <BI name="clipboard-x" style={{ fontSize: '3.5rem', color: 'var(--text-tertiary)' }} />
          <p className="mt-3 font-bold" style={{ color: 'var(--text-secondary)' }}>{t('incidents.no_incidents')}</p>
          {canReport && (
            <Link to="/layout/incidents/create"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: hdr.accent }}>
              <BI name="plus-circle" /> {t('incidents.report_first')}
            </Link>
          )}
        </motion.div>

      ) : viewMode === 'card' ? (
        // ── CARD VIEW ──────────────────────────────────────────────────────────
        <div className="space-y-3">
          <AnimatePresence>
            {incidents.map((inc, idx) => {
              const statusCfg   = STATUS_CFG[inc.status]     || STATUS_CFG.OPEN;
              const severityCfg = SEVERITY_CFG[inc.severity] || SEVERITY_CFG.MEDIUM;
              const typeColor   = TYPE_COLOR[inc.type] || '#6b7280';
              const hasMedia    = (inc.mediaCount || inc.media?.length || 0) > 0;

              return (
                <motion.div key={inc.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  className="cursor-pointer"
                  style={{ ...cardStyle, borderLeft: `4px solid ${typeColor}` }}
                  onClick={() => navigate(`/layout/incidents/${inc.id}`)}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* Type icon */}
                    <EmergencyTypeIcon type={inc.type || 'OTHER'} size={20} badge badgeSize={42} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-black text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {inc.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          {/* Media badge */}
                          {hasMedia && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: 'rgba(255,122,0,0.1)', color: '#FF7A00' }}>
                              <BI name="images" style={{ fontSize: '0.6rem' }} />
                              {inc.mediaCount || inc.media?.length}
                            </span>
                          )}
                          <Link to={`/layout/incidents/${inc.id}`} onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-sm"
                            style={{ color: '#3b82f6' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <BI name="eye" />
                          </Link>
                          {canDelete && (
                            deleteId === inc.id ? (
                              <button onClick={e => handleDelete(inc.id, e)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-white"
                                style={{ background: '#E63946' }}>
                                Confirm
                              </button>
                            ) : (
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

                      {inc.description && (
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {inc.description}
                        </p>
                      )}

                      {/* Tags row */}
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {/* Status */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.pulse && (
                            <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusCfg.color }} />
                          )}
                          <BI name={statusCfg.icon} style={{ fontSize: '0.6rem' }} />
                          {t(`status.${inc.status}`, { defaultValue: inc.status })}
                        </span>
                        {/* Severity */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: severityCfg.bg, color: severityCfg.color }}>
                          <BI name="lightning-charge-fill" style={{ fontSize: '0.6rem' }} />
                          {t(`severity.${inc.severity}`, { defaultValue: inc.severity })}
                        </span>
                        {/* Location */}
                        {(inc.city || inc.address) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                            <BI name="geo-alt-fill" style={{ fontSize: '0.6rem' }} />
                            {inc.city || inc.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border-secondary)', background: 'var(--bg-tertiary)', borderRadius: '0 0 12px 12px' }}>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {seesAll && (inc.reporterName || inc.reportedByName) && (
                        <><BI name="person-fill" className="me-1" />{inc.reporterName || inc.reportedByName} · </>
                      )}
                      {inc.createdAt && new Date(inc.createdAt).toLocaleDateString()}
                    </span>
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
        // ── TABLE VIEW (rescue team / admin) ────────────────────────────────
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...cardStyle, overflow: 'hidden' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-primary)' }}>
                {['#','Title','Type','Severity','Status','Location','Reported','Actions'].map(h => (
                  <th key={h} className="text-start px-3 py-3 font-black uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc, idx) => {
                const statusCfg   = STATUS_CFG[inc.status]     || STATUS_CFG.OPEN;
                const severityCfg = SEVERITY_CFG[inc.severity] || SEVERITY_CFG.MEDIUM;
                const typeColor   = TYPE_COLOR[inc.type] || '#6b7280';
                return (
                  <motion.tr key={inc.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                    className="cursor-pointer group"
                    style={{ borderBottom: '1px solid var(--border-secondary)' }}
                    onClick={() => navigate(`/layout/incidents/${inc.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>#{inc.id}</td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{inc.title}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold" style={{ color: typeColor }}>
                        {t(`types.${inc.type}`, { defaultValue: inc.type })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: severityCfg.bg, color: severityCfg.color }}>
                        {t(`severity.${inc.severity}`, { defaultValue: inc.severity })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                        <BI name={statusCfg.icon} style={{ fontSize: '0.6rem' }} />
                        {t(`status.${inc.status}`, { defaultValue: inc.status })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{inc.city || inc.address || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--text-tertiary)' }}>
                      {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center gap-1.5 pt-2 flex-wrap">
          {/* Prev */}
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
            style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
            <BI name="chevron-left" />
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
            .reduce((acc, i, idx, arr) => {
              if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...');
              acc.push(i);
              return acc;
            }, [])
            .map((item, i) =>
              item === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>…</span>
              ) : (
                <button key={item} onClick={() => setPage(item)}
                  className="w-9 h-9 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: page === item ? `linear-gradient(135deg, ${hdr.accent}, ${hdr.accent}cc)` : 'var(--bg-secondary)',
                    color: page === item ? 'white' : 'var(--text-secondary)',
                    border: page === item ? 'none' : '1px solid var(--border-input)',
                    boxShadow: page === item ? `0 4px 12px ${hdr.accent}40` : 'none',
                  }}>
                  {item + 1}
                </button>
              )
            )}

          {/* Next */}
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
