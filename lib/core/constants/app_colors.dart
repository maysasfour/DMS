/// app_colors.dart
/// ─────────────────────────────────────────────────────────────────────────────
/// Central color palette for the Disaster Management System (DMS) mobile app.
///
/// This file defines every color token used across the DMS UI — from brand
/// colors and semantic states to disaster-incident severity levels, incident
/// lifecycle statuses, and user-role badges. All values are pure `static const`
/// so they compile down to zero-overhead constants.
///
/// Usage: import and reference as `AppColors.primary`, `AppColors.critical`,
/// or call the helper methods `AppColors.severityColor()` /
/// `AppColors.statusColor()` / `AppColors.roleColor()` to map runtime strings
/// (coming from the backend API) to the correct color token.
/// ─────────────────────────────────────────────────────────────────────────────

// Flutter material library — required for Color and Colors constants
import 'package:flutter/material.dart';

// Project-level color palette primitives used as a shared reference baseline
import '../themes/color_palette.dart';

/// Unified color registry for the DMS application.
///
/// Organises colors into themed groups: brand identity, semantic feedback,
/// incident severity, incident lifecycle status, surface/background layers,
/// typography, borders, and user-role identity. Using a single class keeps
/// color decisions consistent across every screen — incident maps, alert
/// banners, resource cards, and user dashboards.
class AppColors {
  // ── Primary brand — clean professional red + blue ─────────────────────────

  /// Primary action color — Material Red 600.
  /// Used for CTA buttons, the app bar, and emergency alert highlights.
  /// Chosen as a universally understood "alert/danger/action" hue without
  /// crossing into the garish neon range used by other themes.
  static const primary   = Color(0xFFE53935); // Material Red 600 — clean, not neon

  /// Secondary brand color — Material Blue 600.
  /// Applied to informational elements, navigation indicators, and links
  /// inside the DMS (e.g. incident detail deep-links, map overlays).
  static const secondary = Color(0xFF1E88E5); // Material Blue 600

  /// Accent highlight color — Material Orange 700.
  /// Used sparingly for badges, tags, and call-out chips (e.g. resource
  /// availability count, unread notification dot).
  static const accent    = Color(0xFFF57C00); // Material Orange 700

  // ── Semantic ──────────────────────────────────────────────────────────────

  /// Positive outcome — Green 600.
  /// Displayed on successful form submissions, resource-assigned confirmations,
  /// and resolved-incident banners.
  static const success = Color(0xFF43A047); // Green 600

  /// Caution state — Orange 600.
  /// Used for warnings on partially-completed reports, low-battery resource
  /// alerts, or incidents awaiting further details.
  static const warning = Color(0xFFFB8C00); // Orange 600

  /// Informational state — Light Blue 600.
  /// Applied to info toasts, help tips, and non-urgent system notifications
  /// within the DMS dashboard.
  static const info    = Color(0xFF039BE5); // Light Blue 600

  /// Danger color — reuses primary red to signal destructive or emergency actions
  /// (e.g. "Delete Incident", "Force-Close Resource").
  static const danger  = Color(0xFFE53935);

  /// Validation error color — same red as danger; shown on form fields,
  /// API error snack-bars, and failed report submissions.
  static const error   = Color(0xFFE53935);

  // ── Severity ──────────────────────────────────────────────────────────────
  // These four tokens map directly to the backend IncidentSeverity enum
  // (LOW / MEDIUM / HIGH / CRITICAL) so the mobile UI mirrors the web portal.

  /// LOW severity — green; minimal immediate risk to life or property.
  static const low      = Color(0xFF43A047);

  /// MEDIUM severity — orange; requires monitoring and possible dispatch.
  static const medium   = Color(0xFFFB8C00);

  /// HIGH severity — red; active threat, responders should be en-route.
  static const high     = Color(0xFFEF5350);

  /// CRITICAL severity — deep red (Red 900); mass-casualty or catastrophic
  /// disaster event requiring immediate coordinated response.
  static const critical = Color(0xFFB71C1C);

  // ── Status ────────────────────────────────────────────────────────────────
  // Maps to the backend IncidentStatus enum lifecycle:
  //   REPORTED → IN_PROGRESS → RESOLVED → CLOSED

  /// REPORTED status — blue; citizen has submitted the incident, awaiting triage.
  static const reported   = Color(0xFF1E88E5);

  /// IN_PROGRESS status — orange; responders are actively working the incident.
  static const inProgress = Color(0xFFFB8C00);

  /// RESOLVED status — green; incident has been contained and signed off.
  static const resolved   = Color(0xFF43A047);

  /// CLOSED status — grey; incident archived, no further action required.
  static const closed     = Color(0xFF757575);

  // ── Dark backgrounds — deep navy, not pure black ──────────────────────────
  // Dark-mode surface hierarchy: bgDark < bgSurface/cardDark < cardGlass.
  // Navy tones reduce eye strain during night-time disaster response operations.

  /// Root dark-mode background — Slate 900; deepest layer behind all content.
  static const bgDark     = Color(0xFF0F172A); // Slate 900

  /// Elevated dark surface — Slate 800; used for side-panels, modal sheets,
  /// and the incident-detail card backdrop.
  static const bgSurface  = Color(0xFF1E293B); // Slate 800

  /// Dark card background — same as bgSurface; alias kept for semantic clarity
  /// when styling individual resource or incident cards.
  static const cardDark   = Color(0xFF1E293B);

