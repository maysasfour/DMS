import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';
import 'package:disaster_management_app/core/constants/roles.dart';
import 'package:disaster_management_app/core/utils/validators.dart';

/// Tests for auth-related pure logic:
/// UserModel fields, role assignments, and validator rules used on login/register screens.
void main() {
  final testAdmin = UserModel(
    id: '1',
    fullName: 'Mays Asfour',
    email: 'admin@dms.local',
    phoneNumber: '+962791234567',
    role: UserRole.admin,
    createdAt: DateTime(2024, 1, 1),
  );

  final testCitizen = UserModel(
    id: '2',
    fullName: 'Ahmed Al-Rashidi',
    email: 'citizen@dms.local',
    phoneNumber: '0791234567',
    role: UserRole.citizen,
    createdAt: DateTime(2024, 1, 1),
  );

  // ── UserModel role fields ───────────────────────────────────────────────────
  group('UserModel — role and identity', () {
    test('admin role is correctly assigned', () {
      expect(testAdmin.role, UserRole.admin);
      expect(testAdmin.email, 'admin@dms.local');
      expect(testAdmin.isActive, isTrue);
    });

    test('citizen role is correctly assigned', () {
      expect(testCitizen.role, UserRole.citizen);
      expect(testCitizen.email, 'citizen@dms.local');
    });

    test('role displayName matches expected string', () {
      expect(testAdmin.role.displayName, 'Administrator');
      expect(testCitizen.role.displayName, 'Citizen');
      expect(UserRole.responder.displayName, 'Responder');
      expect(UserRole.official.displayName, 'Official');
    });

    test('all UserRole enum values exist', () {
      expect(UserRole.values, containsAll([
        UserRole.admin,
        UserRole.responder,
        UserRole.citizen,
        UserRole.official,
      ]));
    });
  });

  // ── copyWith ────────────────────────────────────────────────────────────────
  group('UserModel.copyWith', () {
    test('updating fullName does not change role or email', () {
      final updated = testAdmin.copyWith(fullName: 'New Name');
      expect(updated.fullName, 'New Name');
      expect(updated.role, UserRole.admin);   // unchanged
      expect(updated.email, testAdmin.email); // unchanged
    });

    test('citizen role is preserved through copyWith', () {
      final updated = testCitizen.copyWith(phoneNumber: '+962799999999');
      expect(updated.role, UserRole.citizen); // role cannot change via copyWith
      expect(updated.phoneNumber, '+962799999999');
    });

    test('isActive can be toggled', () {
      final deactivated = testAdmin.copyWith(isActive: false);
      expect(deactivated.isActive, isFalse);
      expect(deactivated.id, testAdmin.id); // other fields preserved
    });
  });

  // ── Login-screen validator logic ────────────────────────────────────────────
  group('Login screen validators', () {
    test('valid credentials pass all validators', () {
      expect(Validators.email('admin@dms.local'), isNull);
      expect(Validators.password('demo123'), isNull);
    });

    test('empty email and password both fail', () {
      expect(Validators.email(''), isNotNull);
      expect(Validators.password(''), isNotNull);
    });

    test('invalid email format fails', () {
      expect(Validators.email('notanemail'), isNotNull);
    });

    test('password under 6 chars fails', () {
      expect(Validators.password('abc'), isNotNull);
    });
  });

  // ── Registration validator logic ────────────────────────────────────────────
  group('Registration screen validators', () {
    test('strong password passes all strength checks', () {
      expect(Validators.strongPassword('Secure123!'), isNull);
    });

    test('password without uppercase fails', () {
      expect(Validators.strongPassword('secure123!'), isNotNull);
    });

    test('password without digit fails', () {
      expect(Validators.strongPassword('Secure!!!'), isNotNull);
    });

    test('password without special char fails', () {
      expect(Validators.strongPassword('Secure1234'), isNotNull);
    });

    test('confirm password matches correctly', () {
      expect(Validators.confirmPassword('Secure123!', 'Secure123!'), isNull);
    });

    test('mismatched confirm password fails', () {
      expect(Validators.confirmPassword('Secure123!', 'Different1!'), isNotNull);
    });

    test('name field requires at least 2 characters', () {
      expect(Validators.name('M', 'First Name'), isNotNull);
      expect(Validators.name('Ma', 'First Name'), isNull);
    });
  });
}
