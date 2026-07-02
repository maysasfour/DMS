import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { incidentAPI } from '../services/api';
import { useAuthStore } from '../store';
import RouteMap from '../components/maps/RouteMap';
import { showNotification } from '../components/NotificationHub';

const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

const STATUS_COLOR = {
  OPEN:        { bg: '#E63946', text: '#fff', glow: 'rgba(230,57,70,0.3)',   icon: 'exclamation-circle-fill' },
  IN_PROGRESS: { bg: '#FF7A00', text: '#fff', glow: 'rgba(255,122,0,0.3)',   icon: 'arrow-repeat'           },
  RESOLVED:    { bg: '#059669', text: '#fff', glow: 'rgba(5,150,105,0.3)',   icon: 'check-circle-fill'      },
  CLOSED:      { bg: '#6b7280', text: '#fff', glow: 'rgba(107,114,128,0.3)', icon: 'x-circle-fill'         },
};
const SEVERITY_COLOR = {
  LOW:      { bg: '#22c55e', glow: 'rgba(34,197,94,0.25)'  },
  MEDIUM:   { bg: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },
  HIGH:     { bg: '#E63946', glow: 'rgba(230,57,70,0.25)'  },
  CRITICAL: { bg: '#7f1d1d', glow: 'rgba(127,29,29,0.4)'   },
};
const TYPE_COLOR = {
  FIRE:       '#E63946', FLOOD:    '#3b82f6', EARTHQUAKE: '#92400e',
  STORM:      '#6366f1', ACCIDENT: '#FF7A00', MEDICAL:    '#10b981',
  HAZMAT:     '#8b5cf6', OTHER:    '#6b7280',
};
const TYPE_ICON = {
  FIRE: 'fire', FLOOD: 'water', EARTHQUAKE: 'house-exclamation-fill',
  STORM: 'cloud-lightning-fill', ACCIDENT: 'car-front-fill', MEDICAL: 'heart-pulse-fill',
  HAZMAT: 'radioactive', OTHER: 'exclamation-triangle-fill',
};

// Roles that can act on incidents (update status, assign, etc.)
const CAN_MANAGE = ['ADMIN', 'RESPONDER', 'RESCUE_TEAM', 'OFFICIAL'];

