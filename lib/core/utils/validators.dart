/// ─────────────────────────────────────────────────────────────────────────────
/// File: lib/core/utils/validators.dart
///
/// Purpose: Provides a centralised, reusable set of static form-field
/// validators for the Disaster Management System (DMS) mobile app.
///
/// These validators are attached to Flutter TextFormField widgets across
/// screens such as user registration, login, incident reporting, and
/// resource/alert creation forms.  Each method follows the Flutter
/// FormFieldValidator<String> contract: return null when valid, or a
/// human-readable error string when invalid.
///
/// Domain context:
///   - Citizen & responder registration enforces strong passwords and
///     validates contact details (email, phone) before submission to the
///     DMS backend (Spring Boot, port 9090).
///   - Incident-report forms use latitude/longitude validators to ensure
///     coordinates submitted to the mapping subsystem are geographically
///     plausible before a pin is rendered on the HeatmapView.
///   - All validators are pure functions with no side-effects, making them
///     safe to call on every keystroke (onChanged) or on form submission.
/// ─────────────────────────────────────────────────────────────────────────────

/// Centralised form validators — used across all screens.
///
/// The private constructor [Validators._] prevents instantiation; all
/// members are static so callers use them as `Validators.email(value)`.
class Validators {
  // Private unnamed constructor — this class is a pure utility namespace.
  // Instantiating it would be meaningless; static access is the only API.
  Validators._();

