// =============================================================================
// login_screen.dart
//
// Authentication entry point for the Disaster Management System (DMS) mobile app.
// This file defines the Login Screen where citizens, field officers, and admins
// authenticate to access incident reporting, resource tracking, and alert features.
//
// It also provides:
//   - AuthTopBar: a shared top bar widget for language and theme switching,
//     reused across login and registration screens.
//   - _SocialBtn: an OAuth provider button (Google, Facebook).
//   - _DemoBtn: a quick-fill demo credential button for testing roles.
//
// Authentication flows supported:
//   - Email + password login via the DMS backend API.
//   - Google OAuth sign-in.
//   - Facebook OAuth sign-in.
//   - Guest emergency SOS access — allows unauthenticated users to report
//     life-threatening incidents without creating an account.
// =============================================================================

// Flutter core UI framework — required for all widget rendering.
import 'package:flutter/material.dart';
// Provides declarative animation extensions (.animate(), .fadeIn(), .slideY())
// used to give entrance animations to form fields and buttons.
import 'package:flutter_animate/flutter_animate.dart';
// Riverpod state management — ConsumerWidget and WidgetRef allow reading
// and watching reactive providers (auth state, locale, theme).
import 'package:flutter_riverpod/flutter_riverpod.dart';
// go_router navigation — context.go() and context.push() handle declarative
// routing to /home, /register, and /emergency screens.
import 'package:go_router/go_router.dart';
// Google Fonts — loads Rajdhani (headings) and Inter (body) fonts matching
// the DMS neon cyberpunk design system.
import 'package:google_fonts/google_fonts.dart';

// DMS-specific colour palette: primary red (#DC2626), borders, and backgrounds.
import '../../../core/constants/app_colors.dart';
// Localisation helper — t(context, ref, key) resolves translated strings for
// the active locale (en, ar, fr, es, de, tr, zh, ru).
import '../../../core/l10n/app_strings.dart';
// Form validation utilities — Validators.email and Validators.password enforce
// input rules before submitting credentials to the DMS backend.
import '../../../core/utils/validators.dart';
// Riverpod provider that tracks the current app locale (language code string).
import '../../../providers/locale_provider.dart';
// Riverpod provider that tracks the current ThemeMode (dark/light/system).
import '../../../providers/theme_provider.dart';
// Bottom sheet widget for picking the display language from the supported list.
import '../../../shared/widgets/lang_pill.dart';
// Auth feature provider — exposes login(), loginWithGoogle(), loginWithFacebook()
// actions and holds the authenticated user state for the DMS session.
import '../providers/auth_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Shared language + theme top bar (used by login & register)
// ─────────────────────────────────────────────────────────────────────────────

/// A top navigation bar shared between the Login and Register screens.
/// Displays a language picker pill and a theme toggle pill so responders
/// can switch locale or dark/light mode before authenticating.
class AuthTopBar extends ConsumerWidget {
  const AuthTopBar({super.key});

