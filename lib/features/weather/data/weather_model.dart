// ---------------------------------------------------------------------------
// File: lib/features/weather/data/weather_model.dart
//
// Purpose: Defines the data models used by the DMS weather feature to parse
// and represent meteorological information fetched from the Open-Meteo API.
// These models feed the weather dashboard, allowing emergency coordinators
// and field officers to assess current conditions, multi-day outlooks, and
// hour-by-hour forecasts relevant to active or potential disaster incidents.
//
// Key models:
//   - WeatherData   : top-level container for current conditions + forecasts
//   - DayForecast   : one day's aggregated weather summary (7-day outlook)
//   - HourForecast  : one hour's conditions (next 24-hour view)
//
// Helper functions:
//   - weatherDescription : converts a WMO code to a human-readable label
//   - weatherEmoji       : returns a display emoji for UI weather indicators
//   - isWeatherSevere    : flags WMO codes that represent hazardous conditions
// ---------------------------------------------------------------------------

/// Represents the full weather payload returned by the Open-Meteo API,
/// including current conditions, a daily forecast list, and an hourly breakdown.
/// Used throughout the DMS to surface weather risk data alongside incident reports.
class WeatherData {
  /// Current air temperature in degrees Celsius at the incident or base location.
  final double temperature;

  /// WMO weather interpretation code describing current sky/precipitation state.
  /// See [weatherDescription] and [weatherEmoji] for human-readable conversions.
  final int weatherCode;

  /// Current wind speed in km/h; elevated values may affect aerial response assets.
  final double windSpeed;

  /// Wind direction in degrees (0–360, meteorological convention, 0 = North).
  /// Helps DMS operators assess smoke, hazmat plume, or wildfire spread direction.
  final double windDirection;

  /// IANA timezone string of the queried location (e.g. "Asia/Riyadh").
  /// Ensures displayed times are localised to the disaster zone's timezone.
  final String timezone;

  /// Multi-day forecast list, typically covering 7 days ahead.
  /// Used by coordinators to plan resource deployment and evacuation windows.
  final List<DayForecast> daily;

  /// Hour-by-hour forecast for the next 24 hours.
  /// Provides fine-grained situational awareness for active field operations.
  final List<HourForecast> hourly;

  /// All fields are required; the object is immutable after construction.
  const WeatherData({
    required this.temperature,
    required this.weatherCode,
    required this.windSpeed,
    required this.windDirection,
    required this.timezone,
    required this.daily,
    required this.hourly,
  });

  /// Deserialises a raw Open-Meteo JSON response into a [WeatherData] instance.
  /// The API returns three top-level sections: current_weather, daily, and hourly.
  factory WeatherData.fromJson(Map<String, dynamic> json) {
    // Extract the three main sections from the API response.
    final cw = json['current_weather'] as Map<String, dynamic>; // current conditions
    final d  = json['daily'] as Map<String, dynamic>;           // daily arrays
    final h  = json['hourly'] as Map<String, dynamic>;          // hourly arrays

    // Pull date strings for the daily forecast; used as loop indices below.
    final times   = (d['time'] as List).cast<String>();

    // Hourly time labels (ISO-8601 strings like "2026-07-11T14:00").
    final hTimes  = (h['time'] as List).cast<String>();

    // Temperature at 2 m above ground for each hourly slot, cast to double.
    final hTemps  = (h['temperature_2m'] as List).map((e) => (e as num).toDouble()).toList();

    // WMO weather codes for each hourly slot, cast to int.
    final hCodes  = (h['weathercode'] as List).map((e) => (e as num).toInt()).toList();

    // Precipitation probability (0–100 %) per hourly slot; nullable — API may omit it.
    final hPrec   = (h['precipitation_probability'] as List?)?.map((e) => (e as num).toDouble()).toList();

    return WeatherData(
      // Current temperature from the live-conditions block.
      temperature:    (cw['temperature'] as num).toDouble(),

      // Current WMO code; drives the weather icon shown on the dashboard.
      weatherCode:    (cw['weathercode'] as num).toInt(),

      // Current wind speed; shown alongside incident location on the map overlay.
      windSpeed:      (cw['windspeed'] as num).toDouble(),

      // Current wind direction; helps assess smoke/hazard plume spread direction.
      windDirection:  (cw['winddirection'] as num).toDouble(),

      // Timezone falls back to empty string if omitted to avoid null crashes.
      timezone:       json['timezone'] as String? ?? '',

      // Build one DayForecast per date entry in the daily array.
      daily: List.generate(times.length, (i) => DayForecast(
        date:          times[i],                                                               // ISO date string for this forecast day
        weatherCode:   (d['weathercode'] as List)[i] as int,                                  // dominant WMO code for the day
        maxTemp:       ((d['temperature_2m_max'] as List)[i] as num).toDouble(),               // daytime high — heat-stress indicator
        minTemp:       ((d['temperature_2m_min'] as List)[i] as num).toDouble(),               // overnight low — hypothermia risk
        precipitation: ((d['precipitation_sum'] as List)[i] as num? ?? 0).toDouble(),         // total daily rainfall in mm; null → 0
        windMax:       ((d['windspeed_10m_max'] as List)[i] as num? ?? 0).toDouble(),         // peak wind gust; null → 0
        uvIndex:       ((d['uv_index_max'] as List?)?.elementAtOrNull(i) as num? ?? 0).toDouble(), // UV peak; list may be absent from API
      )),

      // Limit hourly forecast to 24 entries (next 24 h) even if API returns more.
      hourly: List.generate(
        hTimes.length > 24 ? 24 : hTimes.length, // cap at 24 hours for UI display
        (i) => HourForecast(
          time:                  hTimes[i],                          // hour timestamp string
          temperature:           hTemps[i],                          // temperature at this hour
          weatherCode:           hCodes[i],                          // WMO code at this hour
          precipitationProb:     hPrec != null ? hPrec[i] : 0,       // % chance of rain; default 0 if data absent
        ),
      ),
    );
  }
}

