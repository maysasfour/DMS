/// ---------------------------------------------------------------------------
/// map_screen.dart
///
/// Displays an interactive geographic map of all active disaster incidents
/// in the DMS (Disaster Management System). Each incident with valid GPS
/// coordinates is rendered as a colour-coded, tap-able marker whose colour
/// reflects the incident severity (CRITICAL → red, HIGH → orange,
/// MEDIUM → amber, LOW → green) and whose icon reflects the incident type
/// (fire, flood, accident, medical, earthquake, etc.).
///
/// Tapping a marker opens a bottom sheet with a summary of the incident and
/// a "View Details" button that navigates to the full incident detail screen.
/// A legend overlay in the bottom-right corner lists all severity levels and
/// shows the total number of geo-located incidents currently loaded.
///
/// The screen uses Riverpod (ConsumerStatefulWidget) to observe the
/// [incidentProvider] and refreshes the incident list automatically on mount.
/// Tile data is served by OpenStreetMap; the initial viewport is centred on
/// Riyadh, Saudi Arabia (the primary deployment region).
/// ---------------------------------------------------------------------------

// Flutter UI framework
import 'package:flutter/material.dart';
// flutter_map: OpenStreetMap-based interactive map widget for Flutter
import 'package:flutter_map/flutter_map.dart';
// Riverpod: reactive state management used to watch the incident provider
import 'package:flutter_riverpod/flutter_riverpod.dart';
// go_router: declarative navigation used to push the incident detail route
import 'package:go_router/go_router.dart';
// latlong2: lightweight LatLng type required by flutter_map for coordinates
import 'package:latlong2/latlong.dart';
// DMS design-system colour tokens (primary brand colour, text colours, etc.)
import '../../../core/constants/app_colors.dart';
// Localisation helper that resolves translated strings from the current locale
import '../../../core/l10n/app_strings.dart';
// Data model representing a single DMS incident (title, severity, type, GPS, …)
import '../../../features/incidents/data/models/incident_model.dart';
// Riverpod provider and notifier that fetch and cache incidents from the backend
import '../../../features/incidents/providers/incident_provider.dart';
// Shared navigation drawer used across all main DMS screens
import '../../../shared/widgets/app_drawer.dart';

/// [MapScreen] is a [ConsumerStatefulWidget] so it can both watch Riverpod
/// providers for reactive rebuilds and maintain local widget state (e.g. the
/// [MapController] instance).
class MapScreen extends ConsumerStatefulWidget {
  /// Standard Flutter key forwarded to the superclass for widget identity.
  const MapScreen({super.key});

  @override
  // Creates the mutable state object associated with this widget.
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

/// Private state class for [MapScreen]; holds the map controller and all
/// helper methods for severity colours, type icons, and the incident sheet.
class _MapScreenState extends ConsumerState<MapScreen> {
  /// Controller that allows programmatic pan/zoom of the flutter_map widget.
  final _mapController = MapController();

