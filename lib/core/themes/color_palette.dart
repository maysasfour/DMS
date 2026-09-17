/// ---------------------------------------------------------------------------
/// color_palette.dart
///
/// Central color design token registry for the Disaster Management System (DMS)
/// mobile application. Defines all brand colors, role-specific palettes, semantic
/// status/severity colors, gradient presets, shadow utilities, and helper methods
/// used throughout the app's neon cyberpunk UI theme.
///
/// The palette enforces visual consistency across the four DMS user roles:
/// Admin, Responder, Citizen, and Official — each with a distinct hue that
/// signals authority level and context at a glance. Incident status and severity
/// colors follow an intuitive traffic-light convention to aid quick triage.
/// ---------------------------------------------------------------------------

// Flutter Material library — required for Color, LinearGradient, BoxShadow, etc.
import 'package:flutter/material.dart';
// DMS role enumeration — UserRole enum used to map typed roles to palette colors
import '../constants/roles.dart';

/// Singleton-style static color registry for the DMS app.
/// All values are compile-time constants (static const) for zero runtime cost.
/// No instances should be created; access everything via static members.
class ColorPalette {
  // ── Brand Identity ─────────────────────────────────────────────────────────
  // Core background colors that establish the dark space-blue aesthetic of the DMS app.

  /// Deepest background — used for root scaffolds, splash screens, and full-page backgrounds.
  static const Color brandDeep    = Color(0xFF0A0E27); // near-black space blue

  /// Mid-level background — used for drawers, bottom sheets, and secondary surfaces.
  static const Color brandMid     = Color(0xFF141832); // dark navy

  /// Card / container surface color — used as the base fill for incident cards, panels, dialogs.
  static const Color brandSurface = Color(0xFF1C2140); // card surface

  // ── Role primary palettes ──────────────────────────────────────────────────
  // Each DMS user role (Admin, Responder, Citizen, Official) has three color tiers:
  // primary (main accent), glow (semi-transparent for neon bloom effects), dark (pressed/shadow states).

  /// Admin role accent — electric blue used for admin dashboards, user-management UIs.
  static const Color adminPrimary      = Color(0xFF4F8EF7); // electric blue
  /// Semi-transparent admin blue for neon glow overlays and highlights.
  static const Color adminGlow         = Color(0x554F8EF7);
  /// Darker admin blue for pressed states, active borders, and depth shadows.
  static const Color adminDark         = Color(0xFF1A4DC9);

  /// Responder role accent — hot coral used for first-responder dashboards and alert actions.
  static const Color responderPrimary  = Color(0xFFFF5F3D); // hot coral
  /// Semi-transparent coral for responder glow effects on active incident cards.
  static const Color responderGlow     = Color(0x55FF5F3D);
  /// Dark coral for pressed/active responder UI elements.
  static const Color responderDark     = Color(0xFFC73A1A);

  /// Citizen role accent — neon mint used for the public reporting and citizen portal.
  static const Color citizenPrimary    = Color(0xFF00E5A0); // neon mint
  /// Semi-transparent mint for citizen glow overlays on report submission flows.
  static const Color citizenGlow       = Color(0x5500E5A0);
  /// Darker mint for citizen button pressed states and focused input borders.
  static const Color citizenDark       = Color(0xFF00A872);

  /// Official role accent — violet laser used for government/official-level portal views.
  static const Color officialPrimary   = Color(0xFFAB6FFF); // violet laser
  /// Semi-transparent violet for official glow effects on elevated decision panels.
  static const Color officialGlow      = Color(0x55AB6FFF);
  /// Dark violet for official button pressed/active states.
  static const Color officialDark      = Color(0xFF7A3FD4);

  // ── Global accent ──────────────────────────────────────────────────────────
  // Cross-role accent colors used for special highlights, warnings, and emergency cues.

  /// Warm amber — used for attention-grabbing notifications and resource shortage warnings.
  static const Color accentWarm        = Color(0xFFFF9500); // amber orange
  /// Cyan pulse — used for data feed indicators, connectivity status, and map ping effects.
  static const Color accentCyan        = Color(0xFF00D4FF); // cyan pulse
  /// Emergency pink — used for critical alert banners and SOS-level UI triggers.
  static const Color accentPink        = Color(0xFFFF2D78); // emergency pink

  // ── Semantic ───────────────────────────────────────────────────────────────
  // Standard status colors applied globally across all roles for consistent feedback.

  /// Indicates a successful operation (e.g., incident submitted, resource assigned).
  static const Color success  = Color(0xFF00E5A0);
  /// Cautions the user — used for pending actions or moderate incident severity.
  static const Color warning  = Color(0xFFFFB800);
  /// Signals a failure or error state (e.g., form validation failure, API error).
  static const Color error    = Color(0xFFFF3B5C);
  /// Informational highlight — used for tooltips, info badges, and helper text.
  static const Color info     = Color(0xFF4F8EF7);

  // ── Status chips ───────────────────────────────────────────────────────────
  // Colors for incident lifecycle status chips displayed on incident cards and detail screens.

