// ============================================================================
// resource_model.dart
// ----------------------------------------------------------------------------
// Defines the [ResourceModel] data class for the Disaster Management System.
//
// This model represents a deployable resource (e.g. ambulance, fire truck,
// rescue team, equipment cache) that can be tracked on the map and assigned
// to active disaster incidents. It mirrors the backend ResourceDTO contract,
// supporting both JSON deserialization (from the DMS REST API) and
// serialization (for create/update requests).
//
// Key responsibilities:
//   - Hold identity, classification, availability status, and geo-location
//     of a resource.
//   - Track which incident the resource is currently assigned to, enabling
//     the dispatch and resource-management features of the DMS.
//   - Provide a safe [fromJson] factory that tolerates loose numeric types
//     returned by different backend serializers.
// ============================================================================

/// Immutable data model representing a single DMS resource entity.
///
/// Resources are physical or human assets (vehicles, equipment, rescue teams)
/// that disaster coordinators assign to incidents via the admin dashboard.
class ResourceModel {
  /// Unique database identifier assigned by the DMS backend.
  final int id;

  /// Human-readable name of the resource, e.g. "Ambulance Unit 3" or
  /// "Search & Rescue Team Alpha".
  final String name;

  /// Classification of the resource (e.g. VEHICLE, EQUIPMENT, PERSONNEL).
  /// Comes from the backend ResourceType enum as a string.
  final String type;

  /// Current availability state of the resource.
  /// Typical values: AVAILABLE, DEPLOYED, MAINTENANCE, OUT_OF_SERVICE.
  final String status;

  // ResourceDTO field is locationName — kept nullable because resources may
  // not yet have a named location assigned in the system.
  /// Human-readable location label, e.g. "Central Fire Station – Bay 4".
  /// Sourced from the backend field `locationName` (or legacy `location`).
  final String? locationName;

  /// Geographic latitude of the resource's current or home position.
  /// Used to render the resource pin on the DMS incident map.
  final double? latitude;

  /// Geographic longitude of the resource's current or home position.
  /// Used together with [latitude] for map rendering and proximity queries.
  final double? longitude;

  /// ID of the disaster incident this resource is currently assigned to.
  /// Null when the resource is unassigned (status is typically AVAILABLE).
  final int? assignedIncidentId;

  /// Creates a [ResourceModel] with all required identity and classification
  /// fields. Location and incident-assignment fields are optional.
  const ResourceModel({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    this.locationName,
    this.latitude,
    this.longitude,
    this.assignedIncidentId,
  });

  // Alias so old screens that use .location still compile
  // without a breaking rename — delegates to [locationName].
  /// Backward-compatible getter for screens that referenced the old
  /// `.location` field before the DTO field was renamed to `locationName`.
  String? get location => locationName;

  /// Deserializes a [ResourceModel] from a JSON map returned by the DMS API.
  ///
  /// Handles two defensive cases:
  ///   1. The `id` field may arrive as either an [int] or a [num] depending
  ///      on the JSON serializer used on the backend — both are normalised.
  ///   2. Legacy responses may send `location` instead of `locationName`;
  ///      both keys are checked so older API versions remain compatible.
  factory ResourceModel.fromJson(Map<String, dynamic> json) => ResourceModel(
        // Safely coerce id to int regardless of whether JSON decoded it as
        // int or double (some backends emit 1.0 instead of 1).
        id: (json['id'] ?? 0) is int
            ? json['id'] ?? 0
            : (json['id'] as num).toInt(),

        // Default to empty string to avoid null-check noise in the UI layer.
        name: json['name'] ?? '',

        // Fall back to EQUIPMENT when the backend omits the type field.
        type: json['type']?.toString() ?? 'EQUIPMENT',

        // Default to AVAILABLE so newly imported resources appear deployable.
        status: json['status']?.toString() ?? 'AVAILABLE',

        // Accept both current field name and legacy alias from older API versions.
        locationName: json['locationName'] ?? json['location'],

        // Cast num? safely; latitude/longitude may be absent for unlocated resources.
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),

        // Null when resource is not yet dispatched to any incident.
        assignedIncidentId: (json['assignedIncidentId'] as num?)?.toInt(),
      );

  /// Serializes this resource to a JSON map for POST/PUT requests to the
  /// DMS backend (e.g. creating or updating a resource via the admin panel).
  ///
  /// Notes:
  ///   - `id` is intentionally excluded — the backend assigns it on create
  ///     and derives it from the URL path on update.
  ///   - `assignedIncidentId` is excluded here; incident assignment is handled
  ///     by a dedicated dispatch endpoint in the DMS API.
  ///   - Location fields are only included when present to keep payloads lean.
  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type,
        'status': status,
        // Only emit locationName when available; omitting keeps the payload
        // minimal and avoids overwriting an existing location with null.
        if (locationName != null) 'locationName': locationName,
        // Geo-coordinates are optional; omit when the resource has no fixed position.
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      };
}