# Disaster Management System

Main Flutter application for the Disaster Management System graduation project.

The app connects to a Spring Boot REST API and provides citizen, responder, and administrator experiences. Features include incident reporting, maps, emergency SOS, shelters, notifications, resource and team management, weather, news, and safety guidance. It uses Riverpod, GoRouter, Dio, Hive, and Material UI, with multiple languages and light/dark themes.

## Run locally

Use Flutter 3.38.9 (Dart 3.10.8), matching the development environment.

```sh
flutter pub get
flutter run --dart-define=API_BASE_URL=https://your-backend.example.com
```

Set `API_BASE_URL` to your Spring Boot server. If omitted, the app uses the default URL in `lib/core/constants/api_constants.dart`. The backend is not included in this Flutter folder. The repository's older `master` branch is preserved separately.

## Project structure

- `lib/core/`: routing, API configuration, networking, security, themes, and shared services.
- `lib/features/`: feature screens, repositories, models, and providers.
- `lib/shared/` and `lib/providers/`: reusable widgets and app preferences.
- `assets/`: bundled image assets.
- `test/`: existing unit, widget, security, performance, and acceptance tests.
- `android/`, `ios/`, `web/`, `linux/`, `macos/`, `windows/`: platform projects.
- `Dockerfile` and `nginx/`: Flutter web container configuration.

## Validation and web build

```sh
flutter analyze --no-fatal-infos
flutter test
flutter build web --release --dart-define=API_BASE_URL=https://your-backend.example.com
```

GitHub Actions runs analysis, tests, and a web build. It does not deploy the application.

## Private configuration

OAuth client secrets, Firebase configuration files, signing keys, local settings, screenshots, logs, and generated builds are excluded from version control. Supply your own platform service configuration when needed.

For Android release signing, create an ignored `android/key.properties` file:

```properties
storeFile=dms-release.jks
keyAlias=YOUR_KEY_ALIAS
keyPassword=YOUR_KEY_PASSWORD
storePassword=YOUR_STORE_PASSWORD
```

Place your keystore at `android/app/dms-release.jks`, or set `storeFile` to its path relative to `android/app`. Environment variables `KEYSTORE_PATH`, `KEY_ALIAS`, `KEY_PASSWORD`, and `STORE_PASSWORD` override these settings.

## Documentation

The additional Markdown files record earlier design, demo, and deployment work. Some describe the previous mock-data implementation; use the current source code and this README for the API-backed application. Example accounts in older documents are demo data, not guaranteed server credentials.
