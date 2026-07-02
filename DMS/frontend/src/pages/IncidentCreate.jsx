import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { incidentAPI } from '../services/api';
import LocationPicker from '../components/maps/LocationPicker';
import { showNotification } from '../components/NotificationHub';
import { EmergencyTypeIcon } from '../components/EmergencyIcons';
import { verifyIncidentWithAI, fastPreCheck } from '../services/aiVerification';
import PhoneInput from '../components/PhoneInput';

/* ── Speech Recognition hook ─────────────────────────────────────────────── */
function useSpeechRecognition({ lang, onResult, onInterim, onError }) {
  const recogRef  = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) setSupported(true);
  }, []);

  const start = useCallback(async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) { onError?.('Speech recognition is not supported in this browser. Use Chrome or Edge.'); return; }

    // Explicitly request microphone permission so the browser prompts the user
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (permErr) {
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        onError?.('Microphone access denied. Please allow microphone access in your browser settings and try again.');
      } else {
        onError?.('No microphone found. Please connect a microphone and try again.');
      }
      return;
    }

    const recog = new SpeechRec();
    recog.lang = lang || 'en-US';
    recog.interimResults = true;   // live feedback while speaking
    recog.maxAlternatives = 1;
    recog.continuous = false;

    recog.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (const result of e.results) {
        if (result.isFinal) final   += result[0].transcript + ' ';
        else                interim += result[0].transcript;
      }
      if (interim) onInterim?.(interim);
      if (final)   onResult(final.trim());
    };

    recog.onend  = () => { setListening(false); onInterim?.(''); };
    recog.onerror = (ev) => {
      setListening(false);
      onInterim?.('');
      const MAP = {
        'not-allowed':   'Microphone access denied. Allow microphone in browser settings.',
        'audio-capture': 'No microphone detected. Please connect one and retry.',
        'network':       'Network error during speech recognition. Check your connection.',
        'no-speech':     'No speech detected. Please speak louder and try again.',
        'aborted':       '',  // user stopped — no message needed
      };
      const msg = MAP[ev.error] || `Microphone error: ${ev.error}`;
      if (msg) onError?.(msg);
    };

    try {
      recog.start();
      recogRef.current = recog;
      setListening(true);
    } catch (startErr) {
      onError?.('Could not start speech recognition. Please reload and try again.');
    }
  }, [lang, onResult, onInterim, onError]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

const SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TYPE_OPTIONS     = ['FIRE', 'FLOOD', 'EARTHQUAKE', 'STORM', 'ACCIDENT', 'MEDICAL', 'HAZMAT', 'OTHER'];

/* ── No legacy heuristic engine — real AI is used instead ─────────────────── */

const SEVERITY_BADGE = {
  LOW:      { bg: '#22c55e20', color: '#15803d', border: '#22c55e40' },
  MEDIUM:   { bg: '#f59e0b20', color: '#b45309', border: '#f59e0b40' },
  HIGH:     { bg: '#FF7A0020', color: '#c2410c', border: '#FF7A0040' },
  CRITICAL: { bg: '#E6394620', color: '#b91c1c', border: '#E6394640' },
};

