import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store';
import LangSwitcher from '../components/LangSwitcher';

const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;


function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(params.get('registered') === '1' ? t('auth.register_success') : '');
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Facebook SDK
  useEffect(() => {
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (!fbAppId) return;

    window.fbAsyncInit = function () {
      window.FB.init({ appId: fbAppId, cookie: true, xfbml: false, version: 'v19.0' });
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true; script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleOAuthLogin = async (provider, token) => {
    setLoading(true); setError('');
    try {
      const { data: body } = await authAPI.oauthLogin(provider, token);
      const userData = body?.data || body;
      const user = {
        id: userData.id, email: userData.email,
        firstName: userData.firstName, lastName: userData.lastName,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        role: Array.isArray(userData.roles) ? userData.roles[0].replace(/^ROLE_/, '') : 'CITIZEN',
        avatarUrl: userData.avatarUrl,
      };
      playSuccessSound();
      await login(user, userData.token);
      navigate('/layout/dashboard');
    } catch (err) {
      playErrorSound();
      setError(err.response?.data?.message || `${provider} login failed. Please try again.`);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data: body } = await authAPI.login(form.email, form.password);
      const userData = body?.data || body;
      const user = {
        id: userData.id, email: userData.email,
        firstName: userData.firstName, lastName: userData.lastName,
        role: (() => {
          const raw = Array.isArray(userData.roles) ? userData.roles[0] : (userData.role || 'CITIZEN');
          return typeof raw === 'string' ? raw.replace(/^ROLE_/, '') : raw;
        })(),
        avatarUrl: userData.avatarUrl,
      };
      playSuccessSound();
      await login(user, userData.token);
      navigate('/layout/dashboard');
    } catch (err) {
      playErrorSound();
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 429) setError(t('auth.rate_limit'));
      else if (status === 403) setError(t('auth.access_blocked'));
      else if (status === 401 || msg?.toLowerCase().includes('credentials') || msg?.toLowerCase().includes('password'))
        setError(t('auth.invalid_credentials'));
      else if (!err.response) setError(t('auth.no_server'));
      else setError(msg || t('auth.invalid_credentials'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" dir="ltr" style={{ fontFamily: "'Inter', sans-serif", background: 'var(--bg-primary)' }}>

      {/* ── LEFT PANEL — neon cyberpunk hero (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #000000 0%, #050505 50%, #0a0000 100%)' }}>

        {/* Hex grid */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
          <defs>
            <pattern id="hexlogin" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke="#E63946" strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexlogin)"/>
        </svg>

        {/* Scan beam */}
        <motion.div className="absolute left-0 right-0 pointer-events-none"
          style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)' }}
          animate={{ top: ['-2px', '100%'] }}
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
        />

        {/* Radar rings */}
        {[140, 260, 380].map((size, i) => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: size, height: size, top: '50%', left: '50%',
              marginTop: -size/2, marginLeft: -size/2, border: '1px solid rgba(230,57,70,0.15)' }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.9 }} />
        ))}

        {/* Corner brackets */}
        {[
          { top: 16, left: 16,  borderTop: '2px solid rgba(230,57,70,0.6)', borderLeft: '2px solid rgba(230,57,70,0.6)' },
          { top: 16, right: 16, borderTop: '2px solid rgba(230,57,70,0.6)', borderRight: '2px solid rgba(230,57,70,0.6)' },
          { bottom: 16, left: 16,  borderBottom: '2px solid rgba(230,57,70,0.6)', borderLeft: '2px solid rgba(230,57,70,0.6)' },
          { bottom: 16, right: 16, borderBottom: '2px solid rgba(230,57,70,0.6)', borderRight: '2px solid rgba(230,57,70,0.6)' },
        ].map((s, i) => (
          <motion.div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}/>
        ))}

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
              animate={{ boxShadow: ['0 0 20px rgba(230,57,70,0.5)', '0 0 40px rgba(230,57,70,0.8)', '0 0 20px rgba(230,57,70,0.5)'] }}
              transition={{ duration: 2, repeat: Infinity }}>
              <BI name="shield-exclamation" className="text-white text-lg" />
            </motion.div>
            <span className="text-white font-black text-xl" style={{ letterSpacing: '0.18em', textShadow: '0 0 20px rgba(230,57,70,0.5)' }}>DMS</span>
          </div>
          <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Disaster Management System
          </p>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="font-black text-white leading-none mb-3"
              style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontFamily: "'Rajdhani','Inter',sans-serif", letterSpacing: '0.06em' }}>
              PROTECT.<br />
              <motion.span style={{ color: '#E63946' }}
                animate={{ textShadow: ['0 0 20px rgba(230,57,70,0.5)', '0 0 40px rgba(230,57,70,0.9)', '0 0 20px rgba(230,57,70,0.5)'] }}
                transition={{ duration: 2, repeat: Infinity }}>
                RESPOND.
              </motion.span><br />
              RECOVER.
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: 280, margin: '1rem auto 0', lineHeight: 1.6 }}>
              Real-time emergency coordination for first responders, government officials, and citizens.
            </p>
          </motion.div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: 'Responders', value: '2,847+', icon: 'people-fill',    color: '#E63946' },
            { label: 'Response Rate', value: '94%', icon: 'graph-up-arrow', color: '#FF7A00' },
            { label: 'Incidents',  value: '15K+',  icon: 'clipboard-data',  color: '#00d4ff' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="text-center p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22` }}>
              <BI name={icon} className="text-lg block mb-1" style={{ color }} />
              <div className="text-white font-black text-sm" style={{ textShadow: `0 0 12px ${color}66` }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative min-h-screen"
        dir="auto"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #E63946, #FF7A00, #E63946)' }} />

        {/* ── Language switcher — always top-right regardless of RTL ── */}
        <div className="absolute top-4 right-4 z-50" dir="ltr">
          <LangSwitcher />
        </div>

        {/* ── Centered form card ── */}
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <BI name="shield-exclamation" className="text-white" />
            </div>
            <span className="font-black text-lg tracking-widest" style={{ color: 'var(--text-primary)' }}>DMS</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('auth.sign_in_title')}
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
              {t('auth.authorized_only')}
            </p>

            {/* Banners */}
            <AnimatePresence>
              {success && (
                <motion.div key="success"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669' }}>
                  <BI name="check-circle-fill" /> {success}
                </motion.div>
              )}
              {error && (
                <motion.div key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', color: '#E63946' }}>
                  <BI name="exclamation-octagon-fill" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  <BI name="envelope-fill" className="me-1" /> {t('auth.email_address')}
                </label>
                <input
                  ref={emailRef}
                  type="email" required autoComplete="username"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
                  placeholder={t('auth.email_placeholder')}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' }}
                  onFocus={(e) => e.target.style.borderColor = '#E63946'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-input)'}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> {t('auth.password_label')}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                    placeholder={t('auth.password_placeholder')}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pe-12"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' }}
                    onFocus={(e) => e.target.style.borderColor = '#E63946'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-input)'}
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <BI name={showPw ? 'eye-slash' : 'eye'} className="text-base" />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #E63946 0%, #c0392b 100%)', boxShadow: '0 4px 20px rgba(230,57,70,0.35)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('auth.authenticating')}
                  </>
                ) : (
                  <><BI name="box-arrow-in-right" className="text-base" /> {t('auth.login')}</>
                )}
              </motion.button>
            </form>

            {/* Social Login */}
            {(import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_FACEBOOK_APP_ID) && (
              <div className="mt-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: 'var(--border-input)' }} />
                  <span className="text-xs font-medium px-2" style={{ color: 'var(--text-tertiary)' }}>
                    {t('auth.or_continue_with', 'or continue with')}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-input)' }} />
                </div>
                <div className="flex flex-col gap-3">
                  {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={(resp) => handleOAuthLogin('google', resp.credential)}
                        onError={() => setError('Google login failed')}
                        useOneTap={false} theme="outline" size="large" width="320"
                        text="continue_with" shape="rectangular"
                      />
                    </div>
                  )}
                  {import.meta.env.VITE_FACEBOOK_APP_ID && (
                    <button type="button"
                      onClick={() => {
                        if (!window.FB) { setError(t('auth.facebook_sdk_error')); return; }
                        window.FB.login((resp) => {
                          if (resp.status === 'connected' && resp.authResponse?.accessToken)
                            handleOAuthLogin('facebook', resp.authResponse.accessToken);
                          else if (resp.status === 'not_authorized')
                            setError(t('auth.facebook_not_authorized'));
                          else setError(t('auth.facebook_login_failed'));
                        }, { scope: 'email,public_profile' });
                      }}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all"
                      style={{ background: '#1877F2', color: '#fff', boxShadow: '0 2px 8px rgba(24,119,242,0.35)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#166FE5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#1877F2'}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {t('auth.continue_facebook')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Staff portals */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                <BI name="building-lock" /> {t('auth.staff_portals', 'Staff Portals')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { to: '/admin-login',   label: t('auth.portal_admin', 'Admin'),   icon: 'shield-fill',    color: '#E63946' },
                  { to: '/team-login',    label: t('auth.portal_team', 'Team'),     icon: 'people-fill',    color: '#f59e0b' },
                  { to: '/officer-login', label: t('auth.portal_officer', 'Officer'), icon: 'briefcase-fill', color: '#7c3aed' },
                ].map(({ to, label, icon, color }) => (
                  <Link key={to} to={to}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all text-center"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${color}18`; }}
                  >
                    <BI name={icon} className="text-base" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <p className="text-center text-xs mt-5" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.new_to_dms')}{' '}
              <Link to="/register" className="font-bold hover:underline" style={{ color: '#E63946' }}>
                {t('auth.request_access')} <BI name="arrow-right" />
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
