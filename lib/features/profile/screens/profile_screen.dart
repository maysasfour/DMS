/// profile_screen.dart
///
/// Defines the Profile screen for the Disaster Management System (DMS) mobile app.
/// Allows authenticated citizens, officers, and responders to view and edit their
/// personal information (name, phone), choose an avatar, switch the app theme,
/// select an interface language, and access key DMS features (SOS, shelters,
/// incident reports, weather, safety guide). Also provides a logout action that
/// clears the auth session and redirects to the login flow.

// ── Flutter and UI framework imports ─────────────────────────────────────────
import 'package:flutter/material.dart';
// Riverpod for reactive state management across the profile and auth layers
import 'package:flutter_riverpod/flutter_riverpod.dart';
// go_router for declarative in-app navigation (pushing routes like /emergency)
import 'package:go_router/go_router.dart';
// Google Fonts for the DMS neon-cyberpunk design system (Rajdhani headings)
import 'package:google_fonts/google_fonts.dart';
// SharedPreferences for persisting the selected avatar index between app sessions
import 'package:shared_preferences/shared_preferences.dart';

// ── DMS core and feature imports ──────────────────────────────────────────────
// Centralized color tokens for the DMS neon cyberpunk theme (primary, success, etc.)
import '../../../core/constants/app_colors.dart';
// Auth provider exposes the current user object and updateProfile / logout actions
import '../../../features/auth/providers/auth_provider.dart';
// Localisation helper — returns translated string for the active locale
import '../../../core/l10n/app_strings.dart';
// Riverpod provider that holds and persists the active BCP-47 locale code
import '../../../providers/locale_provider.dart';
// Riverpod provider that holds and persists the active ThemeMode (dark/light/system)
import '../../../providers/theme_provider.dart';

// 16 avatar options represented as (emoji, accent color) tuples.
// Covers DMS-relevant roles: firefighter, medic, superhero, pilot, scientist,
// programmer, safety vest wearer, police officer, and general citizens.
const _avatars = [
  ('🧑‍🚒', Color(0xFFFF4500)), ('👩‍⚕️', Color(0xFF00BCD4)), ('🦸', Color(0xFF9C27B0)),
  ('🧑‍✈️', Color(0xFF2196F3)), ('👩‍🔬', Color(0xFF4CAF50)), ('🧑‍💻', Color(0xFF00F5FF)),
  ('🦺', Color(0xFFFF9800)), ('👮', Color(0xFF3F51B5)), ('🧑‍🌾', Color(0xFF8BC34A)),
  ('🏃', Color(0xFFE91E63)), ('👩', Color(0xFFFF7043)), ('🧑', Color(0xFF26C6DA)),
  ('👧', Color(0xFFAB47BC)), ('👦', Color(0xFF66BB6A)), ('🧔', Color(0xFFFFA726)), ('🧓', Color(0xFF78909C)),
];

// Supported interface languages for the DMS app.
// Each tuple is (BCP-47 code, flag emoji, native language name).
// Covers the primary language communities likely to use the Jordan-based DMS.
const _languages = [
  ('en', '🇬🇧', 'English'),    ('ar', '🇯🇴', 'العربية'),
  ('fr', '🇫🇷', 'Français'),   ('es', '🇪🇸', 'Español'),
  ('de', '🇩🇪', 'Deutsch'),    ('tr', '🇹🇷', 'Türkçe'),
  ('zh', '🇨🇳', '中文'),        ('ru', '🇷🇺', 'Русский'),
  ('pt', '🇧🇷', 'Português'),  ('hi', '🇮🇳', 'हिन्दी'),
  ('ja', '🇯🇵', '日本語'),      ('ko', '🇰🇷', '한국어'),
  ('it', '🇮🇹', 'Italiano'),   ('uk', '🇺🇦', 'Українська'),
];

// Riverpod StateProvider tracking the index into _avatars for the current user.
// Scoped to this file; persisted to SharedPreferences for cross-session durability.
final _avatarIndexProvider = StateProvider<int>((ref) => 0);

/// The main Profile screen widget for DMS app users.
/// Uses [ConsumerStatefulWidget] so it can both watch Riverpod providers
/// reactively and maintain local mutable state (edit mode, saving flag).
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

