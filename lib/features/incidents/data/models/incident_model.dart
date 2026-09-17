// =============================================================================
// incident_model.dart
//
// Data models for disaster incidents in the DMS Flutter mobile application.
// This file defines two core models:
//   - [MediaModel]: Represents media attachments (photos/videos) uploaded
//     alongside an incident report, with URL normalization for backend assets.
//   - [IncidentModel]: Represents a full disaster incident as returned by the
//     DMS REST API, including location, severity, status, reporter identity,
//     assigned response team, and any attached media.
//
// These models are used throughout the incidents feature — in listing,
// detail views, and incident creation — and map directly to the backend's
// IncidentDTO response shape.
// =============================================================================

// Import shared API base URL constant used to resolve relative media paths
import '../../../../core/constants/api_constants.dart';

/// Represents a single media attachment (image or video) associated with
/// a disaster incident report in the DMS system.
class MediaModel {
  /// Unique identifier assigned by the backend for this media record.
  final int id;

  /// Fully-resolved public URL used to load the media asset (image/video).
  /// Relative paths returned by the backend are expanded using [ApiConstants.baseUrl].
  final String url;

  /// MIME type of the media file (e.g. 'image/jpeg', 'video/mp4'), if provided.
  final String? contentType;

  /// The original filename as uploaded by the incident reporter, if provided.
  final String? originalFileName;

  /// Creates an immutable [MediaModel] instance.
  /// [id] and [url] are required; content type and filename are optional metadata.
  const MediaModel({
    required this.id,
    required this.url,
    this.contentType,
    this.originalFileName,
  });

  /// Deserializes a [MediaModel] from a JSON map returned by the DMS backend.
  ///
  /// [baseUrl] is prepended to relative URLs (paths starting with '/') so that
  /// media stored on the server can be referenced as absolute URLs in the app.
  factory MediaModel.fromJson(Map<String, dynamic> json, {String baseUrl = ''}) {
    String url = json['url'] ?? '';
    // Backend returns relative paths like /uploads/file.jpg — prepend base URL
    // to convert them into fully-qualified URLs the app can load directly.
    if (url.isNotEmpty && url.startsWith('/') && baseUrl.isNotEmpty) {
      url = baseUrl + url;
    }
    return MediaModel(
      // Default to 0 if id is missing, though all persisted records should have one
      id: json['id'] ?? 0,
      url: url,
      // Optional fields — may be null if not stored by the backend
      contentType: json['contentType'],
      originalFileName: json['originalFileName'],
    );
  }
}

/// Represents a disaster incident in the DMS system, as surfaced by the
/// backend's IncidentDTO. Captures all key attributes of a reported emergency:
/// type, severity, current status, geographic location, involved parties,
/// timestamps, and associated media evidence.
class IncidentModel {
  /// Unique numeric identifier for this incident, assigned by the backend.
  final int id;

  /// Short descriptive title of the incident (e.g. "Building Fire in Downtown").
  final String title;

  /// Optional detailed narrative describing the nature and context of the incident.
  final String? description;

  // Backend IncidentDTO uses 'category' for type — mapped in fromJson below.
  /// Incident category/type (e.g. 'FIRE', 'FLOOD', 'EARTHQUAKE', 'OTHER').
  final String type;

  /// Urgency level of the incident — typically 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'.
  final String severity;

  /// Current workflow status of the incident — e.g. 'OPEN', 'IN_PROGRESS', 'RESOLVED'.
  final String status;

  /// Optional city/municipality where the incident was reported.
  final String? city;

  /// Optional street-level address or landmark description of the incident location.
  final String? address;

  /// Optional geographic latitude of the incident, used for map display.
  final double? latitude;

  /// Optional geographic longitude of the incident, used for map display.
  final double? longitude;

  // Backend uses 'reporterName' and 'assignedResponderName' field names —
  // both are accepted during deserialization for compatibility.
  /// Display name of the citizen or officer who originally reported the incident.
  final String? reportedByName;

