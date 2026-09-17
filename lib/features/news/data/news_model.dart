// =============================================================================
// news_model.dart
// -----------------------------------------------------------------------------
// Defines the core data model for disaster-related news and alerts in the DMS
// (Disaster Management System) mobile application. This file provides the
// [NewsItem] immutable value class and supporting utilities used across the
// news feature layer. Data may originate from three sources:
//   1. ReliefWeb — humanitarian situation reports and disaster news articles
//   2. USGS Earthquake Hazards Program — real-time seismic event feeds
//   3. DMS internal alerts — emergency alerts broadcast by DMS operators
// =============================================================================

/// Immutable data model representing a single news item or emergency alert
/// shown in the DMS news feed. Normalises fields from heterogeneous external
/// APIs into one unified structure for the UI layer.
class NewsItem {
  /// Unique identifier for this news item; sourced from the originating API
  /// (e.g. ReliefWeb report ID, USGS event code, or DMS alert UUID).
  final String id;

  /// Human-readable headline or event title displayed in the news list and
  /// detail views (e.g. "Earthquake M7.2 — Turkey").
  final String title;

  /// Name of the originating data source, shown as a label in the UI
  /// (e.g. "ReliefWeb", "USGS", "DMS Alert").
  final String source;

  /// ISO-8601 date/time string representing when the event was created or
  /// detected; used for sorting and display in the news feed.
  final String date;

  /// Optional deep-link URL to the full article or event page on the external
  /// source website; may be null if the API did not return a link.
  final String? url;

  /// Optional URL pointing to a thumbnail or cover image for the news item;
  /// may be null when no image is available from the source API.
  final String? imageUrl;

  /// Normalised disaster category string used for filtering and emoji/icon
  /// selection (e.g. "earthquake", "flood", "fire", "storm", "conflict").
  final String category;

  /// Optional short description or body text summarising the event; used in
  /// the news detail view and as a preview snippet in list cards.
  final String? summary;

  /// Whether this item should be treated as an active emergency alert —
  /// true for DMS-issued alerts and high-magnitude USGS events (M >= 6.0);
  /// alerts are visually highlighted and may trigger push notifications.
  final bool isAlert;

  /// Creates a [NewsItem] with all required fields enforced.
  /// [isAlert] defaults to false so routine news articles need not set it.
  const NewsItem({
    required this.id,
    required this.title,
    required this.source,
    required this.date,
    this.url,
    this.imageUrl,
    required this.category,
    this.summary,
    this.isAlert = false,
  });

  /// Constructs a [NewsItem] from a raw ReliefWeb API response map.
  ///
  /// ReliefWeb wraps all content fields inside a nested `fields` object;
  /// the top-level map only carries metadata such as `id`. The category is
  /// inferred automatically from the article title via [_detectCategory]
  /// because ReliefWeb does not provide a machine-readable disaster type.
  factory NewsItem.fromReliefWeb(Map<String, dynamic> json) {
    // Extract the nested `fields` object; fall back to an empty map if absent
    // so subsequent field accesses do not throw on malformed API responses.
    final fields = json['fields'] as Map<String, dynamic>? ?? {};

    // ReliefWeb encodes date information as a sub-object; `created` holds the
    // ISO-8601 publication timestamp we display in the news feed.
    final dateObj = fields['date'] as Map<String, dynamic>?;

    return NewsItem(
      // Convert numeric API IDs to strings for a uniform [id] type across sources.
      id:       json['id']?.toString() ?? '',

      // Fall back to "Untitled" to avoid blank cards in the news list UI.
      title:    fields['title'] as String? ?? 'Untitled',

      // Hard-code source label so the UI can attribute the article correctly.
      source:   'ReliefWeb',

      // Use the nested creation timestamp; empty string signals a missing date.
      date:     dateObj?['created'] as String? ?? '',

      // `url_alias` is ReliefWeb's canonical slug URL for the report page.
      url:      fields['url_alias'] as String?,

      // Infer disaster category from title keywords — ReliefWeb has no type field.
      category: _detectCategory(fields['title'] as String? ?? ''),

      // `body` is the article body text; used as the summary/description.
      summary:  fields['body'] as String?,
    );
  }

  /// Constructs a [NewsItem] from a USGS GeoJSON feature `properties` map.
  ///
  /// USGS earthquake events carry magnitude, location, time, and tsunami/alert
  /// metadata. Items with magnitude >= 6.0 are flagged as emergency alerts
  /// because they are likely to cause significant casualties or infrastructure
  /// damage relevant to DMS response teams.
  factory NewsItem.fromUSGS(Map<String, dynamic> props) {
    // Parse magnitude as a double; default to 0 if the field is missing to
    // avoid null-check failures when formatting the title and summary strings.
    final mag = (props['mag'] as num?)?.toDouble() ?? 0;

    return NewsItem(
      // USGS uses an alphanumeric event code as its unique identifier.
      id:       props['code']?.toString() ?? '',

      // Compose a descriptive title with magnitude and place name so users
      // can assess severity at a glance without opening the detail view.
      title:    '🌍 Earthquake M${mag.toStringAsFixed(1)} — ${props['place'] ?? 'Unknown location'}',

      // Always attribute USGS data to make the source traceable in the UI.
      source:   'USGS',

      // USGS provides time as milliseconds since epoch; convert to ISO-8601
      // so the same date-formatting utilities used by other sources apply.
      date:     DateTime.fromMillisecondsSinceEpoch(props['time'] as int? ?? 0).toIso8601String(),

      // Direct link to the USGS event detail page for first responders.
      url:      props['url'] as String?,

      // All USGS events are seismic by definition.
      category: 'earthquake',

      // Build a human-readable summary including tsunami risk so DMS operators
      // can immediately gauge the need for coastal evacuation orders.
      summary:  'Magnitude ${mag.toStringAsFixed(1)} earthquake detected. Tsunami risk: ${props['tsunami'] == 1 ? "YES" : "No"}. Alert: ${props['alert'] ?? 'None'}',

      // Flag as an emergency alert for events likely to trigger DMS response
      // protocols; M6.0 is the internationally recognised major-quake threshold.
      isAlert:  mag >= 6.0,
    );
  }

