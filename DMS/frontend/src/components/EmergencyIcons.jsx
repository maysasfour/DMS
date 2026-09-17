/**
 * EmergencyIcons.jsx — Shared emergency type SVG icon library for the DMS frontend.
 *
 * Purpose:
 *   Provides a centralized set of inline SVG icons representing all recognized
 *   disaster/incident categories (FIRE, FLOOD, EARTHQUAKE, STORM, ACCIDENT,
 *   MEDICAL, HAZMAT, OTHER) as well as operational role and status icons
 *   (SHIELD, ALERT, AMBULANCE, RESPONDER, SHELTER, RESOURCE).
 *
 *   Using inline SVGs (rather than external image URLs or icon fonts) ensures
 *   that icons render correctly in offline/air-gapped deployments and within
 *   CSP-restricted environments — both common in disaster-response scenarios.
 *
 * Consumers:
 *   IncidentCreate, IncidentList, IncidentDetail, Dashboard, Sidebar, Splash, Alerts
 *
 * Exports:
 *   - EmergencyTypeIcon  — incident-type icon with optional badge wrapper
 *   - EmergencyIcon      — generic named icon (role/status icons)
 *   - typeColor          — utility that returns the brand hex color for an incident type
 *   - default (EmergencyTypeIcon)
 */

// React is required for JSX transformation — all icon components return JSX elements
import React from 'react';

/* ── Individual emergency icon paths ─────────────────────────────────────── */

/**
 * ICONS map: keys are uppercase incident/role type strings.
 * Each entry is a tiny functional component that accepts { size, color }
 * and returns a self-contained inline SVG element.
 * Keeping them as plain functions (not exported components) avoids polluting
 * the module's public API while still enabling composition inside EmergencyTypeIcon.
 */
const ICONS = {
  // FIRE icon — flame silhouette used on fire-type incident cards and map markers
  FIRE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Dual-flame path: outer flame body + inner highlight showing heat intensity */}
      <path d="M12 2c-.5 2.5-2 4.5-3.5 6C7 9.5 6 11.5 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2-5.5-3-6.5C14 8 12.5 6 12 2zm0 16c-2.2 0-4-1.8-4-4 0-1.5.7-2.9 2-4 .3 1 1 1.8 2 2.3.3-1 .7-2 1-3.3.7 1 1 2 1 3-.5-.3-1-.5-1-.5.3 1.8 1 3 1 4.5 0 1.1-.9 2-2 2z"/>
    </svg>
  ),

  // FLOOD icon — teardrop/water-drop silhouette used on flood-type incident markers
  FLOOD: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Water droplet with internal ripple detail indicating rising water levels */}
      <path d="M20 14c0-2.5-3-7-8-12C7 7 4 11.5 4 14c0 4.4 3.6 8 8 8s8-3.6 8-8zm-8 5.5c-3 0-5.5-2.5-5.5-5.5 0-.8.2-1.6.5-2.4.5.5 1.1.9 1.5 1.4C9 14 9 15 10 16c.5-1.5.5-3 .5-4.5C12 13 13 14.5 13 16c.5-.5 1-1.5 1-2.5.5.5.9 1.2 1.2 1.9.2.5.3 1.1.3 1.6 0 2.8-2.2 4.5-3.5 4.5z"/>
    </svg>
  ),

  // EARTHQUAKE icon — lightning-bolt/seismic-wave shape used on earthquake incident markers
  EARTHQUAKE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Dual zigzag bolt representing seismic shockwaves splitting left and right */}
      <path d="M11 2L2 12h5v10l4-6h-3l2-4H7L11 2zm2 0l4 10h-3l2 4h-3l4 6V12h5L13 2z"/>
    </svg>
  ),

  // STORM icon — cloud-with-lightning bolt used on storm/cyclone incident markers
  STORM: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Storm cloud body + inner lightning bolt indicating electrical storm events */}
      <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l1-4H7l5-8-1 4h4l-5 8z"/>
    </svg>
  ),

  // ACCIDENT icon — vehicle/car top-down silhouette used on road accident incident markers
  ACCIDENT: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Car body with two wheel circles; represents traffic accidents and vehicle collisions */}
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  ),

  // MEDICAL icon — first-aid cross on a square background used on medical emergency markers
  MEDICAL: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Hospital/clinic cross symbol indicating medical emergencies, injuries, and health crises */}
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
    </svg>
  ),

  // HAZMAT icon — hazardous-material warning flask/canister used on chemical/biological incident markers
  HAZMAT: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Containment vessel body with warning exclamation mark — represents chemical, biological,
          radiological, or nuclear (CBRN) incidents requiring specialist responders */}
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1zM10 18h4v1h-4z"/>
      {/* White exclamation mark overlaid on the vessel to signal danger/hazard warning */}
      <path d="M11 8v4h2V8h-2zm0 5v2h2v-2h-2z" fill="white"/>
    </svg>
  ),

  // OTHER icon — generic information/alert circle used when incident type is unknown or uncategorized
  OTHER: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Circled "i" / exclamation mark — fallback icon for unclassified or miscellaneous incidents */}
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  ),

  /* ── Role / status icons — used for responder profiles, resource panels, and system alerts ── */

  // SHIELD icon — security/authority badge used for admin or officer role indicators
  SHIELD: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Shield with checkmark inside — indicates verified, authorized, or protected responder status */}
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>
    </svg>
  ),

  // ALERT icon — notification bell used for system-wide alerts and push notifications to responders
  ALERT: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Bell silhouette with subscription dot at base — indicates active/pending DMS alert notifications */}
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  ),

  // AMBULANCE icon — emergency vehicle used for medical resource tracking and dispatch status
  AMBULANCE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Side-view ambulance with two wheels and a cross cabin panel — represents EMS units
          that can be assigned to medical incidents on the resource management panel */}
      <path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9l-3-3H3v11h1.5c0 1.66 1.34 3 3 3s3-1.34 3-3H15c0 1.66 1.34 3 3 3s3-1.34 3-3H22.5v-5l-3-3zm-9 8c-.83 0-1.5-.67-1.5-1.5S9.67 16 10.5 16s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9 10V8h2v2h2v2h-2v2H9v-2H7v-2h2z"/>
    </svg>
  ),

  // RESPONDER icon — person silhouette used for field responder and team member avatars
  RESPONDER: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Head + shoulders human figure — represents individual officers, volunteers, or team members
          assigned to an incident or shown on the responder roster */}
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),

  // SHELTER icon — house/home silhouette used to mark evacuation shelter locations on the incident map
  SHELTER: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Rooftop house shape — identifies designated emergency shelters and safe-zones for displaced civilians */}
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),

  // RESOURCE icon — truck/delivery vehicle used on the resource management and logistics panels
  RESOURCE: ({ size, color }) => (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
      {/* Cargo truck with two wheels — represents physical resources (vehicles, equipment, supplies)
          that can be allocated and tracked across active incidents */}
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-1.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
    </svg>
  ),
};

