// Entry point for the Disaster Management System Flutter app.
// Sets up Hive local cache, requests runtime permissions, and mounts the Riverpod ProviderScope.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Riverpod state management
import 'package:flutter_localizations/flutter_localizations.dart'; // Material/Cupertino i18n delegates
import 'package:hive_flutter/hive_flutter.dart'; // Lightweight local key-value cache
import 'package:permission_handler/permission_handler.dart'; // Runtime Android/iOS permission requests
import 'core/router/app_router.dart'; // GoRouter configuration with auth-guard redirects
import 'features/auth/providers/auth_provider.dart'; // Auth state (user, token, login/logout)
import 'providers/locale_provider.dart'; // Per-user locale persistence
import 'providers/theme_provider.dart'; // Per-user dark/light/system theme persistence

// App entry point — must be async to await Hive + permissions before runApp
void main() async {
  WidgetsFlutterBinding.ensureInitialized(); // Required before any async platform calls
  await Hive.initFlutter(); // Initialize Hive with Flutter's document directory
  await Hive.openBox('dms_cache'); // Open the shared cache box used for offline data
  await _requestPermissions(); // Ask for device permissions before the UI loads
  runApp(const ProviderScope(child: DisasterManagementApp())); // ProviderScope is the Riverpod root
}

// Requests all permissions the app needs, skipping ones already granted or permanently denied.
// Batching into a single request() call shows one permission dialog sequence instead of many.
Future<void> _requestPermissions() async {
  // Only request permissions that aren't already granted — avoids resetting on every launch
  final toRequest = <Permission>[];
  for (final p in [
    Permission.location,      // GPS for incident reporting and map
    Permission.camera,        // Photo capture for incident evidence
    Permission.photos,        // Photo gallery access for evidence upload
    Permission.microphone,    // Future voice note support
    Permission.notification,  // Push notifications for alerts
    Permission.sms,           // SMS-based SOS fallback
    Permission.contacts,      // Emergency contact quick-dial
    Permission.phone,         // Direct call from emergency contacts screen
  ]) {
    final status = await p.status; // Check current grant status
    if (!status.isGranted && !status.isPermanentlyDenied) toRequest.add(p); // Queue only requestable ones
  }
  if (toRequest.isNotEmpty) await toRequest.request(); // Show system permission dialogs
}

// Root widget of the app. Listens to auth state to sync the current user ID
// into locale and theme providers so each user's preferences are persisted separately.
class DisasterManagementApp extends ConsumerWidget {
  const DisasterManagementApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Sync user ID → per-user theme + locale
    ref.listen(authProvider, (prev, next) {
      final uid = next.user?.id?.toString() ?? ''; // Empty string = logged-out / global prefs
      if (ref.read(currentUserIdProvider) != uid) {
        ref.read(currentUserIdProvider.notifier).state = uid; // Update so theme/locale reload per-user prefs
      }
    });

    final themeMode = ref.watch(themeModeProvider); // dark / light / system, persisted per user
    final locale    = ref.watch(localeProvider);    // active Locale, persisted per user
    final router    = ref.watch(routerProvider);    // GoRouter with auth redirect guards

    return MaterialApp.router(
      debugShowCheckedModeBanner: false, // Hide the debug banner in all builds
      title: 'Disaster Management System', // OS task-switcher label
      theme:      ref.watch(lightThemeProvider), // Light theme with brand colors
      darkTheme:  ref.watch(darkThemeProvider),  // Dark (neon-cyberpunk) theme
      themeMode:  themeMode, // Drives which theme is active
      locale:     locale,    // Overrides system locale with user's saved preference
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,   // Material widget i18n (date pickers, etc.)
        GlobalWidgetsLocalizations.delegate,    // Text direction (RTL for Arabic)
        GlobalCupertinoLocalizations.delegate,  // iOS-style widget i18n
      ],
      supportedLocales: const [
        Locale('en'), Locale('ar'), Locale('fr'), Locale('es'), // Core languages
        Locale('de'), Locale('tr'), Locale('zh'), Locale('ru'), // Extended set
        Locale('pt'), Locale('hi'), Locale('ja'), Locale('ko'), // Additional
        Locale('it'), Locale('uk'), // European extras
      ],
      routerConfig: router, // GoRouter handles all navigation and deep-link redirects
    );
  }
}
