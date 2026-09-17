// ─────────────────────────────────────────────────────────────────────────────
// File: lib/features/news/screens/news_screen.dart
//
// Purpose: Displays a real-time disaster news feed within the DMS mobile app.
//          Aggregates news items fetched from the news provider (API/RSS),
//          allowing responders and citizens to monitor active disaster alerts,
//          breaking incidents (earthquakes, floods, fires, conflicts, etc.),
//          and humanitarian situation reports. Also surfaces curated live news
//          channel shortcuts so users can open external outlets (Al Jazeera,
//          BBC, GDACS, ReliefWeb, etc.) directly from the app.
//
// Architecture: Riverpod ConsumerWidget pattern — UI reactively rebuilds on
//               news data changes, category filter changes, and locale switches.
// Screen flow:  Live channel cards → Category filter chips → Alert banner
//               (if alerts exist) → News card list → Empty / error states.
// ─────────────────────────────────────────────────────────────────────────────

// Flutter UI framework — required for all widget building
import 'package:flutter/material.dart';
// Riverpod state-management — used to watch news and category providers
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Google Fonts — provides Rajdhani font matching the DMS neon cyberpunk design system
import 'package:google_fonts/google_fonts.dart';
// timeago — converts UTC timestamps on news items into human-readable relative times (e.g. "3 minutes ago")
import 'package:timeago/timeago.dart' as timeago;
// url_launcher — opens external news website URLs in the device's default browser
import 'package:url_launcher/url_launcher.dart';

// DMS colour palette (neon cyberpunk theme with dark/light CSS variable equivalents)
import '../../../core/constants/app_colors.dart';
// Localisation helper — resolves translated string keys for the active locale
import '../../../core/l10n/app_strings.dart';
// Locale state provider — watched so the UI rebuilds when the user switches language
import '../../../providers/locale_provider.dart';
// Data model describing a single news / alert item returned by the news API
import '../data/news_model.dart';
// Riverpod providers for fetching news items and tracking the selected category filter
import '../providers/news_provider.dart';

// ── News Website Channels ─────────────────────────────────────────────────────

/// Lightweight data class representing a curated live-news channel.
/// Shown as horizontally scrollable channel cards so DMS users can quickly
/// jump to authoritative disaster and humanitarian news sources.
class _Channel {
  /// Display name of the news outlet shown on the channel card
  final String name;
  /// Full URL of the news outlet's website, opened via url_launcher
  final String url;
  /// Short tagline describing the outlet's focus area (e.g. "Humanitarian disasters")
  final String description;
  /// Brand colour used as the card's gradient accent
  final Color color;
  /// Material icon representing the outlet's media type (TV, newspaper, globe, etc.)
  final IconData icon;

  /// All fields are required; const constructor allows compile-time constant channel list
  const _Channel(this.name, this.url, this.description, this.color, this.icon);
}

/// Compile-time constant list of curated disaster/humanitarian news channels.
/// Includes global broadcasters (Al Jazeera, BBC, CNN) and specialist
/// disaster-tracking services (ReliefWeb, GDACS) critical to DMS operations.
const _liveChannels = [
  // Al Jazeera — broad world and breaking-news coverage relevant to conflict and disasters
  _Channel('Al Jazeera',  'https://www.aljazeera.com',              'World & breaking news',   Color(0xFFFFB800), Icons.language),
  // BBC News — authoritative UK and global news; frequently first to report major disasters
  _Channel('BBC News',    'https://www.bbc.com/news',               'UK & global news',        Color(0xFFCC0000), Icons.tv),
  // CNN — US-based breaking news outlet with strong field disaster coverage
  _Channel('CNN',         'https://edition.cnn.com',                'Breaking news & more',    Color(0xFFE50914), Icons.live_tv),
  // ReliefWeb — UN OCHA's humanitarian information service for active disaster responses
  _Channel('ReliefWeb',   'https://reliefweb.int',                  'Humanitarian disasters',  Color(0xFF2563EB), Icons.public),
  // GDACS — EU-JRC's Global Disaster Alert and Coordination System; provides near-real-time alerts
  _Channel('GDACS',       'https://www.gdacs.org',                  'Global disaster alerts',  Color(0xFF16A34A), Icons.warning_amber),
  // France 24 — international broadcaster with strong Middle-East and African disaster reporting
  _Channel('France 24',   'https://www.france24.com/en',            'International news',      Color(0xFF0057A8), Icons.newspaper),
];