/**
 * TYPE_COLORS — maps each incident category to its DMS brand hex color.
 * These colors are used consistently across the map markers, incident cards,
 * badges, and chart legends to give dispatchers instant visual triage cues.
 * Changing a color here propagates everywhere EmergencyTypeIcon or typeColor() is used.
 */
const TYPE_COLORS = {
  FIRE:       '#E63946', // Red — high-danger, immediate attention
  FLOOD:      '#3b82f6', // Blue — water-related, reflects water color convention
  EARTHQUAKE: '#f59e0b', // Amber — ground hazard, structural risk
  STORM:      '#6366f1', // Indigo — atmospheric event
  ACCIDENT:   '#FF7A00', // Orange — traffic/mechanical, caution color
  MEDICAL:    '#10b981', // Emerald — health/medical, aligns with green-cross convention
  HAZMAT:     '#8b5cf6', // Purple — chemical/biological, non-standard to signal specialist risk
  OTHER:      '#64748b', // Slate — neutral fallback for uncategorized incidents
};

/**
 * TYPE_BG — translucent background tints (12% opacity) for each incident type.
 * Used as the badge container fill in EmergencyTypeIcon when badge=true.
 * Low opacity ensures the icon remains the visual focal point while still
 * providing color-coded context on dark or light panel backgrounds.
 */
const TYPE_BG = {
  FIRE:       'rgba(230,57,70,0.12)',   // Fire red tint
  FLOOD:      'rgba(59,130,246,0.12)',  // Flood blue tint
  EARTHQUAKE: 'rgba(245,158,11,0.12)', // Earthquake amber tint
  STORM:      'rgba(99,102,241,0.12)', // Storm indigo tint
  ACCIDENT:   'rgba(255,122,0,0.12)',  // Accident orange tint
  MEDICAL:    'rgba(16,185,129,0.12)', // Medical green tint
  HAZMAT:     'rgba(139,92,246,0.12)', // Hazmat purple tint
  OTHER:      'rgba(100,116,139,0.12)',// Other slate tint
};