  /// Constructs a [NewsItem] from a DMS internal alert payload.
  ///
  /// DMS alerts are issued directly by system operators or automated monitoring
  /// rules and always carry [isAlert] = true so they receive priority display
  /// treatment (e.g. banner notifications, red highlight in the feed).
  factory NewsItem.fromAlert(Map<String, dynamic> json) {
    return NewsItem(
      // DMS alert IDs may be numeric or UUID strings; normalise to String.
      id:       json['id']?.toString() ?? '',

      // Accept either a structured `title` or a raw `message` string as the
      // display headline; fall back to a generic label if neither is present.
      title:    json['title'] as String? ?? json['message'] as String? ?? 'Emergency Alert',

      // Label identifies this item as originating from the DMS backend rather
      // than an external news or seismic data provider.
      source:   'DMS Alert',

      // Accept multiple timestamp field names used across different DMS alert
      // schema versions; default to now so the item always has a valid date.
      date:     json['createdAt'] as String? ?? json['timestamp'] as String? ?? DateTime.now().toIso8601String(),

      // Normalise the alert type to lowercase for consistent category matching
      // with filters and the [newsEmoji] utility function.
      category: (json['type'] as String? ?? 'general').toLowerCase(),

      // Use either a structured description or the raw message body as the
      // human-readable summary shown on the alert detail screen.
      summary:  json['description'] as String? ?? json['message'] as String?,

      // All DMS-issued alerts are flagged true regardless of severity level.
      isAlert:  true,
    );
  }

  /// Returns the category-specific emoji character for this news item,
  /// delegating to the top-level [newsEmoji] utility so display widgets
  /// need not contain category-to-emoji mapping logic directly.
  String get emoji => newsEmoji(category);

  /// Convenience alias for [summary]; allows UI widgets to reference the body
  /// text through a semantically meaningful `description` property name.
  String? get description => summary;

  /// Infers a normalised disaster category string by scanning [title] for
  /// domain-specific keywords. This is used for ReliefWeb items which lack a
  /// machine-readable type field, enabling category-based filtering and
  /// appropriate icon selection in the DMS news feed.
  static String _detectCategory(String title) {
    // Lowercase once for all comparisons to avoid repeated case conversion.
    final t = title.toLowerCase();

    // Seismic events — map both "earthquake" and scientific "seismic" terms.
    if (t.contains('earthquake') || t.contains('seismic')) return 'earthquake';

    // Hydrological events — heavy rainfall is often a precursor to flooding.
    if (t.contains('flood') || t.contains('rain')) return 'flood';

    // Wildfire events — both general "fire" and the specific "wildfire" term.
    if (t.contains('fire') || t.contains('wildfire')) return 'fire';

    // Tropical cyclone events — covers Atlantic (hurricane), Pacific (typhoon),
    // and generic (cyclone) naming conventions used across different regions.
    if (t.contains('hurricane') || t.contains('cyclone') || t.contains('typhoon')) return 'storm';

    // Conflict and security events — relevant to DMS humanitarian response.
    if (t.contains('war') || t.contains('conflict') || t.contains('attack')) return 'conflict';

    // Volcanic events — "eruption" catches reports that omit "volcano".
    if (t.contains('volcano') || t.contains('eruption')) return 'volcano';

    // Tsunami events — separate category from earthquake due to coastal impact.
    if (t.contains('tsunami')) return 'tsunami';

    // Drought events — slow-onset disaster tracked by DMS resource planners.
    if (t.contains('drought')) return 'drought';

    // Default: insufficient keywords to classify; shown with a generic icon.
    return 'general';
  }
}

/// Maps a normalised disaster [category] string to a representative emoji
/// character used as a visual shorthand in news feed list items and badges.
///
/// Keeping this as a top-level function (rather than a method) allows it to
/// be reused by widgets and other models without importing the full [NewsItem]
/// class, and simplifies unit testing of the mapping table in isolation.
String newsEmoji(String category) {
  switch (category) {
    // Globe emoji reinforces the seismic/tectonic scale of earthquake events.
    case 'earthquake': return '🌍';

    // Wave emoji used for both flood and tsunami — large water-related events.
    case 'flood':      return '🌊';

    // Flame emoji for wildfire and structural fire incidents.
    case 'fire':       return '🔥';

    // Tornado/cyclone emoji covers hurricanes, typhoons, and severe storms.
    case 'storm':      return '🌪️';

    // Warning sign for armed conflict — neutral symbol avoiding graphic icons.
    case 'conflict':   return '⚠️';

    // Volcano emoji for eruption and volcanic hazard reports.
    case 'volcano':    return '🌋';

    // Separate case for tsunami even though it shares the wave emoji with flood,
    // allowing independent emoji customisation in the future.
    case 'tsunami':    return '🌊';

    // Sun emoji conveys the heat and arid conditions associated with drought.
    case 'drought':    return '☀️';

    // Newspaper emoji as a neutral fallback for uncategorised news items.
    default:           return '📰';
  }
}