/// Private state class for [ProfileScreen].
/// Manages text field controllers, edit/save UI state, and avatar persistence.
class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  // Controller for the user's first name input field
  final _firstCtrl = TextEditingController();
  // Controller for the user's last name input field
  final _lastCtrl  = TextEditingController();
  // Controller for the user's phone number — used for DMS SMS alert opt-in
  final _phoneCtrl = TextEditingController();

  // Whether the identity section is in edit mode (fields unlocked for input)
  bool _editing = false;
  // Whether a save request is in-flight — disables the Save button to prevent double-submit
  bool _saving = false;

  /// Called once when the widget is inserted into the tree.
  /// Pre-populates text fields from the authenticated user object so the user
  /// sees their current DMS profile data immediately without an extra fetch.
  @override
  void initState() {
    super.initState();
    // Read the current auth state synchronously (no reactive subscription needed here)
    final user = ref.read(authProvider).user;
    // Populate fields with existing profile data, falling back to empty string
    _firstCtrl.text = user?.firstName ?? '';
    _lastCtrl.text  = user?.lastName  ?? '';
    _phoneCtrl.text = user?.phone     ?? '';
    // Restore the avatar the user previously selected from persistent storage
    _loadAvatarIndex();
  }

  /// Reads the saved avatar index from SharedPreferences and updates the Riverpod
  /// provider so the avatar renders correctly on first paint.
  Future<void> _loadAvatarIndex() async {
    final prefs = await SharedPreferences.getInstance();
    // Default to index 0 (firefighter avatar) if no preference has been saved yet
    final idx = prefs.getInt('avatar_index') ?? 0;
    // Guard against async gap: only update state if the widget is still mounted
    if (mounted) ref.read(_avatarIndexProvider.notifier).state = idx;
  }

  /// Persists the chosen avatar index to SharedPreferences and updates the
  /// in-memory Riverpod provider so the UI re-renders immediately.
  Future<void> _saveAvatar(int idx) async {
    final prefs = await SharedPreferences.getInstance();
    // Write avatar selection to disk for persistence across app restarts
    await prefs.setInt('avatar_index', idx);
    // Update the provider so all widgets watching _avatarIndexProvider rebuild
    ref.read(_avatarIndexProvider.notifier).state = idx;
  }

  /// Disposes of text controllers to free memory when the screen is removed.
  @override
  void dispose() {
    // Release all three controllers in sequence before calling super.dispose()
    _firstCtrl.dispose(); _lastCtrl.dispose(); _phoneCtrl.dispose(); super.dispose();
  }

  /// Submits updated profile data (name, phone) to the DMS backend via the
  /// auth provider, then exits edit mode and shows a success/error snack bar.
  Future<void> _save() async {
    // Show loading indicator on the Save button while the network request runs
    setState(() => _saving = true);
    try {
      // Delegate to authProvider which calls the backend PATCH /profile endpoint
      await ref.read(authProvider.notifier).updateProfile({
        'firstName': _firstCtrl.text.trim(),
        'lastName':  _lastCtrl.text.trim(),
        // Phone number is required for DMS SMS emergency alerts
        'phone':     _phoneCtrl.text.trim(),
      });
      // On success, collapse the edit form back to read-only view
      setState(() => _editing = false);
      // Notify the user that their DMS profile was saved successfully
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(t(context, ref, 'profile_updated')), backgroundColor: AppColors.success,
        // Floating style matches the DMS neon cyberpunk design system
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ));
    } catch (e) {
      // Surface backend validation errors (e.g., invalid phone format) to the user
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.primary));
    } finally {
      // Always clear the saving state so the button becomes interactive again
      if (mounted) setState(() => _saving = false);
    }
  }

  /// Opens a modal bottom sheet containing the avatar grid so the user can
  /// choose a role-appropriate avatar for their DMS citizen or responder profile.
  void _pickAvatar() {
    // Read current selection so the grid can highlight the active avatar
    final current = ref.read(_avatarIndexProvider);
    showModalBottomSheet(
      context: context,
      // Dark background matches the DMS neon cyberpunk colour scheme
      backgroundColor: const Color(0xFF0D1117),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // Sheet heading using Rajdhani — DMS brand heading font
          Text(t(context, ref, 'pick_avatar'), style: GoogleFonts.rajdhani(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          // 8-column grid showing all 16 avatar options
          GridView.count(
            crossAxisCount: 8, shrinkWrap: true,
            mainAxisSpacing: 10, crossAxisSpacing: 10,
            children: List.generate(_avatars.length, (i) {
              // Destructure the avatar tuple into emoji and accent color
              final (emoji, color) = _avatars[i];
              return GestureDetector(
                // On tap: persist selection and dismiss the bottom sheet
                onTap: () { _saveAvatar(i); Navigator.pop(context); },
                child: Container(
                  decoration: BoxDecoration(
                    // Currently selected avatar gets a stronger background tint
                    color: color.withValues(alpha: i == current ? 0.3 : 0.12),
                    shape: BoxShape.circle,
                    // Highlight border on the active avatar for clear visual feedback
                    border: Border.all(color: i == current ? color : Colors.transparent, width: 2),
                  ),
                  child: Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  /// Builds the complete profile screen UI: avatar card, identity form,
  /// appearance (theme) switcher, language picker, quick-action links, and logout.
  @override
  Widget build(BuildContext context) {
    // Watch the authenticated user — rebuilds when profile data changes after save
    final user      = ref.watch(authProvider).user;
    // Watch the current ThemeMode so the appearance section reflects selection
    final themeMode = ref.watch(themeModeProvider);
    // Watch the active locale so the language grid reflects the current choice
    final locale    = ref.watch(localeProvider);
    // Watch the avatar index so the avatar card rebuilds when the user picks a new one
    final avatarIdx = ref.watch(_avatarIndexProvider);
    // Destructure the active avatar tuple into its emoji and accent color
    final (avatarEmoji, avatarColor) = _avatars[avatarIdx];
    // Determine brightness for adaptive light/dark styling throughout the screen
    final isDark    = Theme.of(context).brightness == Brightness.dark;
    // Card background: near-black in dark mode, white in light mode
    final cardBg    = isDark ? const Color(0xFF0D1117) : Colors.white;
    // Page background: DMS dark surface or a light grey for light mode
    final bg        = isDark ? AppColors.bgDark : const Color(0xFFF4F5F7);

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        // AppBar matches the page background to create a seamless header
        backgroundColor: isDark ? AppColors.bgDark : Colors.white,
        elevation: 0,
        // "MY PROFILE" in Rajdhani uppercase with wide letter-spacing for DMS branding
        title: Text(t(context, ref, 'my_profile').toUpperCase(), style: GoogleFonts.rajdhani(
          color: isDark ? Colors.white : Colors.black,
          fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 2)),
        centerTitle: true,
        actions: [
          // Settings icon navigates to app-wide settings (notifications, account security)
          IconButton(
            icon: Icon(Icons.settings_outlined, color: isDark ? Colors.white54 : Colors.black54),
            onPressed: () => context.push('/settings'),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [

          // ── Avatar card ──────────────────────────────────────────────
          // Gradient card whose colors are driven by the selected avatar accent color,
          // giving each DMS user a personalised visual identity on the profile screen.
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              // Radial-style gradient from the avatar color fades to near-transparent
              gradient: LinearGradient(
                colors: [avatarColor.withValues(alpha: 0.2), avatarColor.withValues(alpha: 0.05)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              // Subtle border tinted with the avatar color for the neon glow effect
              border: Border.all(color: avatarColor.withValues(alpha: 0.3)),
            ),
            child: Column(children: [
              // Stack overlays the edit pencil badge on the bottom-right of the avatar circle
              Stack(alignment: Alignment.bottomRight, children: [
                // Tappable avatar circle — opens the avatar picker bottom sheet
                GestureDetector(
                  onTap: _pickAvatar,
                  child: Container(
                    width: 90, height: 90,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      // Soft fill with the accent color to tie the emoji to the theme
                      color: avatarColor.withValues(alpha: 0.2),
                      border: Border.all(color: avatarColor, width: 2.5),
                      // Neon glow shadow using the avatar color — part of DMS design language
                      boxShadow: [BoxShadow(color: avatarColor.withValues(alpha: 0.35), blurRadius: 20, spreadRadius: 2)],
                    ),
                    child: Center(child: Text(avatarEmoji, style: const TextStyle(fontSize: 42))),
                  ),
                ),
                // Small edit badge positioned at the bottom-right of the avatar circle
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(color: avatarColor, shape: BoxShape.circle,
                    // White border separates the badge from the avatar container
                    border: Border.all(color: isDark ? AppColors.bgDark : Colors.white, width: 2)),
                  child: const Icon(Icons.edit, color: Colors.white, size: 12),
                ),
              ]),
              const SizedBox(height: 14),
              // Display the user's full name in Rajdhani uppercase for DMS branding
              Text((user?.name ?? 'Mays Asfour').toUpperCase(), style: GoogleFonts.rajdhani(
                color: isDark ? Colors.white : Colors.black,
                fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 1)),
              // Show the user's email address (read-only; changed via account settings)
              Text(user?.email ?? '', style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontSize: 13)),
              const SizedBox(height: 8),
              // Role badge (e.g. CITIZEN, OFFICER, ADMIN) highlights the user's
              // permissions level within the DMS incident management hierarchy
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: avatarColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: avatarColor.withValues(alpha: 0.4)),
                ),
                child: Text(user?.role ?? 'CITIZEN', style: TextStyle(
                  // Role text uses the avatar accent color for visual cohesion
                  color: avatarColor, fontWeight: FontWeight.w700, fontSize: 11, letterSpacing: 1.5)),
              ),
            ]),
          ),

          const SizedBox(height: 16),

          // ── Identity ────────────────────────────────────────────────
          // Card containing the editable identity fields (first name, last name, phone).
          // Phone number is critical for DMS SMS emergency alerts and notifications.
          _Card(bg: cardBg, isDark: isDark, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Section header with an inline edit/close toggle icon button
            _SectionTitle(t(context, ref, 'identity').toUpperCase(), Icons.person_outline, AppColors.secondary, isDark,
                trailing: IconButton(
                  // Toggle between edit and close icons to signal the current mode
                  icon: Icon(_editing ? Icons.close : Icons.edit_outlined,
                      color: isDark ? Colors.white38 : Colors.black38, size: 18),
                  onPressed: () => setState(() => _editing = !_editing),
                )),
            // Email is always read-only — account identity must be changed via settings
            _InfoTile(Icons.email_outlined, 'Email', user?.email ?? '', isDark),
            const SizedBox(height: 10),
            // First name field — editable only when _editing is true
            _EditField(ctrl: _firstCtrl, label: 'First Name', icon: Icons.person_outline, enabled: _editing, isDark: isDark),
            const SizedBox(height: 8),
            // Last name field — editable only when _editing is true
            _EditField(ctrl: _lastCtrl, label: 'Last Name', icon: Icons.person_outline, enabled: _editing, isDark: isDark),
            const SizedBox(height: 8),
            // Phone number field with numeric keyboard — used for DMS SMS alerts
            _EditField(ctrl: _phoneCtrl, label: 'Phone Number', icon: Icons.phone_outlined, enabled: _editing, isDark: isDark, type: TextInputType.phone),
            // Save button is only rendered while the identity section is in edit mode
            if (_editing) ...[
              const SizedBox(height: 14),
              SizedBox(width: double.infinity, height: 46, child: ElevatedButton(
                // Disable the button while a save request is in-flight to prevent duplicates
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                // Show a spinner inside the button body while saving, otherwise show label
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(t(context, ref, 'save_changes'), style: GoogleFonts.rajdhani(fontWeight: FontWeight.w800, letterSpacing: 1.5, color: Colors.white, fontSize: 14)),
              )),
            ],
          ])),

          const SizedBox(height: 12),

          // ── Appearance ──────────────────────────────────────────────
          // Allows the user to switch the DMS app between system, dark, and light themes.
          // Dark mode is the default for the neon cyberpunk DMS design system.
          _Card(bg: cardBg, isDark: isDark, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _SectionTitle(t(context, ref, 'appearance').toUpperCase(), Icons.palette_outlined, AppColors.adminColor, isDark),
            Padding(
              padding: const EdgeInsets.only(top: 8),
              // Three equal-width theme option tiles in a single row
              child: Row(children: [
                // System option: follows the OS-level light/dark preference
                Expanded(child: _ThemeOption(t(context, ref, 'system'), Icons.brightness_auto, ThemeMode.system, themeMode, isDark,
                    () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.system))),
                const SizedBox(width: 8),
                // Dark option: forces the DMS neon cyberpunk dark palette
                Expanded(child: _ThemeOption(t(context, ref, 'dark'), Icons.dark_mode, ThemeMode.dark, themeMode, isDark,
                    () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.dark))),
                const SizedBox(width: 8),
                // Light option: switches to the DMS light surface palette
                Expanded(child: _ThemeOption(t(context, ref, 'light'), Icons.light_mode, ThemeMode.light, themeMode, isDark,
                    () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.light))),
              ]),
            ),
          ])),

          const SizedBox(height: 12),

          // ── Language ────────────────────────────────────────────────
          // Lets the user switch the DMS interface language. Selecting a language
          // updates the localeProvider which rebuilds all localised strings app-wide.
          _Card(bg: cardBg, isDark: isDark, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _SectionTitle(t(context, ref, 'language').toUpperCase(), Icons.language, AppColors.warning, isDark),
            const SizedBox(height: 8),
            // Wrap layout: language chips flow onto multiple rows as needed
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _languages.map((l) {
                // Check if this chip represents the currently active locale
                final selected = locale.languageCode == l.$1;
                return GestureDetector(
                  // Update the app locale via Riverpod — triggers a full UI rebuild
                  onTap: () => ref.read(localeProvider.notifier).setLocale(l.$1),
                  child: AnimatedContainer(
                    // Smooth 150ms transition when the selection state changes
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      // Active language chip gets a warning-color tint to stand out
                      color: selected ? AppColors.warning.withValues(alpha: 0.15) : (isDark ? const Color(0xFF1A2030) : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(10),
                      // Solid border on active chip; transparent on inactive chips
                      border: Border.all(color: selected ? AppColors.warning : (isDark ? AppColors.border : Colors.grey.shade300), width: selected ? 1.5 : 1),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      // Flag emoji provides quick visual identification of the language
                      Text(l.$2, style: const TextStyle(fontSize: 15)),
                      const SizedBox(width: 5),
                      // Native language name; bold and warning-colored when selected
                      Text(l.$3, style: TextStyle(
                        color: selected ? AppColors.warning : (isDark ? Colors.white70 : Colors.black87),
                        fontSize: 11, fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                      )),
                    ]),
                  ),
                );
              }).toList(),
            ),
          ])),

          const SizedBox(height: 12),

          // ── Quick Links ─────────────────────────────────────────────
          // Shortcut tiles giving citizens fast access to the most critical DMS features
          // without navigating through the bottom tab bar during an emergency.
          _Card(bg: cardBg, isDark: isDark, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _SectionTitle(t(context, ref, 'quick_actions').toUpperCase(), Icons.apps, AppColors.success, isDark),
            // SOS emergency — highest priority link, navigates to the emergency activation screen
            _LinkTile(Icons.sos, t(context, ref, 'emer_sos'),          AppColors.primary,      isDark, () => context.push('/emergency')),
            // Weather conditions relevant to disaster risk assessment
            _LinkTile(Icons.wb_sunny_outlined, t(context, ref, 'weather_title'), AppColors.warning, isDark, () => context.push('/weather')),
            // Shelter locations for displaced citizens during active disaster incidents
            _LinkTile(Icons.local_hospital_outlined, t(context, ref, 'shelters'), AppColors.success, isDark, () => context.push('/shelters')),
            // Safety guide: pre-loaded DMS educational content for offline access
            _LinkTile(Icons.menu_book_outlined, t(context, ref, 'guide'),         AppColors.secondary, isDark, () => context.push('/guide')),
            // My Reports: lists incident reports submitted by this citizen
            _LinkTile(Icons.list_alt_outlined, t(context, ref, 'my_reports'),     AppColors.secondary, isDark, () => context.push('/incidents')),
            // Open Portal: navigates to the admin/officer web portal settings screen
            _LinkTile(Icons.open_in_browser, t(context, ref, 'portal_open'),      AppColors.adminColor, isDark, () => context.push('/settings')),
          ])),

          const SizedBox(height: 18),

          // ── Sign Out ─────────────────────────────────────────────────
          // Logs the user out of the DMS session, clears stored credentials,
          // and redirects to the login screen to prevent unauthorized access.
          SizedBox(
            width: double.infinity, height: 52,
            child: OutlinedButton.icon(
              onPressed: () async {
                // Call the auth provider's logout which clears tokens and user state
                await ref.read(authProvider.notifier).logout();
                // Navigate to the login root and remove all previous routes from the stack
                if (context.mounted) context.go('/login');
              },
              // Logout icon in the DMS primary (red/neon) color to signal a destructive action
              icon: const Icon(Icons.logout_rounded, color: AppColors.primary, size: 20),
              label: Text(t(context, ref, 'logout'), style: GoogleFonts.rajdhani(
                color: AppColors.primary, fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 2)),
              style: OutlinedButton.styleFrom(
                // Outlined border in primary color — visible but less prominent than a filled button
                side: const BorderSide(color: AppColors.primary, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // App version and region watermark — helps support teams identify the deployment
          Center(child: Text('DMS v1.0.0 • Jordan',
              style: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 11, letterSpacing: 1))),
          const SizedBox(height: 32),
        ]),
      ),
    );
  }
}

