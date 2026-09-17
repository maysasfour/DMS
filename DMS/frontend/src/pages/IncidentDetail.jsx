/**
 * IncidentDetail.jsx
 *
 * Full detail view for a single disaster incident in the DMS (Disaster Management System).
 * Displays incident metadata (type, severity, status), evidence media (images/videos),
 * geolocation on an interactive map, reporter and contact information, and role-based
 * action panels.
 *
 * Role-specific features:
 *  - ADMIN: AI evidence analysis panel, admin audit metadata, status updater.
 *  - RESCUE_TEAM / RESPONDER: Field action buttons, one-tap navigation to scene,
 *    direct call link to reporter, and critical severity pulsing alert.
 *  - All authenticated managers (CAN_MANAGE roles): Status dropdown updater.
 *
 * Integrates with:
 *  - incidentAPI — fetches and updates incident records.
 *  - AI agent on port 3002 — verifies report authenticity via Gemini 2.5-flash.
 *  - RouteMap — renders an interactive Leaflet map centred on the incident GPS coordinates.
 *  - NotificationHub — shows transient toast feedback after status changes.
 */

// React core hooks for lifecycle, state, and DOM refs
import React, { useEffect, useState, useRef } from 'react';
// Routing utilities: read URL param :id, render anchor links, programmatic navigation
import { useParams, Link, useNavigate } from 'react-router-dom';
// Animation library used for entrance transitions, hover/tap feedback, and animated alerts
import { motion, AnimatePresence } from 'framer-motion';
// i18n hook — translates all user-visible strings based on selected locale (ar/en/es/fr/tr)
import { useTranslation } from 'react-i18next';
// Incident API service: wraps Axios calls for GET /incidents/:id and PATCH /incidents/:id/status
import { incidentAPI } from '../services/api';
// Zustand auth store — provides the currently authenticated user with their role
import { useAuthStore } from '../store';
// Interactive map component that renders the incident's GPS coordinates via Leaflet/OpenStreetMap
import RouteMap from '../components/maps/RouteMap';
// Global notification helper — triggers a themed toast banner inside NotificationHub
import { showNotification } from '../components/NotificationHub';

/**
 * BI — Bootstrap Icons shorthand component.
 * Renders a <i> element with the correct Bootstrap Icons class for the given icon name.
 * @param {string}  name      - Bootstrap Icons glyph name (e.g. "fire", "geo-alt-fill").
 * @param {string}  className - Additional CSS classes to append.
 * @param {object}  style     - Inline styles (used heavily for dynamic colours).
 */
const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

/**
 * STATUS_COLOR — maps each incident lifecycle status to its visual configuration.
 * Used to colour status badges, the status dropdown, and the hero border.
 * Keys mirror the backend IncidentStatus enum: OPEN, IN_PROGRESS, RESOLVED, CLOSED.
 */
const STATUS_COLOR = {
  OPEN:        { bg: '#E63946', text: '#fff', glow: 'rgba(230,57,70,0.3)',   icon: 'exclamation-circle-fill' },
  IN_PROGRESS: { bg: '#FF7A00', text: '#fff', glow: 'rgba(255,122,0,0.3)',   icon: 'arrow-repeat'           },
  RESOLVED:    { bg: '#059669', text: '#fff', glow: 'rgba(5,150,105,0.3)',   icon: 'check-circle-fill'      },
  CLOSED:      { bg: '#6b7280', text: '#fff', glow: 'rgba(107,114,128,0.3)', icon: 'x-circle-fill'         },
};

/**
 * SEVERITY_COLOR — maps each incident severity level to a background colour and glow.
 * Severity is set by the reporter and can be overridden by an admin.
 * CRITICAL severity also triggers a pulsing alert banner for rescue teams.
 */
const SEVERITY_COLOR = {
  LOW:      { bg: '#22c55e', glow: 'rgba(34,197,94,0.25)'  },
  MEDIUM:   { bg: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },
  HIGH:     { bg: '#E63946', glow: 'rgba(230,57,70,0.25)'  },
  CRITICAL: { bg: '#7f1d1d', glow: 'rgba(127,29,29,0.4)'   },
};

/**
 * TYPE_COLOR — accent colour for each disaster category.
 * Applied to type pills, hero card left border, and map markers.
 */
const TYPE_COLOR = {
  FIRE:       '#E63946', FLOOD:    '#3b82f6', EARTHQUAKE: '#92400e',
  STORM:      '#6366f1', ACCIDENT: '#FF7A00', MEDICAL:    '#10b981',
  HAZMAT:     '#8b5cf6', OTHER:    '#6b7280',
};

/**
 * TYPE_ICON — Bootstrap Icons glyph name for each disaster type.
 * Paired with TYPE_COLOR to build the incident type pill displayed in the hero header.
 */