  /// Supported DMS display languages: tuples of (locale code, flag emoji, display name).
  /// Covers the main languages used in disaster-affected regions worldwide.
  static const _langs = [
    ('en', '🇬🇧', 'English'),        ('ar', '🇸🇦', 'العربية'),
    ('fr', '🇫🇷', 'Français'),       ('es', '🇪🇸', 'Español'),
    ('de', '🇩🇪', 'Deutsch'),        ('tr', '🇹🇷', 'Türkçe'),
    ('zh', '🇨🇳', '中文'),           ('ru', '🇷🇺', 'Русский'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch the current locale so the pill re-renders when the user changes language.
    final lang   = ref.watch(localeProvider).languageCode;
    // Watch the theme mode so the icon updates immediately on toggle.
    final mode   = ref.watch(themeModeProvider);
    // Determine brightness from the MaterialApp theme to style pill backgrounds.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // Resolve the flag emoji for the active locale; fall back to English if unknown.
    final flag   = _langs.firstWhere((l) => l.$1 == lang, orElse: () => _langs.first).$2;

    return Padding(
      // Horizontal padding keeps pills away from screen edges; top padding adds breathing room.
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(children: [
        // Language picker pill — tapping opens a bottom sheet with all supported locales.
        _pill(
          onTap: () => _pickLang(context, ref, lang, isDark),
          isDark: isDark,
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            // Flag emoji for the currently active locale.
            Text(flag, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 6),
            // Locale code in uppercase (e.g. "EN", "AR") as a compact label.
            Text(lang.toUpperCase(), style: TextStyle(
              color: isDark ? Colors.white70 : Colors.black54,
              fontSize: 11, fontWeight: FontWeight.w700)),
            // Chevron icon hints that tapping opens a selection sheet.
            const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Colors.grey),
          ]),
        ),
        // Push the theme pill to the right edge of the bar.
        const Spacer(),
        // Theme toggle pill — cycles through dark → light → system on each tap.
        _pill(
          isDark: isDark,
          onTap: () {
            // Cycle: dark → light → system → dark, so every tap changes appearance.
            final next = mode == ThemeMode.dark ? ThemeMode.light
                       : mode == ThemeMode.light ? ThemeMode.system : ThemeMode.dark;
            // Persist the chosen theme mode via the Riverpod notifier.
            ref.read(themeModeProvider.notifier).setMode(next);
          },
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            // Icon reflects the current mode: moon, sun, or auto-brightness.
            Icon(
              mode == ThemeMode.dark ? Icons.dark_mode_rounded
              : mode == ThemeMode.light ? Icons.light_mode_rounded : Icons.brightness_auto_rounded,
              size: 16, color: isDark ? Colors.white70 : Colors.black54),
            const SizedBox(width: 4),
            // Localised label for the current mode so all DMS locales are supported.
            Text(
              mode == ThemeMode.dark ? t(context, ref, 'dark')
              : mode == ThemeMode.light ? t(context, ref, 'light') : t(context, ref, 'system'),
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.black54,
                fontSize: 11, fontWeight: FontWeight.w600)),
          ]),
        ),
      ]),
    );
  }

  /// Builds a rounded pill container used for both the language and theme toggles.
  /// Adapts background and border colours to the active dark/light theme.
  Widget _pill({required Widget child, required VoidCallback onTap, required bool isDark}) =>
    GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          // Dark background uses the DMS card colour; light uses plain white.
          color: isDark ? const Color(0xFF1C2333) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          // DMS-standard border: subtle in dark, even lighter in light mode.
          border: Border.all(color: isDark ? AppColors.border : AppColors.borderLight),
          // Soft shadow to lift the pill off the page background.
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6)],
        ),
        child: child,
      ),
    );

  /// Opens the language selection bottom sheet so the user can switch locale.
  /// Called when the language pill is tapped.
  void _pickLang(BuildContext ctx, WidgetRef ref, String current, bool isDark) {
    // Delegates to the shared lang sheet widget to keep the picker DRY across screens.
    showLangSheet(ctx, ref, isDark: isDark);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────────────────────────────────────────

/// The main authentication screen for the DMS mobile app.
/// Citizens and responders sign in here to access incident reporting,
/// resource management, and real-time disaster alerts.
/// Supports email/password login and OAuth via Google and Facebook.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

/// State class for [LoginScreen]. Manages form controllers, loading state,
/// password visibility, and the async login flows.
class _LoginScreenState extends ConsumerState<LoginScreen> {
  /// GlobalKey used to validate the email and password form before submission.
  final _formKey   = GlobalKey<FormState>();
  /// Controller for the email text field — holds the user's DMS account email.
  final _emailCtrl = TextEditingController();
  /// Controller for the password text field — holds the user's plaintext password
  /// (transmitted over HTTPS to the DMS backend).
  final _passCtrl  = TextEditingController();
  /// Whether the password field is obscured; toggled by the eye icon button.
  bool _obscure = true;
  /// Whether an auth request is in-flight; disables buttons to prevent double-submit.
  bool _loading = false;

  /// Disposes text controllers when the widget is removed to prevent memory leaks.
  @override
  void dispose() { _emailCtrl.dispose(); _passCtrl.dispose(); super.dispose(); }

  /// Validates the form and submits email + password credentials to the DMS backend.
  /// On success, navigates the user to /home (the incident dashboard).
  /// On failure, shows a SnackBar with the server error message.
  Future<void> _login() async {
    // Abort early if any validator (email format, password length) fails.
    if (!_formKey.currentState!.validate()) return;
    // Show loading indicator and lock the submit button during the network call.
    setState(() => _loading = true);
    try {
      // Delegate to the Riverpod auth notifier which calls the DMS REST API.
      // trim() removes accidental whitespace from the email input.
      await ref.read(authProvider.notifier).login(_emailCtrl.text.trim(), _passCtrl.text);
      // Navigate to the main incident dashboard only if the widget is still mounted.
      if (mounted) context.go('/home');
    } catch (e) {
      // Display the backend error (e.g. "Invalid credentials") without the
      // "Exception: " prefix that Dart prepends to thrown strings.
      if (mounted) _snack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      // Always clear the loading state, even if an error occurred.
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Generic wrapper for social OAuth login flows (Google, Facebook).
  /// Sets loading state, calls the provided async OAuth function [fn],
  /// then navigates to /home or shows an error SnackBar.
  Future<void> _social(Future<void> Function() fn) async {
    setState(() => _loading = true);
    try { await fn(); if (mounted) context.go('/home'); }
    // Show OAuth provider error (e.g. "Sign-in cancelled") to the user.
    catch (e) { if (mounted) _snack(e.toString().replaceFirst('Exception: ', '')); }
    finally { if (mounted) setState(() => _loading = false); }
  }

  /// Displays a floating SnackBar at the bottom of the screen with message [m].
  /// Uses the DMS primary colour (red) to match the emergency/alert design language.
  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(m), backgroundColor: AppColors.primary,
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))));

  /// Pre-fills the email and password fields with demo credentials and triggers login.
  /// Used by [_DemoBtn] to allow testers to quickly sign in as a specific DMS role
  /// (e.g. citizen, officer, admin) without typing credentials manually.
  void _demoLogin(String email, String pass) {
    _emailCtrl.text = email; _passCtrl.text = pass; _login();
  }

  @override
  Widget build(BuildContext context) {
    // Resolve dark/light mode to apply the correct colour variables throughout.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    // Page background: near-black navy in dark mode, light grey in light mode.
    final bg     = isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F2F8);
    // Card background for the form container.
    final cardBg = isDark ? const Color(0xFF111827) : Colors.white;
    // Primary text colour — white on dark, near-black on light.
    final textCol   = isDark ? Colors.white : Colors.black87;
    // Secondary/hint text colour — dimmed for labels and placeholders.
    final subCol    = isDark ? Colors.white54 : Colors.black45;
    // Background fill for text input fields.
    final fieldFill = isDark ? const Color(0xFF1C2333) : Colors.grey.shade50;
    // Border colour for input fields and the form card.
    final borderCol = isDark ? AppColors.border : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        // CustomScrollView enables the whole page to scroll if the keyboard appears.
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(), // iOS-style bounce for natural feel.
          slivers: [
            SliverToBoxAdapter(child: Column(children: [
              // ── Top Bar ──────────────────────────────────────────────
              // Shared language + theme switcher placed above the hero image.
              const AuthTopBar(),
              const SizedBox(height: 20),

              // ── Hero gradient card ────────────────────────────────────
              // A full-width banner with a scenic disaster-management imagery
              // and a welcome message to set context for the DMS login screen.
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ClipRRect(
                  // Rounded corners to match the DMS card design language.
                  borderRadius: BorderRadius.circular(24),
                  child: SizedBox(
                    height: 200,
                    child: Stack(fit: StackFit.expand, children: [
                      // Remote mountain/landscape image representing disaster terrain.
                      // Falls back to a solid DMS blue if the network is unavailable.
                      Image.network(
                        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(color: const Color(0xFF1D4ED8))),
                      // Dark gradient overlay ensures the white text is legible
                      // regardless of the underlying image content.
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xEE0D1B2A), Color(0xBB1D4ED8), Colors.transparent],
                            begin: Alignment.bottomLeft, end: Alignment.topRight)),
                      ),
                      // Text content anchored to the bottom-left of the hero card.
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
                          Row(children: [
                            // Red emergency icon badge — signals the DMS emergency theme.
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDC2626), // DMS primary red
                                borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.emergency_share_rounded, color: Colors.white, size: 24)),
                            const SizedBox(width: 12),
                            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              // Localised "Welcome Back" heading in the Rajdhani display font.
                              Text(t(context, ref, 'welcome_back'), style: GoogleFonts.rajdhani(
                                color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                              // Subtitle prompting the user to sign in to manage incidents.
                              Text(t(context, ref, 'signin_subtitle'), style: GoogleFonts.inter(
                                color: Colors.white70, fontSize: 12)),
                            ]),
                          ]),
                        ]),
                      ),
                    ]),
                  ),
                // Animate the hero card in with a fade and slight upward slide.
                ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.05, end: 0),
              ),
              const SizedBox(height: 24),

              // ── Form card ─────────────────────────────────────────────
              // The main login form container with email, password, and action buttons.
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: borderCol),
                    // Elevated shadow: stronger in dark mode to separate from the dark bg.
                    boxShadow: [BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                      blurRadius: 20, offset: const Offset(0, 4))],
                  ),
                  padding: const EdgeInsets.all(24),
                  child: Form(key: _formKey, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

                    // ── Email ──────────────────────────────────────────
                    // Label for the email input — uses subCol for a muted appearance.
                    Text(t(context, ref, 'email'), style: GoogleFonts.inter(
                      color: subCol, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5))
                      .animate().fadeIn(delay: 100.ms),
                    const SizedBox(height: 8),
                    // Email text field — uses the email keyboard and runs Validators.email
                    // to check format before the DMS API call is made.
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      style: TextStyle(color: textCol, fontSize: 14),
                      decoration: _dec(t(context, ref, 'email'), Icons.mail_outline_rounded, isDark, fieldFill, borderCol),
                      validator: Validators.email, // Validates email format (e.g. user@dms.org).
                    ).animate().fadeIn(delay: 120.ms).slideY(begin: 0.1, end: 0),
                    const SizedBox(height: 16),

                    // ── Password ───────────────────────────────────────
                    // Label for the password input.
                    Text(t(context, ref, 'password'), style: GoogleFonts.inter(
                      color: subCol, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5))
                      .animate().fadeIn(delay: 160.ms),
                    const SizedBox(height: 8),
                    // Password field — obscured by default; eye icon toggles visibility.
                    // Validator enforces minimum length per DMS security policy.
                    TextFormField(
                      controller: _passCtrl, obscureText: _obscure,
                      style: TextStyle(color: textCol, fontSize: 14),
                      decoration: _dec(t(context, ref, 'password'), Icons.lock_outline_rounded, isDark, fieldFill, borderCol,
                        // Eye icon suffix toggles password visibility on press.
                        suffix: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            size: 20, color: isDark ? Colors.white38 : Colors.black38),
                          onPressed: () => setState(() => _obscure = !_obscure))),
                      validator: Validators.password, // Enforces DMS password rules (e.g. min length).
                    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1, end: 0),
                    const SizedBox(height: 10),

                    // ── Forgot password ────────────────────────────────
                    // Right-aligned link for password reset (navigation not yet wired).
                    Align(alignment: Alignment.centerRight,
                      child: Text(t(context, ref, 'forgot_password'), style: TextStyle(
                        color: const Color(0xFF1D4ED8), // DMS link blue — distinct from the primary red.
                        fontSize: 12, fontWeight: FontWeight.w600))),
                    const SizedBox(height: 24),

                    // ── Sign In button ─────────────────────────────────
                    // Primary CTA button — red gradient matches the DMS emergency colour.
                    // Disabled and shows a spinner while the login request is in-flight.
                    Container(
                      height: 54,
                      decoration: BoxDecoration(
                        // Red gradient: left-to-right from bright red to dark red.
                        gradient: const LinearGradient(
                          colors: [Color(0xFFDC2626), Color(0xFF991B1B)],
                          begin: Alignment.centerLeft, end: Alignment.centerRight),
                        borderRadius: BorderRadius.circular(14),
                        // Red glow shadow reinforces the neon cyberpunk DMS theme.
                        boxShadow: [const BoxShadow(
                          color: Color(0x55DC2626), blurRadius: 12, offset: Offset(0, 4))],
                      ),
                      child: ElevatedButton(
                        // Disable the button during network request to prevent double-submit.
                        onPressed: _loading ? null : _login,
                        style: ElevatedButton.styleFrom(
                          // Transparent background lets the gradient Container show through.
                          backgroundColor: Colors.transparent, shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                        // Show a spinner while authenticating; otherwise show "Sign In" label.
                        child: _loading
                          ? const SizedBox(width: 22, height: 22,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(t(context, ref, 'sign_in'), style: GoogleFonts.inter(
                              fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                      ),
                    ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.1, end: 0),
                    const SizedBox(height: 20),

                    // ── OR divider ─────────────────────────────────────
                    // Visual separator between email/password login and OAuth options.
                    Row(children: [
                      Expanded(child: Divider(color: borderCol)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        // Localised "or continue with" text to introduce social login buttons.
                        child: Text(t(context, ref, 'or_continue'), style: TextStyle(
                          color: subCol, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5))),
                      Expanded(child: Divider(color: borderCol)),
                    ]).animate().fadeIn(delay: 300.ms),
                    const SizedBox(height: 16),

                    // ── Google ─────────────────────────────────────────
                    // OAuth sign-in via Google — delegates to authProvider.loginWithGoogle()
                    // which triggers the Google Sign-In SDK and exchanges tokens with the DMS backend.
                    _SocialBtn(
                      icon: Icons.g_mobiledata_rounded, iconColor: const Color(0xFFDB4437), // Google brand red
                      label: t(context, ref, 'google'),
                      isDark: isDark, cardBg: cardBg, borderCol: borderCol, textCol: textCol,
                      onTap: () => _social(() => ref.read(authProvider.notifier).loginWithGoogle()),
                    ).animate().fadeIn(delay: 330.ms),
                    const SizedBox(height: 10),

                    // ── Facebook ───────────────────────────────────────
                    // OAuth sign-in via Facebook — uses the Facebook SDK; the App Secret
                    // is kept server-side per DMS security policy (never in the app bundle).
                    _SocialBtn(
                      icon: Icons.facebook_rounded, iconColor: const Color(0xFF1877F2), // Facebook brand blue
                      label: t(context, ref, 'facebook'),
                      isDark: isDark, cardBg: cardBg, borderCol: borderCol, textCol: textCol,
                      onTap: () => _social(() => ref.read(authProvider.notifier).loginWithFacebook()),
                    ).animate().fadeIn(delay: 360.ms),
                    const SizedBox(height: 20),

                    // ── Register link ──────────────────────────────────
                    // Prompts new users (citizens, volunteers) to create a DMS account.
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      // Static question text: "Don't have an account?"
                      Text('${t(context, ref, "no_account")} ', style: TextStyle(color: subCol, fontSize: 13)),
                      // Tappable "Register" link navigates to the account creation screen.
                      GestureDetector(
                        onTap: () => context.push('/register'),
                        child: Text(t(context, ref, 'register'), style: const TextStyle(
                          color: Color(0xFFDC2626), // DMS primary red — matches the Sign In button.
                          fontWeight: FontWeight.w700, fontSize: 13))),
                    ]).animate().fadeIn(delay: 390.ms),
                  ])),
                ),
              ),
              const SizedBox(height: 24),

              const SizedBox(height: 8),

              // ── Guest Emergency SOS ────────────────────────────────────
              // Critical accessibility feature: allows unauthenticated users
              // (e.g. witnesses at an incident scene) to submit an emergency alert
              // without registering or logging in, lowering the barrier in life-threatening situations.
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GestureDetector(
                  // Navigates to the /emergency screen for unauthenticated SOS reporting.
                  onTap: () => context.push('/emergency'),
                  child: Container(
                    decoration: BoxDecoration(
                      // Bold red gradient signals danger/urgency matching DMS alert severity colours.
                      gradient: const LinearGradient(
                        colors: [Color(0xFFDC2626), Color(0xFF7F1D1D)],
                        begin: Alignment.topLeft, end: Alignment.bottomRight),
                      borderRadius: BorderRadius.circular(20),
                      // Strong red glow effect — makes the SOS button unmissable.
                      boxShadow: [const BoxShadow(color: Color(0x55DC2626), blurRadius: 16, offset: Offset(0, 6))],
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Row(children: [
                      // SOS icon in a frosted circular container for quick visual recognition.
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          // Semi-transparent white overlay creates a glass effect on the red gradient.
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14)),
                        // Standard SOS icon — internationally recognised emergency symbol.
                        child: const Icon(Icons.sos, color: Colors.white, size: 32)),
                      const SizedBox(width: 16),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        // Headline for the SOS button in Rajdhani display font with wide tracking.
                        Text(t(context, ref, 'guest_sos'), style: GoogleFonts.rajdhani(
                          color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
                        // Sub-text explaining that no account is required to send an emergency alert.
                        Text(t(context, ref, 'guest_sos_sub'), style: GoogleFonts.inter(
                          color: Colors.white70, fontSize: 12)),
                      ])),
                      // Chevron indicates this is a navigable action, not just a display card.
                      const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 18),
                    ]),
                  // Animate the SOS button in after the form has settled on screen.
                  ).animate().fadeIn(delay: 450.ms).slideY(begin: 0.1, end: 0),
                ),
              ),
              const SizedBox(height: 40),
            ])),
          ],
        ),
      ),
    );
  }

  /// Builds a consistent [InputDecoration] for DMS login form fields.
  /// Applies dark/light-aware colours, a left icon, optional right suffix widget,
  /// and uses the DMS primary red (#DC2626) for focus and error border states.
  ///
  /// [label]     — hint text shown when the field is empty.
  /// [icon]      — prefix icon (e.g. mail, lock) for quick field identification.
  /// [isDark]    — controls placeholder and icon opacity for the active theme.
  /// [fill]      — background fill colour of the input field.
  /// [borderCol] — default and enabled border colour.
  /// [suffix]    — optional trailing widget (e.g. password eye toggle button).
  InputDecoration _dec(String label, IconData icon, bool isDark, Color fill, Color borderCol, {Widget? suffix}) =>
    InputDecoration(
      hintText: label,
      // Dimmed hint text colour so it doesn't compete with the user's typed input.
      hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 13),
      // Left-side icon provides quick visual context for each field.
      prefixIcon: Icon(icon, size: 20, color: isDark ? Colors.white38 : Colors.black38),
      // Optional right-side widget (password visibility toggle).
      suffixIcon: suffix,
      filled: true,
      fillColor: fill,
      // Default (inactive) border.
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: borderCol)),
      // Enabled (unfocused) border — same as the default border.
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: borderCol)),
      // Focused border highlights in DMS primary red, width 2 for prominence.
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDC2626), width: 2)),
      // Error border uses DMS red to signal invalid email/password input.
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDC2626))),
      // Focused error border — red with width 2 for maximum visibility of validation errors.
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDC2626), width: 2)),
      // Comfortable vertical padding for touch targets on mobile devices.
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
}

