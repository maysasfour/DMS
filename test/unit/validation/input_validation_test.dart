import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/core/utils/validators.dart';

void main() {
  // ── Email validation ────────────────────────────────────────────────────────
  group('Validators.email', () {
    test('valid email returns null', () {
      expect(Validators.email('user@example.com'), isNull);
      expect(Validators.email('mays.asfour@meu.edu.jo'), isNull);
      expect(Validators.email('test+alias@domain.org'), isNull);
    });

    test('empty email returns required error', () {
      expect(Validators.email(''), isNotNull);
      expect(Validators.email(null), isNotNull);
    });

    test('email without @ returns invalid error', () {
      expect(Validators.email('notanemail'), isNotNull);
      expect(Validators.email('user.domain.com'), isNotNull);
    });

    test('email without TLD returns invalid error', () {
      expect(Validators.email('user@domain'), isNotNull);
    });

    test('whitespace-only email is invalid', () {
      expect(Validators.email('   '), isNotNull);
    });
  });

  // ── Login password ──────────────────────────────────────────────────────────
  group('Validators.password (login)', () {
    test('valid password returns null', () {
      expect(Validators.password('secret'), isNull);
      expect(Validators.password('password123'), isNull);
    });

    test('empty password returns error', () {
      expect(Validators.password(''), isNotNull);
      expect(Validators.password(null), isNotNull);
    });

    test('password shorter than 6 chars returns error', () {
      expect(Validators.password('abc'), isNotNull);
      expect(Validators.password('12345'), isNotNull);
    });

    test('exactly 6 chars is valid', () {
      expect(Validators.password('123456'), isNull);
    });
  });

  // ── Strong password (registration) ─────────────────────────────────────────
  group('Validators.strongPassword', () {
    test('strong password passes all checks', () {
      expect(Validators.strongPassword('Secure123!'), isNull);
      expect(Validators.strongPassword('MyPass90@'), isNull);
    });

    test('too short fails', () {
      expect(Validators.strongPassword('Ab1!'), isNotNull);
    });

    test('no uppercase fails', () {
      expect(Validators.strongPassword('password1!'), isNotNull);
    });

    test('no digit fails', () {
      expect(Validators.strongPassword('Password!'), isNotNull);
    });

    test('no special character fails', () {
      expect(Validators.strongPassword('Password1'), isNotNull);
    });

    test('empty fails', () {
      expect(Validators.strongPassword(''), isNotNull);
      expect(Validators.strongPassword(null), isNotNull);
    });
  });

  // ── Confirm password ────────────────────────────────────────────────────────
  group('Validators.confirmPassword', () {
    test('matching passwords return null', () {
      expect(Validators.confirmPassword('MyPass90!', 'MyPass90!'), isNull);
    });

    test('mismatched passwords return error', () {
      expect(Validators.confirmPassword('Password1!', 'Password2!'), isNotNull);
    });

    test('empty confirm returns error', () {
      expect(Validators.confirmPassword('', 'Password1!'), isNotNull);
    });
  });

  // ── Phone validation ────────────────────────────────────────────────────────
  group('Validators.phone', () {
    test('valid Jordan phone passes', () {
      expect(Validators.phone('+962791234567'), isNull);
      expect(Validators.phone('0791234567'), isNull);
    });

    test('empty/null phone is valid (optional)', () {
      expect(Validators.phone(''), isNull);
      expect(Validators.phone(null), isNull);
    });

    test('phone with letters fails', () {
      expect(Validators.phone('07901abc567'), isNotNull);
    });

    test('very short phone fails', () {
      expect(Validators.phone('123'), isNotNull);
    });
  });

  // ── Required field ──────────────────────────────────────────────────────────
  group('Validators.required', () {
    test('non-empty value passes', () {
      expect(Validators.required('Hello', 'Title'), isNull);
    });

    test('whitespace-only fails', () {
      expect(Validators.required('   ', 'Title'), isNotNull);
    });

    test('empty returns field-specific message', () {
      expect(Validators.required('', 'Incident Title'), contains('Incident Title'));
    });

    test('null returns error', () {
      expect(Validators.required(null, 'Location'), isNotNull);
    });
  });

  // ── Latitude / Longitude ────────────────────────────────────────────────────
  group('Validators.latitude', () {
    test('valid latitude passes', () {
      expect(Validators.latitude('31.9539'), isNull);
      expect(Validators.latitude('0'), isNull);
      expect(Validators.latitude('-90'), isNull);
      expect(Validators.latitude('90'), isNull);
    });

    test('out-of-range latitude fails', () {
      expect(Validators.latitude('91'), isNotNull);
      expect(Validators.latitude('-91'), isNotNull);
    });

    test('empty/null is optional — returns null', () {
      expect(Validators.latitude(''), isNull);
      expect(Validators.latitude(null), isNull);
    });
  });

  group('Validators.longitude', () {
    test('valid longitude passes', () {
      expect(Validators.longitude('35.9106'), isNull);
      expect(Validators.longitude('-180'), isNull);
      expect(Validators.longitude('180'), isNull);
    });

    test('out-of-range longitude fails', () {
      expect(Validators.longitude('181'), isNotNull);
      expect(Validators.longitude('-181'), isNotNull);
    });
  });
}