/// A reusable card container used throughout the profile screen to group
/// related settings sections (identity, appearance, language, quick links).
/// Applies the DMS design system border and corner radius.
class _Card extends StatelessWidget {
  /// The content widget to render inside this card.
  final Widget child;

  /// Background color — adapts between dark (#0D1117) and white for light mode.
  final Color bg;

  /// Whether the host screen is currently in dark mode, used to pick border color.
  final bool isDark;

  const _Card({required this.child, required this.bg, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(16),
      // Dark mode uses the DMS border token; light mode uses a light grey
      border: Border.all(color: isDark ? AppColors.border : Colors.grey.shade200),
    ),
    child: child,
  );
}

/// A small section header row used inside each [_Card] to label a settings group.
/// Displays a tinted icon badge, an uppercase label, and an optional trailing widget
/// (e.g., an edit/close icon button for the identity section).
class _SectionTitle extends StatelessWidget {
  /// Uppercase label text identifying the settings group (e.g., "IDENTITY").
  final String title;

  /// Icon shown in the colored badge on the left side of the header.
  final IconData icon;

  /// Accent color applied to the icon badge background and icon itself.
  final Color color;

  /// Whether the host screen is in dark mode — adjusts label text color.
  final bool isDark;

  /// Optional trailing widget (e.g., an edit toggle button) aligned to the right.
  final Widget? trailing;

