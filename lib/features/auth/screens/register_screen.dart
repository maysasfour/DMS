// ============================================================================
// register_screen.dart
//
// Registration screen for the Disaster Management System (DMS) mobile app.
// Allows new users (citizens, responders, volunteers) to create an account
// by providing their name, email, optional phone number, and a secure password.
//
// Supports both email/password registration and OAuth sign-in via Google and
// Facebook. On successful registration, the user is redirected to the home
// screen where they can report incidents, view alerts, and access DMS features.
//
// Integrates with:
//   - authProvider  : Riverpod state notifier that calls the DMS backend API
//   - localeProvider: Provides the active language for multilingual support
//   - Validators    : Shared form validation utilities (email, password, etc.)
//   - AppColors     : DMS design-system color tokens (neon cyberpunk theme)
//   - AppStrings    : Localised string resolver for i18n labels
// ============================================================================

// Flutter UI framework — required for all widget trees and material components
import 'package:flutter/material.dart';
// Riverpod state-management — ConsumerStatefulWidget lets this screen read/watch providers
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Declarative animation helpers — used to fade/slide form fields on entry
import 'package:flutter_animate/flutter_animate.dart';
// GoRouter navigation — used to push to /home after successful registration
import 'package:go_router/go_router.dart';
// Google Fonts — provides the Inter typeface used in the DMS design system
import 'package:google_fonts/google_fonts.dart';

// DMS colour palette — defines primary (red/danger), warning, success, border tokens
import '../../../core/constants/app_colors.dart';
// Shared form validators — email format, password strength rules, required-field checks
import '../../../core/utils/validators.dart';
// Authentication state provider — exposes register(), loginWithGoogle(), loginWithFacebook()
import '../providers/auth_provider.dart';
// Localisation helper — resolves translated strings for the active locale
import '../../../core/l10n/app_strings.dart';
// Locale provider — tracks the user's selected language (en, ar, fr, es, tr, etc.)
import '../../../providers/locale_provider.dart';
// Login screen import — exposes the shared AuthTopBar widget used at the top of auth flows
import 'login_screen.dart';

/// Registration screen widget — a [ConsumerStatefulWidget] so it can both
/// hold mutable form state and subscribe to Riverpod providers (auth, locale).
class RegisterScreen extends ConsumerStatefulWidget {
  // Const constructor with forwarded key — supports Flutter widget tree identity
  const RegisterScreen({super.key});

  @override
  // Creates the mutable state object that manages form controllers and UI flags
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

/// Private state class for [RegisterScreen].
/// Owns all [TextEditingController]s and boolean flags for the registration form.
class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  // Global key used to trigger form validation across all TextFormField children
  final _formKey      = GlobalKey<FormState>();

  // Controller for the user's first name input field
  final _firstCtrl    = TextEditingController();

  // Controller for the user's last name input field
  final _lastCtrl     = TextEditingController();

  // Controller for the user's email address — used as the DMS account identifier
  final _emailCtrl    = TextEditingController();

  // Controller for the optional phone number — used for SMS alerts in the DMS
  final _phoneCtrl    = TextEditingController();

  // Controller for the desired account password
  final _passCtrl     = TextEditingController();

  // Controller for the password confirmation field — must match _passCtrl
  final _confirmCtrl  = TextEditingController();

  // Whether the password field text is hidden (true = obscured, default)
  // Whether the confirm-password field is hidden; separate flag so each toggles independently
  // Whether an async registration request is in flight — disables the submit button
  bool _obscure = true, _obscureConfirm = true, _loading = false;

