/**
 * ResourceForm.jsx — Create / Edit Resource Form for the DMS Admin Panel
 *
 * This page allows administrators to register new emergency resources (e.g.,
 * ambulances, fire trucks, shelters, hospitals) into the disaster management
 * system, or to update details of an existing resource. It supports both
 * CREATE and EDIT modes depending on whether a resource ID is present in the URL.
 *
 * Features:
 * - Dynamic form mode detection (create vs. edit) via React Router's useParams
 * - Pre-fills form fields when editing an existing resource
 * - Validates required fields (name, type) before submission
 * - Converts latitude/longitude strings to floats before sending to the API
 * - Displays success/error toast notifications via NotificationHub
 * - Animated page transitions using Framer Motion
 * - Fully internationalised via react-i18next (Arabic, English, French, Spanish, Turkish)
 * - Styled with DMS neon cyberpunk CSS variables (--bg-tertiary, --text-primary, etc.)
 */

// React core: useEffect for data fetching on mount, useState for controlled form state
import React, { useEffect, useState } from 'react';
// useParams: extracts the resource ID from the URL (e.g. /resources/edit/:id)
// useNavigate: programmatically redirects after successful save or cancel
import { useParams, useNavigate } from 'react-router-dom';
// motion: provides animated entry transitions for the form card and heading
import { motion } from 'framer-motion';
// useTranslation: provides the t() function for all user-facing strings (multilingual support)
import { useTranslation } from 'react-i18next';
// resourceAPI: encapsulates all REST calls to the DMS backend for resource CRUD operations
import { resourceAPI } from '../services/api';
// showNotification: triggers toast alerts in the global NotificationHub for success/error feedback
import { showNotification } from '../components/NotificationHub';

// Enumeration of all recognised emergency resource types in the DMS domain.
// These values must match the ResourceType enum defined in the Spring Boot backend.
const RESOURCE_TYPES = [
  'AMBULANCE',      // Mobile medical emergency response unit
  'FIRE_TRUCK',     // Firefighting vehicle
  'POLICE',         // Law enforcement unit
  'HELICOPTER',     // Aerial rescue/transport resource
  'RESCUE_TEAM',    // Ground search-and-rescue personnel team
  'MEDICAL_TEAM',   // On-site paramedic or field medical unit
  'HOSPITAL',       // Fixed medical facility
  'FIRE_STATION',   // Fire department base location
  'POLICE_STATION', // Police department base location
  'SHELTER',        // Civilian evacuation or emergency shelter
  'SUPPLY_CENTER',  // Distribution point for relief supplies and aid
];

// Shared inline style object for all text inputs, textareas, and selects in the form.
// Uses DMS CSS variables so the form automatically adapts to dark/light theme toggles.
const inputStyle = {
  width: '100%',
  padding: '0.6rem 1rem',
  borderRadius: 12,
  fontSize: '0.875rem',
  background: 'var(--bg-tertiary)',    // Matches the DMS dark card background
  color: 'var(--text-primary)',        // High-contrast text for readability
  border: '1px solid var(--border-input)', // Subtle border using the design system token
  outline: 'none',
};

// Shared style for all field labels — secondary text colour, small bold uppercase-like weight
const labelStyle = {
  color: 'var(--text-secondary)', // Muted label colour per DMS design system
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'block',
  marginBottom: 4, // Tight spacing between label and its input
};

/**
 * ResourceForm — React page component for creating or editing a DMS resource.
 *
 * Rendered at routes such as:
 *   /layout/resources/new       → CREATE mode (no :id param)
 *   /layout/resources/edit/:id  → EDIT mode (id param present)
 *
 * @returns {JSX.Element} The resource form page or a loading spinner.
 */
