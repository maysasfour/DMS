# Developer Quick Reference Card

## 🚀 Essential Commands

### Running the App
```bash
# Standard run
flutter run

# Run on specific device
flutter run -d emulator-5554
flutter run -d chrome

# Run with verbose output
flutter run -v

# Hot reload (in terminal)
r        # Hot reload
R        # Hot restart
q        # Quit
```

### Building
```bash
# Debug build (default)
flutter build apk --debug
flutter build ios --debug

# Release build
flutter build apk --release
flutter build ios --release
flutter build web --release

# Web with canvaskit renderer
flutter build web --web-renderer canvaskit
```

### Maintenance
```bash
flutter clean              # Clear build cache
flutter pub get            # Get dependencies
flutter pub upgrade        # Upgrade packages
flutter doctor             # Check setup
flutter analyze            # Static analysis
flutter test               # Run tests
dart format lib/           # Format code
```

---

## 🔐 Demo Credentials (Copy-Paste Ready)

```
🧑‍💼 Admin
admin@dm.com
Admin@123

🚨 Responder
responder@dm.com
Responder@123

👤 Citizen
citizen@dm.com
Citizen@123

🏛️ Official
official@dm.com
Official@123
```

---

## 🎨 Key Colors

### Roles
```dart
const Color adminPrimary = Color(0xFF1E3A8A);          // Blue
const Color responderPrimary = Color(0xFFEA580C);      // Orange
const Color citizenPrimary = Color(0xFF16A34A);        // Green
const Color officialPrimary = Color(0xFF7C3AED);       // Purple
```

### Status
```dart
reported      → #6B7280 (Gray)
acknowledged  → #3B82F6 (Blue)
inProgress    → #F59E0B (Amber)
resolved      → #10B981 (Green)
closed        → #8B5CF6 (Purple)
```

### Severity
```dart
low           → #10B981 (Green)
medium        → #F59E0B (Amber)
high          → #EF4444 (Red)
critical      → #7C3AED (Purple)
```

---

## 📁 File Navigation

### Models
```
lib/core/models/user_model.dart
lib/models/incident_model.dart
lib/alert/alert_model.dart
lib/features/resource_model.dart
```

### Services
```
lib/core/services/auth_service.dart
lib/core/services/incident_service.dart
lib/core/services/storage_service.dart
```

### Providers
```
lib/providers/auth_provider.dart
lib/providers/incident_provider.dart
lib/providers/theme_provider.dart
lib/providers/locale_provider.dart
```

### Screens
```
lib/screens/auth/login_screen.dart
lib/screens/dashboard/dashboard_screen.dart
```

### Theme
```
lib/core/themes/color_palette.dart
lib/core/themes/app_theme.dart
```

---

## 🧩 Common Patterns

### Watch State in Widget
```dart
final user = ref.watch(currentUserProvider);
final incidents = ref.watch(incidentsProvider);

// Handle FutureProvider
incidents.when(
  loading: () => CircularProgressIndicator(),
  error: (err, stack) => Text('Error: $err'),
  data: (list) => ListView(children: list),
);
```

### Read State (One-time)
```dart
ref.read(currentUserProvider.notifier).login(email, pwd);
ref.read(themeModeProvider.notifier).state = ThemeMode.dark;
```

### Update State
```dart
// Using notifier
ref.read(currentUserProvider.notifier).logout();

// Using StateProvider directly
ref.read(themeModeProvider.notifier).state = newValue;
```

### Create New Provider
```dart
final myProvider = Provider<MyType>((ref) {
  // Access other providers
  final other = ref.watch(otherProvider);
  return MyType(...);
});

final myFutureProvider = FutureProvider<MyType>((ref) async {
  return await someAsyncOperation();
});

final myStateProvider = StateNotifierProvider<MyNotifier, MyState>(
  (ref) => MyNotifier(initialState)
);
```

---

## 🎯 Riverpod Cheat Sheet

| Provider Type | Use Case | Caching |
|---|---|---|
| `Provider` | Computed state | Yes (memoized) |
| `StateProvider` | Simple mutable state | Yes |
| `StateNotifierProvider` | Complex mutable state | Yes |
| `FutureProvider` | Async operations | Yes |
| `StreamProvider` | Real-time updates | Yes |
| `.family` | Parameterized | Per-param |

### Watching
```dart
ref.watch(provider)              // Watch for changes
ref.watch(provider.select(...))  // Partial state
ref.listen(provider, (p, n) {})  // Listen without rebuild
```

### Reading
```dart
ref.read(provider)               // One-time read
ref.read(provider.notifier)      // Access notifier
```

---

## 🏗️ Architecture Overview

```
UI Screens
    ↓ ref.watch/read
Riverpod Providers
    ↓ depend on
Services (Mock)
    ↓ operate on
Models (Data Classes)
    ↓ use
Constants & Utils
```

---

## 🎓 Development Workflow

### 1. Add New Feature
```bash
# 1. Create model if needed
lib/models/new_model.dart

# 2. Create service if needed
lib/core/services/new_service.dart

# 3. Create provider if needed
lib/providers/new_provider.dart

# 4. Create screen if needed
lib/screens/feature/feature_screen.dart

# 5. Add route/navigation
```

### 2. Test Locally
```bash
# Run app
flutter run

# Test with different user
Use demo credentials from login screen

# Check for errors
flutter analyze

# Format code
dart format lib/
```

### 3. Commit Changes
```bash
git add .
git commit -m "Feature: Add new feature"
git push
```

---

## 🐛 Debugging Tips