  /// Glass/frosted dark card — Slate 700; applied to translucent overlays on
  /// the incident map and the resource-availability grid.
  static const cardGlass  = Color(0xFF334155); // Slate 700

  // ── Light backgrounds — warm white, not harsh ────────────────────────────

  /// Root light-mode background — Slate 50; soft off-white reduces glare
  /// for field responders using the app in bright outdoor conditions.
  static const bgLight      = Color(0xFFF8FAFC); // Slate 50

  /// Pure white card surface for light mode — used on standard list tiles
  /// and form containers in the incident-reporting flow.
  static const cardLight    = Colors.white;

  /// Secondary light surface — Slate 100; applied to alternating rows,
  /// section headers, and filter chip backgrounds in light mode.
  static const surfaceLight = Color(0xFFF1F5F9); // Slate 100

  // ── Text ──────────────────────────────────────────────────────────────────

  /// Primary text on dark backgrounds — near-white Slate 50 for maximum
  /// legibility when reading incident titles and alert messages at night.
  static const textPrimary   = Color(0xFFF8FAFC);

  /// Subdued text on dark surfaces — Slate 400; used for timestamps,
  /// metadata labels, and secondary incident details.
  static const textSecondary = Color(0xFF94A3B8); // Slate 400

  /// Primary text for light-mode screens — dark navy Slate 800 ensures
  /// WCAG AA contrast on white and off-white backgrounds.
  static const textLight     = Color(0xFF1E293B);

  /// Placeholder / disabled text — Slate 500; shown on empty search fields
  /// and deactivated form controls within the DMS.
  static const textMuted     = Color(0xFF64748B); // Slate 500

  // ── Borders ───────────────────────────────────────────────────────────────

  /// Dark-mode border — Slate 700; outlines cards, dividers, and input fields
  /// on dark surfaces without adding visual noise.
  static const border      = Color(0xFF334155); // Slate 700

  /// Light-mode border — Slate 200; subtle separator between list items and
  /// section containers in the incident list and resource browser.
  static const borderLight = Color(0xFFE2E8F0); // Slate 200

  // ── Roles ─────────────────────────────────────────────────────────────────
  // Each DMS user role gets a unique, perceptually distinct color so avatars,
  // badges, and permission-scoped UI elements are instantly recognisable.

  /// ADMIN role color — Violet 600; distinguishes system administrators who
  /// manage users, configure resources, and view all incidents.
  static const adminColor     = Color(0xFF7C3AED); // Violet 600 — distinctive

  /// RESCUE_TEAM / RESPONDER role color — Sky 600; identifies field responders
  /// and rescue-team members dispatched to active incidents.
  static const responderColor = Color(0xFF0284C7); // Sky 600

  /// CITIZEN role color — Emerald 600; marks registered citizens who submit
  /// incident reports and receive public alert notifications.
  static const citizenColor   = Color(0xFF059669); // Emerald 600

  /// Maps a backend severity string to its corresponding display color.
  ///
  /// Called when rendering incident cards, map markers, and severity badges.
  /// The string is normalised to uppercase before matching so API responses
  /// with mixed casing are handled gracefully.
  ///
  /// [severity] — raw severity label from the DMS backend (e.g. "high", "CRITICAL").
  /// Returns [low] as the safe default when an unrecognised value is received.
  static Color severityColor(String severity) {
    // Normalise to uppercase to guard against mixed-case API responses
    switch (severity.toUpperCase()) {
      case 'LOW':      return low;       // Minimal risk — green
      case 'MEDIUM':   return medium;    // Elevated risk — orange
      case 'HIGH':     return high;      // Serious risk — red
      case 'CRITICAL': return critical;  // Life-threatening — deep red
      default:         return low;       // Unknown severity defaults to lowest tier
    }
  }

  /// Maps a backend incident status string to its corresponding display color.
  ///
  /// Used on incident list tiles, detail screens, and the status-filter chips.
  /// Supports both the canonical enum name (e.g. "IN_PROGRESS") and common
  /// aliases returned by legacy API versions (e.g. "OPEN" → reported color).
  ///
  /// [status] — raw status label from the DMS backend (e.g. "resolved", "OPEN").
  /// Returns [closed] (grey) as the safe default for unrecognised statuses.
  static Color statusColor(String status) {
    // Normalise to uppercase for consistent matching regardless of API casing
    switch (status.toUpperCase()) {
      case 'REPORTED':    return reported;    // Awaiting triage — blue
      case 'OPEN':        return reported;    // Alias for REPORTED from older API versions
      case 'IN_PROGRESS': return inProgress;  // Responders active — orange
      case 'RESOLVED':    return resolved;    // Incident contained — green
      case 'CLOSED':      return closed;      // Archived — grey
      default:            return closed;      // Unknown status defaults to archived/grey
    }
  }

  /// Maps a backend user-role string to its corresponding role-badge color.
  ///
  /// Drives avatar ring colors, role chips in the user-list screen, and
  /// permission-context labels shown inside incident detail views.
  ///
  /// [role] — raw role name from the DMS backend (e.g. "admin", "RESCUE_TEAM").
  /// Returns [citizenColor] as the default for unrecognised or public roles.
  static Color roleColor(String role) {
    // Normalise to uppercase for consistent matching
    switch (role.toUpperCase()) {
      case 'ADMIN':        return adminColor;      // System administrator — violet
      case 'RESCUE_TEAM':
      case 'RESPONDER':    return responderColor;  // Field responder or rescue team — sky blue
      default:             return citizenColor;    // Citizen / public user — emerald
    }
  }
}