  /// Incident has been filed but no action taken yet — neutral grey conveys inaction.
  static const Color reported     = Color(0xFF6B7280);
  /// Incident acknowledged by a responder or admin — blue signals attention.
  static const Color acknowledged = Color(0xFF4F8EF7);
  /// Responders are actively working the incident — amber conveys urgency in progress.
  static const Color inProgress   = Color(0xFFFFB800);
  /// Incident fully resolved — green signals successful closure.
  static const Color resolved     = Color(0xFF00E5A0);
  /// Incident archived/closed in the system — violet marks finalized records.
  static const Color closed       = Color(0xFFAB6FFF);

  // ── Severity ───────────────────────────────────────────────────────────────
  // Colors for incident severity badges — follows traffic-light + emergency escalation logic.

  /// Low severity — green indicates minimal threat; standard monitoring applies.
  static const Color severityLow      = Color(0xFF00E5A0);
  /// Medium severity — amber signals elevated concern; resource pre-positioning may be needed.
  static const Color severityMedium   = Color(0xFFFFB800);
  /// High severity — coral/orange indicates significant incident requiring immediate response.
  static const Color severityHigh     = Color(0xFFFF5F3D);
  /// Critical severity — emergency pink marks life-threatening or mass-casualty incidents.
  static const Color severityCritical = Color(0xFFFF2D78);

  // ── Neutral scale (dark-first) ─────────────────────────────────────────────
  // 11-step greyscale mapped to semantic uses across the dark-first DMS UI.

  /// Pure white — used for primary display text on dark backgrounds.
  static const Color neutral0   = Color(0xFFFFFFFF);
  /// Near-white with blue tint — used for secondary text and icon fills on dark cards.
  static const Color neutral50  = Color(0xFFF0F4FF);
  /// Light blue-grey — used for placeholder text, disabled labels, and dividers.
  static const Color neutral100 = Color(0xFFE0E8FF);
  /// Medium-light — used for inactive tab labels and secondary metadata.
  static const Color neutral200 = Color(0xFFC0CCEE);
  /// Mid grey — used for icon strokes and helper text at medium contrast.
  static const Color neutral300 = Color(0xFF8A96BB);
  /// Dark-mid grey — used for caption text and secondary borders.
  static const Color neutral400 = Color(0xFF606882);
  /// Dark grey — used for disabled control fills and muted backgrounds.
  static const Color neutral500 = Color(0xFF454C66);
  /// Deep grey — used for sidebar separators and elevated-card rims.
  static const Color neutral600 = Color(0xFF2E3450);
  /// Card surface equivalent — matches brandSurface for alias convenience.
  static const Color neutral700 = Color(0xFF1C2140);
  /// Dark navy equivalent — matches brandMid for alias convenience.
  static const Color neutral800 = Color(0xFF141832);
  /// Deepest background equivalent — matches brandDeep for alias convenience.
  static const Color neutral900 = Color(0xFF0A0E27);

  // ── Glass / overlay ────────────────────────────────────────────────────────
  // Semi-transparent white and black layers used for glassmorphism cards and modal scrims.

  /// Light frosted-glass overlay — used for card borders and shimmer highlights.
  static const Color glassLight  = Color(0x1AFFFFFF);
  /// Mid frosted-glass overlay — used for hovered/focused glass card fills.
  static const Color glassMid    = Color(0x33FFFFFF);
  /// Faint glass layer — used for subtle inner-glow strokes on hero widgets.
  static const Color glassDark   = Color(0x0DFFFFFF);
  /// Heavy dark scrim — covers background content behind modals and bottom sheets.
  static const Color overlayDark = Color(0xCC000000);

  // ── Gradients ─────────────────────────────────────────────────────────────
  // Pre-built LinearGradients for hero sections, role-colored buttons, and card backgrounds.

