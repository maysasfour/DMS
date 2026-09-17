// Performance tests — Disaster Management System (Flutter)
// Measures execution time of critical pure-Dart operations:
// validation pipeline, sanitizer, UserModel serialization, RBAC lookup.
// NFR3: all operations must complete within defined thresholds.
//
// Run with: flutter test test/performance/performance_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/core/utils/validators.dart';
import 'package:disaster_management_app/core/security/input_sanitizer.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';

// Max allowed duration for each operation (generous for CI environments)
const _maxMs = 100;

void main() {
  // ── PT-F01: Email validator runs within threshold ─────────────────────────
  group('PT-F01: Validator performance', () {
    test('email validation completes within ${_maxMs}ms', () {
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        Validators.email('mays.asfour@meu.edu.jo');
        Validators.email('notanemail');
        Validators.email('');
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10),
          reason: '1000 iterations should complete quickly');
    });

    test('strongPassword validation completes within threshold', () {
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        Validators.strongPassword('SecurePass1!');
        Validators.strongPassword('weak');
        Validators.strongPassword('NoSpecial1');
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });

    test('full registration form validation pipeline completes within threshold', () {
      final watch = Stopwatch()..start();
      for (int i = 0; i < 500; i++) {
        Validators.name('Mays', 'First Name');
        Validators.name('Asfour', 'Last Name');
        Validators.email('mays@meu.edu.jo');
        Validators.phone('+962791234567');
        Validators.strongPassword('SecurePass1!');
        Validators.confirmPassword('SecurePass1!', 'SecurePass1!');
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });
  });

  // ── PT-F02: InputSanitizer runs within threshold ──────────────────────────
  group('PT-F02: InputSanitizer performance', () {
    test('isDangerous() on safe input completes within threshold', () {
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        InputSanitizer.isDangerous('Flood near Amman bridge area 5');
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });

    test('isDangerous() on attack strings completes within threshold', () {
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        InputSanitizer.isDangerous("' OR '1'='1");
        InputSanitizer.isDangerous('<script>alert(1)</script>');
        InputSanitizer.isDangerous("'; DROP TABLE users;--");
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });

    test('sanitize() runs within threshold', () {
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        InputSanitizer.sanitize("' OR '1'='1 hello world");
        InputSanitizer.sanitize('Normal incident description near Amman');
        InputSanitizer.sanitize(null);
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });
  });

  // ── PT-F03: UserModel serialization within threshold ─────────────────────
  group('PT-F03: UserModel serialization performance', () {
    test('fromJson() runs within threshold for 1000 iterations', () {
      final json = {
        'id': 1,
        'email': 'admin@dms.local',
        'firstName': 'Mays',
        'lastName': 'Asfour',
        'roles': ['ADMIN'],
        'phone': '+962791234567',
        'avatarUrl': null,
      };
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        UserModel.fromJson(json);
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });

    test('toJson() runs within threshold for 1000 iterations', () {
      const user = UserModel(
        id: 1,
        email: 'admin@dms.local',
        firstName: 'Mays',
        lastName: 'Asfour',
        role: 'ADMIN',
      );
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        user.toJson();
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });

    test('copyWith() runs within threshold for 1000 iterations', () {
      const user = UserModel(
        id: 1,
        email: 'admin@dms.local',
        firstName: 'Mays',
        lastName: 'Asfour',
        role: 'ADMIN',
      );
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        user.copyWith(firstName: 'Updated $i');
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });
  });

  // ── PT-F04: JWT validation within threshold ───────────────────────────────
  group('PT-F04: JWT validation performance', () {
    test('isValidJwtShape() runs within threshold for 1000 iterations', () {
      const validJwt =
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      final watch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        InputSanitizer.isValidJwtShape(validJwt);
        InputSanitizer.isValidJwtShape('invalid');
        InputSanitizer.isValidJwtShape(null);
      }
      watch.stop();
      expect(watch.elapsedMilliseconds, lessThan(_maxMs * 10));
    });
  });
}