  /// Display name of the response team or responder currently assigned to the incident.
  final String? assignedTeamName;

  /// ISO-8601 timestamp string of when the incident was first created/reported.
  final String? createdAt;

  /// List of media attachments (photos/videos) submitted as evidence with the incident.
  final List<MediaModel> media;

  /// Creates an immutable [IncidentModel].
  /// Core fields [id], [title], [type], [severity], and [status] are required;
  /// location, personnel, and media fields are optional.
  const IncidentModel({
    required this.id,
    required this.title,
    this.description,
    required this.type,
    required this.severity,
    required this.status,
    this.city,
    this.address,
    this.latitude,
    this.longitude,
    this.reportedByName,
    this.assignedTeamName,
    this.createdAt,
    // Default to an empty list when no media is attached to the incident
    this.media = const [],
  });

  // Convenience getters for screens that use old field names

  /// Returns the most specific available location label for display in UI.
  /// Prefers [address] (street-level) over [city] (municipality-level).
  String? get locationName => address ?? city;

  /// Deserializes an [IncidentModel] from a JSON map as returned by the DMS backend.
  ///
  /// Handles field name variations between backend DTO versions (e.g. 'category' vs
  /// 'type', 'reporterName' vs 'reportedByName') and safely coerces numeric types.
  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    // Parse the list of media attachments; inject the API base URL for path resolution
    final mediaList = (json['media'] as List?)
            ?.map((m) => MediaModel.fromJson(m as Map<String, dynamic>,
                baseUrl: ApiConstants.baseUrl))
            .toList() ??
        // Fall back to empty list if the backend omits the media field entirely
        [];

    // Parse latitude and longitude separately to handle both int and double JSON types
    double? lat;
    double? lng;
    final latRaw = json['latitude'];
    final lngRaw = json['longitude'];
    // Safely cast numeric JSON values (int or double) to Dart double for map display
    if (latRaw != null) lat = (latRaw as num).toDouble();
    if (lngRaw != null) lng = (lngRaw as num).toDouble();

    return IncidentModel(
      // Guard against JSON returning id as a non-int numeric type (e.g. double from some parsers)
      id: (json['id'] ?? 0) is int
          ? json['id'] ?? 0
          : (json['id'] as num).toInt(),
      // Default to empty string if title is missing to keep UI rendering safe
      title: json['title'] ?? '',
      description: json['description'],
      // Accept 'category' (current DTO) or legacy 'type' field; default to 'OTHER'
      type: json['category'] ?? json['type'] ?? 'OTHER',
      // Coerce to String in case backend sends an enum object; default to 'MEDIUM'
      severity: json['severity']?.toString() ?? 'MEDIUM',
      // Coerce to String in case backend sends an enum object; default to 'OPEN'
      status: json['status']?.toString() ?? 'OPEN',
      city: json['city'],
      address: json['address'],
      latitude: lat,
      longitude: lng,
      // Accept both 'reporterName' (current DTO) and legacy 'reportedByName'
      reportedByName: json['reporterName'] ?? json['reportedByName'],
      // Accept both 'assignedResponderName' (current DTO) and legacy 'assignedTeamName'
      assignedTeamName:
          json['assignedResponderName'] ?? json['assignedTeamName'],
      // Convert timestamp to String regardless of backend representation
      createdAt: json['createdAt']?.toString(),
      media: mediaList,
    );
  }

  /// Serializes this incident into a JSON map suitable for the DMS incident
  /// creation endpoint (POST /api/incidents). Only includes fields relevant
  /// to creation; id, reporter, team, and timestamps are assigned server-side.
  Map<String, dynamic> toCreateJson() => {
        'title': title,
        // Omit optional description if not provided by the reporter
        if (description != null) 'description': description,
        // Backend creation endpoint expects 'category', not 'type'
        'category': type,
        'severity': severity,
        // Include location fields only when available — location is optional at creation
        if (address != null) 'address': address,
        if (city != null) 'city': city,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      };
}