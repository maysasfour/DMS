/**
 * Shared emergency type SVG icon library.
 * All icons are inline SVG — no external URLs required.
 * Used on: IncidentCreate, IncidentList, IncidentDetail, Dashboard, Sidebar, Splash, Alerts
 */

import React from 'react';

/* ── Individual emergency icon paths ─────────────────────────────────────── */
const ICONS = {
  FIRE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M12 2c-.5 2.5-2 4.5-3.5 6C7 9.5 6 11.5 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2-5.5-3-6.5C14 8 12.5 6 12 2zm0 16c-2.2 0-4-1.8-4-4 0-1.5.7-2.9 2-4 .3 1 1 1.8 2 2.3.3-1 .7-2 1-3.3.7 1 1 2 1 3-.5-.3-1-.5-1-.5.3 1.8 1 3 1 4.5 0 1.1-.9 2-2 2z"/>
    </svg>
  ),
  FLOOD: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M20 14c0-2.5-3-7-8-12C7 7 4 11.5 4 14c0 4.4 3.6 8 8 8s8-3.6 8-8zm-8 5.5c-3 0-5.5-2.5-5.5-5.5 0-.8.2-1.6.5-2.4.5.5 1.1.9 1.5 1.4C9 14 9 15 10 16c.5-1.5.5-3 .5-4.5C12 13 13 14.5 13 16c.5-.5 1-1.5 1-2.5.5.5.9 1.2 1.2 1.9.2.5.3 1.1.3 1.6 0 2.8-2.2 4.5-3.5 4.5z"/>
    </svg>
  ),
  EARTHQUAKE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M11 2L2 12h5v10l4-6h-3l2-4H7L11 2zm2 0l4 10h-3l2 4h-3l4 6V12h5L13 2z"/>
    </svg>
  ),
  STORM: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l1-4H7l5-8-1 4h4l-5 8z"/>
    </svg>
  ),
  ACCIDENT: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  ),
  MEDICAL: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
    </svg>
  ),
  HAZMAT: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1zM10 18h4v1h-4z"/>
      <path d="M11 8v4h2V8h-2zm0 5v2h2v-2h-2z" fill="white"/>
    </svg>
  ),
  OTHER: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  ),
  /* Role / status icons */
  SHIELD: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>
    </svg>
  ),
  ALERT: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  ),
  AMBULANCE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9l-3-3H3v11h1.5c0 1.66 1.34 3 3 3s3-1.34 3-3H15c0 1.66 1.34 3 3 3s3-1.34 3-3H22.5v-5l-3-3zm-9 8c-.83 0-1.5-.67-1.5-1.5S9.67 16 10.5 16s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9 10V8h2v2h2v2h-2v2H9v-2H7v-2h2z"/>
    </svg>
  ),
  RESPONDER: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  SHELTER: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  RESOURCE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-1.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
    </svg>
  ),
};

const TYPE_COLORS = {
  FIRE:       '#E63946',
  FLOOD:      '#3b82f6',
  EARTHQUAKE: '#f59e0b',
  STORM:      '#6366f1',
  ACCIDENT:   '#FF7A00',
  MEDICAL:    '#10b981',
  HAZMAT:     '#8b5cf6',
  OTHER:      '#64748b',
};

const TYPE_BG = {
  FIRE:       'rgba(230,57,70,0.12)',
  FLOOD:      'rgba(59,130,246,0.12)',
  EARTHQUAKE: 'rgba(245,158,11,0.12)',
  STORM:      'rgba(99,102,241,0.12)',
  ACCIDENT:   'rgba(255,122,0,0.12)',
  MEDICAL:    'rgba(16,185,129,0.12)',
  HAZMAT:     'rgba(139,92,246,0.12)',
  OTHER:      'rgba(100,116,139,0.12)',
};

/**
 * Renders an emergency type icon with optional background badge.
 *
 * @param {string} type - FIRE | FLOOD | EARTHQUAKE | STORM | ACCIDENT | MEDICAL | HAZMAT | OTHER
 * @param {number} size - Icon pixel size (default 20)
 * @param {string} color - Override icon fill color
 * @param {boolean} badge - If true, wraps icon in a colored badge container
 * @param {number} badgeSize - Badge container size in px (default size * 1.8)
 */
export function EmergencyTypeIcon({ type = 'OTHER', size = 20, color, badge = false, badgeSize }) {
  const t = (type || 'OTHER').toUpperCase();
  const IconComp = ICONS[t] || ICONS.OTHER;
  const fillColor = color || TYPE_COLORS[t] || TYPE_COLORS.OTHER;
  const bs = badgeSize || Math.round(size * 1.8);

  if (!badge) {
    return <IconComp size={size} color={fillColor} />;
  }

  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: bs,
        height: bs,
        borderRadius: Math.round(bs * 0.28),
        background: TYPE_BG[t] || TYPE_BG.OTHER,
        border: `1.5px solid ${fillColor}30`,
      }}
    >
      <IconComp size={size} color={fillColor} />
    </div>
  );
}

/** Generic named icon (SHIELD, ALERT, AMBULANCE, RESPONDER, SHELTER, RESOURCE) */
export function EmergencyIcon({ name = 'SHIELD', size = 20, color = 'currentColor' }) {
  const IconComp = ICONS[name.toUpperCase()] || ICONS.OTHER;
  return <IconComp size={size} color={color} />;
}

/** Returns the brand color for a given incident type */
export function typeColor(type) {
  return TYPE_COLORS[(type || 'OTHER').toUpperCase()] || TYPE_COLORS.OTHER;
}

export default EmergencyTypeIcon;
