import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { alertAPI } from '../services/api';
import { useAlertStore } from '../store';

const TYPE_ICON = {
  INCIDENT_REPORTED: 'alert',
  INCIDENT_UPDATED: 'refresh',
  RESOURCE_ASSIGNED: 'truck',
  ASSIGNMENT: 'clipboard',
  ALERT: 'alert',
  SYSTEM: 'settings',
  GENERAL: 'bell',
};

const NotifSvg = ({ type }) => {
  const icons = {
    alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>,
    refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
    truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/></svg>,
  };
  return icons[TYPE_ICON[type]] || icons.bell;
};
const TYPE_COLOR = {
  INCIDENT_REPORTED: '#E63946', INCIDENT_UPDATED: '#FF7A00',
  RESOURCE_ASSIGNED: '#7c3aed', ASSIGNMENT: '#3b82f6',
  ALERT: '#E63946', SYSTEM: '#6b7280', GENERAL: '#059669',
};

export default function Notifications() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadCount, unreadCount } = useAlertStore();

  useEffect(() => {
    alertAPI.getAlerts({ page: 0, size: 100 })
      .then(({ data }) => {
        const inner = data?.data ?? data ?? [];
        const list = inner?.content ?? (Array.isArray(inner) ? inner : []);
        setAlerts(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await alertAPI.markAsRead(id).catch(() => {});
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true, read: true } : a));
    setUnreadCount(Math.max(0, (unreadCount || 1) - 1));
  };

  const markAllRead = async () => {
    await alertAPI.markAllAsRead().catch(() => {});
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true, read: true })));
    setUnreadCount(0);
  };

  const isUnread = (a) => !a.isRead && !a.read;
  const unread = alerts.filter(isUnread).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('notifications.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {unread} {t('notifications.unread')}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-semibold hover:underline"
            style={{ color: '#E63946' }}
          >
            {t('notifications.mark_all')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse h-20"
              style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 card-disaster">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"/></svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('notifications.none')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {alerts.map((alert) => {
              const unreadItem = isUnread(alert);
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  onClick={() => unreadItem && markRead(alert.id)}
                  className="rounded-2xl p-4 transition cursor-pointer"
                  style={{
                    background: unreadItem ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                    border: unreadItem
                      ? '1px solid rgba(230,57,70,0.3)'
                      : '1px solid var(--border-primary)',
                    boxShadow: unreadItem ? 'var(--shadow-sm)' : 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${TYPE_COLOR[alert.type] || '#6b7280'}20` }}
                    >
                      <NotifSvg type={alert.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm" style={{ color: unreadItem ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {alert.title}
                        </p>
                        {unreadItem && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#E63946' }} />
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {alert.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
