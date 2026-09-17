# Technical Architecture & Code Organization

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER (Screens)                    │
│  LoginScreen  │  DashboardScreen  │  (Placeholders)         │
└────────────────────┬────────────────────────────────────────┘
                     │ (ref.watch / ref.read)
┌────────────────────▼────────────────────────────────────────┐
│                   STATE MANAGEMENT LAYER                     │
│         (Riverpod Providers & StateNotifiers)               │
│  auth_provider  │  incident_provider  │  theme_provider     │
└────────────────────┬────────────────────────────────────────┘
                     │ (dependencies)
┌────────────────────▼────────────────────────────────────────┐
│                    SERVICES LAYER                            │
│   AuthService  │  IncidentService  │  StorageService        │
└────────────────────┬────────────────────────────────────────┘
                     │ (operates on)
┌────────────────────▼────────────────────────────────────────┐
│                    MODELS LAYER                              │
│   UserModel  │  IncidentModel  │  AlertModel  │  etc.       │
└──────────────────────────────────────────────────────────────┘
```

## 📂 Directory Structure

### Core Module (`lib/core/`)
**Purpose**: Shared, non-feature-specific code

```
core/
├── constants/           # App-wide constants
│   ├── app_constants.dart    # Delays, limits, configs
│   └── roles.dart            # Enums: UserRole, IncidentStatus, IncidentSeverity
├── localization/        # i18n setup
├── models/              # Core data models
│   └── user_model.dart       # UserModel class
├── services/            # Mock business logic
│   ├── auth_service.dart     # Authentication
│   ├── incident_service.dart # Incident CRUD
│   └── storage_service.dart  # Local persistence
├── themes/              # Design system
│   ├── app_theme.dart        # ThemeData builders
│   └── color_palette.dart    # ColorPalette class
└── widgets/             # Reusable UI components
```

### Features Module (`lib/features/`)
**Purpose**: Feature-specific screens, logic, and sub-modules

```
features/
├── alert/               # Alert/notification feature
├── auth/                # Authentication flow
│   ├── data/            # Data access layer
│   ├── domain/          # Business logic
│   └── presentation/    # UI screens
├── dashboard/           # Main dashboard
├── incident/            # Single incident view
├── incidents/           # Incidents list
├── mapping/             # Map integration
├── notifications/       # Notification display
├── profile/             # User profile
├── reports/             # Report generation
├── resource/            # Resource management
└── settings/            # App settings
```

### Providers Module (`lib/providers/`)
**Purpose**: Riverpod state management

```
providers/
├── auth_provider.dart            # CurrentUserNotifier, auth state
├── incident_provider.dart        # Incidents FutureProvider, filtering
├── theme_provider.dart           # ThemeMode management
└── locale_provider.dart          # Language/locale management
```

### Models Module (`lib/models/`)
**Purpose**: Feature-specific data models

```
models/
├── incident_model.dart           # Incident entity
└── [others derived from models]
```

### Screens Module (`lib/screens/`)
**Purpose**: Top-level screen components

```
screens/
├── auth/
│   └── login_screen.dart         # Login UI
└── dashboard/
    └── dashboard_screen.dart     # Dashboard with 5 tabs
```

## 🔄 Data Flow Pattern

### Authentication Flow
```
User Input (Email/Password)
         ↓
LoginScreen.onLogin()
         ↓
ref.read(currentUserProvider.notifier).login(email, password)
         ↓
CurrentUserNotifier.login() calls AuthService.login()
         ↓
AuthService returns UserModel or null
         ↓
StateNotifier updates: state = user
         ↓
isAuthenticatedProvider re-evaluates
         ↓
main.dart sees isAuthenticated = true
         ↓
Routes to DashboardScreen
```

### Incident Data Flow
```
DashboardScreen (Incidents Tab)
         ↓
ref.watch(incidentsProvider)
         ↓
FutureProvider calls IncidentService.getIncidents()
         ↓
IncidentService returns List<IncidentModel> from mock data
         ↓
FutureProvider.when(
  loading: () => LoadingWidget,
  error: () => ErrorWidget,
  data: (incidents) => ListView(incidents)
)
```

### Theme Switching Flow
```
User toggles dark/light mode
         ↓
ref.read(themeModeProvider.notifier).state = ThemeMode.dark
         ↓
themeModeProvider updates
         ↓
lightThemeProvider/darkThemeProvider re-evaluate
         ↓