const TYPE_ICON = {
  FIRE: 'fire', FLOOD: 'water', EARTHQUAKE: 'house-exclamation-fill',
  STORM: 'cloud-lightning-fill', ACCIDENT: 'car-front-fill', MEDICAL: 'heart-pulse-fill',
  HAZMAT: 'radioactive', OTHER: 'exclamation-triangle-fill',
};

/**
 * CAN_MANAGE — roles that are permitted to take management actions on an incident.
 * These users see the status dropdown and the AI evidence analysis panel.
 * CITIZEN and REPORTER roles are intentionally excluded.
 */
const CAN_MANAGE = ['ADMIN', 'RESPONDER', 'RESCUE_TEAM', 'OFFICIAL'];

// ── AI Evidence Analyzer for admin/rescue ────────────────────────────────────
/**
 * AIEvidencePanel — sends incident metadata (and optionally an attached image) to the
 * DMS AI agent (Gemini 2.5-flash on port 3002) and renders a credibility verdict.
 *
 * Why: before dispatching responders, managers can quickly verify whether a submitted
 * report appears genuine, actionable, and consistent with the declared incident type.
 *
 * @param {object}   incident   - Full incident object from the DMS API.
 * @param {Array}    mediaItems - Processed media array (with isImage flag and resolved src URL).
 * @param {string}   lang       - Two-letter ISO language code for the AI response language.
 */
