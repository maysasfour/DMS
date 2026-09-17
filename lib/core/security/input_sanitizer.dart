/// ---------------------------------------------------------------------------
/// lib/core/security/input_sanitizer.dart
///
/// Provides centralized, stateless input sanitization and validation utilities
/// for the Disaster Management System (DMS) mobile application.
///
/// All free-text fields submitted by citizens reporting incidents, officers
/// updating resource statuses, or admins managing users MUST pass through
/// [InputSanitizer.sanitize] before the data is forwarded to the REST API or
/// rendered in the UI.  This prevents SQL injection, XSS, and null-byte
/// attacks from reaching the Spring Boot backend.
///
/// Usage pattern (at form-submission time):
///   final clean = InputSanitizer.sanitize(controller.text);
///   if (clean == null) { /* show validation error */ }
/// ---------------------------------------------------------------------------

/// InputSanitizer — strips dangerous patterns before any data reaches the UI or API.
/// Call sanitize() on all free-text user input at form-submission time.
class InputSanitizer {
  // Private unnamed constructor prevents instantiation; all members are static
  // utilities that do not require object state.
  InputSanitizer._();

  // ---------------------------------------------------------------------------
  // Compiled regex patterns — defined as static finals so they are built once
  // and reused across every sanitize/isDangerous call in the app lifecycle.
  // ---------------------------------------------------------------------------

  // SQL injection patterns: matches keywords and punctuation used to manipulate
  // queries — e.g. an attacker entering "' OR 1=1--" in an incident title field.
  static final _sqlPattern = RegExp(
    r"('|--|;|/\*|\*/|\bOR\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bEXEC\b|\bCAST\b)",
    caseSensitive: false, // treats "drop" and "DROP" identically
  );

  // XSS / script-injection patterns: blocks HTML tags and event-handler
  // attributes that could execute arbitrary JavaScript when incident
  // descriptions or user-submitted text is rendered in a WebView or browser.
  static final _xssPattern = RegExp(
    r'(<script|</script|javascript:|on\w+\s*=|<iframe|<object|<embed|<svg|data:)',
    caseSensitive: false, // catches mixed-case obfuscation attempts
  );

  // Null-byte injection: removes the \x00 character, which can truncate strings
  // in C-based libraries and bypass length-based validation on the backend.
  static final _nullByte = RegExp(r'\x00');

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// Returns the input stripped of dangerous patterns, or null if the raw
  /// value is null / empty.
  ///
  /// Apply to every free-text field in DMS forms: incident titles,
  /// descriptions, location notes, resource names, and user-supplied comments.
  /// A null return signals the caller to treat the field as absent/invalid.
  static String? sanitize(String? input) {
    // Propagate null so callers can distinguish "not provided" from empty string.
    if (input == null) return null;
    var out = input
        .replaceAll(_sqlPattern, '')   // strip SQL keywords and punctuation
        .replaceAll(_xssPattern, '')   // strip script/HTML injection sequences
        .replaceAll(_nullByte, '')     // strip null bytes that truncate strings
        .trim();                       // remove leading/trailing whitespace
    // Treat a string that consisted entirely of dangerous tokens as absent.
    return out.isEmpty ? null : out;
  }

  /// Returns true if the input contains dangerous content.
  ///
  /// Use this for read-only checks where you want to flag a suspicious value
  /// (e.g. audit-logging a rejected incident report) without modifying it.
  static bool isDangerous(String? input) {
    // Null or empty strings carry no threat; return early to avoid regex cost.
    if (input == null || input.isEmpty) return false;
    // Any single pattern match is sufficient to classify the value as dangerous.
    return _sqlPattern.hasMatch(input) ||
        _xssPattern.hasMatch(input) ||
        _nullByte.hasMatch(input);
  }

  /// Validates an email address format.
  ///
  /// Used when registering new DMS users (citizens, officers, admins) to ensure
  /// the provided email can receive account-verification and alert notifications.
  static bool isValidEmail(String? email) {
    // Null or empty email is considered invalid for DMS registration flows.
    if (email == null || email.isEmpty) return false;
    // Minimal RFC-5322-style check: local-part @ domain . tld, no whitespace.
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
  }

  /// Validates a Jordanian or international phone number.
  ///
  /// Phone numbers are optional in DMS user profiles but, when supplied,
  /// must conform to a digit-only (with optional leading +) format so that
  /// SMS/WhatsApp emergency alerts can be dispatched reliably.
  static bool isValidPhone(String? phone) {
    // Phone is an optional field; a missing value is treated as acceptable.
    if (phone == null || phone.isEmpty) return true; // optional
    // Accepts 7–15 digits with an optional leading '+' for country code (e.g. +962 for Jordan).
    return RegExp(r'^\+?[0-9]{7,15}$').hasMatch(phone);
  }

  /// Ensures a JWT has the expected 3-part structure.
  ///
  /// Called after the DMS backend returns an access token to verify it is
  /// well-formed (header.payload.signature) before storing it in secure
  /// storage and attaching it to subsequent API requests.
  static bool isValidJwtShape(String? token) {
    // A missing or empty token cannot be a valid JWT.
    if (token == null || token.isEmpty) return false;
    final parts = token.split('.'); // JWTs are always dot-delimited into 3 segments
    // All three segments (header, payload, signature) must be non-empty.
    return parts.length == 3 && parts.every((p) => p.isNotEmpty);
  }

  /// Redacts sensitive values in a map for safe logging.
  ///
  /// Wrap any request/response payload with this method before writing to the
  /// DMS debug log or crash-reporting service, preventing passwords, OAuth
  /// tokens, and API keys from appearing in plain text in log output.
  static Map<String, dynamic> redactForLog(Map<String, dynamic> data) {
    // Canonical set of key names whose values must never appear in logs.
    const sensitive = {'password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'};
    return {
      for (final e in data.entries)
        // Replace the value with '***' if the key (case-insensitive) is sensitive;
        // otherwise pass the original value through unchanged.
        e.key: sensitive.contains(e.key.toLowerCase()) ? '***' : e.value,
    };
  }
}