  const _SectionTitle(this.title, this.icon, this.color, this.isDark, {this.trailing});

  @override
  Widget build(BuildContext context) => Row(children: [
    // Rounded icon badge with a semi-transparent background tinted by the accent color
    Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
      child: Icon(icon, color: color, size: 14)),
    const SizedBox(width: 8),
    // Subdued uppercase label — uses wide letter spacing for DMS design system style
    Text(title, style: TextStyle(color: isDark ? Colors.white38 : Colors.black45,
        fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
    // Push trailing widget to the far right if provided
    if (trailing != null) ...[const Spacer(), trailing!],
  ]);
}

/// A read-only info tile displaying a labeled value with a leading icon.
/// Used for fields that cannot be edited inline (e.g., email address).
class _InfoTile extends StatelessWidget {
  /// Icon representing the data type (e.g., email envelope).
  final IconData icon;

  /// Short label shown above the value in a smaller, muted style.
  final String label;

  /// The data value to display (e.g., the user's email address).
  final String value;

  /// Whether the host screen is in dark mode — adjusts text colors.
  final bool isDark;

  const _InfoTile(this.icon, this.label, this.value, this.isDark);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 10),
    child: Row(children: [
      // Leading icon in a muted color to avoid drawing focus from the value
      Icon(icon, size: 16, color: isDark ? Colors.white38 : Colors.black38),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Micro-label above the value — very muted to act as a field descriptor
        Text(label, style: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 10)),
        // Actual value text — more prominent than the label
        Text(value, style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 13)),
      ]),
    ]),
  );
}