/// Filter categories matching the disaster taxonomy used across the DMS system.
/// Each record tuple holds: (provider filter key, display emoji, label).
/// 'all' maps to an empty filter string, showing the full unfiltered feed.
const _cats = [
  ('all','🌐','All'), ('alert','🚨','Alerts'), ('earthquake','🌍','Quakes'),
  ('flood','🌊','Floods'), ('fire','🔥','Fire'), ('conflict','⚔️','Conflict'),
  ('storm','🌪️','Storm'), ('medical','🏥','Medical'),
];

// ── Category visual helpers ───────────────────────────────────────────────────

/// Returns a two-stop gradient [start, end] that visually encodes the disaster
/// category — dark base with a vivid accent colour matching the hazard type.
/// Used as the thumbnail background on each news card so responders can
/// identify disaster type at a glance before reading the headline.
List<Color> _categoryGradient(String cat) {
  switch (cat.toLowerCase()) {
    // Seismic events: dark orange-red evokes cracked earth
    case 'earthquake': return [const Color(0xFF8B2500), const Color(0xFFFF4500)];
    // Flood events: deep blue to vivid blue evokes rising water
    case 'flood':      return [const Color(0xFF003580), const Color(0xFF0078FF)];
    // Fire/wildfire events: dark crimson to orange flame
    case 'fire':       return [const Color(0xFF8B0000), const Color(0xFFFF6600)];
    // Storm/cyclone events: near-black indigo to electric purple for chaotic skies
    case 'storm':      return [const Color(0xFF1A1A40), const Color(0xFF5050CC)];
    // Conflict/civil unrest events: dark to blood-red for danger
    case 'conflict':   return [const Color(0xFF3D0000), const Color(0xFFAA0000)];
    // Volcanic eruptions: near-black to lava-orange
    case 'volcano':    return [const Color(0xFF4A0000), const Color(0xFFFF2200)];
    // Tsunami events: deep navy to intense blue wave
    case 'tsunami':    return [const Color(0xFF002060), const Color(0xFF0040FF)];
    // Medical/epidemic events: dark teal to cyan-green for health/clinical feel
    case 'medical':    return [const Color(0xFF002B2B), const Color(0xFF00AA88)];
    // Generic fallback for uncategorised news items
    default:           return [const Color(0xFF1A1A2E), const Color(0xFF16213E)];
  }
}

/// Returns the emoji icon that represents each disaster category.
/// Displayed as a large centred glyph on the news card thumbnail so
/// DMS users can quickly identify the hazard type without reading the label.
String _categoryEmoji(String cat) {
  switch (cat.toLowerCase()) {
    case 'earthquake': return '🌍';
    case 'flood':      return '🌊';
    case 'fire':       return '🔥';
    case 'storm':      return '🌪️';
    case 'conflict':   return '⚔️';
    case 'volcano':    return '🌋';
    // Tsunami shares the wave emoji with flood for visual consistency
    case 'tsunami':    return '🌊';
    case 'medical':    return '🏥';
    // Default newspaper emoji for general or uncategorised news
    default:           return '📰';
  }
}

// ── News Screen ───────────────────────────────────────────────────────────────

/// Main news screen widget for the DMS app.
/// Uses [ConsumerWidget] (Riverpod) so it reactively rebuilds whenever the
/// news feed or selected category filter changes.
/// Presents: live channel shortcuts → category filter chips → disaster news list.
class NewsScreen extends ConsumerWidget {
  const NewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch locale so the entire screen rebuilds when the user switches language
    ref.watch(localeProvider);

    // Async news list from the news provider (loading / error / data states)
    final newsAsync = ref.watch(newsProvider);

    // Currently selected category filter key (empty string = show all)
    final category  = ref.watch(newsCategoryProvider);