/**
 * EmergencyTypeIcon — primary exported icon component for incident type display.
 *
 * Renders the SVG icon for a given disaster/incident category. When badge=true,
 * wraps the icon in a rounded square badge with the category's translucent tint,
 * useful for incident list rows, detail headers, and map popup cards.
 *
 * @param {string}  type      - Incident category key: FIRE | FLOOD | EARTHQUAKE |
 *                              STORM | ACCIDENT | MEDICAL | HAZMAT | OTHER
 *                              Defaults to 'OTHER' if omitted or unrecognized.
 * @param {number}  size      - Icon pixel size (width & height). Default: 20px.
 * @param {string}  color     - Override the icon fill color; falls back to TYPE_COLORS[type].
 * @param {boolean} badge     - If true, renders a rounded badge container behind the icon.
 * @param {number}  badgeSize - Badge container side length in px. Default: size * 1.8.
 */
export function EmergencyTypeIcon({ type = 'OTHER', size = 20, color, badge = false, badgeSize }) {
  // Normalize type to uppercase so callers can pass 'fire', 'Fire', or 'FIRE' interchangeably
  const t = (type || 'OTHER').toUpperCase();

  // Look up the SVG component for this type; fall back to the generic OTHER icon if unknown
  const IconComp = ICONS[t] || ICONS.OTHER;

  // Use the caller-supplied color override, or resolve from the canonical DMS palette
  const fillColor = color || TYPE_COLORS[t] || TYPE_COLORS.OTHER;

  // Calculate badge container size; 1.8× the icon size gives comfortable padding around the SVG
  const bs = badgeSize || Math.round(size * 1.8);

  // Plain icon — no badge wrapper needed (e.g., inline text labels, compact list items)
  if (!badge) {
    return <IconComp size={size} color={fillColor} />;
  }

  // Badge variant — used on incident detail headers, alert cards, and map popups
  return (
    <div
      // Flex container centers the SVG icon within the badge square
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: bs,
        height: bs,
        // Slightly rounded corners (28% of badge size) give a "squircle" appearance
        // consistent with the DMS neon-cyberpunk design system
        borderRadius: Math.round(bs * 0.28),
        // Translucent category-color tint as background; keeps dark-theme legibility
        background: TYPE_BG[t] || TYPE_BG.OTHER,
        // Subtle border using the category color at 19% opacity for visual separation
        border: `1.5px solid ${fillColor}30`,
      }}
    >
      {/* Render the incident-type SVG icon centered inside the badge */}
      <IconComp size={size} color={fillColor} />
    </div>
  );
}

/**
 * EmergencyIcon — generic named icon component for non-incident-type icons.
 *
 * Used for operational and UI icons such as shield (admin role), alert bell
 * (notifications), ambulance (EMS resource), responder (team member), shelter
 * (evacuation point), and resource (logistics/equipment).
 *
 * @param {string} name  - Icon key from ICONS map: SHIELD | ALERT | AMBULANCE |
 *                         RESPONDER | SHELTER | RESOURCE (also accepts incident types)
 * @param {number} size  - Icon pixel size. Default: 20px.
 * @param {string} color - Fill color; defaults to CSS 'currentColor' for theme inheritance.
 */
export function EmergencyIcon({ name = 'SHIELD', size = 20, color = 'currentColor' }) {
  // Normalize to uppercase and resolve component; fall back to OTHER if name is unrecognized
  const IconComp = ICONS[name.toUpperCase()] || ICONS.OTHER;
  // Render the icon directly — no badge wrapper for generic role/status icons
  return <IconComp size={size} color={color} />;
}

/**
 * typeColor — utility that returns the canonical DMS brand hex color for an incident type.
 *
 * Used outside of JSX contexts where only the color string is needed, such as:
 * - Chart.js dataset colors on the analytics dashboard
 * - Leaflet map marker fill colors on IncidentMap
 * - Programmatic CSS style generation in report exports
 *
 * @param  {string} type - Incident category key (case-insensitive). Defaults to 'OTHER'.
 * @returns {string}     - Hex color string, e.g. '#E63946'
 */
export function typeColor(type) {
  // Normalize and look up; returns OTHER's slate color for any unknown/null type
  return TYPE_COLORS[(type || 'OTHER').toUpperCase()] || TYPE_COLORS.OTHER;
}

// Default export is EmergencyTypeIcon — the most commonly used icon component across the DMS UI
export default EmergencyTypeIcon;