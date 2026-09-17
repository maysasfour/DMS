# Quick Start Guide

## ⚡ Get Running in 5 Minutes

### 1. Navigate to Project
```bash
cd disaster_management_app
```

### 2. Install Dependencies
```bash
flutter pub get
```

### 3. Run the App
```bash
flutter run
```

If multiple devices are connected:
```bash
flutter run -d <device_id>
flutter run -d emulator-5554    # Specific Android emulator
flutter run -d iPhone 15       # Specific iOS simulator
```

### 4. Login with Demo Account

Use any of these credentials:

**👨‍💼 Admin**
- Email: `admin@dm.com`
- Password: `Admin@123`
- Features: Full access to all functions

**🚨 Responder**
- Email: `responder@dm.com`
- Password: `Responder@123`
- Features: Incident acknowledgment, assignment

**👤 Citizen**
- Email: `citizen@dm.com`
- Password: `Citizen@123`
- Features: Report incidents, view status

**🏛️ Official**
- Email: `official@dm.com`
- Password: `Official@123`
- Features: Review reports, create resources

## 🎯 What to Test

### Login Screen
- ✅ All 4 demo credentials work
- ✅ Demo box shows all accounts
- ✅ Error message on invalid login
- ✅ Loading indicator during auth

### Dashboard
After login, you'll see:

1. **Home Tab** - Welcome greeting with quick actions
2. **Incidents Tab** - Mock incident list with 4 samples:
   - Building Fire - Downtown (Critical, In Progress)
   - Road Accident - Highway 101 (High, Acknowledged)
   - Flooding in Residential Area (Medium, Reported)
   - Medical Emergency - School (High, Resolved)

3. **Profile Tab** - Your user information and logout button

### Mock Data Examples

**Incident 1**: Building Fire - Downtown
- Status: In Progress
- Severity: Critical
- Affected: 45 people
- Responders: 3 assigned

**Incident 2**: Road Accident - Highway 101
- Status: Acknowledged
- Severity: High
- Affected: 8 people
- Location: Mapped

## 🎨 Theme Features

### Dark/Light Mode
The app respects your device settings but also includes theme toggle in settings.

### Role-Based Colors
Each role has unique branding:
- **Admin**: Deep Blue (professional)
- **Responder**: Orange (high visibility)
- **Citizen**: Green (safe/calm)
- **Official**: Purple (authority)

## 🔧 Troubleshooting

### App won't run
```bash
# Clear cache
flutter clean

# Get dependencies again
flutter pub get

# Try again
flutter run
```

### Hot reload not working
- Press `r` in terminal for hot reload
- Press `R` for hot restart
- Full app restart if issues persist

### Emulator issues
```bash
# List available devices
flutter devices

# Run on specific device
flutter run -d <device_id>

# Verbose output for debugging
flutter run -v
```

### Dependency errors
```bash
# Update Flutter
flutter upgrade

# Get latest dependencies
flutter pub get

# Check for issues
flutter doctor
```

## 📊 What's Working

✅ **Authentication**
- Login with 4 roles
- Logout
- Session management

✅ **Dashboard**
- Bottom navigation (5 tabs)
- Incident list with mock data
- User profile display
- Quick action cards

✅ **Themes**
- Material 3 design
- Role-based colors
- Light/dark mode support

✅ **Models**
- User, Incident, Alert, Resource
- Full serialization support
- Mock data generation

✅ **State Management**
- Riverpod providers
- Reactive UI updates
- Type-safe state

## 🚀 Next Steps

1. **Explore the code** - Check `lib/screens/`, `lib/providers/`, `lib/models/`
2. **Try each role** - Login as different users to see role-specific UI
3. **Review mock data** - See `lib/core/services/incident_service.dart`
4. **Check colors** - Look at `lib/core/themes/color_palette.dart`

## 📱 Platform-Specific Notes

### Android
- Min API level: 21
- Target API level: 34

### iOS
- Min deployment target: 11.0
- Uses CocoaPods for dependencies

### Web
- Chrome recommended
- Run with: `flutter run -d chrome`

## 🎓 Learning Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Riverpod Guide](https://riverpod.dev)
- [Material 3 Design](https://m3.material.io/)

## 📝 Common Commands

```bash
# Run with specific environment
flutter run --debug
flutter run --release

# Run on web
flutter run -d chrome

# Build for production
flutter build apk --release
flutter build ios --release
flutter build web --release

# View logs
flutter logs

# Run tests
flutter test

# Format code
dart format lib/

# Analyze code
flutter analyze
```

## ⏸️ If You Get Stuck

1. **Check Flutter installation**: `flutter doctor`
2. **Review error message** - Usually tells you what's wrong
3. **Check console output** - Look for red errors
4. **Restart everything** - `flutter clean` → `flutter pub get` → `flutter run`

## 🎉 Success!

Once the app launches:
1. You should see the LoginScreen
2. Demo credentials are displayed
3. Login with any credential
4. Explore the Dashboard
5. Try different roles to see UI variations

---

**Enjoy! 🚀**