main.dart rebuilds with new theme
         ↓
MaterialApp.theme and darkTheme update
         ↓
All widgets rebuild with new colors
```

## 🎯 Key Design Patterns

### 1. StateNotifierProvider Pattern (Auth)
```dart
// Provider definition
final currentUserProvider = StateNotifierProvider<CurrentUserNotifier, UserModel?>(
  (ref) => CurrentUserNotifier(ref.watch(authServiceProvider))
);

// Notifier class
class CurrentUserNotifier extends StateNotifier<UserModel?> {
  CurrentUserNotifier(this.authService) : super(null);
  
  Future<bool> login(String email, String password) async {
    final user = await authService.login(email, password);
    state = user;  // Triggers rebuild for all watchers
    return user != null;
  }
}

// Usage in widget
final user = ref.watch(currentUserProvider);  // Get current state
ref.read(currentUserProvider.notifier).login(email, pwd);  // Call method
```

### 2. FutureProvider Pattern (Incidents)
```dart
// Simple FutureProvider
final incidentsProvider = FutureProvider<List<IncidentModel>>(
  (ref) async => await ref.watch(incidentServiceProvider).getIncidents()
);

// Usage with loading/error states
ref.watch(incidentsProvider).when(
  loading: () => CircularProgressIndicator(),
  error: (err, stack) => ErrorWidget(error: err),
  data: (incidents) => ListView(children: incidents.map(...).toList()),
);
```

### 3. Derived Providers Pattern
```dart
// Derive data from existing provider
final isAuthenticatedProvider = Provider<bool>(
  (ref) => ref.watch(currentUserProvider) != null
);

final userRoleProvider = Provider<UserRole?>(
  (ref) => ref.watch(currentUserProvider)?.role
);

// Usage
if (ref.watch(isAuthenticatedProvider)) {
  // Show dashboard
}
```

### 4. Provider.family Pattern (Parameterized)
```dart
// Provider that accepts a parameter
final incidentProvider = FutureProvider.family<IncidentModel?, String>(
  (ref, id) async => await ref.watch(incidentServiceProvider).getIncident(id)
);

// Usage
final incident = ref.watch(incidentProvider('incident-123'));
```

## 🛠️ Service Layer Design

### Mock Service Pattern
```dart
class IncidentService {
  // In-memory storage
  static final List<IncidentModel> _incidents = [
    IncidentModel(...),
    IncidentModel(...),
  ];
  
  // Simulated async with delay
  Future<List<IncidentModel>> getIncidents() async {
    await Future.delayed(const Duration(milliseconds: 800));
    return List.from(_incidents);
  }
  
  // CRUD operations
  Future<IncidentModel?> createIncident(IncidentModel incident) async {
    await Future.delayed(const Duration(milliseconds: 800));
    _incidents.insert(0, incident);  // New at top
    return incident;
  }
}
```

## 🎨 Theming Architecture

### ColorPalette Class
```dart
class ColorPalette {
  // Role-specific primaries
  static const Color adminPrimary = Color(0xFF1E3A8A);
  static const Color responderPrimary = Color(0xFFEA580C);
  static const Color citizenPrimary = Color(0xFF16A34A);
  static const Color officialPrimary = Color(0xFF7C3AED);
  
  // Status and Severity mappings
  static Color getStatusColor(IncidentStatus status) => switch(status) {
    IncidentStatus.reported => neutral300,
    IncidentStatus.acknowledged => blue500,
    IncidentStatus.inProgress => amber500,
    IncidentStatus.resolved => green500,
    IncidentStatus.closed => purple500,
  };
  
