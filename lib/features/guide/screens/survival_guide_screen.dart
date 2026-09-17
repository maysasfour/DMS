/// survival_guide_screen.dart
///
/// Survival Guide feature screen for the Disaster Management System (DMS) mobile app.
/// Provides citizens with structured, multilingual emergency guidance across major
/// disaster categories: floods, fires, earthquakes, war/conflict, storms, and
/// medical emergencies.
///
/// Each guide category is fully localized via the DMS i18n layer (AppStrings/t())
/// and includes four actionable sections:
///   - Immediate Actions  : what to do the moment a disaster strikes
///   - Emergency Kit      : essential supplies to prepare in advance
///   - Evacuation Tips    : how to safely leave a danger zone
///   - What NOT To Do     : common mistakes that worsen survival outcomes
///
/// This screen is read-only and offline-safe — no network calls are made,
/// making it accessible even when disaster disrupts connectivity.

// Flutter core UI framework
import 'package:flutter/material.dart';
// Animation library used to fade/slide cards into view for a polished UX
import 'package:flutter_animate/flutter_animate.dart';
// Riverpod state management — provides access to locale/translation state
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Google Fonts — provides Rajdhani typeface for DMS's neon-cyberpunk brand identity
import 'package:google_fonts/google_fonts.dart';
// DMS centralized color palette (primary alert red, success green, warning amber, etc.)
import '../../../core/constants/app_colors.dart';
// DMS localization helper — resolves translation keys to the active locale string
import '../../../core/l10n/app_strings.dart';

/// Top-level screen widget that renders the full Survival Guide.
/// Uses [ConsumerWidget] so it can read the active locale from the Riverpod
/// provider tree and re-render if the user switches languages mid-session.
class SurvivalGuideScreen extends ConsumerWidget {
  // Const constructor enables Flutter to cache and reuse this widget efficiently
  const SurvivalGuideScreen({super.key});

  /// Builds the Survival Guide scaffold including the app bar, intro banner,
  /// and the staggered list of disaster-category cards.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Shorthand translator: resolves a string key to the user's active locale
    final tr = (String k) => t(context, ref, k);