  /// Full-app hero gradient — sweeps from near-black to deep midnight blue for splash and home screens.
  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0A0E27), Color(0xFF1A1F45), Color(0xFF0D1533)],
  );

  /// Admin role gradient — dark-to-electric blue for admin action buttons and profile headers.
  static const LinearGradient adminGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A4DC9), Color(0xFF4F8EF7)],
  );

  /// Responder role gradient — dark coral to hot coral for responder CTAs and dashboard banners.
  static const LinearGradient responderGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFC73A1A), Color(0xFFFF5F3D)],
  );

  /// Citizen role gradient — deep mint to bright neon mint for citizen report buttons and banners.
  static const LinearGradient citizenGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF00A872), Color(0xFF00E5A0)],
  );

  /// Official role gradient — deep violet to bright violet for official portals and headers.
  static const LinearGradient officialGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF7A3FD4), Color(0xFFAB6FFF)],
  );

  /// Emergency gradient — pink to coral for critical alert banners, SOS prompts, and mass-casualty UIs.
  static const LinearGradient emergencyGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF2D78), Color(0xFFFF5F3D)],
  );

  /// Card background gradient — subtle dark-surface sweep used as the fill for incident and resource cards.
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1C2140), Color(0xFF141832)],
  );

  // ── Shadows ────────────────────────────────────────────────────────────────
  // Reusable shadow configurations for depth and the neon glow effect central to the DMS aesthetic.

  /// Generates a two-layer neon glow shadow in the given [color].
  /// Used to make role-colored buttons and active incident cards appear to emit light.
  /// [radius] controls the spread of the inner glow; outer layer is automatically doubled.
  static List<BoxShadow> glowShadow(Color color, {double radius = 20}) => [
    // Inner glow — strong opacity for tight halo directly beneath the element
    BoxShadow(color: color.withOpacity(0.4), blurRadius: radius, spreadRadius: 0),
    // Outer bloom — low opacity wide spread for ambient light effect
    BoxShadow(color: color.withOpacity(0.15), blurRadius: radius * 2, spreadRadius: 2),
  ];

  /// Small shadow — subtle depth lift for inline chips and minor UI elements.
  static const List<BoxShadow> shadowSm = [
    BoxShadow(color: Color(0x40000000), blurRadius: 4, offset: Offset(0, 2)),
  ];

  /// Medium shadow — standard depth for incident cards, resource tiles, and list items.
  static const List<BoxShadow> shadowMd = [
    BoxShadow(color: Color(0x50000000), blurRadius: 12, offset: Offset(0, 4)),
    BoxShadow(color: Color(0x20000000), blurRadius: 4, offset: Offset(0, 1)),
  ];

  /// Large shadow — deep elevation for modals, bottom sheets, and floating action elements.
  static const List<BoxShadow> shadowLg = [
    BoxShadow(color: Color(0x60000000), blurRadius: 24, offset: Offset(0, 8)),
    BoxShadow(color: Color(0x30000000), blurRadius: 8, offset: Offset(0, 2)),
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Utility methods that map runtime role/status/severity strings to the correct palette entry.
  // These enable dynamic theming across dashboards, profile screens, and incident detail views.

  /// Returns the primary accent color for the given string role name.
  /// Used when the role is a raw string (e.g., from API responses or shared preferences).
  /// Falls back to [citizenPrimary] for any unrecognized role value.
  static Color getPrimaryByRole(String role) {
    switch (role.toLowerCase()) {
      case 'admin':     return adminPrimary;
      case 'responder': return responderPrimary;
      case 'citizen':   return citizenPrimary;
      case 'official':  return officialPrimary;
      default:          return citizenPrimary; // safe fallback for unknown roles
    }
  }

  /// Returns the primary accent color for a typed [UserRole] enum value.
  /// Preferred over [getPrimaryByRole] when the role is already typed to avoid string errors.
  /// Falls back to [adminPrimary] when role is null (e.g., unauthenticated or loading states).
  static Color primaryByRoleEnum(UserRole? role) {
    switch (role) {
      case UserRole.admin:     return adminPrimary;
      case UserRole.responder: return responderPrimary;
      case UserRole.citizen:   return citizenPrimary;
      case UserRole.official:  return officialPrimary;
      default:                 return adminPrimary; // null-safe fallback
    }
  }

  /// Returns the role-matched [LinearGradient] for use in buttons, headers, and banners.
  /// Ensures visual consistency between the active user's role and their themed UI surfaces.
  /// Falls back to [citizenGradient] for unknown role strings.
  static LinearGradient gradientByRole(String role) {
    switch (role.toLowerCase()) {
      case 'admin':     return adminGradient;
      case 'responder': return responderGradient;
      case 'citizen':   return citizenGradient;
      case 'official':  return officialGradient;
      default:          return citizenGradient; // safe fallback for unknown roles
    }
  }

  /// Returns the semi-transparent glow color for the given role string.
  /// Used to apply neon bloom effects to role-specific buttons and active cards.
  /// Falls back to [citizenGlow] for unrecognized role names.
  static Color glowByRole(String role) {
    switch (role.toLowerCase()) {
      case 'admin':     return adminGlow;
      case 'responder': return responderGlow;
      case 'citizen':   return citizenGlow;
      case 'official':  return officialGlow;
      default:          return citizenGlow; // safe fallback for unknown roles
    }
  }

  /// Maps an incident status string to its corresponding status chip color.
  /// Used on incident list cards and detail screens to reflect the lifecycle stage.
  /// Falls back to [reported] (grey) for any unrecognized status value.
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'reported':     return reported;     // newly filed, no responder yet
      case 'acknowledged': return acknowledged; // responder has seen the incident
      case 'inprogress':   return inProgress;   // active response underway
      case 'resolved':     return resolved;     // incident successfully handled
      case 'closed':       return closed;       // archived and removed from active queue
      default:             return reported;     // default to reported for unknown statuses
    }
  }

  /// Maps an incident severity string to its corresponding severity badge color.
  /// Enables quick visual triage on incident maps, lists, and dashboards.
  /// Falls back to [severityMedium] when severity is unknown or missing from the payload.
  static Color getSeverityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'low':      return severityLow;      // minimal impact, standard monitoring
      case 'medium':   return severityMedium;   // elevated concern, watchlist
      case 'high':     return severityHigh;     // immediate response required
      case 'critical': return severityCritical; // mass-casualty or life-threatening event
      default:         return severityMedium;   // default to medium for unknown severities
    }
  }
}