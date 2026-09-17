// ============================================================
// File: shelter_model.dart
// Feature: Shelters — Data Layer
// Part of: Disaster Management System (DMS) Flutter Application
//
// Purpose:
//   Defines the immutable data model for an emergency shelter
//   used during disaster response operations. This model is
//   consumed by the shelters feature to display available
//   refuge locations to civilians and field officers, including
//   real-time occupancy status and geographic coordinates for
//   map-based navigation.
//
//   Instances are typically deserialized from the DMS backend
//   REST API (Spring Boot) and used read-only throughout the UI.
// ============================================================

/// Immutable data model representing a single emergency shelter
/// registered in the DMS. Shelters provide refuge to displaced
/// civilians during active disaster incidents.
class ShelterModel {
  /// Unique identifier assigned by the backend database.
  final int id;

  /// Human-readable name of the shelter (e.g. "Al-Noor Community Center").
  final String name;

  /// Street or area address of the shelter; nullable if location is
  /// communicated via coordinates only.
  final String? address;

  /// Geographic latitude of the shelter for map pin placement and routing.
  final double? latitude;

  /// Geographic longitude of the shelter for map pin placement and routing.
  final double? longitude;

  /// Maximum number of people the shelter can safely accommodate.
  final int capacity;

  /// Number of people currently checked in to the shelter.
  /// Used alongside [capacity] to determine availability in real time.
  final int currentOccupancy;

  /// Whether the shelter is currently accepting new arrivals.
  /// A shelter may be closed due to damage, full occupancy, or administration.
  final bool isOpen;

  /// Category of shelter (e.g. "Medical", "General", "Women & Children").
  /// Helps civilians and officers filter shelters by need type.
  final String? type;

  /// Contact phone number for the shelter coordinator or front desk.
  final String? phone;

  /// Additional notes about the shelter such as services offered,
  /// accessibility features, or special instructions for arrivals.
  final String? description;

  /// Creates a [ShelterModel] with all required and optional fields.
  /// Marked [const] to enable compile-time constant instances where possible.
  const ShelterModel({
    required this.id,
    required this.name,
    this.address,
    this.latitude,
    this.longitude,
    required this.capacity,
    required this.currentOccupancy,
    required this.isOpen,
    this.type,
    this.phone,
    this.description,
  });

  /// Deserializes a [ShelterModel] from a JSON map returned by the DMS API.
  ///
  /// Handles multiple key aliases per field to stay compatible with
  /// different API versions or backend field naming conventions:
  ///   - latitude  → 'latitude' or 'lat'
  ///   - longitude → 'longitude', 'lng', or 'lon'
  ///   - occupancy → 'currentOccupancy' or 'occupancy'
  ///   - isOpen    → 'isOpen' or 'active'
  ///   - phone     → 'phone' or 'contactPhone'
  ///
  /// Safe defaults are applied so the UI never crashes on partial data:
  /// numeric fields fall back to 0 and [isOpen] defaults to true.
  factory ShelterModel.fromJson(Map<String, dynamic> json) => ShelterModel(
    // Use 0 as a sentinel id if the backend omits the field (should not happen in production).
    id:               json['id'] as int? ?? 0,

    // Fall back to a generic label so shelter cards never display an empty title.
    name:             json['name'] as String? ?? 'Unknown Shelter',

    // Address is optional; some shelters may only have GPS coordinates.
    address:          json['address'] as String?,

    // Accept both 'latitude' (standard) and 'lat' (shorthand) from different API endpoints.
    latitude:         (json['latitude'] as num?)?.toDouble() ?? (json['lat'] as num?)?.toDouble(),

    // Accept 'longitude', 'lng', or 'lon' to handle legacy and third-party map data formats.
    longitude:        (json['longitude'] as num?)?.toDouble() ?? (json['lng'] as num?)?.toDouble() ?? (json['lon'] as num?)?.toDouble(),

    // Total capacity; defaults to 0 if missing so availableSpots stays non-negative.
    capacity:         json['capacity'] as int? ?? 0,

    // Support both camelCase and shorthand key from different API response shapes.
    currentOccupancy: json['currentOccupancy'] as int? ?? json['occupancy'] as int? ?? 0,

    // Default to open (true) to avoid hiding shelters when the flag is absent from the payload.
    isOpen:           json['isOpen'] as bool? ?? json['active'] as bool? ?? true,

    // Shelter category; null if the shelter is unclassified.
    type:             json['type'] as String?,

    // Accept both standard 'phone' and verbose 'contactPhone' field names.
    phone:            json['phone'] as String? ?? json['contactPhone'] as String?,

    // Free-text notes about the shelter; may include services, directions, or warnings.
    description:      json['description'] as String?,
  );

  /// Computed number of remaining available spots in this shelter.
  /// Returns 0 or negative if the shelter is over capacity (edge case).
  /// Used in the UI to show vacancy at a glance and filter full shelters.
  int get availableSpots => capacity - currentOccupancy;

  /// Occupancy ratio expressed as a fraction between 0.0 and 1.0+.
  /// Guards against division-by-zero when [capacity] is 0 (data error).
  /// Consumed by progress indicators and color-coded capacity badges in the UI.
  double get occupancyPercent => capacity > 0 ? currentOccupancy / capacity : 0;
}