  @override
  // Dispose all controllers to free memory when the widget is removed from the tree
  void dispose() {
    // Release each TextEditingController in order to prevent memory leaks
    _firstCtrl.dispose(); _lastCtrl.dispose(); _emailCtrl.dispose();
    _phoneCtrl.dispose(); _passCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  /// Calculates a password strength score from 0–4 for the given password [p].
  /// Each satisfied criterion adds 1 point:
  ///   1. Length >= 8 characters
  ///   2. Contains an uppercase letter
  ///   3. Contains a digit
  ///   4. Contains a special character (!@#$%^&*)
  /// Used to drive the visual strength indicator bar below the password field.
  int _passStrength(String p) {
    // Start with a score of zero — each rule that passes increments it
    int s = 0;
    // Criterion 1: minimum length of 8 characters for a valid DMS password
    if (p.length >= 8) s++;
    // Criterion 2: at least one uppercase letter (improves entropy)
    if (RegExp(r'[A-Z]').hasMatch(p)) s++;
    // Criterion 3: at least one numeric digit
    if (RegExp(r'[0-9]').hasMatch(p)) s++;
    // Criterion 4: at least one special character from the allowed set
    if (RegExp(r'[!@#\$%^&*]').hasMatch(p)) s++;
    return s;
  }

  /// Returns the DMS theme colour that corresponds to the password strength score [s].
  /// Weak (0–1) → primary red (danger), Fair (2) → warning amber, Strong (3–4) → success green.
  Color _strengthColor(int s) {
    // Weak password — use the DMS danger/primary red to alert the user
    if (s <= 1) return AppColors.primary;
    // Fair password — amber warning to encourage improvement
    if (s == 2) return AppColors.warning;
    // Strong password — green success to confirm the password is acceptable
    return AppColors.success;
  }

  /// Returns a localised label string for the password strength score [s].
  /// Reads the current locale from [localeProvider] to pick the correct translation.
  String _strengthLabel(int s) {
    // Resolve the active language code (e.g. 'en', 'ar') for string lookup
    final lang = ref.read(localeProvider).languageCode;
    // Weak label — shown in red below the strength bar
    if (s <= 1) return appString('strength_weak', lang);
    // Fair label — shown in amber below the strength bar
    if (s == 2) return appString('strength_fair', lang);
    // Strong label — shown in green below the strength bar
    return appString('strength_strong', lang);
  }

  /// Validates the form and submits a registration request to the DMS backend.
  /// On success, navigates the user to /home where they can access the DMS dashboard.
  /// On failure, surfaces the server error message in a floating [SnackBar].
  Future<void> _register() async {
    // Abort early if any form field fails its validator (email format, required, etc.)
    if (!_formKey.currentState!.validate()) return;

    // Show spinner and disable the submit button while the request is in flight
    setState(() => _loading = true);
    try {
      // Delegate account creation to the authProvider notifier which calls the DMS REST API
      await ref.read(authProvider.notifier).register(
        // Trim whitespace from name fields to avoid dirty data in the DMS user record
        firstName: _firstCtrl.text.trim(),
        lastName:  _lastCtrl.text.trim(),
        // Email becomes the unique login identifier for this DMS account
        email:     _emailCtrl.text.trim(),
        // Raw password — the provider/backend handles hashing; never stored locally
        password:  _passCtrl.text,
        // Sent to the backend for server-side confirmation match validation
        confirmPassword: _confirmCtrl.text,
        // Phone is optional; send null if the field is blank so backend treats it as absent
        phone: _phoneCtrl.text.trim().isNotEmpty ? _phoneCtrl.text.trim() : null,
      );
      // Navigate to the main DMS home screen only if the widget is still mounted
      if (mounted) context.go('/home');
    } catch (e) {
      // Display the backend error (e.g. "Email already registered") in a floating snack bar
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        // Strip the Dart "Exception: " prefix to show a clean message to the user
        content: Text(e.toString().replaceFirst('Exception: ', '')),
        // Use the DMS primary red background to signal an error condition
        backgroundColor: AppColors.primary, behavior: SnackBarBehavior.floating));
    } finally {
      // Always re-enable the submit button once the async operation completes or fails
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  /// Builds the full registration screen UI including the logo, form fields,
  /// password strength indicator, OAuth social buttons, and a sign-in link.
  Widget build(BuildContext context) {
    // Detect dark/light theme to switch fill colours and text colours accordingly
    final isDark    = Theme.of(context).brightness == Brightness.dark;

    // Read the current password text so the strength indicator updates on every keystroke
    final pass      = _passCtrl.text;

    // Compute strength score once per build so both the bar and label stay in sync
    final strength  = _passStrength(pass);

    return Scaffold(
      // Use the theme's scaffold background — respects DMS dark/light mode
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        // SafeArea avoids system UI intrusions (notch, status bar, home indicator)
        child: Column(children: [
          // Shared top bar (logo + language switcher) imported from login_screen.dart
          const AuthTopBar(),

          // Scrollable form area — fills remaining vertical space below the top bar
          Expanded(child: SingleChildScrollView(
            // Horizontal padding 24, top 16, bottom 40 to clear system navigation bar
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
            child: Form(
              // Attach the global key so _register() can trigger validation imperatively
              key: _formKey,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

                // ── Logo ──────────────────────────────────────────────────
                // Centred DMS brand logo with an animated scale-in entrance
                Center(child: Column(children: [
                  Container(
                    width: 64, height: 64,
                    decoration: BoxDecoration(
                      // Red gradient matches the DMS primary danger/alert colour identity
                      gradient: const LinearGradient(
                        colors: [Color(0xFFDC2626), Color(0xFF991B1B)],
                        begin: Alignment.topLeft, end: Alignment.bottomRight),
                      // Rounded corners consistent with the DMS card component style
                      borderRadius: BorderRadius.circular(16),
                      // Glow shadow using the primary colour — reinforces neon cyberpunk theme
                      boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0,4))],
                    ),
                    // Person-add icon communicates the registration action clearly
                    child: const Icon(Icons.person_add_outlined, color: Colors.white, size: 32),
                  // Elastic scale-in animation — draws attention to the DMS branding on load
                  ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
                  const SizedBox(height: 14),

                  // Screen title — localised "Create Account" heading in Inter Bold
                  Text(t(context, ref, 'create_account'), style: GoogleFonts.inter(
                    fontSize: 22, fontWeight: FontWeight.w700,
                    // Adaptive colour: bright text on dark, darker text on light background
                    color: isDark ? AppColors.textPrimary : AppColors.textLight))
                    // Staggered fade+slide in after the logo to create a waterfall entrance
                    .animate().fadeIn(delay: 100.ms, duration: 400.ms).slideY(begin: 0.2, end: 0),
                  const SizedBox(height: 4),

                  // Subtitle — short tagline or instructions localised via appStrings
                  Text(t(context, ref, 'register_subtitle'), style: TextStyle(
                    fontSize: 13, color: isDark ? AppColors.textSecondary : AppColors.textMuted))
                    .animate().fadeIn(delay: 200.ms, duration: 400.ms),
                ])),
                const SizedBox(height: 28),

                // ── Name Row ───────────────────────────────────────────────
                // First name and last name fields placed side-by-side to save vertical space
                Row(children: [
                  // First name field — required; used in DMS user profile and notifications
                  Expanded(child: _field(_firstCtrl, t(context, ref, 'first_name'), Icons.person_outline,
                    validator: (v) => Validators.required(v, t(context, ref, 'first_name')))),
                  // Horizontal gap between the two name fields
                  const SizedBox(width: 10),
                  // Last name field — required; combined with first name in DMS reports
                  Expanded(child: _field(_lastCtrl, t(context, ref, 'last_name'), Icons.person_outline,
                    validator: (v) => Validators.required(v, t(context, ref, 'last_name')))),
                // Staggered fade+slide animation so the name row enters after the logo
                ]).animate().fadeIn(delay: 250.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),
                const SizedBox(height: 14),

                // ── Email ──────────────────────────────────────────────────
                // Email field — must be a valid address; becomes the DMS login credential
                _field(_emailCtrl, t(context, ref, 'email'), Icons.mail_outline,
                  // Email keyboard type surfaces the @ key and domain suggestions
                  type: TextInputType.emailAddress, validator: Validators.email)
                  .animate().fadeIn(delay: 300.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),
                const SizedBox(height: 14),

                // ── Phone ──────────────────────────────────────────────────
                // Optional phone field — if provided, enables SMS disaster alert delivery
                _field(_phoneCtrl, t(context, ref, 'phone_optional'), Icons.phone_outlined,
                  // Phone keyboard optimises the input for numeric + punctuation entry
                  type: TextInputType.phone)
                  .animate().fadeIn(delay: 350.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),
                const SizedBox(height: 14),

                // ── Password ───────────────────────────────────────────────
                // Password field with visibility toggle and real-time strength evaluation
                TextFormField(
                  controller: _passCtrl,
                  // Mask the password characters by default for security
                  obscureText: _obscure,
                  // Rebuild on each keystroke so the strength indicator updates live
                  onChanged: (_) => setState(() {}),
                  decoration: _dec(t(context, ref, 'password'), Icons.lock_outline,
                    // Suffix button lets the user reveal/hide the password they are typing
                    suffix: IconButton(
                      // Toggle between eye-open and eye-closed icons based on _obscure state
                      icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                      onPressed: () => setState(() => _obscure = !_obscure))),
                  // Apply the shared DMS password validator (min length, complexity rules)
                  validator: Validators.password,
                ).animate().fadeIn(delay: 400.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),

                // Password strength indicator — only shown once the user starts typing
                if (pass.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    // Linear progress bar fills from 0→1 as the strength score improves
                    Expanded(child: ClipRRect(
                      // Clip corners to match the rounded style of DMS form elements
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        // Normalise score to 0.0–1.0 range (score max is 4)
                        value: strength / 4,
                        minHeight: 4,
                        // Bar colour shifts from red → amber → green with password quality
                        color: _strengthColor(strength),
                        // Track colour adapts to dark/light theme
                        backgroundColor: isDark ? AppColors.border : Colors.grey.shade200,
                      ),
                    )),
                    const SizedBox(width: 10),
                    // Localised strength label (Weak / Fair / Strong) in matching colour
                    Text(_strengthLabel(strength),
                      style: TextStyle(color: _strengthColor(strength), fontSize: 11, fontWeight: FontWeight.w600)),
                  ]),
                ],
                const SizedBox(height: 14),

                // ── Confirm Password ───────────────────────────────────────
                // Confirmation field — validator checks it matches the password field
                TextFormField(
                  controller: _confirmCtrl,
                  // Hide text by default; user can reveal with the suffix icon button
                  obscureText: _obscureConfirm,
                  decoration: _dec(t(context, ref, 'confirm_password'), Icons.lock_outline,
                    // Independent visibility toggle so users can reveal just the confirm field
                    suffix: IconButton(
                      icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                      onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm))),
                  // Cross-field validator: returns an error if value differs from _passCtrl
                  validator: (v) => Validators.confirmPassword(v, _passCtrl.text),
                ).animate().fadeIn(delay: 450.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),
                const SizedBox(height: 28),

                // ── Register Button ────────────────────────────────────────
                // Primary CTA button — disabled while a registration request is in flight
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    // Pass null to disable the button and prevent duplicate submissions
                    onPressed: _loading ? null : _register,
                    child: _loading
                      // Show a circular spinner while waiting for the DMS API response
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      // Show the localised "Create Account" label when idle
                      : Text(t(context, ref, 'create_account'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ).animate().fadeIn(delay: 500.ms, duration: 400.ms).slideY(begin: 0.15, end: 0),
                const SizedBox(height: 20),

                // ── OR divider ─────────────────────────────────────────────
                // Visual separator between email registration and OAuth social sign-in options
                Row(children: [
                  // Left rule line — colour adapts to dark/light theme
                  Expanded(child: Divider(color: isDark ? AppColors.border : AppColors.borderLight)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    // Localised "or continue with" label between the two divider lines
                    child: Text(t(context, ref, 'or_continue'), style: TextStyle(
                      color: isDark ? AppColors.textSecondary : AppColors.textMuted, fontSize: 12))),
                  // Right rule line — mirrors the left divider for visual balance
                  Expanded(child: Divider(color: isDark ? AppColors.border : AppColors.borderLight)),
                ]),
                const SizedBox(height: 20),

                // ── Social ─────────────────────────────────────────────────
                // Google OAuth button — triggers Google sign-in flow via authProvider
                _SocialBtn(
                  // Google brand icon and red brand colour for immediate visual recognition
                  icon: Icons.g_mobiledata_rounded, label: t(context, ref, 'google'),
                  color: const Color(0xFFDB4437), isDark: isDark,
                  onTap: () async {
                    // Show loading state to prevent duplicate taps during OAuth redirect
                    setState(() => _loading = true);
                    try {
                      // Delegate Google sign-in to the auth notifier; handles token exchange
                      await ref.read(authProvider.notifier).loginWithGoogle();
                      // Navigate to DMS home if widget is still in the tree
                      if (mounted) context.go('/home');
                    } catch (e) {
                      // Surface OAuth error (e.g. cancelled sign-in, network error) to user
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(e.toString().replaceFirst('Exception: ', '')),
                        backgroundColor: AppColors.primary));
                    } finally { if (mounted) setState(() => _loading = false); }
                  },
                ).animate().fadeIn(delay: 550.ms, duration: 400.ms),
                const SizedBox(height: 10),

                // Facebook OAuth button — triggers Facebook sign-in flow via authProvider
                _SocialBtn(
                  // Facebook brand icon and blue brand colour for immediate recognition
                  icon: Icons.facebook_rounded, label: t(context, ref, 'facebook'),
                  color: const Color(0xFF1877F2), isDark: isDark,
                  onTap: () async {
                    // Show loading state while the Facebook SDK OAuth flow is running
                    setState(() => _loading = true);
                    try {
                      // Delegate Facebook login to the auth notifier; the backend validates
                      // the access token and issues a DMS session token in exchange
                      await ref.read(authProvider.notifier).loginWithFacebook();
                      // Navigate to DMS home on successful authentication
                      if (mounted) context.go('/home');
                    } catch (e) {
                      // Surface Facebook OAuth errors (e.g. permission denied) to the user
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(e.toString().replaceFirst('Exception: ', '')),
                        backgroundColor: AppColors.primary));
                    } finally { if (mounted) setState(() => _loading = false); }
                  },
                ).animate().fadeIn(delay: 600.ms, duration: 400.ms),
                const SizedBox(height: 24),

                // ── Sign In link ───────────────────────────────────────────
                // Prompt for returning DMS users who already have an account
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  // Muted label text — "Already have an account?"
                  Text('${t(context, ref, "have_account")} ',
                    style: TextStyle(color: isDark ? AppColors.textSecondary : AppColors.textMuted)),
                  // Tappable "Sign In" link in DMS primary red — navigates to the login screen
                  GestureDetector(
                    onTap: () => context.go('/login'),
                    child: Text(t(context, ref, 'sign_in'), style: const TextStyle(
                      color: AppColors.primary, fontWeight: FontWeight.w700))),
                ]).animate().fadeIn(delay: 650.ms, duration: 400.ms),
              ]),
            ),
          )),
        ]),
      ),
    );
  }

  /// Convenience factory for a standard [TextFormField] using the DMS input decoration.
  /// [ctrl] — the controller to bind; [label] — localised placeholder/label text;
  /// [icon] — leading icon reflecting the field's data type; [type] — optional keyboard;
  /// [validator] — optional validation function from [Validators].
  Widget _field(TextEditingController ctrl, String label, IconData icon, {
    TextInputType? type, String? Function(String?)? validator,
  }) => TextFormField(
    controller: ctrl,
    // Set the appropriate soft keyboard type (email, phone, text) for the field
    keyboardType: type,
    // Apply the shared DMS-branded InputDecoration with borders, fill, and icon
    decoration: _dec(label, icon),
    // Attach the validator if provided — null means the field is optional
    validator: validator,
  );

  /// Builds a consistent [InputDecoration] for all DMS form fields.
  /// Adapts fill colour and border colours to the current dark/light theme.
  /// [label] — floating label text; [icon] — prefix icon; [suffix] — optional trailing widget.
  InputDecoration _dec(String label, IconData icon, {Widget? suffix}) {
    // Determine theme brightness once so all border/fill colours stay consistent
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InputDecoration(
      // Floating label rendered above the field when it has focus or a value
      labelText: label,
      // Leading icon at 20px — smaller than default to keep fields compact
      prefixIcon: Icon(icon, size: 20),
      // Optional suffix widget — used for password visibility toggle buttons
      suffixIcon: suffix,
      // Filled background distinguishes input fields from the page background
      filled: true,
      // Dark mode: semi-transparent card colour; Light mode: near-white grey
      fillColor: isDark ? AppColors.cardDark : Colors.grey.shade50,
      // Default border — subtle outline at rest state
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
      // Enabled (unfocused) border — same subtle colour as default border
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
      // Focused border — uses DMS secondary accent colour to highlight the active field
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.secondary, width: 1.5)),
      // Error border — DMS primary red indicates a validation failure
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary)),
      // Focused error border — thicker red outline when the field is both focused and invalid
      focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      // Internal padding ensures comfortable touch targets and readable text alignment
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}

