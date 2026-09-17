/// ============================================================
/// File: lib/core/router/app_router.dart
///
/// Central navigation configuration for the Disaster Management
/// System (DMS) Flutter application. This file defines all named
/// routes, role-based redirect logic, and the authenticated shell
/// that wraps the bottom navigation bar. It uses go_router with
/// Riverpod for reactive, auth-aware routing so that unauthenticated
/// users are always redirected to /login, while logged-in users are
/// routed to role-appropriate dashboards (Admin, Rescue Team, Citizen).
/// ============================================================

// Flutter material library — provides BuildContext, Scaffold, widgets used
// in the 404 error page fallback UI.
import 'package:flutter/material.dart';

// Riverpod — state management layer; used here to read auth state and wire
// the router to re-evaluate redirects whenever auth changes.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// go_router — declarative routing package that supports nested shells,
// path parameters, and listenable-driven redirects.
import 'package:go_router/go_router.dart';

// Auth provider that exposes the current AuthState (token + user role),
// used to decide which dashboard to show and whether to redirect.
import '../../features/auth/providers/auth_provider.dart';

// ── Authentication screens ────────────────────────────────────────────────
// Login screen shown to unauthenticated users or when token expires.
import '../../features/auth/screens/login_screen.dart';
// Registration screen for new citizen accounts.
import '../../features/auth/screens/register_screen.dart';

// ── Role-specific dashboard screens ──────────────────────────────────────
// Admin dashboard: system-wide statistics, user management entry point.
import '../../features/dashboard/screens/admin_dashboard.dart';
// Responder dashboard: active incident queue and task assignments for rescue teams.
import '../../features/dashboard/screens/responder_dashboard.dart';
// Citizen dashboard: nearby alerts, SOS button, and safety tips.
import '../../features/dashboard/screens/citizen_dashboard.dart';

// ── Incident management screens ───────────────────────────────────────────
// Paginated list of all reported incidents with filter/search support.
import '../../features/incidents/screens/incident_list_screen.dart';
// Detailed view of a single incident: status, location, responder notes.
import '../../features/incidents/screens/incident_detail_screen.dart';
// Form screen for citizens or officers to report a new disaster incident.
import '../../features/incidents/screens/create_incident_screen.dart';
// Edit screen for updating incident details (admin/responder only).
import '../../features/incidents/screens/edit_incident_screen.dart';

// ── Supporting feature screens ────────────────────────────────────────────
// Interactive map showing real-time incident pins and resource locations.
import '../../features/map/screens/map_screen.dart';
// In-app notification centre for alerts pushed from the DMS backend.
import '../../features/notifications/screens/notification_screen.dart';
// Resource inventory list (vehicles, medical kits, personnel, etc.).
import '../../features/resources/screens/resource_list_screen.dart';
// Create/edit form for adding or updating a disaster resource entry.
import '../../features/resources/screens/resource_form_screen.dart';
// Reports and analytics dashboard for incident trends and response times.
import '../../features/reports/screens/reports_screen.dart';
// User profile screen: personal info, language preference, and logout.
import '../../features/profile/screens/profile_screen.dart';
// Admin-only screen for managing user accounts and role assignments.
import '../../features/users/screens/user_management_screen.dart';
// Team management screen for creating/assigning rescue team units.
import '../../features/teams/screens/teams_screen.dart';
// Application settings (notifications, theme, language, etc.).
import '../../features/settings/screens/settings_screen.dart';
// Chat screen for real-time messaging between responders and citizens.
import '../../features/chat/screens/chat_screen.dart';
// Initial branded splash screen shown while auth state is being resolved.
import '../../features/splash/screens/splash_screen.dart';

// ── Extended safety feature screens (added in later sprint) ──────────────
// One-tap SOS trigger screen — accessible before login for emergencies.
import '../../features/emergency/screens/emergency_sos_screen.dart';
// SOS watch mode: continuous location broadcast for tracked users.
import '../../features/sos/screens/sos_watch_screen.dart';
// Live weather conditions and disaster-risk forecasts for the user's area.
import '../../features/weather/screens/weather_screen.dart';
// Curated disaster news feed and official alerts from DMS authorities.
import '../../features/news/screens/news_screen.dart';
// Offline-capable survival guide with first-aid and evacuation procedures.
import '../../features/guide/screens/survival_guide_screen.dart';
// Directory of nearby emergency shelters with capacity and map links.
import '../../features/shelters/screens/shelters_screen.dart';

