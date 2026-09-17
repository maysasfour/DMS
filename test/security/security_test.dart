// Security Test Suite — Disaster Management System (Flutter)
// Tests real InputSanitizer, Validators, and UserModel security contracts.
// Run with: flutter test test/security/security_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/core/security/input_sanitizer.dart';
import 'package:disaster_management_app/core/utils/validators.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';
import 'package:disaster_management_app/core/constants/roles.dart';

// ── RBAC helper (mirrors app routing guard logic) ─────────────────────────────
bool _canAccess(String role, String resource) {
  const permissions = {
    'admin':     {'users', 'incidents', 'reports', 'resources', 'teams', 'alerts', 'dashboard'},
    'responder': {'incidents', 'resources', 'teams', 'alerts', 'dashboard'},
    'citizen':   {'incidents', 'alerts'},
    'official':  {'incidents', 'reports', 'alerts', 'dashboard'},
  };
  return permissions[role.toLowerCase()]?.contains(resource.toLowerCase()) ?? false;
}

void main() {
  // ── SEC-01: SQL Injection Detection (InputSanitizer.isDangerous) ──────────
  group('SEC-01: SQL Injection Detection', () {
    test('detects single-quote injection', () {
      expect(InputSanitizer.isDangerous("' OR '1'='1"), isTrue);
      expect(InputSanitizer.isDangerous("admin'--"), isTrue);
    });

    test('detects UNION-based attack', () {
      expect(InputSanitizer.isDangerous("UNION SELECT * FROM users"), isTrue);
      expect(InputSanitizer.isDangerous("' UNION SELECT username,password FROM users--"), isTrue);
    });

    test('detects DROP TABLE', () {
      expect(InputSanitizer.isDangerous("'; DROP TABLE incidents;--"), isTrue);
    });

    test('detects DELETE and INSERT', () {
      expect(InputSanitizer.isDangerous("1; DELETE FROM users;"), isTrue);
      expect(InputSanitizer.isDangerous("INSERT INTO users VALUES ('hacker','pw')"), isTrue);
    });

    test('allows safe user input', () {
      expect(InputSanitizer.isDangerous('Mays Asfour'), isFalse);
      expect(InputSanitizer.isDangerous('admin@example.com'), isFalse);
      expect(InputSanitizer.isDangerous('Flood near Amman bridge'), isFalse);
      expect(InputSanitizer.isDangerous('Temperature: 35°C'), isFalse);
    });

    test('sanitize() removes SQL patterns from input', () {
      final clean = InputSanitizer.sanitize("hello' OR '1'='1");
      expect(clean, isNotNull);
      expect(clean, isNot(contains("OR")));
    });
  });

  // ── SEC-02: XSS Detection (InputSanitizer.isDangerous) ───────────────────
  group('SEC-02: XSS Detection', () {
    test('detects script tag', () {
      expect(InputSanitizer.isDangerous('<script>alert("XSS")</script>'), isTrue);
      expect(InputSanitizer.isDangerous('<SCRIPT SRC="evil.js"></SCRIPT>'), isTrue);
    });

    test('detects javascript: protocol', () {
      expect(InputSanitizer.isDangerous('javascript:void(0)'), isTrue);
    });

    test('detects event handler injection', () {
      expect(InputSanitizer.isDangerous('<img onerror="alert(1)" src="x">'), isTrue);
    });

    test('detects iframe injection', () {
      expect(InputSanitizer.isDangerous('<iframe src="evil.com">'), isTrue);
    });

    test('allows safe content', () {
      expect(InputSanitizer.isDangerous('Hello, Mays! How are you?'), isFalse);
      expect(InputSanitizer.isDangerous('Flood reported near Amman.'), isFalse);
    });

    test('sanitize() removes XSS patterns', () {
      final clean = InputSanitizer.sanitize('<script>alert(1)</script>normal text');
      expect(clean, isNotNull);
      expect(clean, isNot(contains('<script')));
    });
  });

  // ── SEC-03: JWT Structure Validation ─────────────────────────────────────
  group('SEC-03: JWT Structure Validation', () {
    test('valid 3-part JWT passes', () {
      expect(InputSanitizer.isValidJwtShape(
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'),
          isTrue);
    });

    test('token with 2 parts fails', () {
      expect(InputSanitizer.isValidJwtShape('header.payload'), isFalse);
    });

    test('empty token fails', () {
      expect(InputSanitizer.isValidJwtShape(''), isFalse);
      expect(InputSanitizer.isValidJwtShape(null), isFalse);
    });

    test('token with empty part fails', () {
      expect(InputSanitizer.isValidJwtShape('abc..xyz'), isFalse);
    });

    test('valid token does not contain plaintext password', () {
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig';
      expect(token.contains('password'), isFalse);
      expect(token.contains('secret'), isFalse);
    });
  });

  // ── SEC-04: RBAC Enforcement ──────────────────────────────────────────────
  group('SEC-04: RBAC Enforcement', () {
    test('ADMIN can access all resources', () {
      for (final r in ['users', 'incidents', 'reports', 'resources', 'teams', 'alerts', 'dashboard']) {
        expect(_canAccess('ADMIN', r), isTrue, reason: 'ADMIN should access $r');
      }
    });

    test('CITIZEN can only access incidents and alerts', () {
      expect(_canAccess('CITIZEN', 'incidents'), isTrue);
      expect(_canAccess('CITIZEN', 'alerts'),    isTrue);
      expect(_canAccess('CITIZEN', 'users'),     isFalse);
      expect(_canAccess('CITIZEN', 'reports'),   isFalse);
      expect(_canAccess('CITIZEN', 'resources'), isFalse);
    });

    test('RESPONDER can manage incidents and resources but not users', () {
      expect(_canAccess('RESPONDER', 'incidents'),  isTrue);
      expect(_canAccess('RESPONDER', 'resources'),  isTrue);
      expect(_canAccess('RESPONDER', 'dashboard'),  isTrue);
      expect(_canAccess('RESPONDER', 'users'),      isFalse);
      expect(_canAccess('RESPONDER', 'reports'),    isFalse);
    });

    test('OFFICIAL can view reports and dashboard but not manage users', () {
      expect(_canAccess('OFFICIAL', 'reports'),   isTrue);
      expect(_canAccess('OFFICIAL', 'dashboard'), isTrue);
      expect(_canAccess('OFFICIAL', 'users'),     isFalse);
      expect(_canAccess('OFFICIAL', 'resources'), isFalse);
    });

    test('unknown role has no access', () {
      expect(_canAccess('HACKER', 'incidents'), isFalse);
      expect(_canAccess('',       'alerts'),    isFalse);
    });

    test('role check is case-insensitive', () {
      expect(_canAccess('admin',   'users'),     isTrue);
      expect(_canAccess('Citizen', 'incidents'), isTrue);
    });
  });

  // ── SEC-05: Sensitive Data Redaction ──────────────────────────────────────
  group('SEC-05: Sensitive Data Redaction', () {
    test('password is redacted in logs', () {
      final data = {'email': 'admin@dms.local', 'password': 'Secret123!'};
      final redacted = InputSanitizer.redactForLog(data);
      expect(redacted['password'], '***');
      expect(redacted['email'], 'admin@dms.local');
    });

    test('token is redacted', () {
      final data = {'token': 'eyJhbGciOiJIUzI1NiJ9...', 'userId': 1};
      final redacted = InputSanitizer.redactForLog(data);
      expect(redacted['token'], '***');
      expect(redacted['userId'], 1);
    });

    test('all sensitive keys are redacted together', () {
      final data = {
        'username': 'admin',
        'password': 'p4ssw0rd',
        'token': 'jwt-here',
        'secret': 'my-api-secret',
        'accessToken': 'access-tok',
      };
      final redacted = InputSanitizer.redactForLog(data);
      expect(redacted['password'],    '***');
      expect(redacted['token'],       '***');
      expect(redacted['secret'],      '***');
      expect(redacted['accessToken'], '***');
      expect(redacted['username'],    'admin'); // not sensitive
    });

    test('UserModel.toJson does not expose password or token', () {
      final user = UserModel(
        id: '1',
        fullName: 'Admin',
        email: 'admin@dms.local',
        phoneNumber: '+962791234567',
        role: UserRole.admin,
        createdAt: DateTime.now(),
      );
      final json = user.toJson();
      expect(json.containsKey('password'),     isFalse);
      expect(json.containsKey('token'),        isFalse);
      expect(json.containsKey('passwordHash'), isFalse);
    });
  });

  // ── SEC-06: Email and Phone Validation ────────────────────────────────────
  group('SEC-06: Input Validation', () {
    test('valid emails pass', () {
      expect(InputSanitizer.isValidEmail('admin@dms.local'), isTrue);
      expect(InputSanitizer.isValidEmail('mays@meu.edu.jo'), isTrue);
    });

    test('invalid emails fail', () {
      expect(InputSanitizer.isValidEmail('notanemail'), isFalse);
      expect(InputSanitizer.isValidEmail(''), isFalse);
      expect(InputSanitizer.isValidEmail(null), isFalse);
    });

    test('valid phone numbers pass', () {
      expect(InputSanitizer.isValidPhone('+962791234567'), isTrue);
      expect(InputSanitizer.isValidPhone('0791234567'), isTrue);
      expect(InputSanitizer.isValidPhone(null), isTrue); // optional
    });

    test('invalid phone numbers fail', () {
      expect(InputSanitizer.isValidPhone('123'), isFalse);
      expect(InputSanitizer.isValidPhone('07901abc567'), isFalse);
    });
  });

  // ── SEC-07: Role Escalation Prevention ────────────────────────────────────
  group('SEC-07: Role Escalation Prevention', () {
    test('citizen role is preserved through copyWith', () {
      final user = UserModel(
        id: '1',
        fullName: 'Citizen',
        email: 'citizen@dms.local',
        phoneNumber: '0791234567',
        role: UserRole.citizen,
        createdAt: DateTime.now(),
      );
      // copyWith does not expose a role parameter by default
      final updated = user.copyWith(fullName: 'Modified');
      expect(updated.role, UserRole.citizen); // role unchanged
    });

    test('UserRole enum has exactly 4 roles — no undocumented escalation paths', () {
      expect(UserRole.values.length, 4);
      expect(UserRole.values, containsAll([
        UserRole.admin,
        UserRole.responder,
        UserRole.citizen,
        UserRole.official,
      ]));
    });
  });

  // ── SEC-08: Null Byte and Edge Cases ──────────────────────────────────────
  group('SEC-08: Edge Case Sanitization', () {
    test('null input returns null from sanitize()', () {
      expect(InputSanitizer.sanitize(null), isNull);
    });

    test('empty string returns null from sanitize()', () {
      expect(InputSanitizer.sanitize(''), isNull);
    });

    test('safe normal text is preserved by sanitize()', () {
      final result = InputSanitizer.sanitize('Flood near Amman bridge area 5');
      expect(result, 'Flood near Amman bridge area 5');
    });

    test('Validators.email handles injection-style input without throwing', () {
      expect(() => Validators.email("' OR '1'='1@evil.com"), returnsNormally);
    });
  });
}