function AIEvidencePanel({ incident, mediaItems, lang }) {
  // t() translates labels; not heavily used inside this panel but kept for future i18n expansion
  const { t } = useTranslation();

  // result holds the structured JSON response from the AI agent after analysis
  const [result, setResult]   = useState(null);
  // loading gates the analyse button and shows a spinner while the AI request is in flight
  const [loading, setLoading] = useState(false);
  // error stores a human-readable failure message shown as a warning box
  const [error, setError]     = useState('');

  /**
   * analyze — assembles a payload from the incident record, optionally base64-encodes the
   * first attached image, then posts to either /verify-full (image + text) or
   * /verify-incident (text only) on the AI agent service.
   * On success the raw JSON verdict is stored in `result`.
   */
  const analyze = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      // Pick the first image attachment available to send to the AI agent for visual analysis
      const imageItem = mediaItems.find(m => m.isImage && m.src);

      // Core incident fields sent to the AI for text-based verification
      const body = {
        title: incident.title,
        description: incident.description,
        type: incident.type,
        severity: incident.severity,
        lang,
      };

      if (imageItem?.src) {
        // Fetch the image blob from the CDN/object-store URL so we can base64-encode it
        const resp = await fetch(imageItem.src);
        const blob = await resp.blob();
        // Use FileReader to convert binary blob to base64 string expected by the AI agent API
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(',')[1]); // strip the "data:<mime>;base64," prefix
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        // Attach base64 image and MIME type so the agent can pass them to Gemini Vision
        body.imageBase64 = b64;
        body.mimeType = blob.type || 'image/jpeg';
      }

      // Choose the appropriate endpoint depending on whether image evidence is available
      const endpoint = body.imageBase64 ? '/verify-full' : '/verify-incident';
      // Determine the AI agent base URL: local dev vs production reverse proxy path
      const aiBase = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '/ai';
      const r = await fetch(`${aiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000), // 25 s hard timeout — AI can be slow under load
      });
      if (!r.ok) throw new Error(`Agent returned ${r.status}`);
      // Store the verdict (score, passed, reasoning, issues, image_analysis) for rendering
      setResult(await r.json());
    } catch (e) {
      setError(e.message || 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * scoreColor — determines the colour used for the numeric credibility score and progress bar.
   * Green >= 70 (credible), Orange >= 50 (uncertain), Red < 50 (suspicious / incomplete).
   */
  const scoreColor = result
    ? result.score >= 70 ? '#00c853' : result.score >= 50 ? '#FF7A00' : '#E63946'
    : '#6b7280';

  return (
    // Outer card with indigo left border to visually distinguish AI-generated content
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
      borderLeft: '4px solid #6366f1', borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header — panel title, media count hint, and the Run AI Analysis action button */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-primary)',
        background: 'linear-gradient(90deg, rgba(99,102,241,0.06), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Robot icon badge to visually signal this is AI-generated output */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
            🤖
          </div>
          <div>
            {/* Panel heading — uppercase Rajdhani to match DMS neon cyberpunk design system */}
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)',
              fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              AI Evidence Analysis
            </div>
            {/* Sub-label tells the user whether image evidence can be included in the analysis */}
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {mediaItems.length > 0 ? `${mediaItems.filter(m => m.isImage).length} image(s) available` : 'Text analysis only'}
            </div>
          </div>
        </div>
        {/* Analyse / Re-analyse button — disabled and dimmed while the AI request is pending */}
        <motion.button whileTap={{ scale: 0.95 }} onClick={analyze} disabled={loading}
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: '#fff', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
          }}>
          {loading ? (
            <>
              {/* SVG spinner shown while waiting for the Gemini AI response */}
              <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }}/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Analyzing…
            </>
          ) : result ? '↺ Re-analyze' : '▶ Run AI Analysis'}
        </motion.button>
      </div>

      {/* Body — conditional rendering of idle hint, error, or the full AI verdict */}
      <div style={{ padding: '16px 20px' }}>
        {/* Idle state — shown before the first analysis request is made */}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
            Click <strong style={{ color: '#6366f1' }}>Run AI Analysis</strong> to verify report authenticity and image evidence before dispatching.
          </div>
        )}

        {/* Error state — AI agent unreachable or returned a non-2xx status */}
        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.2)', color: '#b45309', fontSize: '0.8rem' }}>
            ⚠ {error}
          </div>
        )}

        {/* Result panel — shown after a successful AI analysis response */}
        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Verdict row — score, pass/fail pill, and source label (Gemini or rule-engine fallback) */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Numeric credibility score displayed prominently in score colour */}
                <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: "'Rajdhani',monospace", color: scoreColor,
                  textShadow: `0 0 12px ${scoreColor}66` }}>{result.score}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>/100</span>
              </div>
              {/* Pass/fail verdict badge — green for credible, red for suspicious */}
              <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.78rem',
                background: result.passed ? 'rgba(0,200,83,0.1)' : 'rgba(230,57,70,0.1)',
                color: result.passed ? '#00c853' : '#E63946',
                border: `1px solid ${result.passed ? 'rgba(0,200,83,0.3)' : 'rgba(230,57,70,0.3)'}` }}>
                {result.passed ? '✓ CREDIBLE REPORT' : '✗ SUSPICIOUS / INCOMPLETE'}
              </span>
              {/* Source attribution — distinguishes Gemini AI from the offline rule-engine fallback */}
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                via {result._source === 'gemini' ? 'Gemini AI' : result._source === 'rule-engine' ? 'Rule Engine' : result._source}
              </span>
            </div>

            {/* Animated score progress bar — fills from 0 to result.score on first render */}
            <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${result.score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3,
                  background: result.score >= 70 ? 'linear-gradient(90deg,#00c853,#69f0ae)'
                    : result.score >= 50 ? 'linear-gradient(90deg,#FF7A00,#ffb300)'
                    : 'linear-gradient(90deg,#E63946,#ff6b6b)',
                  boxShadow: `0 0 8px ${scoreColor}66` }} />
            </div>

            {/* AI natural-language reasoning — the Gemini model's explanation of its verdict */}
            {result.reasoning && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>🤖 </span>{result.reasoning}
              </div>
            )}

            {/* Issues list — specific problems the AI flagged (e.g. "description too vague") */}
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

            {/* Image analysis block — only present when an image was included in the request */}
            {result.image_analysis && (
              <div style={{ borderRadius: 12, border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                {/* Sub-header shows the image credibility score and a pass/fail badge */}
                <div style={{ padding: '8px 14px', background: 'rgba(255,122,0,0.07)',
                  borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#FF7A00' }}>📷 Image Evidence Analysis</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Numeric image credibility score (separate from overall report score) */}
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: scoreColor }}>{result.image_analysis.image_score}/100</span>
                    {/* Pass/fail pill for the image evidence check specifically */}
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: result.image_analysis.image_passed ? 'rgba(0,200,83,0.12)' : 'rgba(230,57,70,0.12)',
                      color: result.image_analysis.image_passed ? '#00c853' : '#E63946' }}>
                      {result.image_analysis.image_passed ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Free-text notes from the AI about what it detected in the image */}
                  {result.image_analysis.image_notes && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {result.image_analysis.image_notes}
                    </p>
                  )}
                  {/* Detected elements — specific objects/conditions the AI identified (e.g. "flames", "flood water") */}
                  {result.image_analysis.detected_elements?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 4 }}>Detected:</span>
                      {result.image_analysis.detected_elements.map((el, i) => (
                        // Each detected element rendered as a cyan chip
                        <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
                          background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                          {el}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Three boolean checks rendered as check/cross tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[
                      { label: 'Authentic',  val: result.image_analysis.appears_authentic       }, // Image does not appear AI-generated or stock
                      { label: 'Emergency',  val: result.image_analysis.shows_emergency          }, // Image visually depicts an emergency scene
                      { label: 'Type Match', val: result.image_analysis.matches_incident_type    }, // Image is consistent with the declared incident type
                    ].map(({ label, val }) => (
                      <div key={label} style={{ padding: '5px 8px', borderRadius: 8, background: 'var(--bg-tertiary)',
                        border: `1px solid ${val ? 'rgba(0,200,83,0.2)' : 'rgba(230,57,70,0.2)'}`,
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                        <span style={{ color: val ? '#00c853' : '#E63946' }}>{val ? '✓' : '✗'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Scene environment label and visible severity assessment from the image */}
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

            {/* Report field validation grid — four boolean checks on the text report itself */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {[
                { label: 'Type matches',        val: result.type_matches_description  }, // Incident type matches the description text
                { label: 'Actionable details',  val: result.has_actionable_details    }, // Enough detail for responders to act on
                { label: 'Severity appropriate',val: result.severity_appropriate      }, // Declared severity aligns with description
                { label: 'Not fake/test',        val: !result.is_fake_or_test         }, // Report does not appear to be a test or hoax
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
/**
 * Lightbox — full-screen image overlay used to inspect incident evidence photos.
 * Closes on Escape key press or clicking the backdrop/close button.
 * Wrapped in AnimatePresence at the call site so it fades in/out smoothly.
 *
 * @param {string}   src      - Resolved URL of the image to display.
 * @param {string}   alt      - Accessible alt text (original file name).
 * @param {Function} onClose  - Callback to clear the lightbox state in IncidentDetail.
 */
function Lightbox({ src, alt, onClose }) {
  // Register a global keyboard handler so pressing Escape closes the lightbox
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    // Clean up the listener when the lightbox unmounts to avoid memory leaks
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    // Backdrop — semi-transparent black overlay; clicking it closes the lightbox
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Evidence image — springs in from a slightly scaled-down state for a polished feel */}
      <motion.img
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ type: 'spring', stiffness: 300 }}
        src={src} alt={alt}
        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()} // Prevent click-through closing when clicking the image itself
      />
      {/* Close button — top-right corner, glass-morphism style consistent with DMS design system */}
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
/**
 * InfoRow — reusable labelled data row used in the location and people detail cards.
 * Returns null when `value` is falsy so empty fields are cleanly hidden.
 *
 * @param {string}  icon      - Bootstrap Icons glyph name for the left icon.
 * @param {string}  label     - Field label text (already translated at call site).
 * @param {*}       value     - The field value to display; null/undefined hides the row.
 * @param {string}  color     - Accent colour for the icon background and icon itself.
 * @param {boolean} monospace - If true, applies monospace font (used for GPS coordinates).
 */
function InfoRow({ icon, label, value, color = '#6b7280', monospace = false }) {
  // Hide the row entirely when there is no value to display
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
      {/* Coloured icon badge — uses a translucent tint of the accent colour as background */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}15` }}>
        <BI name={icon} style={{ color, fontSize: '0.8rem' }} />
      </div>
      <div className="flex-1 min-w-0">
        {/* Micro uppercase label e.g. "ADDRESS", "GPS", "REPORTED BY" */}
        <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        {/* The actual value — monospace for coordinates, regular weight for everything else */}
        <p className={`text-sm font-semibold ${monospace ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

/**
 * IncidentDetail — default export; the main page component.
 * Fetches a single incident by :id from the DMS API, resolves media URLs,
 * and renders the hero header, AI panel, media gallery, location map, people info,
 * and role-specific action panels.
 */
export default function IncidentDetail() {
  // Extract the incident ID from the URL path parameter (e.g. /layout/incidents/42)
  const { id } = useParams();
  // Retrieve the logged-in user (with role) from the global Zustand auth store
  const { user } = useAuthStore();
  // navigate() allows programmatic redirection (e.g. back to list on 404)
  const navigate = useNavigate();
  // t() provides locale-aware translations for all user-visible strings
  const { t } = useTranslation();

  // incident — holds the full incident object once loaded from the API
  const [incident,      setIncident]      = useState(null);
  // loading — true while the initial API request is in flight; drives the skeleton UI
  const [loading,       setLoading]       = useState(true);
  // lightbox — null when closed, or { src, alt } when an evidence image is open fullscreen
  const [lightbox,      setLightbox]      = useState(null); // { src, alt }
  // statusLoading — true while a status PATCH request is pending; disables the dropdown
  const [statusLoading, setStatusLoading] = useState(false);

  // canManage — true if the current user's role allows status changes and the AI panel
  const canManage = CAN_MANAGE.includes(user?.role);
  // isRescue — true for field operatives who need navigation links and quick-call buttons
  const isRescue  = user?.role === 'RESCUE_TEAM' || user?.role === 'RESPONDER';

  // Load the incident data when the component mounts or the URL :id changes
  useEffect(() => {
    incidentAPI.getIncidentById(id)
      .then(({ data }) => setIncident(data?.data || data)) // unwrap nested data envelope if present
      .catch(() => navigate('/layout/incidents'))           // redirect to list on any error (e.g. 404)
      .finally(() => setLoading(false));
  }, [id]);

  /**
   * handleStatusChange — PATCHes the incident status via the API and immediately
   * reflects the change in local state to avoid a full re-fetch round trip.
   * Shows a toast notification on success or failure.
   *
   * @param {string} newStatus - One of: OPEN, IN_PROGRESS, RESOLVED, CLOSED.
   */
  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      const { data } = await incidentAPI.updateStatus(id, newStatus);
      // Merge the API response into the local incident state, forcing the new status value
      setIncident(prev => ({ ...prev, ...(data?.data || data || {}), status: newStatus }));
      showNotification(t('incidents.status_updated'), 'success');
    } catch (_) {
      showNotification(t('incidents.status_update_failed'), 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Skeleton loading state — animated grey boxes match the expected page layout
  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-48 rounded-2xl" style={{ background: 'var(--bg-secondary)' }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-secondary)' }} />
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  );
  // Guard — should not normally render since navigate() fires in the catch above
  if (!incident) return null;

  // Resolve visual configuration objects based on the incident's current status/severity/type
  const statusCfg   = STATUS_COLOR[incident.status]     || STATUS_COLOR.OPEN;
  const severityCfg = SEVERITY_COLOR[incident.severity] || SEVERITY_COLOR.MEDIUM;
  const typeColor   = TYPE_COLOR[incident.type]         || '#6b7280';
  const typeIcon    = TYPE_ICON[incident.type]          || 'exclamation-triangle-fill';

  // Shared card style applied to all major content sections for visual consistency
  const cardStyle = {
    background:   'var(--bg-secondary)',
    border:       '1px solid var(--border-primary)',
    borderRadius: 16,
    boxShadow:    'var(--shadow-sm)',
  };

  /**
   * mediaItems — normalised array derived from incident.media.
   * Each item resolves the correct URL field (url / filePath / fileUrl) and determines
   * whether the file is an image (by MIME type or extension) so the gallery can branch
   * between an <img> preview and a video/file play link.
   */
  const mediaItems = (incident.media || []).map((m, i) => {
    // Resolve the best available URL property from the media record
    const src  = m.url || m.filePath || m.fileUrl || '';
    // Resolve the best available display name for the file
    const name = m.originalName || m.fileName || `Media ${i + 1}`;
    // Extract the file extension to help classify non-MIME-typed records
    const ext  = name.split('.').pop()?.toLowerCase();
    // Classify as an image if the MIME type says so, or if the extension is a known image format
    const isImage = m.fileType?.startsWith('image') ||
      ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext);
    return { src, name, isImage, m };
  });

  return (
    <>
      {/* AnimatePresence enables the Lightbox to animate out when lightbox state becomes null */}
      <AnimatePresence>
        {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      {/* Page container — centred, max 4xl wide, with bottom padding so content clears the nav bar */}
      <div className="max-w-4xl mx-auto pb-10">
        {/* Breadcrumb — back link to the incident list plus the current incident ID */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-4 flex items-center gap-2 text-sm">
          <Link to="/layout/incidents" className="flex items-center gap-1 font-semibold hover:underline" style={{ color: typeColor }}>
            <BI name="arrow-left" /> {t('incidents.back')}
          </Link>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          {/* Show the raw incident ID for quick reference / copy-paste */}
          <span style={{ color: 'var(--text-tertiary)' }}>#{id}</span>
        </motion.div>

        {/* All main sections animate in together from slightly below */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* ── HERO HEADER ────────────────────────────────────────────────── */}
          {/* Left border colour matches the disaster type; overflow hidden clips the accent strip */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${typeColor}`, overflow: 'hidden' }} className="p-6">
            {/* Thin colour-gradient strip across the very top of the card (decorative) */}
            <div className="absolute inset-x-0 top-0 h-1 opacity-60" style={{ background: `linear-gradient(90deg, ${typeColor}, ${statusCfg.bg})` }} />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Type pill — e.g. "🔥 FIRE" — and the incident ID badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
                    style={{ background: `${typeColor}18`, color: typeColor }}>
                    <BI name={typeIcon} /> {t(`types.${incident.type}`, { defaultValue: incident.type })}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>#{id}</span>
                </div>

                {/* Incident title — the primary human-readable identifier of the event */}
                <h1 className="text-xl font-black mb-3 leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {incident.title}
                </h1>

                {/* Badges row — status badge, severity badge, and report timestamp */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status badge — background colour reflects current lifecycle stage */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black"
                    style={{ background: statusCfg.bg, color: statusCfg.text, boxShadow: `0 2px 8px ${statusCfg.glow}` }}>
                    <BI name={statusCfg.icon} />
                    {t(`status.${incident.status}`, { defaultValue: incident.status?.replace('_', ' ') })}
                  </span>
                  {/* Severity badge — glowing coloured pill ranging from green (LOW) to dark red (CRITICAL) */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white"
                    style={{ background: severityCfg.bg, boxShadow: `0 2px 8px ${severityCfg.glow}` }}>
                    <BI name="lightning-charge-fill" />
                    {t(`severity.${incident.severity}`, { defaultValue: incident.severity })}
                  </span>
                  {/* Report timestamp — when the citizen submitted the incident */}
                  {incident.createdAt && (
                    <span className="inline-flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--text-tertiary)' }}>
                      <BI name="clock" />
                      {new Date(incident.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Status updater dropdown — only rendered for roles in CAN_MANAGE */}
              {canManage && (
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('incidents.update_status')}</p>
                  {/* Dropdown background matches the current status colour for instant visual feedback */}
                  <select
                    value={incident.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    disabled={statusLoading} // Disabled while the PATCH request is in flight
                    className="px-3 py-2 rounded-xl text-sm font-bold cursor-pointer"
                    style={{ background: statusCfg.bg, color: statusCfg.text, border: 'none', outline: 'none', opacity: statusLoading ? 0.6 : 1 }}
                  >
                    {/* Enumerate all valid lifecycle transitions */}
                    {['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => (
                      <option key={s} value={s} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Incident description — the reporter's free-text account of the event */}
            {incident.description && (
              <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <p className="text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  <BI name="chat-left-text-fill" className="me-1" /> {t('incidents.description')}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {incident.description}
                </p>
              </div>
            )}
          </div>

          {/* ── AI EVIDENCE PANEL — admin/rescue only ──────────────────────── */}
          {/* Only rendered for roles that can act on incidents; hidden from citizens */}
          {canManage && (
            <AIEvidencePanel
              incident={incident}
              mediaItems={mediaItems}
              // Pass the browser's language code so the AI responds in the user's preferred language
              lang={navigator.language?.split('-')[0] || 'en'}
            />
          )}

          {/* ── MEDIA GALLERY — most important for rescue team ─────────────── */}
          {/* Only shown when the incident has at least one attached media file */}
          {mediaItems.length > 0 && (
            <div style={cardStyle} className="p-5">
              {/* Gallery section header with file count badge and a "field view" hint for rescue */}
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,122,0,0.12)' }}>
                  <BI name="images" style={{ color: '#FF7A00' }} />
                </div>
                {t('incidents.evidence_media')}
                {/* File count badge — helps managers know how many pieces of evidence are available */}
                <span className="ms-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,122,0,0.12)', color: '#FF7A00' }}>
                  {mediaItems.length} {t('incidents.files', { count: mediaItems.length })}
                </span>
                {/* "Field view" label visible only to on-the-ground rescue team members */}
                {isRescue && (
                  <span className="ms-auto text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(230,57,70,0.08)', color: '#E63946' }}>
                    <BI name="eye-fill" className="me-1" />{t('incidents.field_view')}
                  </span>
                )}
              </h3>

              {/* Responsive image grid — 1 column for single image, 2–3 for multiple */}
              {/* Images are large and clickable to open the full-screen Lightbox for field assessment */}
              <div className={`grid gap-3 ${mediaItems.length === 1 ? 'grid-cols-1' : mediaItems.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {mediaItems.map(({ src, name, isImage }, i) => (
                  <motion.div
                    key={i}
                    // Stagger each tile's entrance animation for a polished cascade effect
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
                    className="relative rounded-2xl overflow-hidden cursor-pointer group"
                    style={{
                      // Single image uses a wide cinematic ratio; multiple images use a square-ish ratio
                      aspectRatio: mediaItems.length === 1 ? '16/7' : '16/10',
                      background: 'var(--bg-tertiary)',
                      border: '2px solid var(--border-primary)',
                    }}
                    // Only open lightbox for images with a valid URL; non-image files link out instead
                    onClick={() => isImage && src && setLightbox({ src, alt: name })}
                  >
                    {isImage && src ? (
                      <>
                        {/* Evidence image — scale-up on hover via Tailwind group-hover utility */}
                        <img
                          src={src}
                          alt={name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={e => {
                            // If the CDN URL is broken, hide the img tag and show the fallback div
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback if image fails — shown when onError hides the img element */}
                        <div className="hidden w-full h-full flex-col items-center justify-center gap-2">
                          <BI name="image-fill" style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)' }} />
                          <p className="text-xs px-2 text-center" style={{ color: 'var(--text-tertiary)' }}>{name}</p>
                        </div>
                        {/* Hover overlay — semi-transparent black tint + fullscreen expand icon */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                            <BI name="arrows-fullscreen" style={{ color: 'white', fontSize: '1.2rem' }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Video / non-image media — renders a play button linking directly to the file */
                      <a href={src} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2">
                        {/* Orange play button circle consistent with the DMS colour system */}
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(255,122,0,0.12)' }}>
                          <BI name="play-btn-fill" style={{ fontSize: '2rem', color: '#FF7A00' }} />
                        </div>
                        {/* File name truncated to fit within the tile */}
                        <p className="text-xs font-semibold px-3 text-center truncate max-w-full"
                          style={{ color: 'var(--text-secondary)' }}>{name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,122,0,0.12)', color: '#FF7A00' }}>
                          Click to play
                        </span>
                      </a>
                    )}

                    {/* Gradient name label pinned to the bottom of each media tile */}
                    <div className="absolute bottom-0 inset-x-0 p-2"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                      <p className="text-white text-xs truncate font-medium">{name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Download strip — individual download links for each media file */}
              {mediaItems.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {mediaItems.map(({ src, name }, i) => (
                    // Each link triggers a browser download of the evidence file
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
          {/* Two-column grid on medium+ screens; stacks to single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Location card — address, city, GPS coordinates, interactive map, and navigation */}
            <div style={cardStyle} className="p-5">
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(230,57,70,0.12)' }}>
                  <BI name="geo-alt-fill" style={{ color: '#E63946' }} />
                </div>
                {t('incidents.location')}
              </h3>

              {/* Structured location fields — address, city, GPS */}
              <div className="space-y-1 mb-3">
                <InfoRow icon="map"       label={t('incidents.address')} value={incident.address}  color="#E63946" />
                <InfoRow icon="building"  label={t('incidents.city')}    value={incident.city}     color="#3b82f6" />
                {/* GPS coordinates formatted to 5 decimal places for field precision */}
                <InfoRow icon="crosshair" label="GPS"
                  value={incident.latitude && incident.longitude
                    ? `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}`
                    : null}
                  color="#059669" monospace />
                {/* Fallback message when no location data at all was provided by the reporter */}
                {!incident.latitude && !incident.longitude && !incident.address && (
                  <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
                    <BI name="exclamation-triangle" className="me-1" />{t('common.unknown_location')}
                  </p>
                )}
              </div>

              {/* Interactive Leaflet map centred on the incident's GPS coordinates */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
                <RouteMap
                  latitude={incident.latitude}
                  longitude={incident.longitude}
                  title={incident.title}
                  severity={incident.severity}
                  type={incident.type}
                  // Use the most descriptive location label available
                  locationName={incident.locationName || incident.address || incident.city}
                  height="200px"
                  interactive // Allows panning/zooming for detailed field assessment
                />
              </div>

              {/* One-tap Google Maps navigation link — critical for rescue teams en route to the scene */}
              {isRescue && incident.latitude && incident.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition"
                  style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 4px 16px rgba(230,57,70,0.3)' }}
                >
                  <BI name="navigation-fill" /> {t('incidents.navigate_to_scene')}
                </a>
              )}
            </div>

            {/* Reporter & assignment info card — who reported it and who is assigned */}
            <div style={cardStyle} className="p-5">
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <BI name="people-fill" style={{ color: '#3b82f6' }} />
                </div>
                {t('incidents.people')}
              </h3>

              {/* Person fields — reporter name, on-scene contact, assigned responder, timestamps */}
              <div className="space-y-1">
                {/* Name of the citizen who submitted the incident report */}
                <InfoRow icon="person-fill"       label={t('incidents.reported_by')}         value={incident.reporterName || incident.reportedByName} color="#3b82f6" />
                {/* On-scene contact person (may differ from the reporter) */}
                <InfoRow icon="telephone-fill"    label={t('incidents.contact_name')}         value={incident.contactName}  color="#059669" />
                {/* Phone number for the on-scene contact — used by rescue for direct calling */}
                <InfoRow icon="phone"             label={t('incidents.contact_phone')}        value={incident.contactPhone} color="#059669" />
                {/* Name of the responder currently assigned to handle this incident */}
                <InfoRow icon="person-badge-fill" label={t('incidents.assigned_responder')}   value={incident.assignedResponderName} color="#FF7A00" />
                {/* When the incident was originally reported */}
                <InfoRow icon="clock"             label={t('incidents.reported')} value={incident.createdAt ? new Date(incident.createdAt).toLocaleString() : null} color="#6b7280" />
                {/* Last updated timestamp — only shown when it differs from the created time */}
                {incident.updatedAt && incident.updatedAt !== incident.createdAt && (
                  <InfoRow icon="pencil-fill" label={t('incidents.last_updated')} value={new Date(incident.updatedAt).toLocaleString()} color="#6b7280" />
                )}
              </div>

              {/* One-tap phone call link — only shown to rescue/responder roles with a phone number */}
              {isRescue && incident.contactPhone && (
                <a href={`tel:${incident.contactPhone}`}
                  className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                  <BI name="telephone-fill" /> {t('incidents.call_reporter')}: {incident.contactPhone}
                </a>
              )}
            </div>
          </div>

          {/* ── RESCUE TEAM ACTIONS PANEL (only for RESCUE_TEAM / RESPONDER) ─ */}
          {/* Provides large, finger-friendly action buttons for field use on mobile devices */}
          {isRescue && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              // Amber left border visually differentiates this panel from the informational cards
              style={{ ...cardStyle, borderColor: 'rgba(245,158,11,0.4)', borderLeft: '4px solid #f59e0b' }}
              className="p-5"
            >
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <BI name="fire" style={{ color: '#f59e0b' }} />
                </div>
                {t('incidents.field_actions')}
                {/* Label to remind non-rescue staff that this panel is role-restricted */}
                <span className="ms-auto text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  {t('incidents.responder_only')}
                </span>
              </h3>

              {/* Quick-action grid — status transition buttons + navigate shortcut */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { status: 'IN_PROGRESS', label: t('incidents.mark_in_progress'), icon: 'play-circle-fill',  color: '#FF7A00' },
                  { status: 'RESOLVED',    label: t('incidents.mark_resolved'),    icon: 'check-circle-fill', color: '#059669' },
                  { status: 'CLOSED',      label: t('incidents.close_incident'),   icon: 'x-circle-fill',    color: '#6b7280' },
                ].map(({ status, label, icon, color }) => (
                  <motion.button
                    key={status}
                    whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                    // Disabled when already in this status or while a status request is pending
                    disabled={incident.status === status || statusLoading}
                    onClick={() => handleStatusChange(status)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                    // Active/current status button has a coloured tinted background and matching border
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

                {/* Navigate button — opens Google Maps directions to the incident coordinates */}
                {incident.latitude && incident.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(230,57,70,0.08)', border: '1.5px solid rgba(230,57,70,0.3)', color: '#E63946', textDecoration: 'none' }}
                  >
                    <BI name="navigation-fill" style={{ fontSize: '1.25rem', color: '#E63946' }} />
                    {t('incidents.navigate')}
                  </a>
                )}
              </div>

              {/* Critical severity alert — animated pulsing border to draw immediate attention */}
              {/* Only shown when a CRITICAL severity incident is still OPEN (not yet actioned) */}
              {incident.severity === 'CRITICAL' && incident.status === 'OPEN' && (
                <motion.div
                  // Oscillate border opacity to create a "heartbeat" urgency effect
                  animate={{ borderColor: ['rgba(230,57,70,0.4)', 'rgba(230,57,70,0.8)', 'rgba(230,57,70,0.4)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mt-3 p-3 rounded-xl flex items-center gap-2 text-xs font-bold"
                  style={{ background: 'rgba(230,57,70,0.08)', border: '2px solid rgba(230,57,70,0.4)', color: '#E63946' }}
                >
                  {/* Pulsing icon reinforces the urgency of the CRITICAL + OPEN state */}
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <BI name="exclamation-octagon-fill" style={{ fontSize: '1.1rem' }} />
                  </motion.div>
                  {t('incidents.critical_alert')}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── ADMIN DETAILS (extra audit metadata visible only to ADMIN role) ─── */}
          {/* Shows raw database IDs and ISO timestamps for audit and debugging purposes */}
          {user?.role === 'ADMIN' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              style={{ ...cardStyle, borderColor: 'rgba(230,57,70,0.3)' }} className="p-5"
            >
              <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BI name="shield-fill" style={{ color: '#E63946' }} /> {t('incidents.admin_details')}
              </h3>
              {/* Two-column grid of raw audit fields — ID, reporter user ID, created/updated ISO strings */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Incident ID',  value: incident.id             }, // Internal database PK
                  { label: 'Reporter ID',  value: incident.reportedById   }, // FK to the users table
                  { label: 'Created At',   value: incident.createdAt ? new Date(incident.createdAt).toISOString() : '-' },
                  { label: 'Updated At',   value: incident.updatedAt ? new Date(incident.updatedAt).toISOString() : '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    {/* Field label in muted colour */}
                    <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                    {/* Value in monospace for easy copy-pasting of IDs and timestamps */}
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