  // Neutral scale for consistency
  static const Color neutral0 = Color(0xFFFFFFFF);    // White
  static const Color neutral50 = Color(0xFFF9FAFB);   // Almost white
  // ... neutral100 through neutral900
  static const Color neutral900 = Color(0xFF111827);  // Almost black
}
```

### AppTheme Builder
```dart
class AppTheme {
  static ThemeData buildLightTheme(Color primaryColor) {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: primaryColor,
        elevation: 0,
        centerTitle: false,
      ),
      // ... complete theming
    );
  }
}
```

## 🔐 Authentication Flow

### Login Process
1. User enters email & password → LoginScreen
2. Button click → `ref.read(currentUserProvider.notifier).login(email, pwd)`
3. Notifier calls `AuthService.login(email, pwd)`
4. Service checks mock credentials, simulates delay
5. Returns UserModel if valid, null if invalid
6. Notifier sets `state = userModel`
7. `isAuthenticatedProvider` updates
8. `main.dart` routes to DashboardScreen
9. All auth-dependent widgets rebuild

### Logout Process
1. User taps Logout in AppBar
2. `ref.read(currentUserProvider.notifier).logout()`
3. Notifier sets `state = null`
4. `isAuthenticatedProvider` becomes false
5. `main.dart` routes back to LoginScreen

## 📊 State Management Hierarchy

```
Root: main.dart (watches isAuthenticatedProvider)
│
├─ LoginScreen
│  └─ Watches: nothing (just UI)
│
└─ DashboardScreen
   ├─ Watches: currentUserProvider
   ├─ Watches: incidentsProvider
   ├─ Watches: themeModeProvider
   ├─ Watches: localeProvider
   │
   ├─ Home Tab
   │  └─ Displays: User greeting, quick actions
   │
   ├─ Incidents Tab
   │  ├─ Watches: incidentsProvider
   │  └─ Displays: ListView of incidents
   │
   ├─ Alerts Tab
   │  └─ Placeholder
   │
   ├─ Map Tab
   │  └─ Placeholder
   │
   └─ Profile Tab
      ├─ Watches: currentUserProvider
      └─ Displays: User info, logout button
```

## 🧬 Model Serialization

### UserModel JSON
```dart
{
  "id": "user-1",
  "fullName": "John Admin",
  "email": "admin@dm.com",
  "phoneNumber": "+1234567890",
  "role": "admin",
  "profilePictureUrl": null,
  "bio": "System Administrator",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "lastLogin": "2026-01-15T10:30:00.000Z",
  "isActive": true
}
```

### IncidentModel JSON
```dart
{
  "id": "incident-1",
  "title": "Building Fire - Downtown",
  "description": "Fire reported in commercial building",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "status": "inProgress",
  "severity": "critical",
  "reportedBy": "user-3",
  "reportedAt": "2026-01-15T09:00:00.000Z",
  "photoUrls": ["url1.jpg", "url2.jpg"],
  "videoUrls": ["video1.mp4"],
  "assignedResponders": ["user-1", "user-2"],
  "affectedPeople": 45,
  "notes": "3 fire trucks dispatched"
}
```

## 🔗 Dependencies Between Modules

```
main.dart
├─ Depends on: auth_provider, theme_provider, locale_provider
├─ Imports: LoginScreen, DashboardScreen
│
auth_provider.dart
├─ Depends on: AuthService, UserModel, roles.dart
│
incident_provider.dart
├─ Depends on: IncidentService, IncidentModel
│
IncidentService
├─ Depends on: IncidentModel, roles.dart
│
DashboardScreen
├─ Depends on: auth_provider, incident_provider, theme_provider
├─ Imports: ColorPalette, UserRole, IncidentStatus, IncidentSeverity
```

## 🚀 Scalability Patterns

### Adding a New Provider
1. Create file: `lib/providers/new_provider.dart`
2. Define Provider/StateNotifierProvider
3. Create corresponding service if needed
4. Import in screens and use with `ref.watch()`

### Adding a New Screen
1. Create file: `lib/screens/feature_name/feature_screen.dart`
2. Extend `ConsumerWidget` or `ConsumerStatefulWidget`
3. Use `ref.watch()` for reactive data
4. Use `ref.read()` for one-time operations

### Adding a New Model
1. Create file: `lib/models/new_model.dart`
2. Implement toJson()/fromJson() for serialization
3. Add extensions for display names if needed
4. Use in providers and services

## 📈 Performance Considerations

- **FutureProviders cache results** - Automatically reuses data
- **StateNotifiers minimize rebuilds** - Only changed widgets rebuild
- **Lazy loading** - Providers only compute when watched
- **Mock delays simulate real latency** - UI patterns valid for real API

---

## 🔍 Code Quality

- **Type Safety**: Full null safety, explicit types throughout
- **Null Coalescing**: Uses `??` and `?.` operators
- **Error Handling**: Try-catch in services, error states in UI
- **Comments**: Strategic comments explaining complex logic
- **Naming**: Clear, descriptive names for all symbols
- **Consistency**: Follows Dart style guide and Flutter conventions

---

**Last Updated**: 2026  
**Architecture Version**: 1.0 (Riverpod-based, Clean Architecture)
