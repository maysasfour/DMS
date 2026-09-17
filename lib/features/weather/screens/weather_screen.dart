// Weather screen for the DMS Flutter app.
// Displays real-time weather data fetched from the Open-Meteo API via weatherProvider:
//   - _CurrentWeatherCard : large emoji + temperature + wind/direction/rain chips
//   - _SevereWeatherAlert : animated shake banner for WMO codes >= 80 (thunderstorm, hail)
//   - _HourlyForecast     : horizontally scrollable 24-hour temperature + rain-probability strip
//   - _WeatherStats       : today's high/low/rain/wind stats in a 4-column row
//   - _DayCard list       : 7-day forecast rows with weather icon, description, and temp range
//   - _UVCard             : today's UV index with color-coded risk level and advice text
// A refresh button in the AppBar invalidates weatherProvider to re-fetch fresh data.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ConsumerWidget, ref.watch, ref.invalidate
import 'package:flutter_animate/flutter_animate.dart'; // fadeIn, shake, slideX entry animations
import 'package:google_fonts/google_fonts.dart'; // Rajdhani font for temperature and day labels
import '../../../core/constants/app_colors.dart'; // primary, secondary, border color tokens
import '../data/weather_model.dart'; // WeatherData, DayForecast, HourForecast, weatherEmoji(), isWeatherSevere()
import '../providers/weather_provider.dart'; // weatherProvider FutureProvider
import '../../../core/l10n/app_strings.dart'; // t() for 'weather_title' localized string

class WeatherScreen extends ConsumerWidget {
  const WeatherScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final weatherAsync = ref.watch(weatherProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(t(context, ref, 'weather_title').toUpperCase(), style: GoogleFonts.rajdhani(color: AppColors.secondary, fontWeight: FontWeight.w700, letterSpacing: 3)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.secondary),
            onPressed: () => ref.invalidate(weatherProvider),
          ),
        ],
      ),
      body: weatherAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.secondary)),
        error: (e, _) => _ErrorWidget(onRetry: () => ref.invalidate(weatherProvider)),
        data: (w) => _WeatherBody(weather: w),
      ),
    );
  }
}

class _WeatherBody extends StatelessWidget {
  final WeatherData weather;
  const _WeatherBody({required this.weather});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _CurrentWeatherCard(weather: weather).animate().fadeIn(duration: 500.ms),
          const SizedBox(height: 20),
          if (isWeatherSevere(weather.weatherCode))
            _SevereWeatherAlert(code: weather.weatherCode).animate().shake(hz: 2),
          const SizedBox(height: 16),
          _HourlyForecast(hourly: weather.hourly).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 20),
          _WeatherStats(weather: weather).animate().fadeIn(delay: 300.ms),
          const SizedBox(height: 20),
          const _WeatherSectionTitle('7-DAY FORECAST'),
          const SizedBox(height: 12),
          ...List.generate(weather.daily.length, (i) =>
            _DayCard(day: weather.daily[i], isToday: i == 0)
              .animate().slideX(begin: 0.1, delay: (i * 60).ms)),
          const SizedBox(height: 24),
          _UVCard(uvIndex: weather.daily.isNotEmpty ? weather.daily[0].uvIndex : 0)
            .animate().fadeIn(delay: 400.ms),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _CurrentWeatherCard extends StatelessWidget {
  final WeatherData weather;
  const _CurrentWeatherCard({required this.weather});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0D2040),
            const Color(0xFF0A0A1A),
            AppColors.secondary.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
        boxShadow: [BoxShadow(color: AppColors.secondary.withValues(alpha: 0.08), blurRadius: 30)],
      ),
      child: Column(
        children: [
          Text(weatherEmoji(weather.weatherCode), style: const TextStyle(fontSize: 72)),
          const SizedBox(height: 8),
          Text(
            '${weather.temperature.round()}°C',
            style: GoogleFonts.rajdhani(
              color: Colors.white,
              fontSize: 64,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            weatherDescription(weather.weatherCode).toUpperCase(),
            style: GoogleFonts.rajdhani(
              color: AppColors.secondary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              letterSpacing: 3,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _WeatherChip(Icons.air, '${weather.windSpeed.round()} km/h', 'WIND'),
              _WeatherChip(Icons.explore, _windDir(weather.windDirection), 'DIRECTION'),
              if (weather.daily.isNotEmpty)
                _WeatherChip(Icons.water_drop, '${weather.daily[0].precipitation.toStringAsFixed(1)}mm', 'RAIN'),
            ],
          ),
        ],
      ),
    );
  }

  String _windDir(double deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[((deg + 22.5) / 45).floor() % 8];
  }
}

class _WeatherChip extends StatelessWidget {
  final IconData icon;
  final String value, label;
  const _WeatherChip(this.icon, this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppColors.secondary, size: 18),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.rajdhani(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
        Text(label, style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white38 : Colors.black38, fontSize: 9, letterSpacing: 1)),
      ],
    );
  }
}