export default function ResourceForm() {
  // Extract the resource ID from the URL; undefined when creating a new resource
  const { id } = useParams();

  // navigate() is used to redirect to the resource list after save or cancel
  const navigate = useNavigate();

  // t() resolves i18n translation keys to the user's active language
  const { t } = useTranslation();

  // Derive form mode: true when editing an existing resource, false when creating a new one
  const isEdit = Boolean(id);

  // Controlled form state — mirrors the Resource entity fields sent to the backend API.
  // All fields start as empty strings; status defaults to AVAILABLE for new resources.
  const [formData, setFormData] = useState({
    name: '',         // Human-readable resource name (e.g. "Ambulance Unit 7")
    description: '',  // Optional free-text details about the resource's capabilities
    type: '',         // Must match one of the RESOURCE_TYPES enum values
    locationName: '', // Human-readable location label (e.g. "Central Hospital, Amman")
    latitude: '',     // Geographic latitude as a string; parsed to float before API call
    longitude: '',    // Geographic longitude as a string; parsed to float before API call
    status: 'AVAILABLE', // Operational status — defaults to available for new resources
  });

  // loading: true while the save API call is in-flight; disables the submit button
  const [loading, setLoading] = useState(false);

  // fetching: true while pre-loading an existing resource's data in edit mode;
  // shows a spinner instead of the empty form while data is being fetched
  const [fetching, setFetching] = useState(isEdit);

  /**
   * On mount (edit mode only): fetch the existing resource from the backend API
   * and populate the form fields so the admin can review and modify them.
   * Runs whenever the resource ID changes (e.g. navigating between edit pages).
   */
  useEffect(() => {
    if (isEdit) {
      // Request the resource by its ID; handles both wrapped { data: { data: ... } }
      // and flat { data: ... } response shapes from the DMS backend
      resourceAPI.getResourceById(id)
        .then(({ data }) => {
          // Unwrap nested data object if present (DMS API sometimes wraps responses)
          const r = data?.data || data;
          // Populate all form fields with the fetched resource values;
          // fall back to empty string to keep inputs controlled (never undefined)
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
        // Show an error toast if the resource cannot be loaded (e.g. 404, network error)
        .catch(() => showNotification(t('resources.load_failed'), 'error'))
        // Always stop the fetching spinner regardless of success or failure
        .finally(() => setFetching(false));
    }
  }, [id, isEdit]); // Re-run if the URL param changes (e.g. navigating to a different resource)

  /**
   * Generic controlled-input change handler — updates a single field in formData
   * by name attribute, preserving all other field values via spread.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>} e
   */
  const handleChange = (e) => {
    const { name, value } = e.target; // Extract field name and new value from the DOM event
    // Merge the updated field into existing form state without resetting other fields
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Form submission handler — validates, builds the API payload, and calls
   * the appropriate create or update endpoint on the DMS resource service.
   * Navigates to the resource list on success; shows an error toast on failure.
   *
   * @param {React.FormEvent<HTMLFormElement>} e
   */
  const handleSubmit = async (e) => {
    // Prevent the browser's default form POST — all data is sent via the API client
    e.preventDefault();
    setLoading(true); // Disable submit button to prevent duplicate submissions

    // Build the final payload: spread all string fields, then override lat/lng
    // with parsed floats (required by the backend's Resource entity) or null if empty
    const payload = {
      ...formData,
      latitude:  formData.latitude  ? parseFloat(formData.latitude)  : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    try {
      if (isEdit) {
        // PUT request: update an existing resource record by its ID
        await resourceAPI.updateResource(id, payload);
        // Notify the admin that the resource was successfully updated
        showNotification(t('resources.updated'), 'success');
      } else {
        // POST request: register a brand-new resource in the DMS database
        await resourceAPI.createResource(payload);
        // Notify the admin that the new resource was successfully created
        showNotification(t('resources.created'), 'success');
      }
      // Redirect to the resource list page after a successful save
      navigate('/layout/resources');
    } catch (err) {
      // Show the backend's error message if available, otherwise fall back to a generic key
      showNotification(err.response?.data?.message || t('resources.save_error'), 'error');
    } finally {
      // Re-enable the submit button regardless of outcome
      setLoading(false);
    }
  };

  // While the existing resource is being fetched in edit mode, render a centered spinner
  // to prevent the admin from seeing a blank/default form before data arrives
  if (fetching) {
    return (
      // Full-height centred flex container for the loading spinner
      <div className="flex items-center justify-center py-24">
        {/* Animated spinning ring using DMS brand red (#E63946) as the accent colour */}
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent"
          style={{ borderTopColor: '#E63946' }} />
      </div>
    );
  }

  // Main form layout: constrained to a readable max-width, centred on the page
  return (
    <div className="max-w-2xl mx-auto">
      {/* Page heading — fades and slides in from below using Framer Motion */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          {/* Dynamically renders "Edit Resource" or "New Resource" based on form mode */}
          {isEdit ? `✏️ ${t('resources.edit')}` : `+ ${t('resources.new')}`}
        </h1>
      </motion.div>

      {/* Form card — slight delay so the heading animates in first, then the card follows */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-disaster p-6" // card-disaster applies DMS neon-border card styles
      >
        {/* space-y-5 provides consistent vertical spacing between all form field groups */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Resource Name — required field; identifies the asset in dashboards and reports */}
          <div>
            <label style={labelStyle}>{t('resources.name')} *</label>
            <input type="text" name="name" required style={inputStyle}
              value={formData.name} onChange={handleChange} placeholder={t('resources.name_placeholder')} />
          </div>

          {/* Description — optional free-text notes (e.g. capacity, special equipment) */}
          <div>
            <label style={labelStyle}>{t('resources.description')}</label>
            {/* Vertically resizable textarea so admins can write longer descriptions */}
            <textarea name="description" rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              value={formData.description} onChange={handleChange}
              placeholder={t('resources.description_placeholder')} />
          </div>

          {/* Type and Status on a 2-column grid for compact layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Resource Type — required; categorises the resource for dispatch and filtering */}
            <div>
              <label style={labelStyle}>{t('resources.type')} *</label>
              <select name="type" required style={inputStyle}
                value={formData.type} onChange={handleChange}>
                {/* Default empty option prompts the admin to make an explicit selection */}
                <option value="">{t('common.select')}</option>
                {/* Render each DMS resource type; replace underscores for human-readable labels */}
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt} value={rt}>{rt.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Operational Status — controls whether the resource appears as dispatchable */}
            <div>
              <label style={labelStyle}>{t('resources.status')}</label>
              <select name="status" style={inputStyle}
                value={formData.status} onChange={handleChange}>
                {/* AVAILABLE: resource is ready to be assigned to an active incident */}
                <option value="AVAILABLE">{t('resources.status_available_label')}</option>
                {/* ASSIGNED: resource has been dispatched to a specific incident */}
                <option value="ASSIGNED">{t('resources.status_assigned')}</option>
                {/* BUSY: resource is in use but not formally assigned (e.g. in transit) */}
                <option value="BUSY">{t('resources.status_busy')}</option>
                {/* OFFLINE: resource is unavailable (maintenance, out of service, etc.) */}
                <option value="OFFLINE">{t('resources.status_offline')}</option>
              </select>
            </div>
          </div>

          {/* Human-readable location label — shown in resource lists and on the incident map */}
          <div>
            <label style={labelStyle}>{t('resources.location_name')}</label>
            <input type="text" name="locationName" style={inputStyle}
              value={formData.locationName} onChange={handleChange}
              placeholder={t('resources.location_placeholder')} />
          </div>

          {/* Geographic coordinates — 2-column grid; used to pin the resource on the map */}
          <div className="grid grid-cols-2 gap-4">
            {/* Latitude — decimal degrees; placeholder shows a sample coordinate near Amman, Jordan */}
            <div>
              <label style={labelStyle}>{t('resources.latitude')}</label>
              {/* step="any" allows full decimal precision without browser rounding */}
              <input type="number" name="latitude" step="any" style={inputStyle}
                value={formData.latitude} onChange={handleChange} placeholder="31.9539" />
            </div>

            {/* Longitude — decimal degrees; paired with latitude for geospatial positioning */}
            <div>
              <label style={labelStyle}>{t('resources.longitude')}</label>
              <input type="number" name="longitude" step="any" style={inputStyle}
                value={formData.longitude} onChange={handleChange} placeholder="35.9106" />
            </div>
          </div>

          {/* Form action buttons — Save (primary) and Cancel (secondary) side by side */}
          <div className="flex gap-3 pt-2">
            {/* Primary Save button — animated hover/tap scaling for tactile feedback;
                disabled while saving to prevent double-submission */}
            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 shadow-md"
              // DMS brand gradient from emergency red to alert orange
              style={{ background: 'linear-gradient(135deg, #E63946, #FF7A00)' }}
            >
              {/* Shows "Saving…" while the API call is in-flight, otherwise "Save" */}
              {loading ? t('common.saving') : t('common.save')}
            </motion.button>

            {/* Secondary Cancel button — navigates back to the resource list without saving */}
            <button
              type="button"
              onClick={() => navigate('/layout/resources')} // Return to resource management page
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
              // Neutral styling using DMS design tokens so it recedes behind the primary action
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