// ============================================================================
// shelters_screen.dart
//
// DMS Shelters & Safe Zones Screen
//
// Displays a list and interactive map of emergency shelters registered in the
// Disaster Management System. During an active disaster event, citizens can use
// this screen to locate the nearest open shelter, check real-time occupancy,
// call shelter coordinators directly, or launch turn-by-turn navigation via
// Google Maps. The screen uses Riverpod for reactive data fetching and
// Geolocator to sort shelters by proximity to the user's current position.
// ============================================================================

// Flutter UI framework — provides widgets, theming, and Material Design
import 'package:flutter/material.dart';
// Riverpod — reactive state management for shelter data fetched from the DMS backend
import 'package:flutter_riverpod/flutter_riverpod.dart';
// flutter_animate — adds staggered fade-in/slide animations to shelter list cards
import 'package:flutter_animate/flutter_animate.dart';
// flutter_map — renders the OpenStreetMap tile layer and shelter marker pins
import 'package:flutter_map/flutter_map.dart';
// geolocator — retrieves the device's GPS position and calculates distances to shelters
import 'package:geolocator/geolocator.dart';
// google_fonts — supplies the Rajdhani display font used in the DMS cyberpunk design system
import 'package:google_fonts/google_fonts.dart';
// latlong2 — provides the LatLng coordinate type used by flutter_map markers
import 'package:latlong2/latlong.dart';
// url_launcher — opens the phone dialer for shelter calls and Google Maps for navigation
import 'package:url_launcher/url_launcher.dart';
// DMS design-system color palette (success green, secondary blue, warning amber, etc.)
import '../../../core/constants/app_colors.dart';
// ShelterModel — domain model representing a single shelter's attributes (name, capacity, coords)
import '../data/shelter_model.dart';
// shelterProvider — Riverpod AsyncNotifierProvider that fetches shelter list from the DMS API
import '../providers/shelter_provider.dart';
// Localisation helper — resolves translated strings for the active locale (Arabic, English, etc.)
import '../../../core/l10n/app_strings.dart';

/// Root screen widget for the Shelters feature.
///
/// Extends [ConsumerStatefulWidget] so it can read Riverpod providers and also
/// manage tab-controller lifecycle via [initState]/[dispose].
class SheltersScreen extends ConsumerStatefulWidget {
  /// Creates a [SheltersScreen] — no external parameters are required; all data
  /// is loaded from [shelterProvider] at build time.
  const SheltersScreen({super.key});

  @override
  ConsumerState<SheltersScreen> createState() => _SheltersScreenState();
}