class _SevereWeatherAlert extends StatelessWidget {
  final int code;
  const _SevereWeatherAlert({required this.code});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: AppColors.primary, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SEVERE WEATHER ALERT', style: GoogleFonts.rajdhani(color: AppColors.primary, fontWeight: FontWeight.w800, letterSpacing: 1)),
                Text('${weatherEmoji(code)} ${weatherDescription(code)} — Take precautions and stay safe.',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HourlyForecast extends StatelessWidget {
  final List<HourForecast> hourly;
  const _HourlyForecast({required this.hourly});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _WeatherSectionTitle('NEXT 24 HOURS'),
        const SizedBox(height: 12),
        SizedBox(
          height: 90,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: hourly.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (ctx, i) {
              final h = hourly[i];
              final time = h.time.split('T')[1].substring(0, 5);
              return Container(
                width: 60,
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0D1117) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Text(time, style: TextStyle(color: Theme.of(ctx).brightness == Brightness.dark ? Colors.white38 : Colors.black38, fontSize: 10)),
                    Text(weatherEmoji(h.weatherCode), style: const TextStyle(fontSize: 18)),
                    Text('${h.temperature.round()}°', style: GoogleFonts.rajdhani(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                    if (h.precipitationProb > 0)
                      Text('${h.precipitationProb.round()}%', style: const TextStyle(color: AppColors.secondary, fontSize: 9)),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _WeatherStats extends StatelessWidget {
  final WeatherData weather;
  const _WeatherStats({required this.weather});

  @override
  Widget build(BuildContext context) {
    final today = weather.daily.isNotEmpty ? weather.daily[0] : null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0D1117) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const _WeatherSectionTitle('TODAY\'S STATS'),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _StatTile('🌡️', 'HIGH', today != null ? '${today.maxTemp.round()}°C' : '--', AppColors.primary)),
              Expanded(child: _StatTile('🌡️', 'LOW', today != null ? '${today.minTemp.round()}°C' : '--', AppColors.secondary)),
              Expanded(child: _StatTile('💧', 'RAIN', today != null ? '${today.precipitation}mm' : '--', const Color(0xFF3B82F6))),
              Expanded(child: _StatTile('💨', 'WIND', '${weather.windSpeed.round()}km/h', AppColors.success)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String emoji, label, value;
  final Color color;
  const _StatTile(this.emoji, this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 18)),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.rajdhani(color: color, fontSize: 15, fontWeight: FontWeight.w700)),
        Text(label, style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white38 : Colors.black38, fontSize: 9, letterSpacing: 1)),
      ],
    );
  }
}

class _DayCard extends StatelessWidget {
  final DayForecast day;
  final bool isToday;
  const _DayCard({required this.day, required this.isToday});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(day.date);
    final dayName = date != null
        ? (isToday ? 'TODAY' : _weekday(date.weekday))
        : day.date;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isToday ? AppColors.secondary.withValues(alpha: 0.08) : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isToday ? AppColors.secondary.withValues(alpha: 0.4) : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Text(dayName, style: GoogleFonts.rajdhani(
              color: isToday ? AppColors.secondary : Colors.white70,
              fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 1,
            )),
          ),
          Text(weatherEmoji(day.weatherCode), style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(weatherDescription(day.weatherCode),
                style: const TextStyle(color: Colors.white54, fontSize: 12)),
          ),
          if (day.precipitation > 0)
            Container(
              margin: const EdgeInsets.only(right: 8),
              child: Text('${day.precipitation.toStringAsFixed(1)}mm',
                  style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 11)),
            ),
          Text('${day.maxTemp.round()}°', style: GoogleFonts.rajdhani(color: AppColors.primary, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(width: 4),
          Text('/${day.minTemp.round()}°', style: GoogleFonts.rajdhani(color: AppColors.secondary, fontSize: 14)),
        ],
      ),
    );
  }

  String _weekday(int wd) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[(wd - 1) % 7].toUpperCase();
  }
}

class _UVCard extends StatelessWidget {
  final double uvIndex;
  const _UVCard({required this.uvIndex});

  Color get _uvColor {
    if (uvIndex <= 2) return AppColors.success;
    if (uvIndex <= 5) return AppColors.warning;
    if (uvIndex <= 7) return const Color(0xFFFF7A00);
    return AppColors.primary;
  }

  String get _uvLabel {
    if (uvIndex <= 2) return 'Low';
    if (uvIndex <= 5) return 'Moderate';
    if (uvIndex <= 7) return 'High';
    if (uvIndex <= 10) return 'Very High';
    return 'Extreme';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _uvColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _uvColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _uvColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('☀️', style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('UV INDEX', style: const TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 2)),
                Row(children: [
                  Text('${uvIndex.round()}', style: GoogleFonts.rajdhani(color: _uvColor, fontSize: 28, fontWeight: FontWeight.w800)),
                  const SizedBox(width: 8),
                  Text(_uvLabel, style: TextStyle(color: _uvColor, fontSize: 14, fontWeight: FontWeight.w600)),
                ]),
                Text(
                  uvIndex >= 6 ? 'Apply sunscreen. Wear protective clothing.' : 'Safe for outdoor activities.',
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WeatherSectionTitle extends StatelessWidget {
  final String title;
  const _WeatherSectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(title, style: const TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 2, fontWeight: FontWeight.w700));
  }
}

class _ErrorWidget extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorWidget({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('🌩️', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 16),
        const Text('Could not load weather', style: TextStyle(color: Colors.white54)),
        const SizedBox(height: 8),
        const Text('Check your internet connection', style: TextStyle(color: Colors.white30, fontSize: 12)),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh, color: AppColors.secondary),
          label: const Text('RETRY', style: TextStyle(color: AppColors.secondary)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.secondary)),
        ),
      ]),
    );
  }
}