// ── Shell layout ──────────────────────────────────────────────────────────
// Shared scaffold that hosts the bottom navigation bar for tabbed routes.
import '../../shared/widgets/main_scaffold.dart';
// DMS design-system colour tokens (dark background, primary neon accent, etc.).
import '../constants/app_colors.dart' as ac;

/// Bridges Riverpod's [authProvider] with go_router's [ChangeNotifier]-based
/// refresh mechanism. Whenever the auth state changes (login, logout, token
/// expiry) this notifier fires [notifyListeners], which causes [GoRouter] to
/// re-evaluate its redirect logic immediately.
class _AuthNotifierListenable extends ChangeNotifier {
  /// Constructs the listenable and registers a listener on [authProvider].
  /// [_ref] is the Riverpod [Ref] obtained from the enclosing provider.
  _AuthNotifierListenable(this._ref) {
    // Listen to every AuthState change; the actual values are unused here —
    // we only need the side-effect of triggering a router refresh.
    _ref.listen<AuthState>(authProvider, (_, __) => notifyListeners());
  }

  /// Riverpod Ref used to subscribe to [authProvider] changes.
  final Ref _ref;
}

// Routes that do NOT require a valid session token. The /emergency route is
// intentionally public so users can trigger SOS before logging in.
const _publicRoutes = {'/splash', '/login', '/register', '/emergency'};