### Check Provider State
```dart
// In hot reload, add this to inspect
print(ref.read(myProvider));
```

### Catch Provider Errors
```dart
incidents.when(
  loading: () => LoadingWidget(),
  error: (error, stackTrace) {
    print('Error: $error');
    print('Stack: $stackTrace');
    return ErrorWidget(error: error);
  },
  data: (data) => DataWidget(data),
);
```

### Hot Reload Issues
- Press `r` for hot reload
- If not working, press `R` for hot restart
- If still failing, stop and `flutter run` again

### Null Safety Issues
- Use `?.` for nullable access
- Use `!` only when certain (not recommended)
- Use `??` for default values
- Use `??=` for nullable assignment

---

## 📊 Model Quick Reference

### UserModel Fields
```dart
id              // String
fullName        // String
email           // String
phoneNumber     // String
role            // UserRole
profilePictureUrl // String?
bio             // String?
createdAt       // DateTime
lastLogin       // DateTime?
isActive        // bool
```

### IncidentModel Fields
```dart
id                 // String
title              // String
description        // String
latitude           // double
longitude          // double
locationAddress    // String
status             // IncidentStatus
severity           // IncidentSeverity
reportedBy         // String
reportedAt         // DateTime
resolvedAt         // DateTime?
photoUrls          // List<String>
videoUrls          // List<String>
assignedResponders // List<String>
affectedPeople     // int
notes              // String
```

---

## 🎨 Material 3 Text Styles

| Style | Size | Weight | Use |
|---|---|---|---|
| displayLarge | 57 | 400 | Large headlines |
| displayMedium | 45 | 400 | Medium headlines |
| displaySmall | 36 | 400 | Small headlines |
| headlineLarge | 32 | 400 | Section headers |
| headlineMedium | 28 | 400 | Subsection headers |
| headlineSmall | 24 | 400 | Small headers |
| titleLarge | 22 | 500 | Card titles |
| titleMedium | 16 | 500 | Subtitle |
| titleSmall | 14 | 500 | Caption |
| bodyLarge | 16 | 400 | Body text |
| bodyMedium | 14 | 400 | Body text |
| bodySmall | 12 | 400 | Small text |
| labelLarge | 14 | 500 | Label |
| labelMedium | 12 | 500 | Small label |
| labelSmall | 11 | 500 | Tiny label |

---

## 🔗 Documentation Links

### In Project
- `QUICKSTART.md` - Get running in 5 minutes
- `IMPLEMENTATION_GUIDE.md` - Feature overview
- `ARCHITECTURE.md` - Technical design
- `ROADMAP.md` - Future features
- `DEMO_DATA.md` - Mock data details
- `PROJECT_SUMMARY.md` - Completion report

### External
- [Flutter Docs](https://flutter.dev)
- [Riverpod Guide](https://riverpod.dev)
- [Dart Docs](https://dart.dev)
- [Material 3](https://m3.material.io/)

---

## 📝 Code Snippets

### Create New Incident
```dart
final newIncident = IncidentModel(
  id: 'incident-${DateTime.now().millisecondsSinceEpoch}',
  title: 'New Incident',
  description: 'Description here',
  latitude: 40.7128,
  longitude: -74.0060,
  locationAddress: 'Address',
  status: IncidentStatus.reported,
  severity: IncidentSeverity.high,
  reportedBy: currentUser.id,
  reportedAt: DateTime.now(),
  photoUrls: [],
  videoUrls: [],
  assignedResponders: [],
  affectedPeople: 0,
  notes: '',
);

await ref.read(incidentServiceProvider).createIncident(newIncident);
```

### Get User Color
```dart
final color = ColorPalette.getPrimaryByRole(user.role.toString());
```

### Format Status Display
```dart
final statusDisplay = incident.status.displayName;
final statusColor = ColorPalette.getStatusColor(incident.status);
```

### Navigate After Login
```dart
// Auto-handled by main.dart routing
// When isAuthenticatedProvider changes to true,
// MaterialApp automatically shows DashboardScreen
```

---

## ✅ Pre-Launch Checklist

- [ ] Run `flutter clean && flutter pub get`
- [ ] Run `flutter analyze` (no errors)
- [ ] Run `flutter test`
- [ ] Test login with all 4 credentials
- [ ] Verify dashboard displays correctly
- [ ] Check dark/light mode switching
- [ ] Test navigation between tabs
- [ ] Verify incident list loads
- [ ] Test logout functionality
- [ ] Check for console warnings
- [ ] Verify on target platform (Android/iOS)

---

## 🔍 Quick Debug Commands

```bash
# Show all flutter devices
flutter devices

# Show connected devices
adb devices

# Run app with logs
flutter run -v

# Clear app cache
flutter clean

# Check for issues
flutter doctor

# Analyze code
flutter analyze

# Format all Dart files
dart format lib/ test/

# Run specific test
flutter test test/widget_test.dart
```

---

## 📞 When Things Go Wrong

| Issue | Solution |
|-------|----------|
| App won't start | `flutter clean && flutter pub get && flutter run -v` |
| Hot reload fails | Press `R` for hot restart, or restart app |
| Dependency error | `flutter pub get`, check `pubspec.yaml` versions |
| Build error | Check console, look for red text, run in verbose mode |
| State not updating | Verify watching provider correctly with `ref.watch()` |
| Model JSON error | Check `toJson()` and `fromJson()` methods |
| Navigation broken | Verify route in `main.dart` and provider logic |

---

**Quick Reference v1.0 | Last Updated: 2026-01-15**