    // Ordered list of disaster categories displayed to the citizen.
    // Each category encapsulates its own color accent, emoji icon, and all
    // localized content strings for that specific disaster type.
    final categories = [
      // Flood guide — uses blue to visually associate with water-related hazards
      _GuideCategory(
        emoji: '🌊',
        // Localized title displayed in the collapsed card header (e.g. "Flood")
        title: tr('guide_flood'), subtitle: tr('guide_flood_sub'),
        // Blue accent color chosen to reinforce the water/flood association
        color: const Color(0xFF3B82F6),
        // Four localized immediate-action steps to take when a flood occurs
        immediateActions: [tr('guide_flood_a1'), tr('guide_flood_a2'), tr('guide_flood_a3'), tr('guide_flood_a4')],
        // Six kit items — floods often require water purification and flotation supplies
        kit: [tr('guide_flood_k1'), tr('guide_flood_k2'), tr('guide_flood_k3'), tr('guide_flood_k4'), tr('guide_flood_k5'), tr('guide_flood_k6')],
        // Four evacuation tips specific to flooding scenarios (e.g. avoid drainage canals)
        evacuation: [tr('guide_flood_e1'), tr('guide_flood_e2'), tr('guide_flood_e3'), tr('guide_flood_e4')],
        // Three critical "do not" mistakes (e.g. do not walk through moving water)
        doNot: [tr('guide_flood_d1'), tr('guide_flood_d2'), tr('guide_flood_d3')],
      ),
      // Fire guide — uses the DMS primary alert color (red) for fire/danger signaling
      _GuideCategory(
        emoji: '🔥',
        title: tr('guide_fire'), subtitle: tr('guide_fire_sub'),
        // AppColors.primary is the DMS brand red, matching fire emergency urgency
        color: AppColors.primary,
        // Five immediate actions — fire has more steps due to fast-spreading risk
        immediateActions: [tr('guide_fire_a1'), tr('guide_fire_a2'), tr('guide_fire_a3'), tr('guide_fire_a4'), tr('guide_fire_a5')],
        kit: [tr('guide_fire_k1'), tr('guide_fire_k2'), tr('guide_fire_k3'), tr('guide_fire_k4')],
        evacuation: [tr('guide_fire_e1'), tr('guide_fire_e2'), tr('guide_fire_e3'), tr('guide_fire_e4')],
        doNot: [tr('guide_fire_d1'), tr('guide_fire_d2'), tr('guide_fire_d3')],
      ),
      // Earthquake guide — uses a deep orange to signal seismic ground hazard
      _GuideCategory(
        emoji: '🌍',
        title: tr('guide_quake'), subtitle: tr('guide_quake_sub'),
        // Orange distinguishes earthquake from flood (blue) and fire (red)
        color: const Color(0xFFFF7A00),
        immediateActions: [tr('guide_quake_a1'), tr('guide_quake_a2'), tr('guide_quake_a3'), tr('guide_quake_a4')],
        kit: [tr('guide_quake_k1'), tr('guide_quake_k2'), tr('guide_quake_k3'), tr('guide_quake_k4')],
        evacuation: [tr('guide_quake_e1'), tr('guide_quake_e2'), tr('guide_quake_e3'), tr('guide_quake_e4')],
        doNot: [tr('guide_quake_d1'), tr('guide_quake_d2'), tr('guide_quake_d3')],
      ),
      // War/conflict guide — uses the DMS warning color (amber) for armed conflict scenarios
      _GuideCategory(
        emoji: '⚔️',
        title: tr('guide_war'), subtitle: tr('guide_war_sub'),
        // Warning amber communicates caution and civilian safety awareness
        color: AppColors.warning,
        immediateActions: [tr('guide_war_a1'), tr('guide_war_a2'), tr('guide_war_a3'), tr('guide_war_a4')],
        kit: [tr('guide_war_k1'), tr('guide_war_k2'), tr('guide_war_k3'), tr('guide_war_k4')],
        // War evacuation has only 3 steps — movement is more restricted in conflict zones
        evacuation: [tr('guide_war_e1'), tr('guide_war_e2'), tr('guide_war_e3')],
        doNot: [tr('guide_war_d1'), tr('guide_war_d2'), tr('guide_war_d3')],
      ),
      // Storm/hurricane guide — uses the DMS admin color (purple/teal) for severe weather
      _GuideCategory(
        emoji: '🌪️',
        title: tr('guide_storm'), subtitle: tr('guide_storm_sub'),
        // adminColor visually differentiates storm from other weather/natural categories
        color: AppColors.adminColor,
        immediateActions: [tr('guide_storm_a1'), tr('guide_storm_a2'), tr('guide_storm_a3'), tr('guide_storm_a4')],
        kit: [tr('guide_storm_k1'), tr('guide_storm_k2'), tr('guide_storm_k3'), tr('guide_storm_k4')],
        evacuation: [tr('guide_storm_e1'), tr('guide_storm_e2'), tr('guide_storm_e3')],
        doNot: [tr('guide_storm_d1'), tr('guide_storm_d2'), tr('guide_storm_d3')],
      ),
      // Medical emergency guide — uses the DMS success/safe green for health/aid association
      _GuideCategory(
        emoji: '🏥',
        title: tr('guide_medical'), subtitle: tr('guide_medical_sub'),
        // Green aligns with universal health/medical iconography (e.g. first-aid cross)
        color: AppColors.success,
        // Five immediate actions — medical emergencies require triage-level prioritization
        immediateActions: [tr('guide_medical_a1'), tr('guide_medical_a2'), tr('guide_medical_a3'), tr('guide_medical_a4'), tr('guide_medical_a5')],
        kit: [tr('guide_medical_k1'), tr('guide_medical_k2'), tr('guide_medical_k3'), tr('guide_medical_k4')],
        // Four evacuation/transport tips for getting casualties to medical resources
        evacuation: [tr('guide_medical_e1'), tr('guide_medical_e2'), tr('guide_medical_e3'), tr('guide_medical_e4')],
        doNot: [tr('guide_medical_d1'), tr('guide_medical_d2'), tr('guide_medical_d3')],
      ),
    ];

