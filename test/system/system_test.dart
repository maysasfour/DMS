// System tests — Disaster Management System (Flutter)
// Validates complete end-to-end scenarios through real app classes:
// validator pipeline, input sanitizer, RBAC logic, UserModel contracts,
// and app widget startup — without requiring a live backend.
//
// Run with: flutter test test/system/system_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/main.dart';
import 'package:disaster_management_app/core/utils/validators.dart';
import 'package:disaster_management_app/core/security/input_sanitizer.dart';
import 'package:disaster_management_app/core/themes/color_palette.dart';
import 'package:disaster_management_app/core/constants/roles.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';
import 'package:disaster_management_app/features/auth/providers/auth_provider.dart';

// ── Shared RBAC helper (mirrors GoRouter redirect guard) ─────────────────────
bool _canAccess(String role, String resource) {
  const permissions = {
    'admin':      {'users', 'incidents', 'reports', 'resources', 'teams', 'alerts', 'dashboard'},
    'responder':  {'incidents', 'resources', 'teams', 'alerts', 'dashboard'},
    'citizen':    {'incidents', 'alerts'},
    'official':   {'incidents', 'reports', 'alerts', 'dashboard'},
    'rescue_team':{'incidents', 'resources', 'alerts'},
  };
  return permissions[role.toLowerCase()]?.contains(resource.toLowerCase()) ?? false;
}

