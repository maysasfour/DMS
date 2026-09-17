/// Application constants for the Disaster Management System
class AppConstants {
  // App metadata
  static const String appName = 'Disaster Management';
  static const String appVersion = '1.0.0';

  // API mock delays (in milliseconds)
  static const int apiDelay = 800;
  static const int shortDelay = 300;

  // Pagination
  static const int pageSize = 20;

  // File upload limits
  static const int maxPhotoSize = 5 * 1024 * 1024; // 5 MB
  static const int maxVideoSize = 50 * 1024 * 1024; // 50 MB

  // Location
  static const double defaultLatitude = 40.7128;
  static const double defaultLongitude = -74.0060;
  static const double mapZoom = 13.0;

  // Animation durations
  static const Duration quickAnimation = Duration(milliseconds: 300);
  static const Duration normalAnimation = Duration(milliseconds: 500);
  static const Duration slowAnimation = Duration(milliseconds: 800);

  // Validation regex
  static const String emailRegex =
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
  static const String phoneRegex = r'^\+?[0-9]{10,}$';
  static const String passwordRegex =
      r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$';

  // Design tokens
  static const double spaceXs = 8;
  static const double spaceSm = 12;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;

  // Radius
  static const double radiusSm = 8;
  static const double radiusMd = 10;
  static const double radiusLg = 12;

  // Typography
  static const double fontSizeCaption = 12;
  static const double fontSizeBody = 14;
  static const double fontSizeBodyLarge = 16;
  static const double fontSizeTitle = 20;
  static const double fontSizeTitleLarge = 24;
}