// User Acceptance Testing — Disaster Management System (Flutter)
// Simulates end-user acceptance scenarios without a live backend.
// Each group maps to one UAT scenario (UAT-F01 … UAT-F10).
//
// Run with: flutter test test/uat/uat_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/core/utils/validators.dart';
import 'package:disaster_management_app/core/security/input_sanitizer.dart';
import 'package:disaster_management_app/core/themes/color_palette.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';
import 'package:disaster_management_app/features/auth/providers/auth_provider.dart';

// ── Inline RBAC helper (mirrors GoRouter guard) ───────────────────────────────
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
  // ── UAT-F01: Citizen registers successfully (FR1) ─────────────────────────
  group('UAT-F01: FR1 — Citizen Registration Acceptance', () {
    test('valid registration form passes all field validators', () {
      // Scenario: A new citizen fills all registration fields correctly
      expect(Validators.name('Mays', 'First Name'),                isNull);
      expect(Validators.name('Asfour', 'Last Name'),               isNull);
      expect(Validators.email('mays.asfour@meu.edu.jo'),           isNull);
      expect(Validators.phone('+962791234567'),                    isNull);
      expect(Validators.strongPassword('SecurePass1!'),            isNull);
      expect(Validators.confirmPassword('SecurePass1!', 'SecurePass1!'), isNull);
    });

    test('mismatched passwords show clear error to user', () {
      final err = Validators.confirmPassword('SecurePass1!', 'WrongPass1!');
      expect(err, isNotNull);
    });

    test('invalid email shows user-friendly error', () {
      final err = Validators.email('not-an-email');
      expect(err, isNotNull);
    });

    test('weak password fails — must have uppercase, digit, and special char', () {
      expect(Validators.strongPassword('password'),  isNotNull); // entirely lowercase
      expect(Validators.strongPassword('Password'),  isNotNull); // missing digit + special
      expect(Validators.strongPassword('Password1'), isNotNull); // missing special
    });
  });

  // ── UAT-F02: Citizen logs in (FR2) ────────────────────────────────────────
  group('UAT-F02: FR2 — Citizen Login Acceptance', () {
    test('valid login credentials satisfy form validators', () {
      expect(Validators.email('citizen@dms.local'), isNull);
      expect(Validators.password('demo123'),         isNull);
    });

    test('AuthState initial state is unauthenticated', () {
      const state = AuthState();
      expect(state.token,     isNull);
      expect(state.user,      isNull);
      expect(state.isLoading, isFalse);
      expect(state.error,     isNull);
    });

    test('AuthState carries token and user after simulated login', () {
      const user = UserModel(
        id: 2, email: 'citizen@dms.local',
        firstName: 'Citizen', lastName: 'User', role: 'CITIZEN',
      );
      const state = AuthState(token: 'eyJ.tok.en', user: user, isLoading: false);
      expect(state.token, isNotNull);
      expect(state.user!.role, 'CITIZEN');
    });

    test('empty email/password fails client-side validation before API call', () {
      expect(Validators.email(''),    isNotNull);
      expect(Validators.password(''), isNotNull);
    });
  });

  // ── UAT-F03: Citizen reports an incident (FR3) ────────────────────────────
  group('UAT-F03: FR3 — Incident Reporting Acceptance', () {
    test('valid incident fields all pass validators', () {
      expect(Validators.required('Flood near river bank', 'Title'),         isNull);
      expect(Validators.required('Water rising quickly',  'Description'),   isNull);
      expect(Validators.latitude('31.9539'),                                isNull);
      expect(Validators.longitude('35.9106'),                               isNull);
    });

    test('empty title triggers required-field error containing the field name', () {
      final err = Validators.required('', 'Incident Title');
      expect(err, isNotNull);
      expect(err, contains('Incident Title'));
    });

    test('out-of-range GPS coordinates are rejected', () {
      expect(Validators.latitude('95'),   isNotNull);
      expect(Validators.longitude('200'), isNotNull);
    });

    test('dangerous title input is flagged before submission', () {
      expect(InputSanitizer.isDangerous("'; DROP TABLE incidents;--"), isTrue);
      expect(InputSanitizer.isDangerous('<script>alert(1)</script>'),   isTrue);
    });

    test('safe incident descriptions pass through sanitize() unchanged', () {
      const description = 'Flood near Amman bridge area, water level rising';
      expect(InputSanitizer.sanitize(description), description);
    });
  });

  // ── UAT-F04: Citizen views alerts (FR6) ───────────────────────────────────
  group('UAT-F04: FR6 — Citizen Alert Visibility Acceptance', () {
    test('citizen role has access to alerts resource', () {
      expect(_canAccess('citizen', 'alerts'), isTrue);
    });

    test('citizen does NOT have access to admin-only resources', () {
      expect(_canAccess('citizen', 'users'),     isFalse);
      expect(_canAccess('citizen', 'reports'),   isFalse);
      expect(_canAccess('citizen', 'resources'), isFalse);
      expect(_canAccess('citizen', 'dashboard'), isFalse);
    });

    test('UserModel contains expected citizen identity fields', () {
      final user = UserModel.fromJson({
        'id': 2, 'email': 'citizen@dms.local',
        'firstName': 'Citizen', 'lastName': 'User',
        'roles': ['CITIZEN'],
      });
      expect(user.email, 'citizen@dms.local');
      expect(user.firstName, 'Citizen');
    });
  });

  // ── UAT-F05: Admin views dashboard statistics (FR2) ───────────────────────
  group('UAT-F05: FR2 — Admin Dashboard Acceptance', () {
    test('admin role can access dashboard, users, reports, resources', () {
      for (final r in ['dashboard', 'users', 'incidents', 'reports', 'resources', 'alerts', 'teams']) {
        expect(_canAccess('admin', r), isTrue, reason: 'ADMIN must access $r');
      }
    });

    test('admin UserModel parsed from API response JSON', () {
      final user = UserModel.fromJson({
        'id': 1, 'email': 'admin@dms.local',
        'firstName': 'Admin', 'lastName': 'User',
        'roles': ['ADMIN'],
      });
      expect(user.role, 'ADMIN');
      expect(user.id, 1);
    });

    test('admin color palette returns non-null color and gradient', () {
      expect(ColorPalette.getPrimaryByRole('admin'), isNotNull);
      final gradient = ColorPalette.gradientByRole('admin');
      expect(gradient.colors.length, greaterThanOrEqualTo(2));
    });
  });

  // ── UAT-F06: Admin manages resources (FR5) ────────────────────────────────
  group('UAT-F06: FR5 — Resource Management Acceptance', () {
    test('admin has access to resources', () {
      expect(_canAccess('admin', 'resources'), isTrue);
    });

    test('citizen and official cannot manage resources', () {
      expect(_canAccess('citizen',  'resources'), isFalse);
      expect(_canAccess('official', 'resources'), isFalse);
    });

    test('responder can view resources but not users', () {
      expect(_canAccess('responder', 'resources'), isTrue);
      expect(_canAccess('responder', 'users'),     isFalse);
    });

    test('resource name is required and cannot be empty', () {
      expect(Validators.required('', 'Resource Name'),    isNotNull);
      expect(Validators.required('Ambulance 01', 'Resource Name'), isNull);
    });
  });

  // ── UAT-F07: Responder accepts assigned incident (FR4) ────────────────────
  group('UAT-F07: FR4 — Responder Incident Acceptance', () {
    test('responder role can access incidents and teams', () {
      expect(_canAccess('responder', 'incidents'), isTrue);
      expect(_canAccess('responder', 'teams'),     isTrue);
    });

    test('responder role gets coral color scheme', () {
      expect(ColorPalette.getPrimaryByRole('responder'), isNotNull);
      final gradient = ColorPalette.gradientByRole('responder');
      expect(gradient.colors.length, greaterThanOrEqualTo(2));
    });

    test('AuthState holds role for routing guard', () {
      const user = UserModel(
        id: 5, email: 'responder@dms.local',
        firstName: 'Resp', lastName: 'Onder', role: 'RESPONDER',
      );
      const state = AuthState(token: 'tok.en.here', user: user);
      expect(state.user!.role, 'RESPONDER');
    });
  });

  // ── UAT-F08: Official views situation reports (FR8) ───────────────────────
  group('UAT-F08: FR8 — Official Situation Reports Acceptance', () {
    test('official role can access reports and dashboard', () {
      expect(_canAccess('official', 'reports'),   isTrue);
      expect(_canAccess('official', 'dashboard'), isTrue);
    });

    test('official cannot manage users or resources', () {
      expect(_canAccess('official', 'users'),     isFalse);
      expect(_canAccess('official', 'resources'), isFalse);
      expect(_canAccess('official', 'teams'),     isFalse);
    });
  });

  // ── UAT-F09: Sensitive data never exposed in UI layer (NFR2) ──────────────
  group('UAT-F09: NFR2 — Sensitive Data Protection (Acceptance)', () {
    test('UserModel.toJson() never includes password or token', () {
      const user = UserModel(
        id: 1, email: 'admin@dms.local',
        firstName: 'Admin', lastName: 'User', role: 'ADMIN',
      );
      final json = user.toJson();
      expect(json.containsKey('password'),     isFalse);
      expect(json.containsKey('token'),        isFalse);
      expect(json.containsKey('passwordHash'), isFalse);
    });

    test('redactForLog masks password and tokens before logging', () {
      final payload = {'email': 'admin@dms.local', 'password': 'Secret1!', 'token': 'abc.def.ghi'};
      final redacted = InputSanitizer.redactForLog(payload);
      expect(redacted['password'], '***');
      expect(redacted['token'],    '***');
      expect(redacted['email'],    'admin@dms.local');
    });
  });

  // ── UAT-F10: UI reflects severity correctly to user (NFR) ─────────────────
  group('UAT-F10: UI — Severity Visual Feedback Acceptance', () {
    test('all four severity levels render distinct colors', () {
      final low      = ColorPalette.getSeverityColor('low');
      final medium   = ColorPalette.getSeverityColor('medium');
      final high     = ColorPalette.getSeverityColor('high');
      final critical = ColorPalette.getSeverityColor('critical');

      expect({low, medium, high, critical}.length, 4,
          reason: 'All 4 severity levels must map to distinct colors');
    });

    test('unknown severity falls back to a non-null color', () {
      expect(ColorPalette.getSeverityColor('unknown'), isNotNull);
    });

    test('status colors are defined for all incident lifecycle states', () {
      for (final status in ['reported', 'acknowledged', 'in-progress', 'resolved', 'closed']) {
        expect(ColorPalette.getStatusColor(status), isNotNull,
            reason: 'Status "$status" must have a color');
      }
    });
  });
}