/// Top-level Riverpod [Provider] that exposes the configured [GoRouter]
/// instance to the widget tree. The router is kept alive for the app's
/// lifetime and automatically re-evaluates redirects on auth changes.
final routerProvider = Provider<GoRouter>((ref) {
  // Create the auth-change listenable once; go_router holds a weak reference.
  final listenable = _AuthNotifierListenable(ref);

  return GoRouter(
    // Show the branded splash screen first while the app resolves auth state.
    initialLocation: '/splash',

    // Tells go_router to call the redirect callback every time auth changes.
    refreshListenable: listenable,

    /// Global redirect guard evaluated before every navigation event.
    /// Returns a new path string to redirect, or null to allow the navigation.
    redirect: (context, state) {
      // Read the current auth snapshot (synchronous — no await needed).
      final authState = ref.read(authProvider);

      // A non-null token means the user has an active session.
      final isLoggedIn = authState.token != null;

      // The route the user is trying to navigate to.
      final loc = state.matchedLocation;

      // Always allow splash, login, register, and emergency SOS without auth.
      if (_publicRoutes.contains(loc)) return null;

      // Any other route requires authentication; send anonymous users to login.
      if (!isLoggedIn) return '/login';

      // Prevent logged-in users from landing on auth pages — send them home.
      if (loc == '/login' || loc == '/register') return '/home';

      // Navigation is valid — allow it to proceed.
      return null;
    },

    routes: [
      // ── Public routes (no auth required) ─────────────────────────────
      // Splash screen: resolves token and redirects to login or home.
      GoRoute(path: '/splash',   builder: (_, __) => const SplashScreen()),
      // Login screen: credential entry for all user roles.
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      // Registration screen: citizen self-signup flow.
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      // Emergency SOS: one-tap distress signal, intentionally pre-auth.
      GoRoute(path: '/emergency',builder: (_, __) => const EmergencySOSScreen()),

      // ── Main shell: tabbed layout with persistent bottom navigation ───
      // StatefulShellRoute keeps each branch's state alive when switching tabs,
      // so the map viewport and news scroll position are preserved.
      StatefulShellRoute.indexedStack(
        // MainScaffold renders the bottom nav bar and wraps the active branch.
        builder: (context, state, navigationShell) =>
            MainScaffold(navigationShell: navigationShell),
        branches: [
          // Tab 0 — Home/Dashboard: content differs by authenticated user role.
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) {
                // Read the user's role from auth state to pick the right dashboard.
                final role = ref.read(authProvider).user?.role ?? '';
                // Admins see system-wide management controls.
                if (role == 'ADMIN') return const AdminDashboard();
                // Rescue team members see their active incident assignments.
                if (role == 'RESCUE_TEAM') return const ResponderDashboard();
                // All other users (citizens) see alerts and safety resources.
                return const CitizenDashboard();
              },
            ),
          ]),

          // Tab 1 — Map: real-time incident and resource map for situational awareness.
          StatefulShellBranch(routes: [
            GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
          ]),

          // Tab 2 — News & Alerts: curated disaster news and official authority alerts.
          StatefulShellBranch(routes: [
            GoRoute(path: '/news', builder: (_, __) => const NewsScreen()),
          ]),

          // Tab 3 — Profile: personal account settings, language, and session controls.
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          ]),
        ],
      ),

      // ── Standalone authenticated routes (rendered without bottom nav) ─
      // Full incident list with search and filter capabilities.
      GoRoute(path: '/incidents', builder: (_, __) => const IncidentListScreen()),
      // Form for reporting a new disaster incident with location and media.
      GoRoute(path: '/incidents/create', builder: (_, __) => const CreateIncidentScreen()),
      // Detail view for a specific incident; :id is the DMS incident primary key.
      GoRoute(path: '/incidents/:id',
          // Parse the path parameter to the integer ID expected by the backend.
          builder: (_, s) => IncidentDetailScreen(id: int.parse(s.pathParameters['id']!))),
      // Edit form for an existing incident; restricted to admin/responder roles.
      GoRoute(path: '/incidents/:id/edit',
          builder: (_, s) => EditIncidentScreen(id: int.parse(s.pathParameters['id']!))),

      // Push notification centre: lists all system alerts sent to this user.
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationScreen()),

      // Resource inventory list: vehicles, equipment, and personnel records.
      GoRoute(path: '/resources',        builder: (_, __) => const ResourceListScreen()),
      // Form for adding a new resource to the DMS inventory.
      GoRoute(path: '/resources/create', builder: (_, __) => const ResourceFormScreen()),
      // Edit form for an existing resource; :id is the resource primary key.
      GoRoute(path: '/resources/:id/edit',
          // tryParse is used defensively — ResourceFormScreen handles null gracefully.
          builder: (_, s) => ResourceFormScreen(id: int.tryParse(s.pathParameters['id']!))),

      // Analytics and reporting screen: incident heatmaps, response time stats.
      GoRoute(path: '/reports',  builder: (_, __) => const ReportsScreen()),
      // Admin-only user management: view, promote, deactivate DMS user accounts.
      GoRoute(path: '/users',    builder: (_, __) => const UserManagementScreen()),
      // Team management: create rescue teams and assign responder members.
      GoRoute(path: '/teams',    builder: (_, __) => const TeamsScreen()),
      // App settings: notification preferences, language, and theme selection.
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      // In-app chat: real-time messaging channel between responders and citizens.
      GoRoute(path: '/chat',     builder: (_, __) => const ChatScreen()),

      // ── Extended safety feature routes (added in later sprint) ────────
      // Weather screen: live conditions and disaster-risk index for user's region.
      GoRoute(path: '/weather',  builder: (_, __) => const WeatherScreen()),
      // Survival guide: offline first-aid procedures and evacuation checklists.
      GoRoute(path: '/guide',    builder: (_, __) => const SurvivalGuideScreen()),
      // Shelter finder: nearby emergency shelters with capacity and directions.
      GoRoute(path: '/shelters',  builder: (_, __) => const SheltersScreen()),
      // SOS watch mode: continuous GPS broadcast so responders can track the user.
      GoRoute(path: '/sos-watch', builder: (_, __) => const SOSWatchScreen()),
    ],

    /// Fallback UI rendered when go_router cannot match the requested path.
    /// Uses the DMS dark theme to stay visually consistent with the app shell.
    errorBuilder: (context, state) => Scaffold(
      // Always use the dark background colour for the error page for consistency.
      backgroundColor: ac.AppColors.bgDark, // error page uses dark always
      body: Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          // Warning emoji as a large visual cue that something went wrong.
          const Text('⚠️', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          // Human-readable error message for end users.
          const Text('Page not found', style: TextStyle(color: Colors.white54, fontSize: 16)),
          const SizedBox(height: 8),
          // Display the bad URI so developers can quickly identify the broken link.
          Text(state.uri.toString(), style: const TextStyle(color: Colors.white24, fontSize: 12)),
          const SizedBox(height: 24),
          // Recovery button: navigates back to /home using the role-based dashboard.
          ElevatedButton(
            onPressed: () => context.go('/home'),
            // Use the DMS primary neon colour to match the design system.
            style: ElevatedButton.styleFrom(backgroundColor: ac.AppColors.primary),
            child: const Text('GO HOME'),
          ),
        ]),
      ),
    ),
  );
});