    // Determine current brightness to apply appropriate light/dark styling
    final isDark    = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      // Honour the app-wide scaffold background (dark or light theme)
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Remove the default back arrow — this is a top-level tab screen
        automaticallyImplyLeading: false,
        // Localised "NEWS & ALERTS" title using the DMS Rajdhani display font
        title: Text(t(context, ref, 'news_alerts').toUpperCase(), style: GoogleFonts.rajdhani(
            color: AppColors.primary, fontWeight: FontWeight.w800, letterSpacing: 2, fontSize: 18)),
        centerTitle: true,
        actions: [
          // Manual refresh button — invalidates the news provider to re-fetch latest incidents
          IconButton(
            icon: Icon(Icons.refresh, color: isDark ? Colors.white54 : Colors.black45),
            // Invalidating newsProvider triggers a fresh API/RSS fetch
            onPressed: () => ref.invalidate(newsProvider),
          ),
        ],
      ),
      body: RefreshIndicator(
        // Pull-to-refresh accent colour matches DMS primary neon colour
        color: AppColors.primary,
        // Background of the pull indicator adapts to current theme
        backgroundColor: isDark ? AppColors.cardDark : Colors.white,
        // Re-fetch news on pull-to-refresh gesture
        onRefresh: () async => ref.invalidate(newsProvider),
        child: CustomScrollView(
          slivers: [
            // ── Live News Section ────────────────────────────────────────
            // Horizontal row of tappable channel cards linking to external news sites
            SliverToBoxAdapter(child: _LiveTVSection()),

            // ── Category chips ───────────────────────────────────────────
            // Horizontally scrollable filter strip for disaster categories (All, Alerts, Quakes, etc.)
            SliverToBoxAdapter(
              child: SizedBox(
                height: 44, // Fixed height to contain the chip row
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
                  itemCount: _cats.length,
                  // 8 px horizontal gap between each category chip
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, i) {
                    // Destructure the category tuple into key, emoji, and display label
                    final (key, emoji, label) = _cats[i];
                    // A chip is "selected" if: the user picked 'all' and no filter is active,
                    // or the chip key matches the active filter
                    final selected = (key == 'all' && category.isEmpty) || category == key;
                    return GestureDetector(
                      // Tapping 'all' clears the filter; tapping any other key applies it
                      onTap: () => ref.read(newsCategoryProvider.notifier).state = key == 'all' ? '' : key,
                      child: AnimatedContainer(
                        // Smooth 150 ms colour transition when a chip becomes selected/deselected
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          // Selected chip: faint primary tint; unselected: subtle grey/dark surface
                          color: selected ? AppColors.primary.withValues(alpha: 0.15) : (isDark ? const Color(0xFF1A1F2E) : Colors.grey.shade100),
                          borderRadius: BorderRadius.circular(20),
                          // Selected chip has a stronger, thicker primary border
                          border: Border.all(color: selected ? AppColors.primary : (isDark ? AppColors.border : Colors.grey.shade300), width: selected ? 1.5 : 1),
                        ),
                        // Emoji + label text; bold weight when selected for visual prominence
                        child: Text('$emoji $label', style: TextStyle(
                          color: selected ? AppColors.primary : (isDark ? Colors.white70 : Colors.black87),
                          fontSize: 12, fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
                      ),
                    );
                  },
                ),
              ),
            ),

            // ── News list ────────────────────────────────────────────────
            // Resolves the three async states of the news provider
            newsAsync.when(
              // Show a centred spinner while the news API/RSS response is in-flight
              loading: () => const SliverToBoxAdapter(child: Padding(
                padding: EdgeInsets.only(top: 60),
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              )),
              // Show a retry-capable error state when the fetch fails (network issues, API errors)
              error: (e, _) => SliverToBoxAdapter(child: _ErrorState(onRetry: () => ref.invalidate(newsProvider))),
              // Successful fetch: filter, count alerts, and render the card list
              data: (items) {
                // Apply category filter: pass-through if empty, otherwise match against item's category string
                final filtered = category.isEmpty ? items
                    : items.where((it) => it.category.toLowerCase().contains(category)).toList();
                // Count how many filtered items are flagged as active disaster alerts
                final alerts = filtered.where((it) => it.isAlert).length;
                return SliverList(delegate: SliverChildListDelegate([
                  // Show the alert count banner only when there are active alerts in the filtered view
                  if (alerts > 0) _AlertBanner(count: alerts),
                  // Show empty state when the selected category has no matching news
                  if (filtered.isEmpty)
                    const _EmptyNews()
                  else
                    // Render each news item as a card, passing dark-mode flag for theme-aware styling
                    ...List.generate(filtered.length, (i) => _NewsCard(item: filtered[i], index: i, isDark: isDark)),
                  // Bottom padding so the last card clears navigation bars
                  const SizedBox(height: 100),
                ]));
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Live News Section ─────────────────────────────────────────────────────────

/// Horizontal strip of curated live-news channel cards placed at the top of
/// the news screen. Provides DMS users with one-tap access to external news
/// outlets broadcasting disaster coverage.
class _LiveTVSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Resolve theme brightness for text colour switching (light vs dark mode)
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Section header row: coloured accent bar + "LIVE NEWS" label + "LIVE" badge
        Row(children: [
          // Thin vertical accent bar in DMS primary colour — visual design system marker
          Container(width: 3, height: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          // "LIVE NEWS" heading in Rajdhani display font matching the DMS design language
          Text('LIVE NEWS', style: GoogleFonts.rajdhani(
            color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.w800, fontSize: 14, letterSpacing: 1.5)),
          const SizedBox(width: 8),
          // Small "LIVE" badge in primary colour to reinforce that channels link to live coverage
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4)),
            child: const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
          ),
        ]),
        const SizedBox(height: 10),
        // Horizontally scrollable row of channel cards; fixed height for consistent layout
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _liveChannels.length,
            // 10 px gap between adjacent channel cards
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            // Build one card per curated channel
            itemBuilder: (ctx, i) => _ChannelCard(channel: _liveChannels[i], isDark: isDark),
          ),
        ),
      ]),
    );
  }
}