/// A theme-aware text input field used in the identity section of the profile screen.
/// Switches between an editable and a visually disabled (read-only) appearance
/// based on whether the profile is currently in edit mode.
class _EditField extends StatelessWidget {
  /// Controller that holds and provides access to the field's current text value.
  final TextEditingController ctrl;

  /// Descriptive label shown inside the field as a floating label.
  final String label;

  /// Leading icon that indicates the field's data type (person, phone, etc.).
  final IconData icon;

  /// When false, the field is rendered as read-only with a darker fill color.
  final bool enabled;

  /// Whether the host screen is in dark mode — drives fill and border colors.
  final bool isDark;

  /// Optional keyboard type override (e.g., [TextInputType.phone] for phone number).
  final TextInputType? type;

  const _EditField({required this.ctrl, required this.label, required this.icon,
    this.enabled = true, required this.isDark, this.type});

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: ctrl,
    enabled: enabled,
    keyboardType: type,
    // Text color adapts between white (dark) and near-black (light)
    style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 13),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: isDark ? Colors.white38 : Colors.black38, fontSize: 12),
      // Prefix icon uses the same muted color as the label for visual consistency
      prefixIcon: Icon(icon, color: isDark ? Colors.white38 : Colors.black38, size: 18),
      filled: true,
      // Active fields get a slightly lighter fill to signal they are interactive
      fillColor: enabled ? (isDark ? const Color(0xFF1A2030) : Colors.grey.shade50) : (isDark ? const Color(0xFF0D1117) : Colors.grey.shade100),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      // Default border for initial render (before focus/enable state is applied)
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? AppColors.border : Colors.grey.shade300)),
      // Enabled-but-unfocused border
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? AppColors.border : Colors.grey.shade300)),
      // Disabled border is even more subtle to de-emphasize non-editable fields
      disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? const Color(0xFF1E2530) : Colors.grey.shade200)),
      // Focused border uses the DMS primary neon color to indicate active input
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
    ),
  );
}

