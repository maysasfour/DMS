// Root shell scaffold for the main authenticated app area.
// Wraps the GoRouter StatefulNavigationShell with:
//   - ConnectivityBanner at the top (offline indicator)
//   - Custom bottom navigation bar with 4 tabs (Home, Map, News, Profile)
//   - Floating SOS button centered above the bottom bar (citizens only)
// Admin and RESCUE_TEAM users see no SOS button since they don't need emergency reporting.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ConsumerWidget, ref.watch
import 'package:go_router/go_router.dart'; // StatefulNavigationShell, context.push
import '../../core/constants/app_colors.dart'; // bgDark, border, primary colors
import '../../core/l10n/app_strings.dart'; // t() localization helper
import '../../features/auth/providers/auth_provider.dart'; // authProvider for role check
import '../../providers/locale_provider.dart'; // localeProvider — watched to trigger nav label rebuild on locale change
import 'connectivity_banner.dart'; // Top offline banner

// Shell scaffold that holds the StatefulNavigationShell from GoRouter.
// StatefulNavigationShell preserves each branch's scroll/state across tab switches.
class MainScaffold extends ConsumerWidget {
  final StatefulNavigationShell navigationShell; // GoRouter shell managing branch navigation
  const MainScaffold({required this.navigationShell, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(localeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final navBg  = isDark ? const Color(0xFF060A0F) : Colors.white;
    final role   = ref.watch(authProvider).user?.role ?? '';
    final isCitizen = role != 'ADMIN' && role != 'RESCUE_TEAM';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : const Color(0xFFF5F5F5),
      body: Column(
        children: [
          const ConnectivityBanner(),
          Expanded(child: navigationShell),
        ],
      ),
      floatingActionButton: isCitizen ? _SOSButton() : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _BottomNavBar(
        currentIndex: navigationShell.currentIndex,
        navBg: navBg,
        ref: ref,
        onTap: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
      ),
    );
  }
}

class _SOSButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/emergency'),
      child: Container(
        width: 62,
        height: 62,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const RadialGradient(
            colors: [Color(0xFFFF2050), Color(0xFFAA0020)],
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.5),
              blurRadius: 16,
              spreadRadius: 2,
            ),
          ],
          border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 2),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sos, color: Colors.white, size: 26),
            Text('SOS', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }
}

class _BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Color navBg;
  final WidgetRef ref;
  final void Function(int) onTap;
  const _BottomNavBar({required this.currentIndex, required this.navBg, required this.ref, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: navBg,
        border: Border(top: BorderSide(color: isDark ? AppColors.border : Colors.grey.shade200)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home, label: t(context, ref, 'home'), index: 0, current: currentIndex, onTap: onTap),
              _NavItem(icon: Icons.map_outlined, activeIcon: Icons.map, label: t(context, ref, 'map'), index: 1, current: currentIndex, onTap: onTap),
              const SizedBox(width: 70),
              _NavItem(icon: Icons.newspaper_outlined, activeIcon: Icons.newspaper, label: t(context, ref, 'news'), index: 2, current: currentIndex, onTap: onTap),
              _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: t(context, ref, 'profile'), index: 3, current: currentIndex, onTap: onTap),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon, activeIcon;
  final String label;
  final int index, current;
  final void Function(int) onTap;
  const _NavItem({
    required this.icon, required this.activeIcon, required this.label,
    required this.index, required this.current, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = index == current;
    final color    = isActive ? AppColors.primary : Colors.grey;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(isActive ? activeIcon : icon, color: color, size: 22,
                  key: ValueKey(isActive)),
            ),
            const SizedBox(height: 3),
            Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: isActive ? FontWeight.w700 : FontWeight.w400)),
          ],
        ),
      ),
    );
  }
}