/// Holds aggregated weather data for a single calendar day.
/// Displayed in the DMS 7-day forecast strip to help coordinators
/// anticipate worsening conditions or plan multi-day response logistics.
class DayForecast {
  /// ISO-8601 date string (e.g. "2026-07-11") identifying this forecast day.
  final String date;

  /// WMO code representing the predominant weather condition for the day.
  /// Determines the icon and severity badge shown in the daily forecast tile.
  final int weatherCode;

  /// Highest expected temperature in °C — relevant for heat-related incident risk.
  /// Lowest expected temperature in °C — relevant for cold-exposure risk.
  /// Total precipitation expected in mm — flooding and road-access indicator.
  /// Maximum wind speed in km/h — affects aerial operations and wildfire spread.
  /// Peak UV index for the day — affects prolonged outdoor rescue operations.
  final double maxTemp, minTemp, precipitation, windMax, uvIndex;

  /// All forecast fields are required; object is immutable (const constructor).
  const DayForecast({
    required this.date,
    required this.weatherCode,
    required this.maxTemp,
    required this.minTemp,
    required this.precipitation,
    required this.windMax,
    required this.uvIndex,
  });
}

/// Holds weather data for a single hour within the next 24-hour window.
/// Rendered in the DMS hourly timeline so field teams can time deployments
/// around rain windows, poor visibility, or storm onset.
class HourForecast {
  /// ISO-8601 datetime string (e.g. "2026-07-11T14:00") for this hourly slot.
  final String time;

  /// Air temperature in °C at this hour.
  /// Probability of precipitation (0–100 %) at this hour.
  /// Both drive the colour-coded risk indicators in the hourly timeline UI.
  final double temperature, precipitationProb;

  /// WMO weather interpretation code for this hour; used to select the hour's icon.
  final int weatherCode;

  /// All fields required; immutable after construction.
  const HourForecast({
    required this.time,
    required this.temperature,
    required this.weatherCode,
    required this.precipitationProb,
  });
}

// WMO weather code helpers — translates numeric Open-Meteo codes into
// human-readable labels and visual indicators for the DMS weather UI.

/// Returns a plain-English description for a given WMO weather interpretation code.
/// Used to populate weather-condition labels on the DMS incident and dashboard screens.
String weatherDescription(int code) {
  if (code == 0) return 'Clear Sky';       // no cloud cover; ideal for aerial response
  if (code <= 2) return 'Partly Cloudy';   // codes 1–2: slight to moderate cloud cover
  if (code == 3) return 'Overcast';        // complete cloud cover; reduced visibility
  if (code <= 48) return 'Foggy';          // codes 10–48: various fog/rime ice conditions
  if (code <= 55) return 'Drizzle';        // codes 51–55: light drizzle intensities
  if (code <= 65) return 'Rain';           // codes 61–65: moderate to heavy rain
  if (code <= 77) return 'Snow';           // codes 71–77: snow fall intensities
  if (code <= 82) return 'Rain Showers';   // codes 80–82: showers — short but intense bursts
  if (code <= 86) return 'Snow Showers';   // codes 85–86: snow shower intensities
  if (code == 95) return 'Thunderstorm';   // code 95: thunderstorm without heavy hail
  return 'Severe Storm';                   // codes 96–99: thunderstorm with heavy hail
}

/// Returns a weather emoji corresponding to a WMO code for compact UI display.
/// Emojis appear in forecast tiles, push notifications, and alert banners.
String weatherEmoji(int code) {
  if (code == 0) return '☀️';   // clear sky
  if (code <= 2) return '⛅';   // partly cloudy
  if (code == 3) return '☁️';   // overcast
  if (code <= 48) return '🌫️';  // fog
  if (code <= 55) return '🌦️';  // drizzle
  if (code <= 65) return '🌧️';  // rain
  if (code <= 77) return '🌨️';  // snow
  if (code <= 82) return '🌦️';  // rain showers (reuses drizzle-rain icon)
  if (code <= 86) return '❄️';   // snow showers
  return '⛈️';                   // thunderstorm / severe storm
}

/// Returns true when the WMO code indicates severe or hazardous weather (code >= 80).
/// Used by the DMS alert engine to automatically flag incidents where weather
/// conditions may impede response or pose additional risk to affected communities.
bool isWeatherSevere(int code) => code >= 80;