/// Private reusable social sign-in button used for Google and Facebook OAuth options.
/// Renders a branded icon + label on a card-style container that adapts to dark/light theme.
class _SocialBtn extends StatelessWidget {
  // Material icon representing the social provider (e.g. Google G, Facebook F)
  final IconData icon;

  // Localised label text displayed next to the icon (e.g. "Google", "Facebook")
  final String label;

  // Brand colour for the provider icon — keeps Google red and Facebook blue on-brand
  final Color color;

  // Tap callback — wired to the OAuth login flow for this specific provider
  final VoidCallback onTap;

  // Theme flag — controls fill colour and text colour in dark vs light mode
  final bool isDark;

  // Const constructor — all fields required; no optional parameters
  const _SocialBtn({required this.icon, required this.label, required this.color, required this.onTap, required this.isDark});

  @override
  /// Renders a tappable pill-shaped button with the provider icon and label centred inside.
  Widget build(BuildContext context) => GestureDetector(
    // Wire the tap to the OAuth handler passed in by the parent screen
    onTap: onTap,
    child: Container(
      // Fixed 48px height matches the DMS primary button height for visual consistency
      height: 48,
      decoration: BoxDecoration(
        // Dark mode: glass-card colour; Light mode: white to match standard OAuth button UX
        color: isDark ? AppColors.cardGlass : Colors.white,
        // Rounded corners aligned with the DMS form field border radius
        borderRadius: BorderRadius.circular(10),
        // Thin border separates the button from the background in both themes
        border: Border.all(color: isDark ? AppColors.border : AppColors.borderLight),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        // Provider icon in its brand colour at 24px — larger than field icons for emphasis
        Icon(icon, color: color, size: 24),
        const SizedBox(width: 10),
        // Provider label in 14px semi-bold — adaptive colour for dark/light backgrounds
        Text(label, style: TextStyle(
          color: isDark ? AppColors.textPrimary : AppColors.textLight,
          fontSize: 14, fontWeight: FontWeight.w600)),
      ]),
    ),
  );
}