  /// Validates that [v] is a syntactically correct email address.
  ///
  /// Used on the login, registration, and profile-update screens where the
  /// DMS backend expects a valid RFC-5321-style address for account lookup.
  /// Returns null (valid) or a localised error string (invalid/empty).
  static String? email(String? v) {
    // Reject null or whitespace-only input — email is always required.
    if (v == null || v.trim().isEmpty) return 'Email is required';
    // Regex checks for the minimal structure: local-part @ domain . tld(2+).
    // Deliberately lenient to avoid false-positives on international domains.
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$').hasMatch(v.trim())) {
      return 'Enter a valid email address';
    }
    // Input passed all checks — signal validity to the form framework.
    return null;
  }

  /// Generic non-empty validator for any mandatory text field.
  ///
  /// [field] is an optional human-readable label (e.g. 'Incident Title')
  /// that is interpolated into the error message so the user knows exactly
  /// which field they left blank.
  static String? required(String? v, [String field = 'This field']) {
    // Treat both null and whitespace-only values as empty to prevent
    // users bypassing validation with spaces.
    if (v == null || v.trim().isEmpty) return '$field is required';
    return null;
  }

  /// Login password — minimal check (server validates strength on register).
  ///
  /// At login time we only need to confirm the field is not blank and meets
  /// the minimum length the backend would accept, avoiding a network round
  /// trip for obviously invalid passwords.
  static String? password(String? v) {
    // Blank password cannot possibly match any stored hash.
    if (v == null || v.isEmpty) return 'Password is required';
    // Passwords shorter than 6 characters are rejected before hitting the API.
    if (v.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  /// Registration password — enforces strength rules matching the prompt spec.
  ///
  /// Applied on the citizen/officer registration form to ensure all DMS
  /// accounts meet the security policy before the password reaches the
  /// backend's BCrypt hashing layer.
  static String? strongPassword(String? v) {
    // Blank input is an instant failure — password is always required.
    if (v == null || v.isEmpty) return 'Password is required';
    // Minimum length of 8 characters is the baseline strength requirement.
    if (v.length < 8) return 'At least 8 characters required';
    // At least one uppercase letter prevents trivially guessable passwords.
    if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Must contain an uppercase letter';
    // At least one lowercase letter ensures mixed-case complexity.
    if (!RegExp(r'[a-z]').hasMatch(v)) return 'Must contain a lowercase letter';
    // At least one digit adds numeric entropy to the password space.
    if (!RegExp(r'[0-9]').hasMatch(v)) return 'Must contain a digit';
    // Special characters significantly expand the effective key-space and
    // match the backend's registration validation rules.
    if (!RegExp(r'[!@#\$%^&*(),.?":{}|<>]').hasMatch(v)) {
      return 'Must contain a special character';
    }
    // All strength criteria satisfied — password is acceptable.
    return null;
  }

  /// Validates that the confirmation field [v] matches the original [password].
  ///
  /// Prevents typos during DMS account creation; both values must be
  /// identical before the registration form is submitted to the backend.
  static String? confirmPassword(String? v, String password) {
    // Empty confirmation is treated as a distinct error from a mismatch.
    if (v == null || v.isEmpty) return 'Please confirm your password';
    // Character-by-character equality check — no trimming because passwords
    // are case- and whitespace-sensitive.
    if (v != password) return 'Passwords do not match';
    return null;
  }

  /// Accepts international format: +962791234567 or 0791234567
  ///
  /// Phone numbers are optional on DMS profile forms but are used by the
  /// AI agent (Gemini, port 3002) for contact verification during incident
  /// reporting.  Returns null for both valid input AND empty input (optional).
  static String? phone(String? v) {
    // Phone is optional — an empty value is silently accepted.
    if (v == null || v.trim().isEmpty) return null; // optional
    // Allow an optional leading '+' for country codes; digits only thereafter.
    // Range 7–15 digits covers local (Jordan: 10) and international numbers.
    if (!RegExp(r'^\+?[0-9]{7,15}$').hasMatch(v.trim())) {
      return 'Enter a valid phone number';
    }
    return null;
  }

  /// Validates a person's name (first name, last name, team name, etc.).
  ///
  /// Used on registration and profile screens; [field] lets callers surface
  /// context-specific labels like 'First Name' or 'Organisation Name' in the
  /// error message.
  static String? name(String? v, [String field = 'Name']) {
    // A name must be present — blank submissions are rejected.
    if (v == null || v.trim().isEmpty) return '$field is required';
    // Single-character names are likely data-entry errors in the DMS context.
    if (v.trim().length < 2) return '$field must be at least 2 characters';
    // Cap at 50 characters to match the VARCHAR(50) column in the backend DB.
    if (v.trim().length > 50) return '$field must be under 50 characters';
    return null;
  }

  /// Ensures [v] meets a caller-specified minimum character count [min].
  ///
  /// Used for free-text fields such as incident description where a minimum
  /// length helps ensure responders receive actionable information.
  static String? minLength(String? v, int min, [String field = 'Field']) {
    // Null or empty values are treated as missing, not merely short.
    if (v == null || v.isEmpty) return '$field is required';
    // Enforce the caller-defined lower bound on text length.
    if (v.length < min) return '$field must be at least $min characters';
    return null;
  }

  /// Ensures [v] does not exceed a caller-specified maximum character count [max].
  ///
  /// Prevents oversized payloads being sent to the DMS backend and protects
  /// database column length constraints (e.g. alert message VARCHAR limits).
  /// Returns null for empty input because length is not required by this validator.
  static String? maxLength(String? v, int max, [String field = 'Field']) {
    // Empty input is acceptable — this validator does not enforce presence.
    if (v == null || v.isEmpty) return null;
    // Reject input exceeding the maximum to protect backend storage limits.
    if (v.length > max) return '$field must be under $max characters';
    return null;
  }

  /// Latitude: -90 to 90
  ///
  /// Validates geographic latitude values entered on incident-report and
  /// resource-location forms before coordinates are sent to the mapping
  /// subsystem (HeatmapView / IncidentMap).  Optional — returns null if empty.
  static String? latitude(String? v) {
    // Latitude is optional when GPS auto-fill is active; skip validation.
    if (v == null || v.isEmpty) return null;
    // Attempt numeric parse; reject non-numeric strings immediately.
    final d = double.tryParse(v);
    // Valid WGS-84 latitude must fall within [-90, 90] degrees.
    if (d == null || d < -90 || d > 90) return 'Invalid latitude (-90 to 90)';
    return null;
  }

  /// Longitude: -180 to 180
  ///
  /// Validates geographic longitude values on incident and resource forms.
  /// Ensures the coordinate is within the valid WGS-84 longitude range before
  /// the DMS backend stores it or the map widget renders a marker.
  static String? longitude(String? v) {
    // Longitude is optional when GPS auto-fill is active; skip validation.
    if (v == null || v.isEmpty) return null;
    // Attempt numeric parse; reject non-numeric strings immediately.
    final d = double.tryParse(v);
    // Valid WGS-84 longitude must fall within [-180, 180] degrees.
    if (d == null || d < -180 || d > 180) return 'Invalid longitude (-180 to 180)';
    return null;
  }
}