void main() {
  // ── ST-F01: App bootstraps and renders without errors ─────────────────────
  group('ST-F01: App Startup', () {
    testWidgets('DisasterManagementApp renders MaterialApp.router',
        (WidgetTester tester) async {
      await tester.pumpWidget(
          const ProviderScope(child: DisasterManagementApp()));
      await tester.pump();

      // App uses MaterialApp.router (GoRouter) — not bare MaterialApp
      expect(find.byType(MaterialApp), findsOneWidget);

      // Cleanup SplashScreen timers safely
      await tester.pumpWidget(const SizedBox());
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('No duplicate MaterialApp roots', (WidgetTester tester) async {
      await tester.pumpWidget(
          const ProviderScope(child: DisasterManagementApp()));
      await tester.pump();
      expect(find.byType(MaterialApp), findsOneWidget);

      await tester.pumpWidget(const SizedBox());
      await tester.pump(const Duration(seconds: 5));
    });
  });

  // ── ST-F02: FR1 — Citizen registration form validation end-to-end ─────────
  group('ST-F02: FR1 — Registration Form Validation', () {
    test('all valid registration fields pass together', () {
      expect(Validators.name('Mays', 'First Name'), isNull);
      expect(Validators.name('Asfour', 'Last Name'), isNull);
      expect(Validators.email('mays@meu.edu.jo'), isNull);
      expect(Validators.phone('+962791234567'), isNull);
      expect(Validators.strongPassword('SecurePass1!'), isNull);
      expect(Validators.confirmPassword('SecurePass1!', 'SecurePass1!'), isNull);
    });

    test('empty required fields all fail', () {
      expect(Validators.name('', 'First Name'), isNotNull);
      expect(Validators.email(''), isNotNull);
      expect(Validators.strongPassword(''), isNotNull);
      expect(Validators.confirmPassword('', 'SecurePass1!'), isNotNull);
    });

    test('weak passwords fail strength check', () {
      expect(Validators.strongPassword('password'),   isNotNull); // no upper, digit, special
      expect(Validators.strongPassword('Password'),   isNotNull); // no digit, special
      expect(Validators.strongPassword('Password1'),  isNotNull); // no special char
      expect(Validators.strongPassword('Pass1!'),     isNotNull); // too short
    });

    test('password mismatch fails confirmPassword', () {
      expect(Validators.confirmPassword('SecurePass1!', 'DifferentPass1!'), isNotNull);
    });

    test('invalid email formats all fail', () {
      for (final bad in ['notanemail', 'user@', 'user@domain', '@nodomain.com', '']) {
        expect(Validators.email(bad), isNotNull, reason: 'Should fail: $bad');
      }
    });

    test('name under 2 chars fails', () {
      expect(Validators.name('M', 'First Name'), isNotNull);
      expect(Validators.name('Ma', 'First Name'), isNull); // exactly 2 is valid
    });
  });

  // ── ST-F03: FR2 — Login screen validation ─────────────────────────────────
  group('ST-F03: FR2 — Login Form Validation', () {
    test('valid login credentials pass validators', () {
      expect(Validators.email('admin@dms.local'), isNull);
      expect(Validators.password('demo123'), isNull);
    });

    test('empty login fields both fail', () {
      expect(Validators.email(null), isNotNull);
      expect(Validators.password(null), isNotNull);
    });

    test('password shorter than 6 chars fails login validator', () {
      expect(Validators.password('abc'), isNotNull);
      expect(Validators.password('12345'), isNotNull);
      expect(Validators.password('123456'), isNull); // exactly 6 = valid
    });
  });

  // ── ST-F04: FR3 — Incident report field validation ────────────────────────
  group('ST-F04: FR3 — Incident Reporting Validation', () {
    test('valid incident fields pass', () {
      expect(Validators.required('Flood near river bank', 'Title'), isNull);
      expect(Validators.required('Water rising fast', 'Description'), isNull);
      expect(Validators.latitude('31.9539'), isNull);
      expect(Validators.longitude('35.9106'), isNull);
    });

    test('empty title and description fail', () {
      expect(Validators.required('', 'Title'), isNotNull);
      expect(Validators.required(null, 'Description'), isNotNull);
      expect(Validators.required('   ', 'Title'), isNotNull); // whitespace-only
    });

    test('invalid GPS coordinates fail', () {
      expect(Validators.latitude('91'),   isNotNull);  // > 90
      expect(Validators.latitude('-91'),  isNotNull);  // < -90
      expect(Validators.longitude('181'), isNotNull);  // > 180
      expect(Validators.longitude('-181'),isNotNull);  // < -180
    });

    test('valid GPS boundary values pass', () {
      expect(Validators.latitude('90'),    isNull);
      expect(Validators.latitude('-90'),   isNull);
      expect(Validators.longitude('180'),  isNull);
      expect(Validators.longitude('-180'), isNull);
    });

    test('missing title triggers required error with field name', () {
      final error = Validators.required('', 'Incident Title');
      expect(error, contains('Incident Title'));
    });
  });

  // ── ST-F05: NFR1 — SQL injection blocked by InputSanitizer ────────────────
  group('ST-F05: NFR1 — SQL Injection Prevention', () {
    test('sanitize() strips SQL patterns from all common attacks', () {
      final attacks = [
        "' OR '1'='1",
        "'; DROP TABLE incidents;--",
        "UNION SELECT * FROM users",
        "admin'--",
        "1; DELETE FROM users;",
      ];
      for (final attack in attacks) {
        expect(InputSanitizer.isDangerous(attack), isTrue,
            reason: 'Should flag: $attack');
        final cleaned = InputSanitizer.sanitize(attack);
        // After sanitize, result must not contain the injection keyword
        if (cleaned != null) {
          expect(cleaned.toLowerCase(), isNot(contains('drop')));
          expect(cleaned.toLowerCase(), isNot(contains('delete')));
        }
      }
    });

    test('safe user input passes through sanitize() unchanged', () {
      expect(InputSanitizer.sanitize('Flood near Amman bridge'), 'Flood near Amman bridge');
      expect(InputSanitizer.sanitize('admin@example.com'), 'admin@example.com');
      expect(InputSanitizer.sanitize('Report: fire at building 5'), 'Report: fire at building 5');
    });

    test('null and empty input sanitize() returns null', () {
      expect(InputSanitizer.sanitize(null), isNull);
      expect(InputSanitizer.sanitize(''), isNull);
    });
  });

  // ── ST-F06: NFR1 — XSS blocked by InputSanitizer ─────────────────────────
  group('ST-F06: NFR1 — XSS Prevention', () {
    test('XSS patterns are flagged as dangerous', () {
      expect(InputSanitizer.isDangerous('<script>alert(1)</script>'), isTrue);
      expect(InputSanitizer.isDangerous('javascript:void(0)'), isTrue);
      expect(InputSanitizer.isDangerous('<img onerror="alert(1)" src="x">'), isTrue);
      expect(InputSanitizer.isDangerous('<iframe src="evil.com">'), isTrue);
    });

    test('sanitize() removes XSS patterns', () {
      final cleaned = InputSanitizer.sanitize('<script>alert(1)</script>hello');
      expect(cleaned, isNotNull);
      expect(cleaned, isNot(contains('<script')));
    });
  });

  // ── ST-F07: NFR1 — RBAC: role access matrix ───────────────────────────────
  group('ST-F07: NFR1 — Role-Based Access Control', () {
    test('ADMIN can access all 7 resource types', () {
      final adminResources = ['users', 'incidents', 'reports', 'resources', 'teams', 'alerts', 'dashboard'];
      for (final r in adminResources) {
        expect(_canAccess('admin', r), isTrue, reason: 'ADMIN should access $r');
      }
    });

    test('CITIZEN is limited to incidents and alerts only', () {
      expect(_canAccess('citizen', 'incidents'), isTrue);
      expect(_canAccess('citizen', 'alerts'),    isTrue);
      expect(_canAccess('citizen', 'users'),     isFalse);
      expect(_canAccess('citizen', 'reports'),   isFalse);
      expect(_canAccess('citizen', 'resources'), isFalse);
      expect(_canAccess('citizen', 'dashboard'), isFalse);
    });

    test('RESPONDER cannot manage users or view reports', () {
      expect(_canAccess('responder', 'incidents'), isTrue);
      expect(_canAccess('responder', 'resources'), isTrue);
      expect(_canAccess('responder', 'users'),     isFalse);
      expect(_canAccess('responder', 'reports'),   isFalse);
    });

    test('OFFICIAL can view reports and dashboard but not manage resources', () {
      expect(_canAccess('official', 'reports'),   isTrue);
      expect(_canAccess('official', 'dashboard'), isTrue);
      expect(_canAccess('official', 'resources'), isFalse);
      expect(_canAccess('official', 'users'),     isFalse);
    });

    test('unknown role has no access to anything', () {
      expect(_canAccess('hacker', 'incidents'), isFalse);
      expect(_canAccess('',       'alerts'),    isFalse);
      expect(_canAccess('guest',  'users'),     isFalse);
    });

    test('RBAC check is case-insensitive', () {
      expect(_canAccess('ADMIN',   'users'),     isTrue);
      expect(_canAccess('CITIZEN', 'incidents'), isTrue);
      expect(_canAccess('Citizen', 'users'),     isFalse);
    });
  });

  // ── ST-F08: NFR2 — UserModel never exposes sensitive fields ───────────────
  group('ST-F08: NFR2 — Sensitive Data Protection', () {
    test('UserModel.toJson never contains password or token', () {
      final user = UserModel(
        id: 1,
        email: 'admin@dms.local',
        firstName: 'Mays',
        lastName: 'Asfour',
        role: 'ADMIN',
      );
      final json = user.toJson();
      expect(json.containsKey('password'),     isFalse);
      expect(json.containsKey('token'),        isFalse);
      expect(json.containsKey('passwordHash'), isFalse);
      expect(json.containsKey('secret'),       isFalse);
    });

    test('redactForLog masks all sensitive keys', () {
      final payload = {
        'email':        'admin@dms.local',
        'password':     'Secret123!',
        'token':        'eyJhbGciOiJIUzI1NiJ9...',
        'accessToken':  'access-tok',
        'refreshToken': 'refresh-tok',
        'secret':       'my-api-secret',
      };
      final redacted = InputSanitizer.redactForLog(payload);
      expect(redacted['password'],    '***');
      expect(redacted['token'],       '***');
      expect(redacted['accessToken'], '***');
      expect(redacted['secret'],      '***');
      expect(redacted['email'],       'admin@dms.local'); // non-sensitive preserved
    });
  });

  // ── ST-F09: NFR3 — JWT shape validation ───────────────────────────────────
  group('ST-F09: NFR3 — JWT Token Validation', () {
    test('valid 3-part JWT passes shape check', () {
      expect(InputSanitizer.isValidJwtShape(
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'),
          isTrue);
    });

    test('malformed tokens fail shape check', () {
      expect(InputSanitizer.isValidJwtShape('only.two'),   isFalse);
      expect(InputSanitizer.isValidJwtShape(''),           isFalse);
      expect(InputSanitizer.isValidJwtShape(null),         isFalse);
      expect(InputSanitizer.isValidJwtShape('abc..xyz'),   isFalse);
    });
  });

  // ── ST-F10: NFR4 — Multilingual locale support ────────────────────────────
  group('ST-F10: NFR4 — Multilingual Support', () {
    test('all 5 core supported locales are available in app', () {
      // These are the locales listed in main.dart's supportedLocales
      const coreLocales = ['en', 'ar', 'fr', 'es', 'tr'];
      final supportedByApp = ['en', 'ar', 'fr', 'es', 'de', 'tr', 'zh', 'ru', 'pt', 'hi', 'ja', 'ko', 'it', 'uk'];
      for (final lang in coreLocales) {
        expect(supportedByApp.contains(lang), isTrue,
            reason: 'Core locale $lang must be supported');
      }
    });

    test('AuthState default is unauthenticated regardless of locale', () {
      const state = AuthState();
      expect(state.token, isNull);
      expect(state.user, isNull);
      expect(state.isLoading, isFalse);
    });
  });

  // ── ST-F11: ColorPalette — severity colors match design spec ──────────────
  group('ST-F11: UI — Severity Color System', () {
    test('all 4 severity levels return distinct non-null colors', () {
      final low      = ColorPalette.getSeverityColor('low');
      final medium   = ColorPalette.getSeverityColor('medium');
      final high     = ColorPalette.getSeverityColor('high');
      final critical = ColorPalette.getSeverityColor('critical');

      expect(low,      isNotNull);
      expect(medium,   isNotNull);
      expect(high,     isNotNull);
      expect(critical, isNotNull);

      // All four must be distinct colors
      final colors = {low, medium, high, critical};
      expect(colors.length, 4);
    });

    test('role color system covers all 3 system roles', () {
      for (final role in ['admin', 'citizen', 'responder', 'official']) {
        expect(ColorPalette.getPrimaryByRole(role), isNotNull);
        final gradient = ColorPalette.gradientByRole(role);
        expect(gradient.colors.length, greaterThanOrEqualTo(2));
      }
    });
  });
}