// ─────────────────────────────────────────────────────────────────────────────

/// A reusable social OAuth login button used for Google and Facebook sign-in.
/// Displays a provider icon, the provider name, and triggers [onTap] on press.
/// Adapts background and border to the current dark/light theme.
class _SocialBtn extends StatelessWidget {
  /// The Material icon representing the OAuth provider (e.g. Google, Facebook).
  final IconData icon;
  /// Brand colour for the provider icon (Google red, Facebook blue).
  final Color iconColor;
  /// Localised label text (e.g. "Continue with Google").
  final String label;
  /// Whether the app is currently in dark mode — affects card and text colours.
  final bool isDark;
  /// Background colour of the button, matches the surrounding form card.
  final Color cardBg;
  /// Border colour consistent with the form's input field borders.
  final Color borderCol;
  /// Primary text colour adapted to the active theme.
  final Color textCol;
  /// Callback triggered when the user taps the social login button.
  final VoidCallback onTap;
  const _SocialBtn({required this.icon, required this.iconColor, required this.label,
    required this.isDark, required this.cardBg, required this.borderCol,
    required this.textCol, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      height: 50,
      decoration: BoxDecoration(
        // Use the same card background as the form to integrate seamlessly.
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        // Subtle border distinguishes the button from the card background.
        border: Border.all(color: borderCol)),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        // Provider brand icon (e.g. Google "G", Facebook "f").
        Icon(icon, color: iconColor, size: 26),
        const SizedBox(width: 10),
        // Provider label text (e.g. "Google", "Facebook") in semi-bold weight.
        Text(label, style: TextStyle(color: textCol, fontSize: 13, fontWeight: FontWeight.w600)),
      ]),
    ),
  );
}