/// Private state class for [SheltersScreen].
///
/// Manages a two-tab layout (List / Map) and the user's live GPS location
/// which is used to sort shelters by proximity and pin the user on the map.
class _SheltersScreenState extends ConsumerState<SheltersScreen>
    // SingleTickerProviderStateMixin supplies the vsync tick source required by TabController
    with SingleTickerProviderStateMixin {

  /// Controls the List <-> Map tab switcher shown in the AppBar.
  late TabController _tab;

  /// The device's current GPS position, nullable until permission is granted and
  /// the first fix is received. Used for proximity sorting and map centering.
  LatLng? _userLoc;

  @override
  void initState() {
    super.initState();
    // Initialise a two-tab controller (index 0 = List, index 1 = Map)
    _tab = TabController(length: 2, vsync: this);
    // Begin GPS acquisition immediately so distance data is ready when the list renders
    _getLocation();
  }

  @override
  // Dispose the tab controller to release animation resources when the screen is removed
  void dispose() { _tab.dispose(); super.dispose(); }

  /// Requests location permission if not already granted, then obtains a single
  /// low-accuracy GPS fix sufficient for sorting shelters by distance.
  ///
  /// Errors are silently swallowed — the screen still works without location;
  /// shelters are simply shown in their server-returned order.
  Future<void> _getLocation() async {
    try {
      // Check current permission status before making a live request
      final perm = await Geolocator.checkPermission();
      // Prompt the user for location access if it has not been granted yet
      if (perm == LocationPermission.denied) await Geolocator.requestPermission();
      // Fetch a single position fix; low accuracy is acceptable for shelter sorting
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      );
      // Guard against widget being unmounted before the async call completes
      if (mounted) setState(() => _userLoc = LatLng(pos.latitude, pos.longitude));
    } catch (_) {}
    // Silently catch permission-denied or GPS-unavailable errors;
    // the screen degrades gracefully — shelters still display without distance info
  }

  @override
  Widget build(BuildContext context) {
    // Watch the shelter list asynchronously; rebuilds automatically when data refreshes
    final sheltersAsync = ref.watch(shelterProvider);
    // Detect active theme brightness to adapt card background colours
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      // Use the theme's scaffold background so light/dark mode is respected
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Screen title styled with the DMS Rajdhani font and success-green accent colour
        title: Text('SHELTERS & SAFE ZONES', style: GoogleFonts.rajdhani(
          color: AppColors.success, fontWeight: FontWeight.w700, letterSpacing: 2, fontSize: 16)),
        centerTitle: true,
        actions: [
          // Refresh button forces a re-fetch of shelter data from the DMS backend
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.success),
            // Invalidate the provider to trigger a fresh API call
            onPressed: () => ref.invalidate(shelterProvider),
          ),
        ],
        // Tab bar embedded in the AppBar bottom slot — toggles between List and Map views
        bottom: TabBar(
          controller: _tab,
          // Active tab label uses DMS success-green to match the screen's accent
          labelColor: AppColors.success,
          // Inactive tabs are dimmed so the active tab stands out
          unselectedLabelColor: Colors.white38,
          // Underline indicator matches the success-green accent colour
          indicatorColor: AppColors.success,
          tabs: const [
            // Tab 0 — scrollable list of shelter cards with occupancy details
            Tab(icon: Icon(Icons.list_alt, size: 18), text: 'LIST'),
            // Tab 1 — interactive OpenStreetMap showing shelter pin markers
            Tab(icon: Icon(Icons.map_outlined, size: 18), text: 'MAP'),
          ],
        ),
      ),
      body: sheltersAsync.when(
        // Show a branded loading spinner while the API request is in-flight
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.success)),
        // Display a localised error message if the DMS backend is unreachable
        error: (e, _) => Center(child: Text(t(context, ref, 'could_not_load'), style: const TextStyle(color: Colors.white54))),
        // On success, hand the shelter list to both tab views
        data: (shelters) => TabBarView(
          controller: _tab,
          children: [
            // List view — cards sorted by proximity to the user's GPS location
            _ShelterList(shelters: shelters, userLoc: _userLoc),
            // Map view — OpenStreetMap with a marker per shelter and a user-location pin
            _ShelterMap(shelters: shelters, userLoc: _userLoc),
          ],
        ),
      ),
    );
  }
}

/// Private widget that renders a proximity-sorted, animated list of shelter cards.
///
/// If the user's GPS location is available, shelters are reordered nearest-first
/// so displaced citizens can immediately find the closest safe zone.
class _ShelterList extends StatelessWidget {
  /// Full list of shelters retrieved from the DMS backend.
  final List<ShelterModel> shelters;

  /// User's current GPS coordinates; null if permission was denied or GPS unavailable.
  final LatLng? userLoc;

  const _ShelterList({required this.shelters, this.userLoc});

  @override
  Widget build(BuildContext context) {
    // Create a mutable copy of the shelter list so sorting doesn't mutate provider state
    final sorted = [...shelters];
    if (userLoc != null) {
      // Sort shelters ascending by straight-line distance from the user's position
      sorted.sort((a, b) {
        // Calculate distance to shelter A; treat shelters without coordinates as infinitely far
        final da = (a.latitude != null && a.longitude != null)
            ? Geolocator.distanceBetween(userLoc!.latitude, userLoc!.longitude, a.latitude!, a.longitude!)
            : double.infinity;
        // Calculate distance to shelter B; same infinite-distance fallback for coord-less entries
        final db = (b.latitude != null && b.longitude != null)
            ? Geolocator.distanceBetween(userLoc!.latitude, userLoc!.longitude, b.latitude!, b.longitude!)
            : double.infinity;
        // Return negative/positive/zero so ListView renders nearest shelters at the top
        return da.compareTo(db);
      });
    }

    return ListView.builder(
      // Add uniform padding around the card list for visual breathing room
      padding: const EdgeInsets.all(14),
      // Render one card per shelter in the sorted list
      itemCount: sorted.length,
      // Apply a staggered fade + slight upward slide animation to each card as it enters
      itemBuilder: (ctx, i) => _ShelterCard(shelter: sorted[i], userLoc: userLoc)
          // Each card delays by 60ms x its index, creating a cascading reveal effect
          .animate().fadeIn(delay: (i * 60).ms).slideY(begin: 0.05),
    );
  }
}

