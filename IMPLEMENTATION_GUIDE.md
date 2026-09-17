# Disaster Management System - Flutter App

A comprehensive, production-ready Flutter application for disaster management with role-based access, incident reporting, and real-time notifications.

## 🚀 Features

### ✅ Implemented
- **Material 3 Design** with custom color palette
- **Multi-role authentication** (Admin, Responder, Citizen, Official)
- **User profiles** with role-based UI personalization
- **Incident Management** with CRUD operations
- **Mock data** for all features (no Firebase required)
- **Dark/Light mode support**
- **Internationalization** (English + Arabic prepared)
- **Flutter Riverpod** for state management
- **Role-specific colors**:
  - Admin: Deep Blue (#1E3A8A)
  - Responder: Orange (#EA580C)
  - Citizen: Green (#16A34A)
  - Official: Purple (#7C3AED)

### 📚 Demo Credentials

Test the app with these pre-configured accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@dm.com` | `Admin@123` |
| Responder | `responder@dm.com` | `Responder@123` |
| Citizen | `citizen@dm.com` | `Citizen@123` |
| Official | `official@dm.com` | `Official@123` |

## 📁 Project Structure

```
lib/
├── main.dart                    # App entry point
├── alert/
│   └── alert_model.dart        # Alert notifications model
├── auth/
│   ├── data/
│   ├── domain/
│   └── presentation/
├── core/
│   ├── constants/
│   │   ├── app_constants.dart  # App configuration
│   │   └── roles.dart          # Role enums and extensions
│   ├── localization/           # i18n setup
│   ├── models/
│   │   └── user_model.dart     # User model
│   ├── services/
│   │   ├── auth_service.dart   # Mock auth service
│   │   ├── incident_service.dart
│   │   └── storage_service.dart
│   ├── themes/
│   │   ├── app_theme.dart      # Theme builder
│   │   └── color_palette.dart  # Color definitions
│   └── widgets/
├── features/
│   ├── alert/
│   ├── auth/
│   ├── dashboard/
│   ├── incident/
│   ├── incidents/
│   ├── mapping/
│   ├── notifications/
│   ├── profile/
│   ├── reports/
│   ├── resource/
│   ├── resources/
│   ├── settings/
│   └── splash/
├── models/
│   └── incident_model.dart     # Incident model
├── providers/
│   ├── auth_provider.dart      # Auth state management
│   ├── incident_provider.dart  # Incidents state
│   ├── locale_provider.dart    # Language settings
│   └── theme_provider.dart     # Theme state
├── routes/
├── screens/
│   ├── auth/
│   │   └── login_screen.dart   # Login UI
│   └── dashboard/
│       └── dashboard_screen.dart # Main dashboard
├── services/
├── utils/
└── widgets/
```

## 🛠 Installation & Setup

### Prerequisites
- Flutter SDK (>=3.0.0)
- Dart (>=3.0.0)
- Android Studio / Xcode for simulators

### Installation Steps

```bash
# 1. Clone or extract the project
cd disaster_management_app

# 2. Get dependencies
flutter pub get

# 3. Run the app
flutter run

# For specific platform:
flutter run -d android   # Android emulator
flutter run -d ios       # iOS simulator
```

### Build Release

```bash
# Android APK
flutter build apk --release

# iOS IPA
flutter build ios --release

# Web
flutter build web --release
```

## 📦 Dependencies

Key packages used:
- **flutter_riverpod** (^2.4.0) - State management
- **fl_chart** (^0.65.0) - Analytics charts
- **geolocator** (^9.0.2) - Location services
- **google_maps_flutter** (^2.4.0) - Map integration
- **image_picker** (^1.0.4) - Photo/video capture
- **shared_preferences** (^2.2.2) - Local storage
- **video_player** (^2.8.0) - Video playback
- **intl** (^0.20.0) - Internationalization

## 🎨 Color System

### Status Colors
- **Reported**: Gray (#6B7280)
- **Acknowledged**: Blue (#3B82F6)
- **In Progress**: Amber (#F59E0B)
- **Resolved**: Green (#10B981)
- **Closed**: Purple (#8B5CF6)

### Severity Colors
- **Low**: Green (#10B981)
- **Medium**: Amber (#F59E0B)
- **High**: Red (#EF4444)
- **Critical**: Purple (#7C3AED)

## 🔐 Authentication

The app uses mock authentication with pre-defined credentials. In production, integrate:
- Firebase Authentication
- OAuth 2.0 providers
- Custom backend API

## 📱 Main Screens

1. **Login Screen** - Demo credentials displayed
2. **Dashboard** - Home with quick actions
3. **Incidents** - List of all incidents with filters
4. **Alerts** - Notifications and warnings
5. **Map View** - Geolocation visualization
6. **Profile** - User information and settings

## 🔄 State Management

Using **Flutter Riverpod**:
- `currentUserProvider` - Current logged-in user
- `incidentsProvider` - List of incidents
- `themeModeProvider` - Dark/light mode
- `localeProvider` - Language settings

## 🧪 Testing

```bash
# Run tests
flutter test

# Run with coverage
flutter test --coverage

# Generate coverage report
lcov --list coverage/lcov.info
```

## 📝 Models

### UserModel
```dart
UserModel(
  id: String,
  fullName: String,
  email: String,
  phoneNumber: String,
  role: UserRole,
  profilePictureUrl: String?,
  bio: String?,
  createdAt: DateTime,
  lastLogin: DateTime?,
  isActive: bool,
)
```

### IncidentModel
```dart
IncidentModel(
  id: String,
  title: String,
  description: String,
  latitude: double,
  longitude: double,
  status: IncidentStatus,
  severity: IncidentSeverity,
  reportedBy: String,
  reportedAt: DateTime,
  photoUrls: List<String>,
  videoUrls: List<String>,
  assignedResponders: List<String>,
  affectedPeople: int,
)
```

## 🚨 Mock Services

All services return mock data with simulated delays:
- **AuthService** - User authentication
- **IncidentService** - Incident CRUD operations
- **StorageService** - Local data persistence
- Delays: 300-800ms per operation

## 🌐 Localization

Prepare for multi-language support:
- English (en) - Default
- Arabic (ar) - RTL support ready

## 🎯 Future Enhancements

- [ ] Firebase integration
- [ ] Real-time database
- [ ] Push notifications
- [ ] Offline support
- [ ] WebSocket for live updates
- [ ] Video recording & uploads
- [ ] Advanced map features
- [ ] Analytics dashboard
- [ ] Report generation (PDF/Excel)
- [ ] Team collaboration features

## 📞 Support

For issues or questions:
1. Check the Flutter documentation
2. Review the code comments
3. Check demo credentials in login screen

## 📄 License

This project is created for educational and demonstration purposes.

## ✨ Credits

Built with Flutter and Flutter Riverpod.
Demonstrates best practices in:
- State management
- Architecture patterns
- UI/UX design
- Mock data handling
- Role-based access control

---

**Version**: 1.0.0  
**Last Updated**: 2026  
**Platform**: Flutter (iOS, Android, Web)
