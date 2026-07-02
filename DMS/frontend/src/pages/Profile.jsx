import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store';
import { userAPI } from '../services/api';
import { showNotification } from '../components/NotificationHub';

const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

// ── Role config per account type ──────────────────────────────────────────────
const ROLE_CONFIG = {
  ADMIN: {
    accent: '#E63946', bg: 'rgba(230,57,70,0.1)', text: '#fca5a5',
    label: 'System Administrator', icon: 'shield-fill',
    description: 'Full system access — manage users, incidents, resources and system configuration.',
    capabilities: ['Manage all users & roles', 'View all incidents system-wide', 'Configure system settings', 'Access audit logs & reports', 'Manage resources & teams'],
  },
  RESCUE_TEAM: {
    accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: '#fcd34d',
    label: 'Rescue Team Officer', icon: 'fire',
    description: 'Field responder with real-time incident access and resource coordination.',
    capabilities: ['View & respond to active incidents', 'Update incident status on-site', 'Access resource & team assignments', 'View incident maps & media', 'Coordinate with dispatch'],
  },
  RESPONDER: {
    accent: '#FF7A00', bg: 'rgba(255,122,0,0.1)', text: '#fdba74',
    label: 'Emergency Responder', icon: 'activity',
    description: 'Emergency dispatch and field coordination for active incidents.',
    capabilities: ['Manage incident assignments', 'Update incident status', 'Allocate emergency resources', 'View all active incidents', 'Access team & resource maps'],
  },
  OFFICIAL: {
    accent: '#7c3aed', bg: 'rgba(124,58,237,0.1)', text: '#c4b5fd',
    label: 'Government Official', icon: 'building',
    description: 'Oversight and reporting access for government coordination.',
    capabilities: ['View all incident reports', 'Access analytics & trends', 'Generate official reports', 'Monitor resource utilization', 'View system-wide statistics'],
  },
  CITIZEN: {
    accent: '#059669', bg: 'rgba(5,150,105,0.1)', text: '#6ee7b7',
    label: 'Community Member', icon: 'person-circle',
    description: 'Report incidents and track your emergency reports.',
    capabilities: ['Submit incident reports', 'Track your own reports', 'Receive emergency alerts', 'View incident map', 'Get real-time notifications'],
  },
};

