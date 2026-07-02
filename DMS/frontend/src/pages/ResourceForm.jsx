import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { resourceAPI } from '../services/api';
import { showNotification } from '../components/NotificationHub';

const RESOURCE_TYPES = [
  'AMBULANCE', 'FIRE_TRUCK', 'POLICE', 'HELICOPTER',
  'RESCUE_TEAM', 'MEDICAL_TEAM', 'HOSPITAL', 'FIRE_STATION',
  'POLICE_STATION', 'SHELTER', 'SUPPLY_CENTER',
];

const inputStyle = {
  width: '100%',
  padding: '0.6rem 1rem',
  borderRadius: 12,
  fontSize: '0.875rem',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-input)',
  outline: 'none',
};

const labelStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'block',
  marginBottom: 4,
};

export default function ResourceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '', description: '', type: '', locationName: '',
    latitude: '', longitude: '', status: 'AVAILABLE',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      resourceAPI.getResourceById(id)
        .then(({ data }) => {
          const r = data?.data || data;
          setFormData({
            name:         r.name         || '',
            description:  r.description  || '',
            type:         r.type         || '',
            locationName: r.locationName || '',
            latitude:     r.latitude     || '',
            longitude:    r.longitude    || '',
            status:       r.status       || 'AVAILABLE',
          });
        })
        .catch(() => showNotification(t('resources.load_failed'), 'error'))
        .finally(() => setFetching(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...formData,
      latitude:  formData.latitude  ? parseFloat(formData.latitude)  : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };
    try {
      if (isEdit) {
        await resourceAPI.updateResource(id, payload);
        showNotification(t('resources.updated'), 'success');
      } else {
        await resourceAPI.createResource(payload);
        showNotification(t('resources.created'), 'success');
      }
      navigate('/layout/resources');
    } catch (err) {
      showNotification(err.response?.data?.message || t('resources.save_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent"
          style={{ borderTopColor: '#E63946' }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          {isEdit ? `✏️ ${t('resources.edit')}` : `+ ${t('resources.new')}`}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-disaster p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label style={labelStyle}>{t('resources.name')} *</label>
            <input type="text" name="name" required style={inputStyle}
              value={formData.name} onChange={handleChange} placeholder="e.g. Ambulance Unit 1" />
          </div>

          <div>
            <label style={labelStyle}>{t('resources.description')}</label>
            <textarea name="description" rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              value={formData.description} onChange={handleChange}
              placeholder="Short description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t('resources.type')} *</label>
              <select name="type" required style={inputStyle}
                value={formData.type} onChange={handleChange}>
                <option value="">{t('common.select')}</option>
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt} value={rt}>{rt.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('resources.status')}</label>
              <select name="status" style={inputStyle}
                value={formData.status} onChange={handleChange}>
                <option value="AVAILABLE">{t('resources.status_available_label')}</option>
                <option value="ASSIGNED">{t('resources.status_assigned')}</option>
                <option value="BUSY">{t('resources.status_busy')}</option>
                <option value="OFFLINE">{t('resources.status_offline')}</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('resources.location_name')}</label>
            <input type="text" name="locationName" style={inputStyle}
              value={formData.locationName} onChange={handleChange}
              placeholder="e.g. Central Station, Amman" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t('resources.latitude')}</label>
              <input type="number" name="latitude" step="any" style={inputStyle}
                value={formData.latitude} onChange={handleChange} placeholder="31.9539" />
            </div>
            <div>
              <label style={labelStyle}>{t('resources.longitude')}</label>
              <input type="number" name="longitude" step="any" style={inputStyle}
                value={formData.longitude} onChange={handleChange} placeholder="35.9106" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 shadow-md"
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              {loading ? t('common.saving') : t('common.save')}
            </motion.button>
            <button
              type="button"
              onClick={() => navigate('/layout/resources')}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
              style={{ border: '1px solid var(--border-input)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
