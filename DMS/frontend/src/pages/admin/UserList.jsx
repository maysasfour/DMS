import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../services/api';
import { showNotification } from '../../components/NotificationHub';

const BI = ({ name, className = '', style }) => <i className={`bi bi-${name} ${className}`} style={style} />;

const ROLES = ['CITIZEN', 'RESPONDER', 'RESCUE_TEAM', 'OFFICIAL', 'ADMIN'];

const ROLE_CFG = {
  ADMIN:       { color: '#E63946', bg: 'rgba(230,57,70,0.12)',  icon: 'shield-fill',   label: 'Admin'       },
  RESPONDER:   { color: '#FF7A00', bg: 'rgba(255,122,0,0.12)',  icon: 'activity',      label: 'Responder'   },
  RESCUE_TEAM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'fire',          label: 'Rescue Team' },
  OFFICIAL:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: 'briefcase-fill',label: 'Official'    },
  CITIZEN:     { color: '#059669', bg: 'rgba(5,150,105,0.12)',  icon: 'person-fill',   label: 'Citizen'     },
};

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '', role: 'CITIZEN' };

/* ── tiny helpers ── */
function Avatar({ user, size = 8 }) {
  const cfg = ROLE_CFG[user?.role] || ROLE_CFG.CITIZEN;
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)` }}>
      {user?.firstName?.[0]}{user?.lastName?.[0]}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.CITIZEN;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      <BI name={cfg.icon} style={{ fontSize: '0.6rem' }} /> {cfg.label}
    </span>
  );
}

/* ── Create / Edit modal ── */
function UserModal({ mode, user, onClose, onSave }) {
  const [form, setForm] = useState(
    mode === 'edit'
      ? { firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '',
          password: '', phoneNumber: user.phoneNumber || '', role: user.role || 'CITIZEN' }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim())  e.lastName  = 'Required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (mode === 'create' && form.password.length < 8) e.password = 'Min 8 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (mode === 'create') {
        await userAPI.createUser({ ...form, roles: [form.role] });
        showNotification(`✅ ${form.firstName} ${form.lastName} created as ${ROLE_CFG[form.role]?.label}`, 'success');
      } else {
        await userAPI.updateRole(user.id, form.role);
        showNotification(`Role updated to ${ROLE_CFG[form.role]?.label}`, 'success');
      }
      onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save user';
      showNotification(msg, 'error');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all';
  const inputStyle = (err) => ({
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
    border: `1.5px solid ${err ? '#E63946' : 'var(--border-input)'}`,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', }}>
          <div className="flex items-center gap-3">
            <BI name={mode === 'create' ? 'person-plus-fill' : 'pencil-fill'} className="text-white text-lg" />
            <h2 className="text-white font-black text-base">
              {mode === 'create' ? 'Create New User' : `Edit — ${user.firstName} ${user.lastName}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <BI name="x-lg" className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'create' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>First Name *</label>
                  <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                    className={inputCls} style={inputStyle(errors.firstName)} placeholder="John" />
                  {errors.firstName && <p className="text-xs mt-1 text-red-500">{errors.firstName}</p>}
                </div>
                {/* Last Name */}
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Last Name *</label>
                  <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                    className={inputCls} style={inputStyle(errors.lastName)} placeholder="Doe" />
                  {errors.lastName && <p className="text-xs mt-1 text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="envelope-fill" className="me-1" /> Email *
                </label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className={inputCls} style={inputStyle(errors.email)} placeholder="user@organization.com" />
                {errors.email && <p className="text-xs mt-1 text-red-500">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="lock-fill" className="me-1" /> Password * (min 8 chars)
                </label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  className={inputCls} style={inputStyle(errors.password)} placeholder="••••••••" />
                {errors.password && <p className="text-xs mt-1 text-red-500">{errors.password}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  <BI name="telephone-fill" className="me-1" /> Phone (optional)
                </label>
                <input type="tel" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}
                  className={inputCls} style={inputStyle(false)} placeholder="+966 5x xxx xxxx" />
              </div>
            </>
          )}

          {/* Role picker */}
          <div>
            <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              <BI name="person-badge-fill" className="me-1" /> Role *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map(role => {
                const cfg = ROLE_CFG[role];
                const active = form.role === role;
                return (
                  <button key={role} type="button" onClick={() => set('role', role)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? cfg.bg : 'var(--bg-tertiary)',
                      color: active ? cfg.color : 'var(--text-secondary)',
                      border: `2px solid ${active ? cfg.color : 'var(--border-input)'}`,
                      boxShadow: active ? `0 0 12px ${cfg.color}30` : 'none',
                    }}>
                    <BI name={cfg.icon} />
                    {cfg.label}
                    {active && <BI name="check-circle-fill" className="ms-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role description */}
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-secondary)' }}>
            <BI name="info-circle-fill" className="me-1" style={{ color: ROLE_CFG[form.role]?.color }} />
            {form.role === 'ADMIN'       && 'Full system access — can manage all users, incidents, and resources.'}
            {form.role === 'RESPONDER'   && 'Emergency responder — can manage and respond to assigned incidents.'}
            {form.role === 'RESCUE_TEAM' && 'Rescue team member — can view incidents and update rescue operations.'}
            {form.role === 'OFFICIAL'    && 'Government official — can view reports, resources, and incident data.'}
            {form.role === 'CITIZEN'     && 'Regular citizen — can report incidents and track their own submissions.'}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
              Cancel
            </button>
            <motion.button type="submit" disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 4px 14px rgba(230,57,70,0.35)' }}>
              {saving ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving…</>
              : <><BI name={mode === 'create' ? 'person-plus-fill' : 'check-lg'} /> {mode === 'create' ? 'Create User' : 'Save Changes'}</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Delete confirm modal ── */
function DeleteModal({ user, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(230,57,70,0.4)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(230,57,70,0.15)' }}>
          <BI name="trash3-fill" style={{ fontSize: '1.5rem', color: '#E63946' }} />
        </div>
        <h3 className="font-black text-base mb-1" style={{ color: 'var(--text-primary)' }}>Delete User?</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-tertiary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</strong> ({user.email}) will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
            Cancel
          </button>
          <button onClick={handle} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#E63946' }}>
            {loading ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <BI name="trash3-fill" />}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main page ── */
export default function UserList() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('ALL');
  const [statusFilter,setStatusFilter]= useState('ALL'); // ALL | ACTIVE | DISABLED
  const [modal,       setModal]       = useState(null);  // null | { type: 'create' | 'edit' | 'delete', user? }
  const [editingRole, setEditingRole] = useState({});    // { [id]: role }
  const [savingRole,  setSavingRole]  = useState({});    // { [id]: bool }

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.getAllUsers(page, 20);
      const paged = data?.data || data;
      setUsers(paged?.content || (Array.isArray(paged) ? paged : []));
      setTotalPages(paged?.totalPages || 1);
    } catch {
      showNotification('Failed to load users', 'error');
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (u) => {
    try {
      await userAPI.toggleActive(u.id);
      showNotification(`${u.firstName} ${u.active !== false ? 'disabled' : 'enabled'}`, u.active !== false ? 'warning' : 'success');
      fetchUsers();
    } catch { showNotification('Failed to update status', 'error'); }
  };

  const handleDeleteUser = async (u) => {
    try {
      await userAPI.deleteUser(u.id);
      showNotification(`${u.firstName} ${u.lastName} deleted`, 'success');
      fetchUsers();
      setModal(null);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handleInlineRoleSave = async (u) => {
    const newRole = editingRole[u.id];
    if (!newRole || newRole === u.role) return;
    setSavingRole(s => ({ ...s, [u.id]: true }));
    try {
      await userAPI.updateRole(u.id, newRole);
      showNotification(`${u.firstName}'s role changed to ${ROLE_CFG[newRole]?.label}`, 'success');
      fetchUsers();
    } catch { showNotification('Failed to update role', 'error'); }
    finally { setSavingRole(s => ({ ...s, [u.id]: false })); setEditingRole(e => { const n = {...e}; delete n[u.id]; return n; }); }
  };

  // Client-side filter
  const filtered = users.filter(u => {
    const matchRole   = roleFilter   === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.active !== false : u.active === false);
    const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchStatus && matchSearch;
  });

  // Stats
  const total    = users.length;
  const active   = users.filter(u => u.active !== false).length;
  const disabled = total - active;
  const roleCounts = Object.fromEntries(ROLES.map(r => [r, users.filter(u => u.role === r).length]));

  return (
    <div className="space-y-5 pb-8">

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'create' && (
          <UserModal mode="create" onClose={() => setModal(null)} onSave={fetchUsers} />
        )}
        {modal?.type === 'edit' && (
          <UserModal mode="edit" user={modal.user} onClose={() => setModal(null)} onSave={fetchUsers} />
        )}
        {modal?.type === 'delete' && (
          <DeleteModal user={modal.user} onClose={() => setModal(null)} onConfirm={() => handleDeleteUser(modal.user)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
              <BI name="database-fill" className="text-white" />
            </div>
            User Database
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Create and manage admin, staff, and citizen accounts
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)', boxShadow: '0 4px 14px rgba(230,57,70,0.35)' }}>
          <BI name="person-plus-fill" /> Add New User
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Total',    value: total,           color: '#6b7280' },
          { label: 'Active',   value: active,          color: '#059669' },
          { label: 'Disabled', value: disabled,        color: '#E63946' },
          { label: 'Admins',   value: roleCounts.ADMIN,       color: ROLE_CFG.ADMIN.color },
          { label: 'Officials',value: roleCounts.OFFICIAL,    color: ROLE_CFG.OFFICIAL.color },
          { label: 'Teams',    value: roleCounts.RESCUE_TEAM + roleCounts.RESPONDER, color: ROLE_CFG.RESCUE_TEAM.color },
          { label: 'Citizens', value: roleCounts.CITIZEN,     color: ROLE_CFG.CITIZEN.color },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-3 px-2 rounded-2xl"
            style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
            <span className="text-xl font-black" style={{ color }}>{value}</span>
            <span className="text-xs mt-0.5 text-center" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.07 }}
        className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <BI name="search" className="absolute start-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full ps-9 pe-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-input)' }} />
        </div>

        {/* Role filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['ALL', ...ROLES].map(role => {
            const cfg = ROLE_CFG[role];
            const active = roleFilter === role;
            return (
              <button key={role} onClick={() => setRoleFilter(role)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? (cfg?.color || '#6b7280') : 'var(--bg-tertiary)',
                  color:      active ? 'white' : 'var(--text-secondary)',
                  border:     `1px solid ${active ? (cfg?.color || '#6b7280') : 'var(--border-input)'}`,
                }}>
                {role === 'ALL' ? 'All Roles' : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[['ALL','All'], ['ACTIVE','Active'], ['DISABLED','Disabled']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: statusFilter === val ? (val === 'DISABLED' ? '#E63946' : val === 'ACTIVE' ? '#059669' : '#6b7280') : 'var(--bg-tertiary)',
                color:      statusFilter === val ? 'white' : 'var(--text-secondary)',
                border:     `1px solid ${statusFilter === val ? (val === 'DISABLED' ? '#E63946' : val === 'ACTIVE' ? '#059669' : '#6b7280') : 'var(--border-input)'}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-primary)' }}>
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-black uppercase tracking-wide"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <BI name="person-x" style={{ fontSize: '2.5rem', color: 'var(--text-tertiary)' }} />
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>No users found</p>
                        <button onClick={() => setModal({ type: 'create' })}
                          className="mt-4 px-4 py-2 rounded-xl text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}>
                          <BI name="person-plus-fill" className="me-1" /> Add First User
                        </button>
                      </td>
                    </tr>
                  ) : filtered.map((u, i) => {
                    const cfg      = ROLE_CFG[u.role] || ROLE_CFG.CITIZEN;
                    const isActive = u.active !== false;
                    const roleEditing = editingRole[u.id] !== undefined;
                    const currentRole = editingRole[u.id] ?? u.role;

                    return (
                      <motion.tr key={u.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.015 }}
                        className="group"
                        style={{ borderBottom: '1px solid var(--border-secondary)' }}
                      >
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <Avatar user={u} size={9} />
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                style={{ background: isActive ? '#059669' : '#6b7280', borderColor: 'var(--bg-secondary)' }} />
                            </div>
                            <div>
                              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                                {u.firstName} {u.lastName}
                              </p>
                              {u.phoneNumber && (
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{u.phoneNumber}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                        </td>

                        {/* Role — inline editable */}
                        <td className="px-4 py-3">
                          {roleEditing ? (
                            <div className="flex items-center gap-1.5">
                              <select value={currentRole}
                                onChange={e => setEditingRole(r => ({ ...r, [u.id]: e.target.value }))}
                                className="px-2 py-1 rounded-lg text-xs outline-none"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: `1.5px solid ${cfg.color}` }}>
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_CFG[r].label}</option>)}
                              </select>
                              <button onClick={() => handleInlineRoleSave(u)} disabled={savingRole[u.id]}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                                style={{ background: '#059669' }}>
                                {savingRole[u.id] ? '…' : <BI name="check-lg" />}
                              </button>
                              <button onClick={() => setEditingRole(e => { const n={...e}; delete n[u.id]; return n; })}
                                className="px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-input)' }}>
                                <BI name="x" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingRole(r => ({ ...r, [u.id]: u.role }))}
                              className="group/role flex items-center gap-1.5 transition-opacity"
                              title="Click to change role">
                              <RoleBadge role={u.role} />
                              <BI name="pencil-fill" className="text-xs opacity-0 group-hover/role:opacity-60 transition-opacity"
                                style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold"
                            style={{ color: isActive ? '#059669' : '#E63946' }}>
                            <BI name={isActive ? 'check-circle-fill' : 'x-circle-fill'} />
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/layout/users/${u.id}`}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80 flex items-center gap-1"
                              style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
                              <BI name="eye-fill" /> View
                            </Link>
                            <button onClick={() => handleToggleActive(u)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-80 flex items-center gap-1"
                              style={{ background: isActive ? '#6b7280' : '#059669' }}>
                              <BI name={isActive ? 'slash-circle' : 'check-circle'} />
                              {isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button onClick={() => setModal({ type: 'delete', user: u })}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-80 flex items-center gap-1"
                              style={{ background: '#E63946' }}>
                              <BI name="trash3-fill" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
            style={{ borderTop: '1px solid var(--border-secondary)', background: 'var(--bg-tertiary)' }}>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong> users
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
                  <BI name="chevron-left" /> Prev
                </button>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-input)' }}>
                  Next <BI name="chevron-right" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