// ── Channel Card (tap → open real news website) ───────────────────────────────

/// Tappable card representing a single external news channel.
/// Tapping opens the channel's website in the device browser via url_launcher,
/// letting DMS users read live disaster coverage from authoritative sources.
class _ChannelCard extends StatelessWidget {
  /// Channel data (name, URL, colour, icon) for this card
  final _Channel channel;
  /// Whether the current theme is dark — adjusts text visibility
  final bool isDark;
  const _ChannelCard({required this.channel, required this.isDark});

  /// Parses the channel URL and launches it in an external browser application.
  /// Uses [LaunchMode.externalApplication] so the DMS app stays in the background.
  Future<void> _openWebsite() async {
    final uri = Uri.parse(channel.url);
    // Guard against unparseable or unsupported URLs before attempting to launch
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Tapping anywhere on the card opens the news outlet's website
      onTap: _openWebsite,
      child: Container(
        width: 130, // Fixed card width for a uniform scrollable row
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          // Three-stop gradient: opaque brand colour → semi-transparent → near-black
          // Creates depth and ensures white text remains legible over the gradient
          gradient: LinearGradient(
            colors: [channel.color.withValues(alpha: 0.9), channel.color.withValues(alpha: 0.4), Colors.black87],
            begin: Alignment.topLeft, end: Alignment.bottomRight),
          // Subtle border tinted with the channel's brand colour
          border: Border.all(color: channel.color.withValues(alpha: 0.45)),
        ),
        child: Stack(children: [
          // Large watermark-style first letter of the channel name for visual texture
          Center(child: Text(channel.name[0],
            style: TextStyle(color: Colors.white.withValues(alpha: 0.15), fontSize: 56, fontWeight: FontWeight.w900))),
          // Foreground content layer laid over the watermark
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                // Pulsing "● LIVE" indicator badge in DMS primary colour
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4)),
                  child: const Text('● LIVE', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900)),
                ),
                const Spacer(),
                // Channel type icon (e.g. TV, globe, newspaper) top-right
                Icon(channel.icon, color: Colors.white.withValues(alpha: 0.6), size: 14),
              ]),
              const Spacer(), // Push name and description to the bottom of the card
              // Channel display name in bold white text
              Text(channel.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
              const SizedBox(height: 2),
              // Short tagline describing the channel's coverage area, clipped to one line
              Text(channel.description, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white60, fontSize: 8)),
              const SizedBox(height: 3),
              // "Open Website" affordance row so users know the card is tappable
              Row(children: [
                const Icon(Icons.open_in_new, color: Colors.white70, size: 12),
                const SizedBox(width: 4),
                const Text('Open Website', style: TextStyle(color: Colors.white60, fontSize: 9)),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

// ── News Card ─────────────────────────────────────────────────────────────────

/// Renders a single [NewsItem] as a rich card with a category-gradient thumbnail,
/// alert badge (if applicable), source attribution, relative timestamp, and a
/// "Read more" link that opens the article's external URL.
/// Alert-flagged items receive a highlighted border to draw responder attention.
class _NewsCard extends StatelessWidget {
  /// The news/alert item to render — sourced from the DMS news provider
  final NewsItem item;
  /// Position index in the filtered list (available for future staggered-animation use)
  final int index;
  /// Whether the app is currently in dark mode for theme-aware colour choices
  final bool isDark;
  const _NewsCard({required this.item, required this.index, required this.isDark});

  @override
  Widget build(BuildContext context) {
    // Parse the ISO-8601 date string from the news item; null-safe for malformed dates
    final date = DateTime.tryParse(item.date);
    // Format as human-readable relative time (e.g. "5 minutes ago") for quick situational awareness
    final ago  = date != null ? timeago.format(date) : '';
    // Retrieve the two-colour gradient that visually represents this item's disaster category
    final grad = _categoryGradient(item.category);

    return GestureDetector(
      // Tapping the card opens the full article in the device's browser (if a URL is provided)
      onTap: () async {
        // Guard: some news items may not have a source URL (e.g. internal DMS alerts)
        if (item.url == null) return;
        final uri = Uri.parse(item.url!);
        // Open article in external browser so the app remains accessible for response actions
        if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        decoration: BoxDecoration(
          // Dark card surface or white — matches the active app theme
          color: isDark ? const Color(0xFF0D1117) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          // Alert items get a primary-tinted border to visually distinguish them from regular news
          border: Border.all(color: item.isAlert
            ? AppColors.primary.withValues(alpha: 0.35)
            : (isDark ? AppColors.border : Colors.grey.shade200)),
          // Soft primary glow on alert cards draws responder attention to critical events
          boxShadow: item.isAlert
            ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.08), blurRadius: 12)]
            : null,
        ),
        // Clip children to rounded corners for a clean card appearance
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // ── Thumbnail: rich gradient with emoji ──────────────────────
          // Visual header section: category gradient + large emoji + overlay badges
          SizedBox(
            height: 140,
            child: Stack(fit: StackFit.expand, children: [
              // Category-specific gradient background (e.g. blue for floods, red for fires)
              Container(decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: grad, begin: Alignment.topLeft, end: Alignment.bottomRight))),
              // Large centred emoji icon representing the disaster category at a glance
              Center(child: Text(_categoryEmoji(item.category),
                style: const TextStyle(fontSize: 64))),
              // Semi-transparent bottom fade so overlaid text (badges) stays legible
              Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.transparent, Colors.black.withValues(alpha: 0.6)],
                  begin: Alignment.topCenter, end: Alignment.bottomCenter)))),
              // Alert badge — only shown for items flagged as active disaster alerts
              if (item.isAlert) Positioned(top: 10, left: 10, child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(6)),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  // Warning icon reinforces the urgency of the alert
                  Icon(Icons.warning_amber_rounded, color: Colors.white, size: 12),
                  SizedBox(width: 4),
                  // "ALERT" label styled in all-caps for immediate recognition
                  Text('ALERT', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
                ]),
              )),
              // Source attribution badge top-right — shows which outlet reported this item
              Positioned(top: 10, right: 10, child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.65), borderRadius: BorderRadius.circular(6)),
                // e.g. "ReliefWeb", "GDACS", "BBC" — lets responders assess source credibility
                child: Text(item.source, style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w600)),
              )),
            ]),
          ),
          // ── Text content ─────────────────────────────────────────────
          // Article title, description excerpt, timestamp, and read-more affordance
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Category emoji repeated inline beside the title for quick scan
                Text(item.emoji, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                // Article headline — capped at 2 lines to keep cards uniform in height
                Expanded(child: Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.w700, fontSize: 13, height: 1.35))),
              ]),
              // Description/excerpt row — only rendered when description text is non-empty
              if ((item.description ?? '').isNotEmpty) ...[
                const SizedBox(height: 6),
                // Short summary excerpt capped at 2 lines; helps responders assess relevance quickly
                Text(item.description!, maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontSize: 12, height: 1.4)),
              ],
              const SizedBox(height: 8),
              // Footer row: relative timestamp on the left, "Read more" link on the right
              Row(children: [
                // Clock icon pairs with the relative timestamp for quick time-since-event reading
                Icon(Icons.access_time_rounded, size: 12, color: isDark ? Colors.white30 : Colors.black38),
                const SizedBox(width: 4),
                // Relative time string (e.g. "12 minutes ago") for situational-awareness context
                Text(ago, style: TextStyle(color: isDark ? Colors.white30 : Colors.black38, fontSize: 11)),
                const Spacer(),
                // "Read more" link row — only shown when the item has an external article URL
                if (item.url != null) Row(children: [
                  Text('Read more', style: TextStyle(color: AppColors.secondary, fontSize: 11)),
                  const SizedBox(width: 2),
                  // External link icon signals that tapping opens the device browser
                  const Icon(Icons.open_in_new_rounded, size: 11, color: AppColors.secondary),
                ]),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Prominent banner displayed above the news list whenever the current filtered
/// view contains one or more active disaster alert items.
/// Keeps responders aware of critical situation count without scrolling.
class _AlertBanner extends StatelessWidget {
  /// Number of active alert items in the currently filtered news list
  final int count;
  const _AlertBanner({required this.count});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        // Faint primary tint background highlights the banner without overwhelming the UI
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        // Primary-coloured border reinforces the alert status at a glance
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
      ),
      child: Row(children: [
        // Warning icon to immediately signal that critical disaster alerts are present
        const Icon(Icons.warning_amber_rounded, color: AppColors.primary, size: 18),
        const SizedBox(width: 10),
        // Dynamic message showing the alert count and instructing users to scroll for details
        Text('$count active alerts — scroll for details',
          style: TextStyle(color: AppColors.primary.withValues(alpha: 0.9), fontSize: 13)),
      ]),
    ),
  );
}