  @override
  void initState() {
    super.initState();
    // Defer the initial incident load until after the first frame so that the
    // Riverpod ref is fully wired and the map tile layer is already visible.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Force a fresh fetch from the DMS backend, bypassing any cached state.
      ref.read(incidentProvider.notifier).loadIncidents(refresh: true);
    });
  }

  /// Returns the marker fill colour that corresponds to an incident's
  /// [severity] level, giving responders an immediate visual triage cue.
  ///
  /// - CRITICAL → red    (#DC2626) — life-threatening, immediate response required
  /// - HIGH     → orange (#EA580C) — serious, urgent response required
  /// - MEDIUM   → amber  (#D97706) — significant but not immediately life-threatening
  /// - (default/LOW) → green (#16A34A) — minor or informational incident
  Color _severityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return const Color(0xFFDC2626); // Red — highest urgency
      case 'HIGH':     return const Color(0xFFEA580C); // Orange — high urgency
      case 'MEDIUM':   return const Color(0xFFD97706); // Amber — moderate urgency
      default:         return const Color(0xFF16A34A); // Green — low / unknown severity
    }
  }

  /// Maps an incident [type] string from the DMS backend to a Material icon
  /// so that each map marker communicates the nature of the disaster at a
  /// glance without requiring the user to open the detail sheet.
  IconData _typeIcon(String type) {
    switch (type.toUpperCase()) {
      case 'FIRE':       return Icons.local_fire_department; // Active fire incident
      case 'FLOOD':      return Icons.water;                 // Flooding / water event
      case 'ACCIDENT':   return Icons.car_crash;             // Road / traffic accident
      case 'MEDICAL':    return Icons.medical_services;      // Medical emergency
      case 'EARTHQUAKE': return Icons.landscape;             // Seismic event
      default:           return Icons.warning_amber;         // Unknown or other incident type
    }
  }

  /// Presents a modal bottom sheet summarising the tapped [incident].
  ///
  /// The sheet shows the incident icon, title, status, and address, and
  /// includes a primary action button that navigates to the full incident
  /// detail screen so the responder can view or update the incident record.
  void _showIncidentSheet(BuildContext context, IncidentModel incident) {
    // Detect current theme so the sheet matches the app-wide dark/light mode.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      // Sheet background adapts to dark/light theme for visual consistency.
      backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
      // Rounded top corners give the sheet a modern card appearance.
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header row: severity-tinted icon badge + incident title and status.
          Row(children: [
            // Circular icon badge whose background is a translucent tint of
            // the severity colour, reinforcing the urgency signal from the map.
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                // 15 % opacity tint of the severity colour as badge background.
                color: _severityColor(incident.severity).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12)),
              // Icon uses the incident type to show e.g. flame for FIRE events.
              child: Icon(_typeIcon(incident.type),
                  color: _severityColor(incident.severity), size: 24)),
            const SizedBox(width: 12),
            // Incident title and current workflow status stacked vertically.
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Incident title; truncated to two lines to preserve sheet height.
              Text(incident.title, style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w700, fontSize: 15),
                maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              // Workflow status (e.g. "IN PROGRESS") coloured by severity to
              // reinforce urgency alongside the text label.
              Text(incident.status.replaceAll('_', ' '),
                style: TextStyle(color: _severityColor(incident.severity),
                    fontSize: 11, fontWeight: FontWeight.w600)),
            ])),
          ]),
          // Address row — shown only when the incident has location text data.
          if (incident.address != null || incident.city != null) ...[
            const SizedBox(height: 12),
            Row(children: [
              // Pin icon as a visual cue that the following text is a location.
              Icon(Icons.location_on_outlined, size: 14,
                  color: isDark ? Colors.white38 : Colors.black38),
              const SizedBox(width: 4),
              // Combine address + city fields, filtering out nulls/empty strings.
              Expanded(child: Text(
                [incident.address, incident.city].where((s) => s != null && s.isNotEmpty).join(', '),
                style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontSize: 12),
                maxLines: 1, overflow: TextOverflow.ellipsis)),
            ]),
          ],
          const SizedBox(height: 16),
          // Full-width "View Details" button that navigates to the incident
          // detail screen, dismissing this sheet first to avoid stacked routes.
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Dismiss the bottom sheet before pushing the detail route.
                Navigator.pop(context);
                // Navigate to the incident detail screen using its numeric ID.
                context.push('/incidents/${incident.id}');
              },
              style: ElevatedButton.styleFrom(
                // Use the DMS primary brand colour for the call-to-action button.
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              // Localised label resolved via the DMS i18n helper.
              child: Text(t(context, ref, 'view_details'),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context, ) {
    // Observe the incident state; any provider update triggers a rebuild so
    // new or updated incidents appear on the map immediately.
    final state = ref.watch(incidentProvider);
    // Cache the brightness flag to avoid repeated Theme lookups in the tree.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // Filter to only incidents that have valid GPS coordinates; incidents
    // without coordinates cannot be placed on the map and are skipped.
    final incidents = state.incidents
        .where((i) => i.latitude != null && i.longitude != null)
        .toList();

    return Scaffold(
      // Background colour inherits from the active theme (dark/light).
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      // Shared DMS navigation drawer provides links to other app sections.
      drawer: const AppDrawer(),
      appBar: AppBar(
        // Transparent-style app bar that blends with the map background.
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        foregroundColor: AppColors.textPrimary,
        // Localised screen title resolved from the active locale.
        title: Text(t(context, ref, 'map')),
        actions: [
          // Show a compact spinner in the action area while incidents are
          // being fetched so the user knows a background request is in flight.
          if (state.isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(width: 18, height: 18,
                  // Thin stroke to keep the spinner visually lightweight.
                  child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          // Manual refresh button — forces a fresh API call regardless of cache.
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(incidentProvider.notifier).loadIncidents(refresh: true),
          ),
        ],
      ),
      // Stack layering: map tiles → incident markers → legend overlay → empty state.
      body: Stack(children: [
        // Primary interactive map widget powered by flutter_map + OpenStreetMap.
        FlutterMap(
          // Controller reference enables future programmatic pan/zoom if needed.
          mapController: _mapController,
          options: MapOptions(
            // Default viewport centred on Riyadh, Saudi Arabia — the primary
            // operational region for this DMS deployment.
            initialCenter: const LatLng(24.7136, 46.6753), // Riyadh center
            // Zoom level 6 shows the full Kingdom of Saudi Arabia on load.
            initialZoom: 6,
          ),
          children: [
            // Raster tile layer fetched from the public OpenStreetMap tile CDN.
            TileLayer(
              // {z}/{x}/{y} placeholders are filled by flutter_map at runtime.
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              // Package name sent as the HTTP User-Agent to comply with OSM policy.
              userAgentPackageName: 'com.company.DisasterManagementApp',
            ),
            // Marker layer renders one coloured pin per geo-located incident.
            MarkerLayer(
              markers: incidents.map((incident) {
                // Resolve severity colour once per incident to reuse below.
                final color = _severityColor(incident.severity);
                return Marker(
                  // Place the marker at the incident's exact GPS coordinates.
                  point: LatLng(incident.latitude!, incident.longitude!),
                  // 44×44 logical pixels gives a comfortable tap target on mobile.
                  width: 44,
                  height: 44,
                  // GestureDetector wraps the visual so tapping opens the sheet.
                  child: GestureDetector(
                    // Open the incident bottom sheet when the pin is tapped.
                    onTap: () => _showIncidentSheet(context, incident),
                    child: Container(
                      decoration: BoxDecoration(
                        // Solid severity colour as the marker background circle.
                        color: color,
                        // Circular shape distinguishes markers from rectangular UI.
                        shape: BoxShape.circle,
                        // Soft drop shadow matching the severity colour so the
                        // glow effect reinforces the urgency of the incident.
                        boxShadow: [BoxShadow(
                            color: color.withValues(alpha: 0.5),
                            blurRadius: 8, offset: const Offset(0, 2))],
                        // White border improves legibility against the map tiles.
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      // Incident-type icon rendered in white for maximum contrast.
                      child: Icon(_typeIcon(incident.type),
                          color: Colors.white, size: 20),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),

        // Severity legend — always visible in the bottom-right corner so that
        // responders can quickly interpret marker colours without prior training.
        Positioned(
          bottom: 20, right: 12,
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              // Card background adapts to dark/light theme.
              color: isDark ? const Color(0xFF111827) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              // Subtle shadow lifts the legend card above the map tiles visually.
              boxShadow: [BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 8)]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Legend section header label, capitalised for visual hierarchy.
              Text(t(context, ref, 'severity'), style: TextStyle(
                color: isDark ? Colors.white54 : Colors.black54,
                fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
              const SizedBox(height: 6),
              // Render one legend row per severity level in descending priority order.
              for (final entry in [
                ('CRITICAL', const Color(0xFFDC2626)), // Red — most severe
                ('HIGH', const Color(0xFFEA580C)),     // Orange
                ('MEDIUM', const Color(0xFFD97706)),   // Amber
                ('LOW', const Color(0xFF16A34A)),      // Green — least severe
              ]) ...[
                Row(children: [
                  // Small colour dot matching the corresponding marker colour.
                  Container(width: 10, height: 10,
                      decoration: BoxDecoration(color: entry.$2, shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  // Severity label text aligned with the colour dot.
                  Text(entry.$1, style: TextStyle(
                      color: isDark ? Colors.white70 : Colors.black87,
                      fontSize: 10)),
                ]),
                // Small gap between legend rows for readability.
                const SizedBox(height: 3),
              ],
              const SizedBox(height: 4),
              // Total count of geo-located incidents currently shown on the map,
              // giving dispatchers a quick situational-awareness number.
              Text('${incidents.length} ${t(context, ref, 'incidents')}',
                style: TextStyle(
                    color: isDark ? Colors.white38 : Colors.black38,
                    fontSize: 9, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),

        // Empty state overlay — shown only when the incident list has no
        // geo-located incidents AND no fetch is currently in progress, so that
        // it does not flash briefly during the initial data load.
        if (incidents.isEmpty && !state.isLoading)
          Center(
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                // Card background inherits theme colours.
                color: isDark ? const Color(0xFF111827) : Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)]),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                // Large muted map icon conveys "nothing to show here" without text.
                Icon(Icons.map_outlined, size: 48,
                    color: isDark ? Colors.white24 : Colors.black26),
                const SizedBox(height: 12),
                // Localised message explaining that no incidents have GPS data.
                Text(t(context, ref, 'no_location_incidents'),
                  style: TextStyle(
                    color: isDark ? Colors.white54 : Colors.black54, fontSize: 14),
                  textAlign: TextAlign.center),
              ]),
            ),
          ),
      ]),
    );
  }
}