// ── Animated stat card ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="flex flex-col items-center gap-1 p-3 rounded-2xl flex-1"
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}
    >
      <BI name={icon} style={{ color, fontSize: '1.25rem' }} />
      <span className="text-lg font-black" style={{ color }}>{value}</span>
      <span className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </motion.div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const { t } = useTranslation();
  const role = user?.role || 'CITIZEN';
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.CITIZEN;

  const [formData, setFormData] = useState({
    firstName:   user?.firstName   || '',
    lastName:    user?.lastName    || '',
    email:       user?.email       || '',
    phoneNumber: user?.phoneNumber || '',
    // CITIZEN extras
    emergencyContactName:  user?.emergencyContactName  || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
    // RESCUE_TEAM / RESPONDER extras
    agency:           user?.agency           || '',
    certifications:   user?.certifications   || '',
    badgeNumber:      user?.badgeNumber      || '',
    vehicleType:      user?.vehicleType      || '',
    // OFFICIAL extras
    department:       user?.department       || '',
    jurisdiction:     user?.jurisdiction     || '',
    officialId:       user?.officialId       || '',
  });

  const [pwForm,    setPwForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { firstName: formData.firstName, lastName: formData.lastName, phoneNumber: formData.phoneNumber };
      // Role-specific fields
      if (role === 'CITIZEN')  Object.assign(payload, { emergencyContactName: formData.emergencyContactName, emergencyContactPhone: formData.emergencyContactPhone });
      if (role === 'RESCUE_TEAM' || role === 'RESPONDER') Object.assign(payload, { agency: formData.agency, certifications: formData.certifications, badgeNumber: formData.badgeNumber, vehicleType: formData.vehicleType });
      if (role === 'OFFICIAL') Object.assign(payload, { department: formData.department, jurisdiction: formData.jurisdiction, officialId: formData.officialId });

      const { data } = await userAPI.updateProfile(payload);
      const updated = data?.data || data;
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const merged = { ...stored, ...updated };
      localStorage.setItem('user', JSON.stringify(merged));
      setUser(merged);
      showNotification(t('profile.updated'), 'success');
    } catch (_) {
      showNotification(t('profile.error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showNotification(t('auth.passwords_no_match'), 'error'); return;
    }
    setPwLoading(true);
    try {
      await userAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      showNotification(t('profile.pw_changed'), 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPw(false);
    } catch (err) {
      showNotification(err.response?.data?.message || t('profile.pw_failed'), 'error');
    } finally {
      setPwLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all';
  const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' };
  const labelStyle = { color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const cardStyle  = { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 16, boxShadow: 'var(--shadow-sm)' };
  const focusRed   = e => (e.target.style.borderColor = cfg.accent);
  const blurGray   = e => (e.target.style.borderColor = 'var(--border-input)');

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  // Tabs per role
  const tabs = [
    { key: 'info',     label: 'Personal Info', icon: 'person-fill' },
    ...(role === 'CITIZEN'                        ? [{ key: 'emergency', label: 'Emergency Contact', icon: 'telephone-fill' }] : []),
    ...(role === 'RESCUE_TEAM' || role === 'RESPONDER' ? [{ key: 'field',     label: 'Field Info',       icon: 'activity'     }] : []),
    ...(role === 'OFFICIAL'                        ? [{ key: 'official',  label: 'Official Info',    icon: 'building'     }] : []),
    ...(role === 'ADMIN'                           ? [{ key: 'admin',     label: 'Admin Access',     icon: 'shield-fill'  }] : []),
    { key: 'security', label: 'Security',       icon: 'lock-fill' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-5">

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: `linear-gradient(135deg, ${cfg.accent}20, ${cfg.accent}08)`, border: `1px solid ${cfg.accent}30` }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${cfg.accent} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${cfg.accent} 0%, transparent 40%)`,
        }} />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}
            className="relative flex-shrink-0"
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl"
              style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}aa)`, boxShadow: `0 8px 32px ${cfg.accent}40` }}>
              {initials || <BI name="person-fill" />}
            </div>
            {/* Online dot */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ background: '#059669', borderColor: 'var(--bg-primary)' }}>
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: cfg.bg, color: cfg.accent }}>
              <BI name={cfg.icon} />
              {cfg.label}
            </span>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {cfg.description}
            </p>
          </div>
        </div>

        {/* Capability pills */}
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {cfg.capabilities.map((cap, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
            >
              <BI name="check-circle-fill" className="me-1" style={{ color: cfg.accent, fontSize: '0.65rem' }} />
              {cap}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto scrollbar-none"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: activeTab === tab.key ? cfg.accent : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.key ? `0 4px 12px ${cfg.accent}40` : 'none',
            }}
          >
            <BI name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          style={cardStyle} className="p-6"
        >

          {/* ── PERSONAL INFO ── */}
          {activeTab === 'info' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="person-fill" style={{ color: cfg.accent }} /> Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>{t('profile.first_name')}</label>
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.firstName} onChange={e => set('firstName', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.last_name')}</label>
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.lastName} onChange={e => set('lastName', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('profile.email')}</label>
                <input className={inputCls} style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  type="email" value={formData.email} disabled />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.phone')}</label>
                <input className={inputCls} style={inputStyle} type="tel"
                  value={formData.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder="+962 7X XXX XXXX" />
              </div>

              {/* Role info row */}
              <div className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: cfg.bg, border: `1px solid ${cfg.accent}30` }}>
                <BI name={cfg.icon} style={{ color: cfg.accent, fontSize: '1.5rem' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: cfg.accent }}>{cfg.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Account type cannot be changed here. Contact an administrator.</p>
                </div>
              </div>

              <motion.button type="submit" disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`, boxShadow: `0 4px 16px ${cfg.accent}30` }}>
                {isLoading ? <><BI name="arrow-repeat" className="me-2" style={{ animation: 'spin 1s linear infinite' }} />{t('profile.saving')}</> : <><BI name="check-lg" className="me-2" />{t('profile.save')}</>}
              </motion.button>
            </form>
          )}

          {/* ── CITIZEN: Emergency Contact ── */}
          {activeTab === 'emergency' && role === 'CITIZEN' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="telephone-fill" style={{ color: '#059669' }} /> Emergency Contact
              </h2>
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', color: '#059669' }}>
                <BI name="info-circle-fill" className="me-1.5" />
                This person will be contacted by emergency services if you are incapacitated and cannot communicate.
              </div>
              <div>
                <label style={labelStyle}>{t('profile.emergency_name')}</label>
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder="Full name of emergency contact" />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.emergency_phone')}</label>
                <input className={inputCls} style={inputStyle} type="tel"
                  value={formData.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder="+962 7X XXX XXXX" />
              </div>
              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                <BI name="check-lg" className="me-2" />{t('profile.save')}
              </motion.button>
            </form>
          )}

          {/* ── RESCUE_TEAM / RESPONDER: Field Info ── */}
          {activeTab === 'field' && (role === 'RESCUE_TEAM' || role === 'RESPONDER') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="activity" style={{ color: cfg.accent }} /> Field Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Agency / Unit</label>
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.agency} onChange={e => set('agency', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder="e.g. Civil Defense Unit 3" />
                </div>
                <div>
                  <label style={labelStyle}>Badge / ID Number</label>
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.badgeNumber} onChange={e => set('badgeNumber', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder="e.g. CD-4821" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Certifications</label>
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.certifications} onChange={e => set('certifications', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder="e.g. CPR, HAZMAT Level II, Paramedic, USAR" />
              </div>
              <div>
                <label style={labelStyle}>Vehicle / Equipment Type</label>
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.vehicleType} onChange={e => set('vehicleType', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder="e.g. Type-1 Fire Engine, Advanced Life Support" />
              </div>
              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`, boxShadow: `0 4px 16px ${cfg.accent}30` }}>
                <BI name="check-lg" className="me-2" />{t('profile.save')}
              </motion.button>
            </form>
          )}

          {/* ── OFFICIAL: Official Info ── */}
          {activeTab === 'official' && role === 'OFFICIAL' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="building" style={{ color: '#7c3aed' }} /> Official Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Department</label>
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.department} onChange={e => set('department', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder="e.g. Ministry of Interior" />
                </div>
                <div>
                  <label style={labelStyle}>Official ID</label>
                  <input className={inputCls} style={inputStyle} type="text"
                    value={formData.officialId} onChange={e => set('officialId', e.target.value)}
                    onFocus={focusRed} onBlur={blurGray} placeholder="Government ID number" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Jurisdiction / Area</label>
                <input className={inputCls} style={inputStyle} type="text"
                  value={formData.jurisdiction} onChange={e => set('jurisdiction', e.target.value)}
                  onFocus={focusRed} onBlur={blurGray} placeholder="e.g. Amman Governorate" />
              </div>
              <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                <BI name="check-lg" className="me-2" />{t('profile.save')}
              </motion.button>
            </form>
          )}

          {/* ── ADMIN: Access Overview ── */}
          {activeTab === 'admin' && role === 'ADMIN' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="shield-fill" style={{ color: '#E63946' }} /> Administrator Access
              </h2>
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.2)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#E63946' }}>Full System Privileges</p>
                {[
                  { icon: 'people-fill',     label: 'User Management',      desc: 'Create, edit, disable and assign roles to all users' },
                  { icon: 'exclamation-triangle-fill', label: 'Incident Control', desc: 'View, update, assign and close all incidents' },
                  { icon: 'graph-up-arrow',  label: 'Analytics Access',     desc: 'Full access to all dashboards and reports' },
                  { icon: 'gear-fill',       label: 'System Configuration', desc: 'Manage resources, teams, shelters, alerts' },
                  { icon: 'file-earmark-text-fill', label: 'Audit Logs',   desc: 'View complete system activity and audit trail' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 py-2" style={{ borderBottom: i < 4 ? '1px solid rgba(230,57,70,0.1)' : 'none' }}>
                    <BI name={item.icon} style={{ color: '#E63946', fontSize: '1rem', marginTop: 2 }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                <BI name="lock-fill" style={{ color: cfg.accent }} /> {t('profile.change_password')}
              </h2>
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                <BI name="info-circle-fill" className="me-1.5" />
                Use a strong password with at least 8 characters, including uppercase, numbers, and symbols.
              </div>
              {!showPw ? (
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPw(true)}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ border: `1.5px solid ${cfg.accent}`, color: cfg.accent, background: cfg.bg }}>
                  <BI name="pencil-fill" /> Change Password
                </motion.button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  {[
                    { name: 'currentPassword', label: t('profile.current_password'), placeholder: 'Current password' },
                    { name: 'newPassword',      label: t('profile.new_password'),     placeholder: 'New password (8+ chars)' },
                    { name: 'confirmPassword',  label: t('profile.confirm_password'), placeholder: 'Confirm new password' },
                  ].map(({ name, label, placeholder }) => (
                    <div key={name}>
                      <label style={labelStyle}>{label}</label>
                      <input className={inputCls} style={inputStyle} type="password" required
                        placeholder={placeholder}
                        value={pwForm[name]} onChange={e => setPwForm(p => ({ ...p, [name]: e.target.value }))}
                        onFocus={focusRed} onBlur={blurGray} />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowPw(false)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                      style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
                      {t('common.cancel')}
                    </button>
                    <motion.button type="submit" disabled={pwLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 py-2.5 rounded-xl text-white font-black disabled:opacity-60 text-sm"
                      style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)` }}>
                      {pwLoading ? t('common.loading') : t('profile.change_password')}
                    </motion.button>
                  </div>
                </form>
              )}

              {/* Account security info */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { icon: 'calendar-check', label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
                  { icon: 'clock-history',  label: 'Last Login',   value: 'Today' },
                  { icon: 'shield-check',   label: 'Security',     value: 'Password Auth' },
                  { icon: 'bell-fill',      label: 'Alerts',       value: 'Enabled' },
                ].map(({ icon, label, value }, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                    <BI name={icon} style={{ color: cfg.accent, fontSize: '1rem' }} />
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
