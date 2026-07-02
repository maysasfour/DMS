import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { resourceAPI } from '../services/api';
import { useAuthStore } from '../store';
import { showNotification } from '../components/NotificationHub';
import ResourceMap from '../components/maps/ResourceMap';

const STATUS_COLOR = {
  AVAILABLE: '#059669', ASSIGNED: '#FF7A00', BUSY: '#E63946',
  OFFLINE: '#6b7280', DEPLOYED: '#FF7A00', OUT_OF_SERVICE: '#6b7280',
};
const TYPE_ICON = {
  AMBULANCE: '🚑', FIRE_TRUCK: '🚒', POLICE: '🚓', HELICOPTER: '🚁',
  RESCUE_TEAM: '👷', MEDICAL_TEAM: '⚕️', HOSPITAL: '🏥',
  FIRE_STATION: '🚒', POLICE_STATION: '🚓', SHELTER: '🏕️',
  SUPPLY_CENTER: '📦',
};

export default function ResourceList() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    try {
      const { data } = await resourceAPI.getResources({ page: 0, size: 100 });
      const inner = data?.data ?? data;
      const list = inner?.content ?? (Array.isArray(inner) ? inner : []);
      setResources(list);
    } catch (_) {
      showNotification(t('resources.load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('resources.confirm_delete'))) return;
    try {
      await resourceAPI.deleteResource(id);
      setResources(r => r.filter(x => x.id !== id));
      showNotification(t('resources.deleted'), 'success');
    } catch (_) {
      showNotification(t('resources.delete_failed'), 'error');
    }
  };

  const filtered = filterStatus
    ? resources.filter(r => r.status === filterStatus)
    : resources;

  const canEdit = ['ADMIN', 'RESPONDER', 'OFFICIAL'].includes(user?.role);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('resources.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {resources.length} {t('resources.total')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-input)' }}>
            {['grid', 'map'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-2 text-xs font-semibold transition"
                style={{
                  background: viewMode === mode ? '#E63946' : 'var(--bg-secondary)',
                  color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {mode === 'grid' ? `📋 ${t('resources.grid_view')}` : `🗺️ ${t('resources.map_view')}`}
              </button>
            ))}
          </div>
          {canEdit && (
            <Link
              to="/layout/resources/new"
              className="px-4 py-2 rounded-xl text-white font-semibold text-xs shadow-md"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              + {t('resources.new')}
            </Link>
          )}
        </div>
      </div>

      {/* Status filter (grid mode) */}
      {viewMode === 'grid' && (
        <div className="flex flex-wrap gap-2">
          {['', 'AVAILABLE', 'ASSIGNED', 'BUSY', 'OFFLINE'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={{
                background: filterStatus === s ? (STATUS_COLOR[s] || '#E63946') : 'var(--bg-tertiary)',
                color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-input)',
              }}
            >
              {s || t('common.all')}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl h-36 animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <ResourceMap facilities={resources} height="calc(100vh - 240px)" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card-disaster">
          <div className="text-4xl mb-3">🚑</div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('resources.none_found')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((resource, i) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-disaster p-5 flex flex-col"
              >
                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${STATUS_COLOR[resource.status] || '#6b7280'}20` }}
                  >
                    {TYPE_ICON[resource.type] || '📍'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {resource.name}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {resource.type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: STATUS_COLOR[resource.status] || '#6b7280' }}
                  >
                    {resource.status}
                  </span>
                  {resource.locationName && (
                    <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      📍 {resource.locationName}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-2 mt-auto pt-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                    <Link
                      to={`/layout/resources/${resource.id}`}
                      className="flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition"
                      style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
                    >
                      {t('resources.edit')}
                    </Link>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                      style={{ background: '#E63946' }}
                    >
                      {t('resources.delete')}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