// ── AI Evidence Analyzer for admin/rescue ────────────────────────────────────
function AIEvidencePanel({ incident, mediaItems, lang }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const imageItem = mediaItems.find(m => m.isImage && m.src);
      const body = {
        title: incident.title,
        description: incident.description,
        type: incident.type,
        severity: incident.severity,
        lang,
      };

      if (imageItem?.src) {
        // fetch image and convert to base64
        const resp = await fetch(imageItem.src);
        const blob = await resp.blob();
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        body.imageBase64 = b64;
        body.mimeType = blob.type || 'image/jpeg';
      }

      const endpoint = body.imageBase64 ? '/verify-full' : '/verify-incident';
      const r = await fetch(`http://localhost:3002${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok) throw new Error(`Agent returned ${r.status}`);
      setResult(await r.json());
    } catch (e) {
      setError(e.message || 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = result
    ? result.score >= 70 ? '#00c853' : result.score >= 50 ? '#FF7A00' : '#E63946'
    : '#6b7280';

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
      borderLeft: '4px solid #6366f1', borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-primary)',
        background: 'linear-gradient(90deg, rgba(99,102,241,0.06), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
            🤖
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)',
              fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              AI Evidence Analysis
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {mediaItems.length > 0 ? `${mediaItems.filter(m => m.isImage).length} image(s) available` : 'Text analysis only'}
            </div>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={analyze} disabled={loading}
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: '#fff', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
          }}>
          {loading ? (
            <>
              <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }}/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Analyzing…
            </>
          ) : result ? '↺ Re-analyze' : '▶ Run AI Analysis'}
        </motion.button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
            Click <strong style={{ color: '#6366f1' }}>Run AI Analysis</strong> to verify report authenticity and image evidence before dispatching.
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.2)', color: '#b45309', fontSize: '0.8rem' }}>
            ⚠ {error}
          </div>
        )}

        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Verdict row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: "'Rajdhani',monospace", color: scoreColor,
                  textShadow: `0 0 12px ${scoreColor}66` }}>{result.score}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>/100</span>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.78rem',
                background: result.passed ? 'rgba(0,200,83,0.1)' : 'rgba(230,57,70,0.1)',
                color: result.passed ? '#00c853' : '#E63946',
                border: `1px solid ${result.passed ? 'rgba(0,200,83,0.3)' : 'rgba(230,57,70,0.3)'}` }}>
                {result.passed ? '✓ CREDIBLE REPORT' : '✗ SUSPICIOUS / INCOMPLETE'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                via {result._source === 'gemini' ? 'Gemini AI' : result._source === 'rule-engine' ? 'Rule Engine' : result._source}
              </span>
            </div>

            {/* Score bar */}
            <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${result.score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3,
                  background: result.score >= 70 ? 'linear-gradient(90deg,#00c853,#69f0ae)'
                    : result.score >= 50 ? 'linear-gradient(90deg,#FF7A00,#ffb300)'
                    : 'linear-gradient(90deg,#E63946,#ff6b6b)',
                  boxShadow: `0 0 8px ${scoreColor}66` }} />
            </div>

            {/* AI reasoning */}
            {result.reasoning && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>🤖 </span>{result.reasoning}
              </div>
            )}

            {/* Issues */}
            {result.issues?.filter(Boolean).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {result.issues.map((iss, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 12px', borderRadius: 8,
                    background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.18)',
                    fontSize: '0.78rem', color: '#c0202d' }}>
                    <span style={{ flexShrink: 0 }}>⚠</span><span>{iss}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Image analysis block */}
            {result.image_analysis && (
              <div style={{ borderRadius: 12, border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', background: 'rgba(255,122,0,0.07)',
                  borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#FF7A00' }}>📷 Image Evidence Analysis</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: scoreColor }}>{result.image_analysis.image_score}/100</span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: result.image_analysis.image_passed ? 'rgba(0,200,83,0.12)' : 'rgba(230,57,70,0.12)',
                      color: result.image_analysis.image_passed ? '#00c853' : '#E63946' }}>
                      {result.image_analysis.image_passed ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.image_analysis.image_notes && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {result.image_analysis.image_notes}
                    </p>
                  )}
                  {result.image_analysis.detected_elements?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 4 }}>Detected:</span>
                      {result.image_analysis.detected_elements.map((el, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
                          background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                          {el}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[
                      { label: 'Authentic', val: result.image_analysis.appears_authentic },
                      { label: 'Emergency', val: result.image_analysis.shows_emergency },
                      { label: 'Type Match', val: result.image_analysis.matches_incident_type },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ padding: '5px 8px', borderRadius: 8, background: 'var(--bg-tertiary)',
                        border: `1px solid ${val ? 'rgba(0,200,83,0.2)' : 'rgba(230,57,70,0.2)'}`,
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                        <span style={{ color: val ? '#00c853' : '#E63946' }}>{val ? '✓' : '✗'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {result.image_analysis.environment && result.image_analysis.environment !== 'unknown' && (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      📍 Environment: <strong style={{ color: 'var(--text-secondary)' }}>{result.image_analysis.environment}</strong>
                      {result.image_analysis.severity_visible && result.image_analysis.severity_visible !== 'unknown' &&
                        <> &nbsp;·&nbsp; ⚡ Visible severity: <strong style={{ color: scoreColor }}>{result.image_analysis.severity_visible}</strong></>}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Report fields check */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {[
                { label: 'Type matches', val: result.type_matches_description },
                { label: 'Actionable details', val: result.has_actionable_details },
                { label: 'Severity appropriate', val: result.severity_appropriate },
                { label: 'Not fake/test', val: !result.is_fake_or_test },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
                  background: 'var(--bg-tertiary)', border: `1px solid ${val ? 'rgba(0,200,83,0.15)' : 'rgba(230,57,70,0.15)'}`,
                  fontSize: '0.75rem' }}>
                  <span style={{ color: val ? '#00c853' : '#E63946' }}>{val ? '✓' : '✗'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lightbox for fullscreen image view ────────────────────────────────────────
function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.img
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ type: 'spring', stiffness: 300 }}
        src={src} alt={alt}
        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
      >
        <BI name="x-lg" />
      </button>
    </motion.div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color = '#6b7280', monospace = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}15` }}>
        <BI name={icon} style={{ color, fontSize: '0.8rem' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className={`text-sm font-semibold ${monospace ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [incident,    setIncident]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lightbox,    setLightbox]    = useState(null); // { src, alt }
  const [statusLoading, setStatusLoading] = useState(false);

  const canManage = CAN_MANAGE.includes(user?.role);
  const isRescue  = user?.role === 'RESCUE_TEAM' || user?.role === 'RESPONDER';

  useEffect(() => {
    incidentAPI.getIncidentById(id)
      .then(({ data }) => setIncident(data?.data || data))
      .catch(() => navigate('/layout/incidents'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      const { data } = await incidentAPI.updateStatus(id, newStatus);
      setIncident(prev => ({ ...prev, ...(data?.data || data || {}), status: newStatus }));
      showNotification(t('incidents.status_updated'), 'success');
    } catch (_) {
      showNotification(t('incidents.status_update_failed'), 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-48 rounded-2xl" style={{ background: 'var(--bg-secondary)' }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-secondary)' }} />
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  );
  if (!incident) return null;

  const statusCfg   = STATUS_COLOR[incident.status]   || STATUS_COLOR.OPEN;
  const severityCfg = SEVERITY_COLOR[incident.severity] || SEVERITY_COLOR.MEDIUM;
  const typeColor   = TYPE_COLOR[incident.type] || '#6b7280';
  const typeIcon    = TYPE_ICON[incident.type] || 'exclamation-triangle-fill';

  const cardStyle = {
    background:   'var(--bg-secondary)',
    border:       '1px solid var(--border-primary)',
    borderRadius: 16,
    boxShadow:    'var(--shadow-sm)',
  };

  // Media items
  const mediaItems = (incident.media || []).map((m, i) => {
    const src  = m.url || m.filePath || m.fileUrl || '';
    const name = m.originalName || m.fileName || `Media ${i + 1}`;
    const ext  = name.split('.').pop()?.toLowerCase();
    const isImage = m.fileType?.startsWith('image') ||
      ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext);
    return { src, name, isImage, m };
  });

  return (
    <>
      <AnimatePresence>
        {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto pb-10">
        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-4 flex items-center gap-2 text-sm">
          <Link to="/layout/incidents" className="flex items-center gap-1 font-semibold hover:underline" style={{ color: typeColor }}>
            <BI name="arrow-left" /> {t('incidents.back')}
          </Link>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span style={{ color: 'var(--text-tertiary)' }}>#{id}</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* ── HERO HEADER ────────────────────────────────────────────────── */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${typeColor}`, overflow: 'hidden' }} className="p-6">
            {/* Top accent strip */}
            <div className="absolute inset-x-0 top-0 h-1 opacity-60" style={{ background: `linear-gradient(90deg, ${typeColor}, ${statusCfg.bg})` }} />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Type pill */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
                    style={{ background: `${typeColor}18`, color: typeColor }}>
                    <BI name={typeIcon} /> {t(`types.${incident.type}`, { defaultValue: incident.type })}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>#{id}</span>
                </div>

                <h1 className="text-xl font-black mb-3 leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {incident.title}
                </h1>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black"
                    style={{ background: statusCfg.bg, color: statusCfg.text, boxShadow: `0 2px 8px ${statusCfg.glow}` }}>
                    <BI name={statusCfg.icon} />
                    {t(`status.${incident.status}`, { defaultValue: incident.status?.replace('_', ' ') })}
                  </span>
                  {/* Severity */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white"
                    style={{ background: severityCfg.bg, boxShadow: `0 2px 8px ${severityCfg.glow}` }}>
                    <BI name="lightning-charge-fill" />
                    {t(`severity.${incident.severity}`, { defaultValue: incident.severity })}
                  </span>
                  {/* Time */}
                  {incident.createdAt && (
                    <span className="inline-flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--text-tertiary)' }}>
                      <BI name="clock" />
                      {new Date(incident.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Status updater — rescue team & above */}
              {canManage && (
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>Update Status</p>
                  <select
                    value={incident.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    disabled={statusLoading}
                    className="px-3 py-2 rounded-xl text-sm font-bold cursor-pointer"
                    style={{ background: statusCfg.bg, color: statusCfg.text, border: 'none', outline: 'none', opacity: statusLoading ? 0.6 : 1 }}
                  >
                    {['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => (
                      <option key={s} value={s} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Description */}
            {incident.description && (
              <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <p className="text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  <BI name="chat-left-text-fill" className="me-1" /> Description
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {incident.description}
                </p>
              </div>
            )}
          </div>

          {/* ── AI EVIDENCE PANEL — admin/rescue only ──────────────────────── */}
          {canManage && (
            <AIEvidencePanel
              incident={incident}
              mediaItems={mediaItems}
              lang={navigator.language?.split('-')[0] || 'en'}
            />
          )}

          {/* ── MEDIA GALLERY — most important for rescue team ─────────────── */}
          {mediaItems.length > 0 && (
            <div style={cardStyle} className="p-5">
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,122,0,0.12)' }}>
                  <BI name="images" style={{ color: '#FF7A00' }} />
                </div>
                Evidence Media
                <span className="ms-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,122,0,0.12)', color: '#FF7A00' }}>
                  {mediaItems.length} file{mediaItems.length !== 1 ? 's' : ''}
                </span>
                {isRescue && (
                  <span className="ms-auto text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(230,57,70,0.08)', color: '#E63946' }}>
                    <BI name="eye-fill" className="me-1" />Field View
                  </span>
                )}
              </h3>

              {/* Images grid — large, clickable, fullscreen */}
              <div className={`grid gap-3 ${mediaItems.length === 1 ? 'grid-cols-1' : mediaItems.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {mediaItems.map(({ src, name, isImage }, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
                    className="relative rounded-2xl overflow-hidden cursor-pointer group"
                    style={{
                      aspectRatio: mediaItems.length === 1 ? '16/7' : '16/10',
                      background: 'var(--bg-tertiary)',
                      border: '2px solid var(--border-primary)',
                    }}
                    onClick={() => isImage && src && setLightbox({ src, alt: name })}
                  >
                    {isImage && src ? (
                      <>
                        <img
                          src={src}
                          alt={name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback if image fails */}
                        <div className="hidden w-full h-full flex-col items-center justify-center gap-2">
                          <BI name="image-fill" style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)' }} />
                          <p className="text-xs px-2 text-center" style={{ color: 'var(--text-tertiary)' }}>{name}</p>
                        </div>
                        {/* Hover overlay with expand icon */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                            <BI name="arrows-fullscreen" style={{ color: 'white', fontSize: '1.2rem' }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Video / non-image */
                      <a href={src} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,122,0,0.12)' }}>
                          <BI name="play-btn-fill" style={{ fontSize: '2rem', color: '#FF7A00' }} />
                        </div>
                        <p className="text-xs font-semibold px-3 text-center truncate max-w-full"
                          style={{ color: 'var(--text-secondary)' }}>{name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,122,0,0.12)', color: '#FF7A00' }}>
                          Click to play
                        </span>
                      </a>
                    )}

                    {/* File name label */}
                    <div className="absolute bottom-0 inset-x-0 p-2"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                      <p className="text-white text-xs truncate font-medium">{name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Download all link */}
              {mediaItems.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {mediaItems.map(({ src, name }, i) => (
                    <a key={i} href={src} target="_blank" rel="noopener noreferrer" download={name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
                      <BI name="download" /> {name.length > 20 ? name.slice(0, 20) + '…' : name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DETAILS GRID ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Location card */}
            <div style={cardStyle} className="p-5">
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(230,57,70,0.12)' }}>
                  <BI name="geo-alt-fill" style={{ color: '#E63946' }} />
                </div>
                {t('incidents.location')}
              </h3>

              <div className="space-y-1 mb-3">
                <InfoRow icon="map"         label="Address"    value={incident.address}   color="#E63946" />
                <InfoRow icon="building"    label="City"       value={incident.city}      color="#3b82f6" />
                <InfoRow icon="crosshair"   label="GPS"
                  value={incident.latitude && incident.longitude
                    ? `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}`
                    : null}
                  color="#059669" monospace />
                {!incident.latitude && !incident.longitude && !incident.address && (
                  <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                    <BI name="exclamation-triangle" className="me-1" />{t('common.unknown_location')}
                  </p>
                )}
              </div>

              {/* Map */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
                <RouteMap
                  latitude={incident.latitude}
                  longitude={incident.longitude}
                  title={incident.title}
                  severity={incident.severity}
                  type={incident.type}
                  locationName={incident.locationName || incident.address || incident.city}
                  height="200px"
                  interactive
                />
              </div>

              {/* Navigation button for rescue team */}
              {isRescue && incident.latitude && incident.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition"
                  style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 4px 16px rgba(230,57,70,0.3)' }}
                >
                  <BI name="navigation-fill" /> Navigate to Scene
                </a>
              )}
            </div>

            {/* Reporter & assignment info */}
            <div style={cardStyle} className="p-5">
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <BI name="people-fill" style={{ color: '#3b82f6' }} />
                </div>
                {t('incidents.people')}
              </h3>

              <div className="space-y-1">
                <InfoRow icon="person-fill"    label={t('incidents.reported_by')} value={incident.reporterName || incident.reportedByName} color="#3b82f6" />
                <InfoRow icon="telephone-fill" label="Contact Name"  value={incident.contactName}  color="#059669" />
                <InfoRow icon="phone"          label="Contact Phone" value={incident.contactPhone} color="#059669" />
                <InfoRow icon="person-badge-fill" label="Assigned Responder" value={incident.assignedResponderName} color="#FF7A00" />
                <InfoRow icon="clock"          label={t('incidents.reported')} value={incident.createdAt ? new Date(incident.createdAt).toLocaleString() : null} color="#6b7280" />
                {incident.updatedAt && incident.updatedAt !== incident.createdAt && (
                  <InfoRow icon="pencil-fill"  label="Last Updated"  value={new Date(incident.updatedAt).toLocaleString()} color="#6b7280" />
                )}
              </div>

              {/* Quick call button if phone exists and user is rescue */}
              {isRescue && incident.contactPhone && (
                <a href={`tel:${incident.contactPhone}`}
                  className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                  <BI name="telephone-fill" /> Call Reporter: {incident.contactPhone}
                </a>
              )}
            </div>
          </div>

          {/* ── RESCUE TEAM ACTIONS PANEL (only for RESCUE_TEAM / RESPONDER) ─ */}
          {isRescue && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ ...cardStyle, borderColor: 'rgba(245,158,11,0.4)', borderLeft: '4px solid #f59e0b' }}
              className="p-5"
            >
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <BI name="fire" style={{ color: '#f59e0b' }} />
                </div>
                Field Actions
                <span className="ms-auto text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  Responder Only
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { status: 'IN_PROGRESS', label: 'Mark In Progress', icon: 'play-circle-fill', color: '#FF7A00' },
                  { status: 'RESOLVED',    label: 'Mark Resolved',    icon: 'check-circle-fill', color: '#059669' },
                  { status: 'CLOSED',      label: 'Close Incident',   icon: 'x-circle-fill',    color: '#6b7280' },
                ].map(({ status, label, icon, color }) => (
                  <motion.button
                    key={status}
                    whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                    disabled={incident.status === status || statusLoading}
                    onClick={() => handleStatusChange(status)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                    style={{
                      background: incident.status === status ? `${color}20` : 'var(--bg-tertiary)',
                      border: `1.5px solid ${incident.status === status ? color : 'var(--border-input)'}`,
                      color: incident.status === status ? color : 'var(--text-secondary)',
                    }}
                  >
                    <BI name={icon} style={{ fontSize: '1.25rem', color }} />
                    {label}
                  </motion.button>
                ))}

                {incident.latitude && incident.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(230,57,70,0.08)', border: '1.5px solid rgba(230,57,70,0.3)', color: '#E63946', textDecoration: 'none' }}
                  >
                    <BI name="navigation-fill" style={{ fontSize: '1.25rem', color: '#E63946' }} />
                    Navigate
                  </a>
                )}
              </div>

              {/* Critical alert for CRITICAL severity */}
              {incident.severity === 'CRITICAL' && incident.status === 'OPEN' && (
                <motion.div
                  animate={{ borderColor: ['rgba(230,57,70,0.4)', 'rgba(230,57,70,0.8)', 'rgba(230,57,70,0.4)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mt-3 p-3 rounded-xl flex items-center gap-2 text-xs font-bold"
                  style={{ background: 'rgba(230,57,70,0.08)', border: '2px solid rgba(230,57,70,0.4)', color: '#E63946' }}
                >
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <BI name="exclamation-octagon-fill" style={{ fontSize: '1.1rem' }} />
                  </motion.div>
                  CRITICAL INCIDENT — Immediate response required. All available units should respond.
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── ADMIN DETAILS (extra info for admin only) ────────────────────── */}
          {user?.role === 'ADMIN' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              style={{ ...cardStyle, borderColor: 'rgba(230,57,70,0.3)' }} className="p-5"
            >
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BI name="shield-fill" style={{ color: '#E63946' }} /> Admin Details
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Incident ID',    value: incident.id           },
                  { label: 'Reporter ID',    value: incident.reportedById },
                  { label: 'Created At',     value: incident.createdAt ? new Date(incident.createdAt).toISOString() : '-' },
                  { label: 'Updated At',     value: incident.updatedAt ? new Date(incident.updatedAt).toISOString() : '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                    <p className="font-mono font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{value || '-'}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>
    </>
  );
}