    return Scaffold(
      // Respects the system/app theme (dark by default per DMS design system)
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        // Screen title rendered in Rajdhani (DMS brand font) with wide letter-spacing
        // for the neon-cyberpunk aesthetic; uses secondary accent color
        title: Text(tr('guide_title'), style: GoogleFonts.rajdhani(
          color: AppColors.secondary, fontWeight: FontWeight.w700, letterSpacing: 3)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        // Uniform 16px padding keeps content away from screen edges on all devices
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Intro banner — draws immediate attention with the SOS emoji and
            // a brief subtitle explaining what this guide provides to the citizen
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                // Semi-transparent primary color background keeps banner subtle but branded
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                // Low-opacity border reinforces the card boundary without harsh contrast
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  // SOS emoji acts as a universal emergency indicator regardless of locale
                  const Text('🆘', style: TextStyle(fontSize: 24)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      // Localized subtitle explains the guide's purpose (e.g. "Stay safe...")
                      tr('guide_subtitle'),
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ),
                ],
              ),
            // Fade-in animation makes the intro banner appear smoothly on screen load
            ).animate().fadeIn(),
            const SizedBox(height: 20),
            // Map each disaster category to a _CategoryCard with staggered animation.
            // Using asMap().entries gives access to the index (e) for delay calculation,
            // producing a cascading entrance effect that draws the user's eye downward.
            ...categories.asMap().entries.map((e) =>
              _CategoryCard(category: e.value, ref: ref)
                // Each card fades in 80ms after the previous, creating a stagger effect
                .animate()
                .fadeIn(delay: (e.key * 80).ms)
                // Slight upward slide (5% of widget height) reinforces the entrance motion
                .slideY(begin: 0.05)),
            // Bottom padding ensures the last card is fully visible above system nav bar
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

/// Private expandable card widget that displays a single disaster category.
/// Collapsed state shows the emoji icon, title, and subtitle.
/// Expanded state reveals all four action sections for that disaster type.
/// Uses [ConsumerWidget] to resolve translation keys for section headings.
class _CategoryCard extends ConsumerWidget {
  // The disaster category data model containing all localized content
  final _GuideCategory category;
  // Riverpod ref passed from the parent — used for translation lookup
  final WidgetRef ref;
  const _CategoryCard({required this.category, required this.ref});

