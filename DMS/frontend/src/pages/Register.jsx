import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

const BI = ({ name, className = '' }) => <i className={`bi bi-${name} ${className}`} />;

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

const STRENGTH_LEVELS = [
  { key: 'strength_short', color: '#E63946', min: 0 },
  { key: 'strength_weak',  color: '#FF7A00', min: 6 },
  { key: 'strength_fair',  color: '#f59e0b', min: 8 },
  { key: 'strength_strong',color: '#059669', min: 10 },
];

function getStrength(pw) {
  if (!pw) return -1;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 6) return 0;
  if (score <= 1) return 1;
  if (score <= 3) return 2;
  return 3;
}

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError(t('auth.passwords_mismatch')); return; }
    if (!agreed) { setError(t('auth.terms_agree') + ' ' + t('auth.terms_link')); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.register({
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        password:  form.password,
        phoneNumber: form.phone || undefined,
      });
      playSuccessSound();
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.register_error'));
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.password);
  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' };
  const focusRed = (e) => (e.target.style.borderColor = '#E63946');
  const blurGray  = (e) => (e.target.style.borderColor = 'var(--border-input)');

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-2/5 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060d1a 0%, #0E2A47 60%, #1a1a2e 100%)' }}>
        <div className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=75&auto=format&fit=crop')" }} />
        <div className="absolute inset-0" style={{ background: 'rgba(6,13,26,0.7)' }} />
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 0 24px rgba(230,57,70,0.5)' }}>
              <BI name="shield-exclamation" className="text-white text-lg" />
            </div>
            <span className="text-white font-black text-xl" style={{ letterSpacing: '0.15em' }}>DMS</span>
          </div>
          <p className="text-white/40 text-xs tracking-widest uppercase">Disaster Management System</p>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-bold">{t('auth.why_register')}</p>
          {[
            { icon: 'geo-alt-fill',      key: 'why_location' },
            { icon: 'bell-fill',         key: 'why_alerts' },
            { icon: 'people-fill',       key: 'why_connect' },
            { icon: 'clipboard2-check',  key: 'why_track' },
          ].map(({ icon, key }) => (
            <div key={icon} className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.25)' }}>
                <BI name={icon} className="text-red-400 text-sm" />
              </div>
              <p className="text-white/60 text-sm leading-relaxed">{t(`auth.${key}`)}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 p-4 rounded-xl"
          style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)' }}>
          <p className="text-white/70 text-xs leading-relaxed">
            <BI name="shield-lock-fill" className="text-red-400 me-1" />
            Your data is protected under our emergency services data policy. Access is strictly controlled.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #E63946, #FF7A00, #E63946)' }} />

        <div className="w-full max-w-sm py-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <BI name="shield-exclamation" className="text-white" />
            </div>
            <span className="font-black text-lg tracking-widest" style={{ color: 'var(--text-primary)' }}>DMS</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{t('auth.create_account')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              {t('auth.register_subtitle')}
            </p>

            <AnimatePresence>
              {error && (
                <motion.div key="err"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.3)', color: '#E63946' }}>
                  <BI name="exclamation-octagon-fill" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    {t('auth.first_name')} <span style={{ color: '#E63946' }}>*</span>
                  </label>
                  <input type="text" name="firstName" required className={inputCls} style={inputStyle}
                    value={form.firstName} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.first_name')} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    {t('auth.last_name')} <span style={{ color: '#E63946' }}>*</span>
                  </label>
                  <input type="text" name="lastName" required className={inputCls} style={inputStyle}
                    value={form.lastName} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.last_name')} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="envelope-fill" className="me-1" /> {t('auth.email')} <span style={{ color: '#E63946' }}>*</span>
                </label>
                <input type="email" name="email" required className={inputCls} style={inputStyle}
                  value={form.email} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                  placeholder="your@email.com" autoComplete="email" />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="telephone-fill" className="me-1" /> {t('auth.phone')}
                </label>
                <input type="tel" name="phone" className={inputCls} style={inputStyle}
                  value={form.phone} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                  placeholder="+962 7X XXX XXXX" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> {t('auth.password')} <span style={{ color: '#E63946' }}>*</span>
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} name="password" required minLength={8}
                    className={`${inputCls} pe-12`} style={inputStyle}
                    value={form.password} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.password_placeholder')} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <BI name={showPw ? 'eye-slash' : 'eye'} />
                  </button>
                </div>
                {/* Strength bar */}
                {form.password.length > 0 && (
                  <div className="mt-1.5">
                    <div className="flex gap-1 mb-0.5">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: i <= strength ? STRENGTH_LEVELS[strength]?.color || '#059669' : 'var(--border-primary)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: STRENGTH_LEVELS[strength]?.color || '#6b7280' }}>
                      {t(`auth.${STRENGTH_LEVELS[strength]?.key}`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> {t('auth.confirm_password')} <span style={{ color: '#E63946' }}>*</span>
                </label>
                <div className="relative">
                  <input type={showCpw ? 'text' : 'password'} name="confirmPassword" required
                    className={`${inputCls} pe-12`} style={{
                      ...inputStyle,
                      borderColor: form.confirmPassword && form.password !== form.confirmPassword ? '#E63946' : 'var(--border-input)',
                    }}
                    value={form.confirmPassword} onChange={handleChange} onFocus={focusRed} onBlur={blurGray}
                    placeholder={t('auth.confirm_password')} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowCpw(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <BI name={showCpw ? 'eye-slash' : 'eye'} />
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#E63946' }}>
                    <BI name="x-circle-fill" className="me-1" /> {t('auth.passwords_no_match')}
                  </p>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-red-600 w-4 h-4 flex-shrink-0" />
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t('auth.terms_agree')}{' '}
                  <span className="font-semibold" style={{ color: '#E63946' }}>{t('auth.terms_link')}</span>{' '}
                  {t('auth.terms_note')}
                </span>
              </label>

              {/* Submit */}
              <motion.button
                type="submit" disabled={loading || !agreed}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #E63946, #c0392b)', boxShadow: '0 4px 20px rgba(230,57,70,0.3)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('auth.creating')}
                  </>
                ) : (
                  <><BI name="person-plus-fill" /> {t('auth.create_account')}</>
                )}
              </motion.button>
            </form>

            <p className="text-center text-xs mt-5" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.already_registered')}{' '}
              <Link to="/login" className="font-bold hover:underline" style={{ color: '#E63946' }}>
                {t('auth.login')} <BI name="arrow-right" />
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
