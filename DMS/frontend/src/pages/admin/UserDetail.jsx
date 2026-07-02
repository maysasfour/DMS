import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../../services/api';
import { showNotification } from '../../components/NotificationHub';

const ROLE_STYLE = {
  ADMIN:     { bg: 'rgba(230,57,70,0.12)',  color: '#E63946' },
  RESPONDER: { bg: 'rgba(255,122,0,0.12)',  color: '#FF7A00' },
  OFFICIAL:  { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  CITIZEN:   { bg: 'rgba(5,150,105,0.12)', color: '#059669' },
};

const ALL_ROLES = ['CITIZEN', 'RESPONDER', 'OFFICIAL', 'ADMIN'];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetchUser(); }, [id]);

  const fetchUser = async () => {
    try {
      const { data } = await userAPI.getUserById(id);
      const u = data?.data || data;
      setUser(u);
      setNewRole(u?.role || 'CITIZEN');
    } catch (_) {
      showNotification('Failed to load user', 'error');
      navigate('/layout/users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    setSaving(true);
    try {
      await userAPI.updateRole(id, newRole);
      setUser(u => ({ ...u, role: newRole }));
      showNotification('Role updated', 'success');
    } catch (_) {
      showNotification('Failed to update role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await userAPI.toggleActive(id);
      setUser(u => ({ ...u, active: !u.active }));
      showNotification('Status updated', 'success');
    } catch (_) {
      showNotification('Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent"
          style={{ borderTopColor: '#E63946' }} />
      </div>
    );
  }

  const rs = ROLE_STYLE[user?.role] || ROLE_STYLE.CITIZEN;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button
        onClick={() => navigate('/layout/users')}
        className="flex items-center gap-2 text-sm font-semibold hover:underline"
        style={{ color: '#E63946' }}
      >
        <i className="bi bi-arrow-left" /> Back to Users
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card-disaster p-6"
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: rs.bg, color: rs.color }}>
              {user?.role}
            </span>
          </div>
          <div className="ms-auto">
            <button
              onClick={handleToggleActive}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: user?.active !== false ? '#6b7280' : '#059669' }}
            >
              {user?.active !== false ? 'Disable Account' : 'Enable Account'}
            </button>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Email',   value: user?.email },
            { label: 'Phone',   value: user?.phoneNumber || '—' },
            { label: 'Status',  value: user?.active !== false ? 'Active' : 'Disabled' },
            { label: 'Joined',  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label}
              className="p-3 rounded-xl"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Role change */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Change Role</p>
          <div className="flex gap-2">
            <select
              value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-input)' }}
            >
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={handleRoleChange} disabled={saving || newRole === user?.role}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