/// A selectable theme option tile used in the Appearance section.
/// Highlights in the admin accent color when its [mode] matches the [current] ThemeMode.
class _ThemeOption extends StatelessWidget {
  /// Human-readable label for this theme choice (e.g., "Dark", "Light", "System").
  final String label;

  /// Icon representing this theme choice (e.g., dark_mode, light_mode, brightness_auto).
  final IconData icon;

  /// The ThemeMode this tile represents.
  final ThemeMode mode;

  /// The currently active ThemeMode — used to determine if this tile is selected.
  final ThemeMode current;

  /// Whether the host screen is in dark mode — adjusts unselected tile colors.
  final bool isDark;

  /// Callback invoked when the user taps this tile to activate this theme mode.
  final VoidCallback onTap;

  const _ThemeOption(this.label, this.icon, this.mode, this.current, this.isDark, this.onTap);

  @override
  Widget build(BuildContext context) {
    // Determine if this tile represents the currently active theme
    final selected = mode == current;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        // Smooth selection transition so switching themes feels responsive
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          // Selected tile gets a tint of the admin accent color
          color: selected ? AppColors.adminColor.withValues(alpha: 0.15) : (isDark ? const Color(0xFF1A2030) : Colors.grey.shade100),
          borderRadius: BorderRadius.circular(10),
          // Visible border only on the selected tile; transparent border reserves space
          border: Border.all(color: selected ? AppColors.adminColor : Colors.transparent, width: 1.5),
        ),
        child: Column(children: [
          // Icon is highlighted in admin color when selected
          Icon(icon, color: selected ? AppColors.adminColor : (isDark ? Colors.white38 : Colors.black38), size: 20),
          const SizedBox(height: 4),
          // Label is bold and admin-colored when selected, muted otherwise
          Text(label, style: TextStyle(
            color: selected ? AppColors.adminColor : (isDark ? Colors.white54 : Colors.black54),
            fontSize: 11, fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
        ]),
      ),
    );
  }
}

