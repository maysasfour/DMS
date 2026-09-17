// Side navigation drawer used across all authenticated screens.
// Shows user avatar (initial letter), name, email, and role badge in the header.
// Provides language picker + theme toggle in a compact pill row below the header.
// Navigation items are role-filtered: ADMIN sees Users + Teams; RESCUE_TEAM sees Resources + Reports.
// Includes a logout button at the bottom that clears auth state and navigates to /login.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ConsumerWidget, WidgetRef
import 'package:go_router/go_router.dart'; // context.go() for route navigation
import 'package:google_fonts/google_fonts.dart'; // Rajdhani font for avatar letter, Inter for items
import '../../core/constants/app_colors.dart'; // roleColor(), border, and theme tokens
import '../../core/l10n/app_strings.dart'; // t() localization helper for nav labels
import '../../features/auth/providers/auth_provider.dart'; // authProvider for user info and logout
import '../../providers/locale_provider.dart'; // localeProvider for current language code
import '../../providers/theme_provider.dart'; // themeModeProvider for dark/light/system toggle
import 'lang_pill.dart'; // showLangSheet() bottom sheet for language selection

class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key});

  static const _langs = [
    ('en', '🇬🇧', 'English'),        ('ar', '🇸🇦', 'العربية'),
    ('fr', '🇫🇷', 'Français'),       ('es', '🇪🇸', 'Español'),
    ('de', '🇩🇪', 'Deutsch'),        ('tr', '🇹🇷', 'Türkçe'),
    ('zh', '🇨🇳', '中文'),           ('ru', '🇷🇺', 'Русский'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user   = ref.watch(authProvider).user;
    final role   = user?.role ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final lang   = ref.watch(localeProvider).languageCode;
    final mode   = ref.watch(themeModeProvider);

    final bg       = isDark ? const Color(0xFF111827) : Colors.white;
    final textCol  = isDark ? Colors.white : Colors.black87;
    final subCol   = isDark ? Colors.white54 : Colors.black45;
    final iconCol  = isDark ? Colors.white60 : Colors.black54;
    final divCol   = isDark ? AppColors.border : Colors.grey.shade200;
    final tileBg   = isDark ? const Color(0xFF1C2333) : Colors.grey.shade50;
    final flag     = _langs.firstWhere((l) => l.$1 == lang, orElse: () => _langs.first).$2;

    return Drawer(
      backgroundColor: bg,
      child: SafeArea(
        child: Column(
          children: [
            // ── Header ─────────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                    ? [const Color(0xFF1C2333), const Color(0xFF111827)]
                    : [const Color(0xFFE8F0FE), Colors.white],
                  begin: Alignment.topLeft, end: Alignment.bottomRight),
                ),
              child: Row(children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.roleColor(role),
                  child: Text(
                    (user?.name.isNotEmpty == true) ? user!.name[0].toUpperCase() : 'U',
                    style: GoogleFonts.rajdhani(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 22)),
                ),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user?.name ?? '', style: GoogleFonts.inter(
                    color: textCol, fontWeight: FontWeight.w700, fontSize: 15),
                    overflow: TextOverflow.ellipsis),
                  Text(user?.email ?? '', style: GoogleFonts.inter(
                    color: subCol, fontSize: 11),
                    overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.roleColor(role).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.roleColor(role).withValues(alpha: 0.4))),
                    child: Text(role.replaceAll('_', ' '), style: TextStyle(
                      color: AppColors.roleColor(role), fontSize: 10, fontWeight: FontWeight.w700))),
                ])),
              ]),
            ),

            // ── Language + Theme row ────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(children: [
                // Language picker
                Expanded(child: _QuickPill(
                  onTap: () => _pickLang(context, ref, lang, isDark),
                  isDark: isDark,
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text(flag, style: const TextStyle(fontSize: 16)),
                    const SizedBox(width: 5),
                    Text(lang.toUpperCase(), style: TextStyle(
                      color: textCol, fontSize: 11, fontWeight: FontWeight.w700)),
                    Icon(Icons.arrow_drop_down, size: 16, color: iconCol),
                  ]),
                )),
                const SizedBox(width: 8),
                // Theme toggle
                Expanded(child: _QuickPill(
                  isDark: isDark,
                  onTap: () {
                    final next = mode == ThemeMode.dark ? ThemeMode.light
                               : mode == ThemeMode.light ? ThemeMode.system : ThemeMode.dark;
                    ref.read(themeModeProvider.notifier).setMode(next);
                  },
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(
                      mode == ThemeMode.dark ? Icons.dark_mode_rounded
                      : mode == ThemeMode.light ? Icons.light_mode_rounded : Icons.brightness_auto_rounded,
                      size: 15, color: iconCol),
                    const SizedBox(width: 5),
                    Text(
                      mode == ThemeMode.dark ? t(context, ref, 'dark')
                      : mode == ThemeMode.light ? t(context, ref, 'light') : t(context, ref, 'system'),
                      style: TextStyle(color: textCol, fontSize: 11, fontWeight: FontWeight.w600)),
                  ]),
                )),
              ]),
            ),

            Divider(color: divCol, height: 1),

            // ── Navigation items ────────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _DrawerTile(icon: Icons.home_outlined,         label: t(context, ref, 'home'),          route: '/home',          isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  _DrawerTile(icon: Icons.warning_amber_outlined, label: t(context, ref, 'incidents'),     route: '/incidents',      isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  _DrawerTile(icon: Icons.map_outlined,           label: t(context, ref, 'map'),           route: '/map',            isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  _DrawerTile(icon: Icons.notifications_outlined, label: t(context, ref, 'notifications'), route: '/notifications',  isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  _DrawerTile(icon: Icons.chat_bubble_outline,    label: t(context, ref, 'messages'),      route: '/chat',           isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  if (role == 'ADMIN' || role == 'RESCUE_TEAM') ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text(t(context, ref, 'management'), style: TextStyle(
                        color: subCol, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8))),
                    _DrawerTile(icon: Icons.inventory_2_outlined, label: t(context, ref, 'resources'), route: '/resources', isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                    _DrawerTile(icon: Icons.bar_chart_outlined,   label: t(context, ref, 'reports'),   route: '/reports',   isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  ],
                  if (role == 'ADMIN') ...[
                    _DrawerTile(icon: Icons.people_outline,  label: t(context, ref, 'users'),  route: '/users',  isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                    _DrawerTile(icon: Icons.groups_outlined, label: t(context, ref, 'teams'),  route: '/teams',  isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  ],
                  Divider(color: divCol, height: 20),
                  _DrawerTile(icon: Icons.person_outline,   label: t(context, ref, 'profile'),  route: '/profile',  isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                  _DrawerTile(icon: Icons.settings_outlined, label: t(context, ref, 'settings'), route: '/settings', isDark: isDark, textCol: textCol, iconCol: iconCol, tileBg: tileBg),
                ],
              ),
            ),

            // ── Logout ──────────────────────────────────────────────────────
            Divider(color: divCol, height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: GestureDetector(
                onTap: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) context.go('/login');
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFF991B1B)]),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [const BoxShadow(color: Color(0x44DC2626), blurRadius: 8, offset: Offset(0, 3))]),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.logout_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(t(context, ref, 'logout'), style: GoogleFonts.inter(
                      color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _pickLang(BuildContext ctx, WidgetRef ref, String current, bool isDark) {
    showLangSheet(ctx, ref, isDark: isDark);
  }
}

class _QuickPill extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  final bool isDark;
  const _QuickPill({required this.child, required this.onTap, required this.isDark});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C2333) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isDark ? AppColors.border : Colors.grey.shade200)),
      child: child,
    ),
  );
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String label, route;
  final bool isDark;
  final Color textCol, iconCol, tileBg;
  const _DrawerTile({required this.icon, required this.label, required this.route,
    required this.isDark, required this.textCol, required this.iconCol, required this.tileBg});

  @override
  Widget build(BuildContext context) => ListTile(
    dense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
    leading: Icon(icon, color: iconCol, size: 20),
    title: Text(label, style: TextStyle(color: textCol, fontSize: 14, fontWeight: FontWeight.w500)),
    onTap: () { Navigator.pop(context); context.go(route); },
  );
}