/// Shown when the selected category filter returns zero news items.
/// Reassures DMS users that data loaded successfully but no items matched the filter.
class _EmptyNews extends StatelessWidget {
  const _EmptyNews();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(48),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      // Newspaper emoji illustrates the "no news" empty state contextually
      Text('📰', style: TextStyle(fontSize: 48)),
      SizedBox(height: 14),
      // Descriptive message so users understand the absence of items is filter-related
      Text('No news in this category', style: TextStyle(color: Colors.grey, fontSize: 14)),
    ]),
  );
}

/// Displayed when the news provider fetch fails (e.g. network unavailable,
/// API timeout). Provides a retry button so DMS users can reload without
/// navigating away from the news screen.
class _ErrorState extends StatelessWidget {
  /// Callback invoked when the user taps "Retry" — typically invalidates the news provider
  final VoidCallback onRetry;
  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    const SizedBox(height: 40),
    // Warning emoji visually communicates that something went wrong with the data fetch
    const Text('⚠️', style: TextStyle(fontSize: 40)),
    const SizedBox(height: 12),
    // Human-friendly error message — avoids exposing technical error details to end users
    const Text('Could not load news', style: TextStyle(color: Colors.grey, fontSize: 14)),
    const SizedBox(height: 16),
    // Retry button in DMS secondary colour — triggers re-fetch of the news feed
    TextButton(onPressed: onRetry, child: const Text('Retry', style: TextStyle(color: AppColors.secondary))),
  ]));
}