/// Private widget that renders a single shelter's summary card.
///
/// Shows the shelter name, address, open/closed status, occupancy progress bar,
/// shelter type, distance from the user, and action buttons to call or navigate.
class _ShelterCard extends StatelessWidget {
  /// The shelter whose data this card displays.
  final ShelterModel shelter;

  /// User's GPS coordinates used to compute and display distance to this shelter.
  final LatLng? userLoc;

  const _ShelterCard({required this.shelter, this.userLoc});

  /// Computes the straight-line distance in metres from the user to this shelter.
  ///
  /// Returns null if either the user's location or the shelter's coordinates are unknown,
  /// in which case the distance badge is hidden from the card UI.
  double? _distance() {
    // Both endpoints must be known to calculate a meaningful distance
    if (userLoc == null || shelter.latitude == null) return null;
    return Geolocator.distanceBetween(
        userLoc!.latitude, userLoc!.longitude, shelter.latitude!, shelter.longitude!);
  }

  @override
  Widget build(BuildContext context) {
    // Compute distance once and reuse for both the badge and the sort comparison
    final dist = _distance();
    // Fractional occupancy (0.0-1.0) used to fill the capacity progress bar
    final pct = shelter.occupancyPercent;
    // Accent colour encodes shelter status: closed = grey, open + almost full = amber, open = green
    final color = shelter.isOpen
        ? (pct > 0.9 ? AppColors.warning : AppColors.success) // Warn when >90% full
        : Colors.white38; // Closed shelters are visually muted

    return Container(
      // Vertical spacing between cards
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        // Deep dark background in dark mode; white in light mode — follows DMS design system
        color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0D1117) : Colors.white,
        // Rounded corners for a modern card appearance
        borderRadius: BorderRadius.circular(14),
        // Subtle border tinted with the shelter's status colour to provide visual grouping
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // -- Header row: icon, shelter name + address, open/closed badge --
            Row(
              children: [
                // Status-coloured icon container — acts as a quick visual indicator
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    // Tinted background echoes the shelter status colour at low opacity
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  // Building icon represents the physical shelter structure
                  child: Icon(Icons.location_city, color: color, size: 20),
                ),
                const SizedBox(width: 10),
                // Shelter name and optional address stacked vertically
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Primary shelter name — bold white for legibility on dark backgrounds
                      Text(shelter.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                      // Address shown as secondary metadata when available
                      if (shelter.address != null)
                        Text(shelter.address!, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                    ],
                  ),
                ),
                // OPEN / CLOSED pill badge — colour-coded to match the overall card accent
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    // Display operational status in uppercase for emphasis
                    shelter.isOpen ? 'OPEN' : 'CLOSED',
                    style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // -- Occupancy section: label, available-spots count, progress bar --
            // Occupancy bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Section label — uppercase spaced lettering matches the DMS typography style
                    Text('CAPACITY', style: const TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 1)),
                    // Remaining spots help citizens quickly gauge whether to travel to this shelter
                    Text('${shelter.availableSpots} spots available',
                        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
                const SizedBox(height: 4),
                // Rounded progress bar fills proportionally with current occupancy
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    // pct is the ratio of current occupants to total capacity (0.0 - 1.0)
                    value: pct,
                    // Track background is a subtle white to contrast with the fill colour
                    backgroundColor: Colors.white12,
                    // Fill colour shifts to amber when the shelter is nearly full (>90%)
                    valueColor: AlwaysStoppedAnimation(color),
                    // Thicker bar for easier reading at a glance
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 2),
                // Raw occupancy numbers provide precise information below the progress bar
                Text('${shelter.currentOccupancy} / ${shelter.capacity} people',
                    style: const TextStyle(color: Colors.white30, fontSize: 10)),
              ],
            ),
            const SizedBox(height: 12),
            // -- Footer row: shelter type chip, distance badge, call & navigate buttons --
            Row(
              children: [
                // Shelter type chip (e.g. "School", "Community Centre") aids citizens in
                // choosing a shelter appropriate to their needs (medical, family, etc.)
                if (shelter.type != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    // Neutral dark chip so it doesn't compete with the status colour
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F2937),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(shelter.type!, style: const TextStyle(color: Colors.white54, fontSize: 10)),
                  ),
                // Distance from the user — shown only when GPS position is available
                if (dist != null) ...[
                  const SizedBox(width: 8),
                  // Directional icon reinforces that this is a proximity measurement
                  Icon(Icons.near_me, size: 12, color: AppColors.secondary),
                  const SizedBox(width: 3),
                  Text(
                    // Show metres for short distances, kilometres for longer ones
                    dist < 1000 ? '${dist.round()}m' : '${(dist / 1000).toStringAsFixed(1)}km away',
                    style: const TextStyle(color: AppColors.secondary, fontSize: 10),
                  ),
                ],
                // Push the action buttons to the right side of the footer row
                const Spacer(),
                // CALL button — visible only when the shelter has a registered phone number
                if (shelter.phone != null)
                  GestureDetector(
                    // Open the native phone dialer pre-filled with the shelter's number
                    onTap: () async {
                      final uri = Uri.parse('tel:${shelter.phone}');
                      // Guard: only launch if the device supports the tel: scheme
                      if (await canLaunchUrl(uri)) launchUrl(uri);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        // Green-tinted call button follows the DMS success-colour convention
                        color: AppColors.success.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          // Phone icon reinforces the tap action
                          const Icon(Icons.phone, size: 12, color: AppColors.success),
                          const SizedBox(width: 4),
                          // Uppercase label for compact, legible CTA text
                          const Text('CALL', style: TextStyle(color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                // NAV button — visible only when the shelter has GPS coordinates stored
                if (shelter.latitude != null)
                  GestureDetector(
                    // Open Google Maps in an external app for turn-by-turn navigation
                    onTap: () async {
                      // Build a Google Maps geo URI targeting the shelter's coordinates
                      final uri = Uri.parse('https://maps.google.com/?q=${shelter.latitude},${shelter.longitude}');
                      // externalApplication mode ensures the Maps app (not a WebView) opens
                      if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        // Blue-tinted navigation button uses DMS secondary colour for differentiation
                        color: AppColors.secondary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
                      ),
                      child: const Row(children: [
                        // Directions arrow icon clarifies that this opens navigation
                        Icon(Icons.directions, size: 12, color: AppColors.secondary),
                        SizedBox(width: 4),
                        // "NAV" abbreviation keeps the button compact in the footer row
                        Text('NAV', style: TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.w700)),
                      ]),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Private widget that renders an interactive OpenStreetMap view of all shelters.
///
/// Plots colour-coded circular markers for each shelter (green = open, grey = closed)
/// and a distinct blue pin for the user's current location. Tapping a marker opens
/// a bottom sheet with shelter summary info and action buttons.
class _ShelterMap extends StatelessWidget {
  /// Full shelter list retrieved from the DMS backend; only entries with coordinates are pinned.
  final List<ShelterModel> shelters;

  /// User's GPS coordinates; null if permission denied or GPS unavailable.
  final LatLng? userLoc;

  const _ShelterMap({required this.shelters, this.userLoc});

  @override
  Widget build(BuildContext context) {
    // Default map centre: Riyadh, Saudi Arabia — sensible fallback for the DMS deployment region
    final center = userLoc ?? const LatLng(24.713, 46.675);
    // Check whether any shelter has geographic coordinates to potentially re-centre the map
    final hasShelters = shelters.any((s) => s.latitude != null);
    // If the user's location is unknown but shelters exist, centre on the first shelter instead
    final mapCenter = hasShelters && userLoc == null
        ? LatLng(shelters.first.latitude!, shelters.first.longitude!)
        : center;

    return FlutterMap(
      // Set the initial viewport; zoom 12 shows a city-level view suitable for locating shelters
      options: MapOptions(initialCenter: mapCenter, initialZoom: 12),
      children: [
        // OpenStreetMap raster tile layer — no API key required, suitable for DMS deployment
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          // Identifies the DMS app as the tile requester to comply with OSM usage policy
          userAgentPackageName: 'com.dms.app',
        ),
        // Marker layer renders the user pin and all shelter pins as interactive overlays
        MarkerLayer(markers: [
          // User location marker — only rendered when GPS position has been acquired
          if (userLoc != null)
            Marker(
              point: userLoc!,
              width: 36, height: 36,
              // Blue circular marker visually distinguishes the user from shelter pins
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.secondary.withValues(alpha: 0.2),
                  border: Border.all(color: AppColors.secondary, width: 2),
                ),
                // GPS crosshair icon reinforces that this is the user's current position
                child: const Icon(Icons.my_location, color: AppColors.secondary, size: 18),
              ),
            ),
          // Shelter markers — mapped from the list; entries without coordinates are excluded
          ...shelters.where((s) => s.latitude != null).map((s) => Marker(
            point: LatLng(s.latitude!, s.longitude!),
            width: 40, height: 40,
            // Wrapping in GestureDetector allows tapping a pin to surface shelter details
            child: GestureDetector(
              // Tapping the marker opens a bottom sheet with shelter info and action buttons
              onTap: () => _showShelterInfo(context, s),
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  // Green fill for open shelters, grey for closed — matches card colour logic
                  color: (s.isOpen ? AppColors.success : Colors.white38).withValues(alpha: 0.2),
                  border: Border.all(
                    // Border colour mirrors fill for a cohesive status-coded appearance
                    color: s.isOpen ? AppColors.success : Colors.white38, width: 2),
                ),
                // Hospital cross icon — consistent with DMS emergency shelter iconography
                child: Icon(
                  Icons.local_hospital,
                  color: s.isOpen ? AppColors.success : Colors.white38,
                  size: 18,
                ),
              ),
            ),
          )),
        ]),
      ],
    );
  }

  /// Displays a bottom sheet summarising the tapped shelter's details.
  ///
  /// Provides citizens with the shelter name, address, available spots, open/closed
  /// status, a call button to reach shelter coordinators, and a navigate button
  /// that hands off to Google Maps for turn-by-turn directions.
  void _showShelterInfo(BuildContext context, ShelterModel s) {
    showModalBottomSheet(
      context: context,
      // Respect the active theme so the sheet blends with the app's dark/light mode
      backgroundColor: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0D1117) : Colors.white,
      // Rounded top corners for a polished modal appearance consistent with DMS UI
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          // Shrink-wrap the column so the sheet height matches its content
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Shelter name — primary identifier shown prominently at the top of the sheet
            Text(s.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 6),
            // Street address provides additional wayfinding context when available
            if (s.address != null)
              Text(s.address!, style: const TextStyle(color: Colors.white54, fontSize: 13)),
            const SizedBox(height: 12),
            Row(children: [
              // Available spots count in green gives an at-a-glance capacity assessment
              Text('${s.availableSpots} spots available', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600)),
              const Spacer(),
              // OPEN / CLOSED status mirrored from the card for consistency
              Text(s.isOpen ? 'OPEN' : 'CLOSED',
                  style: TextStyle(color: s.isOpen ? AppColors.success : Colors.white38, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 16),
            // -- Action row: Call and Navigate buttons --
            Row(children: [
              // Call button — rendered only when the shelter has a registered phone number
              if (s.phone != null) ...[
                Expanded(child: OutlinedButton.icon(
                  // Open the native phone dialer pre-filled with the shelter's number
                  onPressed: () async { final u = Uri.parse('tel:${s.phone}'); if (await canLaunchUrl(u)) launchUrl(u); },
                  // Phone icon and green text match the DMS success-colour convention
                  icon: const Icon(Icons.phone, color: AppColors.success, size: 16),
                  label: const Text('Call', style: TextStyle(color: AppColors.success)),
                  // Outlined style with green border distinguishes the call button from Navigate
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.success)),
                )),
                const SizedBox(width: 10),
              ],
              // Navigate button — rendered only when the shelter has stored GPS coordinates
              if (s.latitude != null) Expanded(child: ElevatedButton.icon(
                onPressed: () async {
                  // Construct a Google Maps URL targeting the shelter's exact coordinates
                  final u = Uri.parse('https://maps.google.com/?q=${s.latitude},${s.longitude}');
                  // Open in the external Maps app rather than an in-app WebView
                  if (await canLaunchUrl(u)) launchUrl(u, mode: LaunchMode.externalApplication);
                },
                // Directions icon makes the action immediately clear
                icon: const Icon(Icons.directions, size: 16),
                label: const Text('Navigate'),
                // Filled green button with black text — high contrast CTA for emergency contexts
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.success, foregroundColor: Colors.black),
              )),
            ]),
            // Bottom padding ensures the sheet clears the device's home indicator
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}