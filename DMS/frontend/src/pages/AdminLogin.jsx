import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { useAuthStore, useUIStore } from '../store';
import LangSwitcher from '../components/LangSwitcher';

const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;

const ALLOWED_ROLES = ['ADMIN'];

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data: body } = await authAPI.login(form.email, form.password);
      const userData = body?.data || body;
      const rawRole = Array.isArray(userData.roles) ? userData.roles[0] : (userData.role || '');
      const role = typeof rawRole === 'string' ? rawRole.replace(/^ROLE_/, '') : rawRole;

      if (!ALLOWED_ROLES.includes(role)) {
        setError(t('auth.access_denied_portal', 'Access denied. This portal is for Administrators only.'));
        setLoading(false);
        return;
      }

      const user = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role,
        avatarUrl: userData.avatarUrl,
      };
      await login(user, userData.token);
      navigate('/layout/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 401 || msg?.toLowerCase().includes('credentials')) {
        setError(t('auth.invalid_credentials'));
      } else if (status === 403) {
        setError(t('auth.access_blocked'));
      } else if (!err.response) {
        setError(t('auth.no_server'));
      } else {
        setError(msg || t('auth.invalid_credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" dir="ltr"
      style={{ background: 'linear-gradient(160deg, #000 0%, #0a0000 50%, #1a000a 100%)' }}>

      {/* Hex grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
        <defs>
          <pattern id="hex-admin" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 56,15 56,39 30,52 4,39 4,15" fill="none" stroke="#E63946" strokeWidth="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-admin)"/>
      </svg>

      {/* Scan beam */}
      <motion.div className="absolute left-0 right-0 pointer-events-none"
        style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(230,57,70,0.4), transparent)' }}
        animate={{ top: ['-2px', '100%'] }}
        transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
      />

      <div className="absolute top-4 right-4 z-50" dir="ltr"><LangSwitcher /></div>
      <div className="relative w-full max-w-md" dir="auto">
        {/* Top bar */}
        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #E63946, #FF7A00, #E63946)' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(230,57,70,0.25)', backdropFilter: 'blur(12px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 0 24px rgba(230,57,70,0.5)' }}>
              <BI name="shield-lock-fill" className="text-white text-xl" />
            </div>
            <div>
              <h1 className="font-black text-xl text-white leading-tight" style={{ letterSpacing: '0.05em' }}>
                {t('auth.admin_portal', 'Admin Portal')}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#E63946', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {t('auth.restricted_access', 'Restricted Access')}
              </p>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div key="err"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.35)', color: '#E63946' }}>
                <BI name="exclamation-octagon-fill" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <BI name="envelope-fill" className="me-1" /> {t('auth.email_address')}
              </label>
              <input
                ref={emailRef}
                type="email" required autoComplete="username"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
                placeholder="admin@organization.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1.5px solid rgba(230,57,70,0.25)' }}
                onFocus={(e) => e.target.style.borderColor = '#E63946'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(230,57,70,0.25)'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <BI name="lock-fill" className="me-1" /> {t('auth.password_label')}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pe-12"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1.5px solid rgba(230,57,70,0.25)' }}
                  onFocus={(e) => e.target.style.borderColor = '#E63946'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(230,57,70,0.25)'}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <BI name={showPw ? 'eye-slash' : 'eye'} className="text-base" />
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #E63946 0%, #c0392b 100%)', boxShadow: '0 4px 20px rgba(230,57,70,0.4)' }}
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
                <><BI name="shield-lock" className="text-base" /> {t('auth.access_system', 'Access System')}</>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Link to="/login" className="flex items-center gap-1 hover:text-white transition-colors">
              <BI name="arrow-left" /> {t('auth.citizen_login', 'Citizen Login')}
            </Link>
            <span className="flex items-center gap-1">
              <BI name="lock-fill" /> {t('auth.admin_only', 'Admin only')}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