  /// Builds the collapsible card UI for one disaster category.
  /// Adapts colors for both light and dark themes.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Detect active theme brightness to switch text/background colors accordingly
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // Local shorthand for translating section heading keys (immediate actions, kit, etc.)
    final tr = (String k) => t(context, ref, k);
    return Container(
      // Vertical margin between consecutive category cards
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        // Dark theme: near-black card surface matching DMS dark design system
        // Light theme: white card for clean contrast on light backgrounds
        color: isDark ? const Color(0xFF0D1117) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        // Category-specific accent color used for the border to visually differentiate types
        border: Border.all(color: category.color.withValues(alpha: 0.3)),
      ),
      child: Theme(
        // Remove the default ExpansionTile divider line to keep the card edge clean
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          // Colored icon container — the emoji visually identifies the disaster type at a glance
          leading: Container(
            width: 46, height: 46,
            decoration: BoxDecoration(
              // Translucent version of the category accent color for the icon background
              color: category.color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            // Emoji rendered at 24px — large enough for quick identification
            child: Center(child: Text(category.emoji, style: const TextStyle(fontSize: 24))),
          ),
          // Category title (e.g. "Flood", "Fire") in DMS brand Rajdhani font
          title: Text(category.title, style: GoogleFonts.rajdhani(
            color: isDark ? Colors.white : Colors.black87,
            fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 1)),
          // Short subtitle providing context (e.g. "Natural disaster — water overflow")
          subtitle: Text(category.subtitle,
            style: TextStyle(color: isDark ? Colors.white38 : Colors.black45, fontSize: 11)),
          // Chevron icon tinted with the category's accent color for visual consistency
          trailing: Icon(Icons.keyboard_arrow_down, color: category.color),
          // Expanded-state icon color matches the category accent
          iconColor: category.color,
          // Collapsed-state icon color also uses the category accent for brand consistency
          collapsedIconColor: category.color,
          // Expanded content: the four actionable guide sections for this disaster type
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Visual divider separating the header from the guide content
                  Divider(color: category.color.withValues(alpha: 0.2)),
                  const SizedBox(height: 8),
                  // Section 1: Steps to take immediately when the disaster hits
                  _Section('⚡ ${tr('immediate_actions')}', category.color, category.immediateActions),
                  const SizedBox(height: 14),
                  // Section 2: Items citizens should have prepared before a disaster
                  _Section('🎒 ${tr('emergency_kit')}', category.color, category.kit),
                  const SizedBox(height: 14),
                  // Section 3: Guidance on how to safely evacuate the affected area
                  _Section('🏃 ${tr('evacuation_tips')}', category.color, category.evacuation),
                  const SizedBox(height: 14),
                  // Section 4: Critical mistakes to avoid — always shown in DMS alert red
                  // regardless of category color, to emphasize danger of these actions
                  _Section('❌ ${tr('what_not_to_do')}', AppColors.primary, category.doNot),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Private stateless widget that renders a single labeled section of guide content
/// (e.g. "Immediate Actions", "Emergency Kit") as a bulleted list.
/// Reused across all disaster categories to keep layout consistent.
class _Section extends StatelessWidget {
  // Section heading text, including emoji prefix (e.g. "⚡ Immediate Actions")
  final String title;
  // Accent color for both the section title and the bullet dot markers
  final Color color;
  // Localized list of guide items to display as bullet points
  final List<String> items;
  const _Section(this.title, this.color, this.items);

  /// Builds the labeled bulleted list for a single guide section.
  @override
  Widget build(BuildContext context) {
    // Detect theme brightness to adapt item text color (white-tinted vs dark)
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section heading — uppercase-styled via letter spacing; colored per category accent
        Text(title, style: TextStyle(
          color: color, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.5)),
        const SizedBox(height: 8),
        // Render each guide item as a row with a colored dot bullet and wrapped text
        ...items.map((item) => Padding(
          // Bottom padding between bullets maintains readable vertical rhythm
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            // Align dot to top of text for multi-line items (long instructions)
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Small circular dot bullet — uses DirectionalOffset so it aligns
              // correctly in both LTR (English) and RTL (Arabic) locales
              Container(
                margin: const EdgeInsetsDirectional.only(top: 5, end: 8),
                width: 5, height: 5,
                // Dot color matches the section's accent color for visual grouping
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              // Guide item text — wraps naturally; line height 1.4 for readability
              Expanded(child: Text(item,
                style: TextStyle(
                  // Softer white in dark mode, near-black in light mode for contrast
                  color: isDark ? Colors.white70 : Colors.black87,
                  fontSize: 12, height: 1.4))),
            ],
          ),
        )),
      ],
    );
  }
}

/// Private immutable data model representing a single disaster guide category.
/// Holds all content for one disaster type: identity fields (emoji, title, subtitle,
/// color) and the four localized string lists shown in the expanded card view.
class _GuideCategory {
  // Emoji character used as the visual icon for this disaster type (e.g. '🌊' for flood)
  final String emoji;
  // Localized display name for this disaster category (e.g. "Flood", "فيضان")
  final String title;
  // Brief localized description shown as the card subtitle in collapsed state
  final String subtitle;
  // Accent color used for borders, bullets, section titles, and icon backgrounds
  final Color color;
  // Ordered list of immediate response actions the citizen should take at disaster onset
  final List<String> immediateActions;
  // List of supplies and items to prepare in an emergency go-bag or household kit
  final List<String> kit;
  // Evacuation instructions specific to this disaster type's hazards and routes
  final List<String> evacuation;
  // Actions and behaviors the citizen must avoid to prevent worsening outcomes
  final List<String> doNot;
  // All fields are required — a category with missing content would be incomplete and unsafe
  const _GuideCategory({
    required this.emoji, required this.title, required this.subtitle,
    required this.color, required this.immediateActions, required this.kit,
    required this.evacuation, required this.doNot,
  });
}