/* lang map from i18n locale to BCP-47 for SpeechRecognition */
const LANG_MAP = { en: 'en-US', ar: 'ar-SA', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR' };

export default function IncidentCreate() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState({
    title: '', description: '', address: '', city: '',
    latitude: '', longitude: '', locationName: '',
    severity: 'MEDIUM', type: 'OTHER',
    contactName: '', contactPhone: '',
  });
  const [files,        setFiles]        = useState([]);
  const [previews,     setPreviews]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [verifying,    setVerifying]    = useState(false); // AI call in progress
  const [error,        setError]        = useState('');
  const [verified,     setVerified]     = useState(false); // user clicked "I confirm"
  const [showCheck,    setShowCheck]    = useState(false); // show verification panel
  const [checkResult,  setCheckResult]  = useState(null);
  const [aiError,      setAiError]      = useState('');
  const [micError,     setMicError]     = useState('');
  const [interimText,  setInterimText]  = useState('');

  const set = (name, val) => setForm(f => ({ ...f, [name]: val }));

  /* Speech recognition */
  const { listening, supported: micSupported, start: startMic, stop: stopMic } = useSpeechRecognition({
    lang: LANG_MAP[i18n.language] || 'en-US',
    onResult: (transcript) => {
      set('description', form.description ? form.description + ' ' + transcript : transcript);
      setVerified(false);
      setMicError('');
      setInterimText('');
    },
    onInterim: (text) => setInterimText(text),
    onError:   (msg)  => { setMicError(msg); setInterimText(''); },
  });

  const toggleMic = () => {
    setMicError('');
    if (listening) stopMic();
    else startMic();
  };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map(f => ({ name: f.name, url: URL.createObjectURL(f), type: f.type })));
  };

  /* Run real Claude AI verification */
  const handleVerify = useCallback(async () => {
    setAiError('');
    setVerified(false);

    const lang = i18n.language?.split('-')[0] || 'en';

    // Step 1: strict required-field check (ALL fields mandatory)
    const requiredIssues = [];
    if (!form.title?.trim())       requiredIssues.push('⚠ Title is required.');
    if (!form.description?.trim()) requiredIssues.push('⚠ Description is required.');
    if (!form.latitude || !form.longitude) requiredIssues.push('⚠ Location (GPS pin) is required — tap the map.');
    if (!form.address?.trim())     requiredIssues.push('⚠ Street address is required.');
    if (!form.city?.trim())        requiredIssues.push('⚠ City is required.');
    if (!form.contactName?.trim()) requiredIssues.push('⚠ Contact name is required.');
    if (!form.contactPhone?.trim() || form.contactPhone.length < 7) requiredIssues.push('⚠ Valid contact phone is required.');
    if (files.length === 0)        requiredIssues.push('⚠ At least one photo or video is required as evidence.');

    if (requiredIssues.length > 0) {
      setCheckResult({
        passed: false,
        score: 0,
        issues: requiredIssues,
        reasoning: 'Please complete all required fields before AI verification.',
        _source: 'precheck',
      });
      setShowCheck(true);
      return;
    }

    // Step 2: fast sync pre-check
    const pre = fastPreCheck({ ...form, latitude: form.latitude, longitude: form.longitude, lang });
    if (pre.blocked) {
      setCheckResult({
        passed: false,
        score: 0,
        issues: pre.reasons.map(r => r.text),
        reasoning: 'Submission blocked — required fields missing or invalid.',
        _source: 'precheck',
      });
      setShowCheck(true);
      return;
    }

    // Step 2: call Claude API
    setVerifying(true);
    setShowCheck(true);
    try {
      const imageFile = files.find(f => f.type.startsWith('image/')) || null;
      const lang = i18n.language?.split('-')[0] || 'en';
      const result = await verifyIncidentWithAI({
        title: form.title,
        description: form.description,
        type: form.type,
        severity: form.severity,
        imageFile,
        lang,
      });
      result._source = 'claude';
      setCheckResult(result);
      setVerified(result.passed === true);
    } catch (err) {
      const msg = err.message || 'AI verification unavailable. Please try again.';
      setAiError(msg);
      setCheckResult(null);
    } finally {
      setVerifying(false);
    }
  }, [form, files]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    /* Force verification before submit */
    if (!verified) {
      await handleVerify();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      const { data } = await incidentAPI.createIncident(payload);
      const incident = data?.data || data;

      if (files.length > 0 && incident?.id) {
        await Promise.allSettled(files.map(f => incidentAPI.uploadMedia(incident.id, f)));
      }

      showNotification(t('incidents.create_success'), 'success');
      navigate(`/layout/incidents/${incident.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || t('incidents.create_failed');
      setError(msg);
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' };
  const focusRed = e => { e.target.style.borderColor = '#E63946'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; };
  const blurGray = e => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; };

  const sectionStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    position: 'relative',
    overflow: 'hidden',
  };

  // neon top-line accent on each section
  const sectionAccentLine = (color = '#E63946') => ({
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
  });

  const sevBadge = SEVERITY_BADGE[form.severity] || SEVERITY_BADGE.MEDIUM;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Page header */}
      <motion.div className="mb-6" initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
        <div className="flex items-center gap-3 mb-1">
          <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 0 20px rgba(230,57,70,0.4)' }}
            animate={{ boxShadow: ['0 0 20px rgba(230,57,70,0.4)', '0 0 35px rgba(230,57,70,0.7)', '0 0 20px rgba(230,57,70,0.4)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}>
            <BI name="exclamation-triangle-fill" className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black leading-tight" style={{ color: 'var(--text-primary)', fontFamily:"'Rajdhani','Inter',sans-serif", letterSpacing:'0.03em' }}>
              {t('incidents.create_title')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {t('incidents.create_subtitle')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Warning banner */}
      <motion.div className="mb-5 p-4 rounded-2xl flex items-start gap-3"
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}
        style={{ background: 'rgba(230,57,70,0.05)', border: '1px solid rgba(230,57,70,0.25)', borderLeft: '3px solid #E63946' }}>
        <BI name="shield-exclamation" className="text-lg flex-shrink-0 mt-0.5" style={{ color: '#E63946' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#E63946' }}>{t('incidents.warning_title', 'Important:')}</strong>{' '}
          {t('incidents.warning_body', 'Filing a false emergency report is a criminal offence. All reports are timestamped, geolocated, and linked to your account. An AI verification step will review your report before dispatching emergency services.')}
        </p>
      </motion.div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', color: '#E63946' }}>
          <BI name="exclamation-octagon-fill" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── SECTION 1: Basic Info ─────────────────────────────────── */}
        <motion.div style={sectionStyle} className="p-5 space-y-4"
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
          <div style={sectionAccentLine('#3b82f6')} />
          <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'0.95rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>
            <span style={{ color: '#3b82f6', fontSize:'1rem' }}>⬡</span> {t('incidents.basic_info')}
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              {t('incidents.incident_title')} <span style={{ color: '#E63946' }}>*</span>
            </label>
            <input type="text" required className={inputCls} style={inputStyle}
              value={form.title}
              onChange={e => { set('title', e.target.value); setVerified(false); }}
              onFocus={focusRed} onBlur={blurGray}
              placeholder="e.g. Structure fire at 4-storey residential building" />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.description')}
              </label>
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  title={listening ? t('incidents.mic_stop') : t('incidents.mic_start')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: listening ? 'rgba(230,57,70,0.15)' : 'var(--bg-tertiary)',
                    border: `1.5px solid ${listening ? '#E63946' : 'var(--border-input)'}`,
                    color: listening ? '#E63946' : 'var(--text-secondary)',
                    animation: listening ? 'pulse 1.2s ease-in-out infinite' : 'none',
                  }}
                >
                  <BI name={listening ? 'stop-circle-fill' : 'mic-fill'} />
                  {listening ? t('incidents.mic_listening') : t('incidents.mic_start')}
                </button>
              )}
            </div>
            <textarea required rows={3} className={inputCls} style={{ ...inputStyle, resize: 'none' }}
              value={form.description}
              onChange={e => { set('description', e.target.value); setVerified(false); }}
              onFocus={focusRed} onBlur={blurGray}
              placeholder="Describe what you see: flames visible, floors affected, people trapped, smell of gas, etc." />
            {listening && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#E63946' }}>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" style={{ animation: 'pulse 1s infinite' }} />
                {t('incidents.mic_recording', 'Listening… speak now')}
              </p>
            )}
            {interimText && (
              <p className="text-xs mt-1 px-2 py-1 rounded-lg italic" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}>
                {interimText}…
              </p>
            )}
            {micError && (
              <div className="mt-1.5 px-3 py-2 rounded-lg flex items-start gap-2 text-xs"
                style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.25)', color: '#E63946' }}>
                <BI name="mic-mute-fill" className="flex-shrink-0 mt-0.5" />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* Severity + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.severity')} <span style={{ color: '#E63946' }}>*</span>
              </label>
              <select required value={form.severity}
                onChange={e => { set('severity', e.target.value); setVerified(false); }}
                className={inputCls} style={{ ...inputStyle, fontWeight: 700, color: sevBadge.color }}>
                {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{t(`severity.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.category')}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {TYPE_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { set('type', c); setVerified(false); }}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: form.type === c ? 'rgba(230,57,70,0.1)' : 'var(--bg-tertiary)',
                      border: `1.5px solid ${form.type === c ? '#E63946' : 'var(--border-input)'}`,
                      color: form.type === c ? '#E63946' : 'var(--text-secondary)',
                    }}
                  >
                    <EmergencyTypeIcon type={c} size={18} color={form.type === c ? '#E63946' : undefined} />
                    <span className="text-xs" style={{ fontSize: '0.6rem' }}>{t(`types.${c}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 2: Location ──────────────────────────────────── */}
        <motion.div style={sectionStyle} className="p-5 space-y-4"
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
          <div style={sectionAccentLine('#E63946')} />
          <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'0.95rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>
            <span style={{ color: '#E63946', fontSize:'1rem' }}>⬡</span> {t('incidents.location_section')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.address')}
              </label>
              <input type="text" className={inputCls} style={inputStyle}
                value={form.address}
                onChange={e => { set('address', e.target.value); setVerified(false); }}
                onFocus={focusRed} onBlur={blurGray}
                placeholder="Street address or landmark" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.city')}
              </label>
              <input type="text" className={inputCls} style={inputStyle}
                value={form.city}
                onChange={e => { set('city', e.target.value); setVerified(false); }}
                onFocus={focusRed} onBlur={blurGray}
                placeholder="City / District" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              <BI name="pin-map-fill" className="me-1" style={{ color: '#E63946' }} />
              {t('incidents.pick_on_map')}
            </label>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onLocationChange={(lat, lng) => { setForm(f => ({ ...f, latitude: lat, longitude: lng })); setVerified(false); }}
              height="280px"
            />
          </div>
          {form.latitude && form.longitude && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.25)', color: '#00c853' }}>
              <BI name="check-circle-fill" />
              {t('incidents.gps_set')}: {parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}
            </div>
          )}
        </motion.div>

        {/* ── SECTION 3: Contact ───────────────────────────────────── */}
        <motion.div style={sectionStyle} className="p-5 space-y-4"
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}>
          <div style={sectionAccentLine('#7c3aed')} />
          <h2 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'0.95rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>
            <BI name="telephone-fill" style={{ color: '#7c3aed' }} /> {t('incidents.contact_section')}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.contact_name')}
              </label>
              <input type="text" className={inputCls} style={inputStyle}
                value={form.contactName}
                onChange={e => { set('contactName', e.target.value); setVerified(false); }}
                onFocus={focusRed} onBlur={blurGray}
                placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {t('incidents.contact_phone')}
              </label>
              <PhoneInput
                value={form.contactPhone}
                onChange={v => { set('contactPhone', v); setVerified(false); }}
                latitude={form.latitude ? parseFloat(form.latitude) : null}
                longitude={form.longitude ? parseFloat(form.longitude) : null}
              />
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 4: Media ─────────────────────────────────────── */}
        <motion.div style={sectionStyle} className="p-5"
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <div style={sectionAccentLine('#FF7A00')} />
          <h2 className="text-sm font-black mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'0.95rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>
            <span style={{ color:'#FF7A00', fontSize:'1rem' }}>⬡</span> {t('incidents.media_section')}
          </h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
            <BI name="info-circle" className="me-1" />
            {t('incidents.upload_media_hint')}
          </p>
          <label
            className="block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition"
            style={{ borderColor: 'var(--border-input)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#E63946'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-input)'}>
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFiles} />
            <BI name="cloud-upload-fill" className="text-3xl mb-2 block" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('incidents.upload_hint')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('incidents.upload_types')}</p>
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
                  {p.type.startsWith('image') ? (
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                      <BI name="play-btn-fill" className="text-2xl" style={{ color: 'var(--text-tertiary)' }} />
                      <p className="text-xs truncate px-2" style={{ color: 'var(--text-tertiary)' }}>{p.name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── AI VERIFICATION PANEL ────────────────────────────────── */}
        <AnimatePresence>
          {showCheck && (
            <motion.div key="check" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              style={{
                ...sectionStyle,
                borderColor: verifying ? 'rgba(99,102,241,0.5)'
                  : aiError ? 'rgba(245,158,11,0.5)'
                  : checkResult?.passed ? 'rgba(0,200,83,0.5)'
                  : 'rgba(230,57,70,0.5)',
              }}
              className="p-5 space-y-4">
              <div style={sectionAccentLine(
                verifying ? '#6366f1' : aiError ? '#f59e0b' : checkResult?.passed ? '#00c853' : '#E63946'
              )} />

              {/* Panel title */}
              <div className="flex items-center justify-between">
                <h2 className="font-black flex items-center gap-2"
                  style={{ color:'var(--text-primary)', fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'0.95rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  <BI name="robot" style={{ color: verifying ? '#6366f1' : aiError ? '#f59e0b' : checkResult?.passed ? '#00c853' : '#E63946' }} />
                  {t('incidents.ai_check_title')}
                </h2>
                {!verifying && checkResult && (
                  <span style={{
                    fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700,
                    background: checkResult.passed ? 'rgba(0,200,83,0.12)' : 'rgba(230,57,70,0.12)',
                    color: checkResult.passed ? '#00c853' : '#E63946',
                    border: `1px solid ${checkResult.passed ? 'rgba(0,200,83,0.3)' : 'rgba(230,57,70,0.3)'}`,
                  }}>
                    {checkResult.passed ? `✓ ${t('incidents.ai_passed')}` : `✗ ${t('incidents.ai_blocked')}`}
                  </span>
                )}
              </div>

              {/* Loading */}
              {verifying && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'24px 0' }}>
                  <div style={{ position:'relative', width:52, height:52 }}>
                    <svg style={{ position:'absolute', inset:0, animation:'spin 0.8s linear infinite', color:'#6366f1' }} fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" style={{ opacity:0.2 }}/>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity:0.8 }}/>
                    </svg>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:'1.1rem' }}>🤖</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:'0.875rem', fontWeight:700, color:'#6366f1' }}>{t('incidents.ai_analyzing','AI is analyzing your report…')}</p>
                    <p style={{ fontSize:'0.75rem', color:'var(--text-tertiary)', marginTop:4 }}>{t('incidents.ai_analyzing_sub','Checking validity, content, and image…')}</p>
                  </div>
                </div>
              )}

              {/* API error */}
              {!verifying && aiError && (
                <div style={{ display:'flex', gap:8, padding:'10px 12px', borderRadius:10, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)', color:'#b45309', fontSize:'0.8rem' }}>
                  <BI name="exclamation-triangle-fill" className="flex-shrink-0 mt-0.5" />
                  <div><strong>{t('incidents.ai_unavailable','AI verification unavailable')}:</strong> {aiError}</div>
                </div>
              )}

              {/* Result */}
              {!verifying && !aiError && checkResult && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

                  {/* Score row */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-secondary)' }}>{t('incidents.ai_score','Credibility Score')}</span>
                      <span style={{ fontSize:'1.1rem', fontWeight:900, fontFamily:"'Rajdhani',monospace",
                        color: checkResult.score >= 70 ? '#00c853' : checkResult.score >= 50 ? '#FF7A00' : '#E63946',
                        textShadow: checkResult.score >= 70 ? '0 0 12px rgba(0,200,83,0.5)' : '0 0 12px rgba(230,57,70,0.5)' }}>
                        {checkResult.score}<span style={{ fontSize:'0.7rem', opacity:0.6 }}>/100</span>
                      </span>
                    </div>
                    <div style={{ height:6, borderRadius:3, background:'var(--bg-tertiary)', overflow:'hidden' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:`${checkResult.score}%` }} transition={{ duration:1, ease:'easeOut' }}
                        style={{ height:'100%', borderRadius:3,
                          background: checkResult.score >= 70 ? 'linear-gradient(90deg,#00c853,#69f0ae)'
                            : checkResult.score >= 50 ? 'linear-gradient(90deg,#FF7A00,#ffb300)'
                            : 'linear-gradient(90deg,#E63946,#ff6b6b)',
                          boxShadow: checkResult.score >= 70 ? '0 0 8px rgba(0,200,83,0.5)' : '0 0 8px rgba(230,57,70,0.5)',
                        }}/>
                    </div>
                  </div>

                  {/* Reasoning */}
                  {checkResult.reasoning && (
                    <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--bg-tertiary)', border:'1px solid var(--border-primary)', fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.55 }}>
                      <span style={{ fontWeight:700, color:'#6366f1' }}>🤖 </span>
                      {checkResult.reasoning}
                    </div>
                  )}

                  {/* Issues */}
                  {checkResult.issues?.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {checkResult.issues.map((iss, i) => (
                        <div key={i} style={{ display:'flex', gap:8, padding:'8px 12px', borderRadius:10,
                          background:'rgba(230,57,70,0.06)', border:'1px solid rgba(230,57,70,0.2)',
                          fontSize:'0.78rem', color:'#c0202d', lineHeight:1.5 }}>
                          <BI name="exclamation-triangle-fill" className="flex-shrink-0 mt-0.5" />
                          <span>{iss}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Image analysis — detailed */}
                  {checkResult.image_analysis && (
                    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border-primary)' }}>
                      <div style={{ padding:'8px 12px', background:'rgba(255,122,0,0.08)', borderBottom:'1px solid var(--border-primary)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:700, fontSize:'0.8rem', color:'#FF7A00' }}>
                          📷 {t('incidents.ai_image_analysis','Image Analysis')}
                        </span>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:700,
                          background: checkResult.image_analysis.image_passed ? 'rgba(0,200,83,0.12)' : 'rgba(230,57,70,0.12)',
                          color: checkResult.image_analysis.image_passed ? '#00c853' : '#E63946',
                          border: `1px solid ${checkResult.image_analysis.image_passed ? 'rgba(0,200,83,0.3)' : 'rgba(230,57,70,0.3)'}` }}>
                          {checkResult.image_analysis.image_passed ? '✓ Pass' : '✗ Fail'}
                          {checkResult.image_analysis.image_score != null && ` · ${checkResult.image_analysis.image_score}/100`}
                        </span>
                      </div>
                      <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                        {/* Description */}
                        {checkResult.image_analysis.image_notes && (
                          <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.55, margin:0 }}>
                            {checkResult.image_analysis.image_notes}
                          </p>
                        )}
                        {/* Detected elements */}
                        {checkResult.image_analysis.detected_elements?.length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {checkResult.image_analysis.detected_elements.map((el, i) => (
                              <span key={i} style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                                background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)',
                                color:'#00d4ff' }}>{el}</span>
                            ))}
                          </div>
                        )}
                        {/* Environment / Severity chips */}
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {checkResult.image_analysis.environment && checkResult.image_analysis.environment !== 'unknown' && (
                            <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>
                              📍 {checkResult.image_analysis.environment}
                            </span>
                          )}
                          {checkResult.image_analysis.severity_visible && checkResult.image_analysis.severity_visible !== 'unknown' && (
                            <span style={{ fontSize:11,
                              color: { critical:'#E63946', severe:'#FF7A00', moderate:'#f59e0b', minor:'#22c55e', none:'#6b7280' }[checkResult.image_analysis.severity_visible] || '#6b7280' }}>
                              ⚡ {checkResult.image_analysis.severity_visible}
                            </span>
                          )}
                        </div>
                        {/* Flags */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {[
                            { label: t('incidents.ai_image_authentic','Authentic'), val: checkResult.image_analysis.appears_authentic },
                            { label: t('incidents.ai_image_shows_emergency','Shows emergency'), val: checkResult.image_analysis.shows_emergency },
                            { label: t('incidents.ai_type_matches','Type match'), val: checkResult.image_analysis.matches_incident_type },
                          ].map(({ label, val }) => (
                            <div key={label} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:8,
                              background:'var(--bg-tertiary)', border:'1px solid var(--border-primary)', fontSize:'0.72rem' }}>
                              <span style={{ color: val ? '#00c853' : '#E63946' }}>{val ? '✓' : '✗'}</span>
                              <span style={{ color:'var(--text-secondary)' }}>{label}</span>
                            </div>
                          ))}
                        </div>
                        {/* Issues */}
                        {checkResult.image_analysis.image_issues?.map((iss, i) => (
                          <div key={i} style={{ fontSize:'0.75rem', color:'#FF7A00', display:'flex', gap:6 }}>
                            <span>⚠</span><span>{iss}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status flags grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[
                      { label: t('incidents.ai_type_matches','Type matches'), val: checkResult.type_matches_description },
                      { label: t('incidents.ai_actionable','Actionable details'), val: checkResult.has_actionable_details },
                      { label: t('incidents.ai_severity_ok','Severity ok'), val: checkResult.severity_appropriate },
                      { label: t('incidents.ai_is_fake','Not fake/test'), val: !checkResult.is_fake_or_test },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:8,
                        background:'var(--bg-tertiary)', border:`1px solid ${val ? 'rgba(0,200,83,0.2)' : 'rgba(230,57,70,0.2)'}`,
                        fontSize:'0.75rem' }}>
                        <BI name={val ? 'check-circle-fill' : 'x-circle-fill'} style={{ color: val ? '#00c853' : '#E63946', flexShrink:0 }} />
                        <span style={{ color:'var(--text-secondary)' }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Passed: confirm checkbox */}
                  {checkResult.passed && (
                    <div style={{ padding:'12px', borderRadius:10, background:'rgba(0,200,83,0.06)', border:'1px solid rgba(0,200,83,0.25)' }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#00c853', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                        <BI name="check-circle-fill" /> {t('incidents.ai_looks_credible')}
                      </div>
                      <label style={{ display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer' }}>
                        <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}
                          style={{ marginTop:2, accentColor:'#E63946', width:16, height:16, flexShrink:0 }} />
                        <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:1.55 }}>
                          {t('incidents.ai_confirm_label')}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ACTIONS ──────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
            style={{ border: '1.5px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#E63946'; e.currentTarget.style.color='#E63946'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-input)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
            <BI name="arrow-left" /> {t('incidents.cancel')}
          </button>

          {/* Verify button (before confirmed) */}
          {!verified && (
            <button type="button" onClick={handleVerify} disabled={verifying}
              className="flex-1 py-3 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
              {verifying ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Claude AI analyzing…
                </>
              ) : (
                <><BI name="robot" /> {t('incidents.verify_report')}</>
              )}
            </button>
          )}

          {/* Submit (only after confirmed) */}
          {verified && (
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="flex-1 py-3 rounded-xl text-white font-black disabled:opacity-60 shadow-md text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 4px 16px rgba(230,57,70,0.35)' }}>
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t('incidents.submitting')}
                </>
              ) : (
                <><BI name="send-fill" /> {t('incidents.submit')}</>
              )}
            </motion.button>
          )}
        </div>
      </form>
    </div>
  );
}