/// A compact gradient button used to pre-fill demo credentials for a specific DMS role.
/// Each button represents a role (e.g. Citizen, Officer, Admin) and fills in
/// the login form with test credentials so QA testers can quickly switch accounts.
class _DemoBtn extends StatelessWidget {
  /// The role label displayed below the icon (e.g. "Admin", "Officer").
  final String label;
  /// Icon representing the DMS role (e.g. admin badge, officer shield).
  final IconData icon;
  /// Gradient colours that visually differentiate each role button.
  final List<Color> grad;
  /// Callback that pre-fills credentials and triggers [_LoginScreenState._demoLogin].
  final VoidCallback onTap;
  const _DemoBtn({required this.label, required this.icon, required this.grad, required this.onTap});

  @override
  Widget build(BuildContext context) => Expanded(child: GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        // Each role has a unique gradient for quick visual identification.
        gradient: LinearGradient(colors: grad, begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(12),
        // Coloured glow shadow derived from the first gradient colour.
        boxShadow: [BoxShadow(color: grad.first.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Column(children: [
        // Role icon — white for contrast against the gradient background.
        Icon(icon, color: Colors.white, size: 22),
        const SizedBox(height: 5),
        // Role name label in compact Inter font, bold for legibility at small size.
        Text(label, style: GoogleFonts.inter(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
      ]),
    ),
  ));
}