/// A tappable list tile used in the Quick Actions section of the profile screen.
/// Each tile navigates to a key DMS feature (SOS, shelters, weather, guide, reports).
class _LinkTile extends StatelessWidget {
  /// Icon identifying the DMS feature this tile links to.
  final IconData icon;

  /// Localised label for the DMS feature (e.g., "Emergency SOS", "My Reports").
  final String label;

  /// Accent color for the icon badge — visually differentiates feature categories.
  final Color color;

  /// Whether the host screen is in dark mode — adjusts label text color.
  final bool isDark;

  /// Navigation callback executed when the user taps the tile.
  final VoidCallback onTap;

  const _LinkTile(this.icon, this.label, this.color, this.isDark, this.onTap);

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    dense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
    // Rounded icon badge tinted with the feature's accent color
    leading: Container(
      padding: const EdgeInsets.all(7),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, color: color, size: 16),
    ),
    // Feature label in a readable weight — slightly muted in dark mode
    title: Text(label, style: TextStyle(color: isDark ? const Color(0xDEFFFFFF) : Colors.black87, fontSize: 13, fontWeight: FontWeight.w500)),
    // Chevron indicates the tile is navigable (standard Material navigation convention)
    trailing: Icon(Icons.arrow_forward_ios, size: 12, color: isDark ? Colors.white24 : Colors.black26),
  );
}