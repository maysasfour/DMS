import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';
import 'package:disaster_management_app/core/constants/roles.dart';

void main() {
  group('UserModel', () {
    // ── fromJson ────────────────────────────────────────────────────────────
    group('fromJson', () {
      test('parses all fields correctly', () {
        final now = DateTime.now().toUtc();
        final json = {
          'id': '1',
          'fullName': 'Mays Asfour',
          'email': 'admin@dms.local',
          'phoneNumber': '+962791234567',
          'role': 'admin',
          'profilePictureUrl': 'https://example.com/avatar.jpg',
          'bio': 'DMS admin',
          'createdAt': now.toIso8601String(),
          'isActive': true,
        };

        final user = UserModel.fromJson(json);
        expect(user.id, '1');
        expect(user.fullName, 'Mays Asfour');
        expect(user.email, 'admin@dms.local');
        expect(user.phoneNumber, '+962791234567');
        expect(user.role, UserRole.admin);
        expect(user.profilePictureUrl, 'https://example.com/avatar.jpg');
        expect(user.bio, 'DMS admin');
        expect(user.isActive, isTrue);
      });

      test('parses citizen role', () {
        final json = {
          'id': '2',
          'fullName': 'Ahmed Al-Rashidi',
          'email': 'citizen@dms.local',
          'phoneNumber': '0791234567',
          'role': 'citizen',
          'createdAt': DateTime.now().toIso8601String(),
        };
        final user = UserModel.fromJson(json);
        expect(user.role, UserRole.citizen);
      });

      test('parses responder role', () {
        final json = {
          'id': '3',
          'fullName': 'Alpha Team',
          'email': 'team1@dms.local',
          'phoneNumber': '0791234568',
          'role': 'responder',
          'createdAt': DateTime.now().toIso8601String(),
        };
        final user = UserModel.fromJson(json);
        expect(user.role, UserRole.responder);
      });

      test('defaults isActive to true when missing', () {
        final json = {
          'id': '4',
          'fullName': 'Test User',
          'email': 'test@dms.local',
          'phoneNumber': '0791234569',
          'role': 'citizen',
          'createdAt': DateTime.now().toIso8601String(),
        };
        final user = UserModel.fromJson(json);
        expect(user.isActive, isTrue);
      });

      test('parses null profilePictureUrl', () {
        final json = {
          'id': '5',
          'fullName': 'No Avatar',
          'email': 'noavatar@dms.local',
          'phoneNumber': '0791234570',
          'role': 'official',
          'profilePictureUrl': null,
          'createdAt': DateTime.now().toIso8601String(),
        };
        final user = UserModel.fromJson(json);
        expect(user.profilePictureUrl, isNull);
      });
    });

    // ── toJson ──────────────────────────────────────────────────────────────
    group('toJson', () {
      test('serializes all fields', () {
        final now = DateTime.now().toUtc();
        final user = UserModel(
          id: '1',
          fullName: 'Mays Asfour',
          email: 'admin@dms.local',
          phoneNumber: '+962791234567',
          role: UserRole.admin,
          createdAt: now,
          isActive: true,
        );
        final json = user.toJson();
        expect(json['id'], '1');
        expect(json['fullName'], 'Mays Asfour');
        expect(json['email'], 'admin@dms.local');
        expect(json['role'], 'admin');
        expect(json['isActive'], isTrue);
      });

      test('does not expose password or token', () {
        final user = UserModel(
          id: '1',
          fullName: 'Admin',
          email: 'admin@dms.local',
          phoneNumber: '+962791234567',
          role: UserRole.admin,
          createdAt: DateTime.now(),
        );
        final json = user.toJson();
        expect(json.containsKey('password'), isFalse);
        expect(json.containsKey('token'), isFalse);
        expect(json.containsKey('passwordHash'), isFalse);
      });

      test('round-trips through fromJson → toJson', () {
        final now = DateTime.now().toUtc();
        final original = {
          'id': '10',
          'fullName': 'Round Trip',
          'email': 'rt@dms.local',
          'phoneNumber': '0791234560',
          'role': 'admin',
          'createdAt': now.toIso8601String(),
          'isActive': true,
        };
        final user = UserModel.fromJson(original);
        final json = user.toJson();
        expect(json['id'], '10');
        expect(json['email'], 'rt@dms.local');
        expect(json['role'], 'admin');
      });
    });

    // ── copyWith ────────────────────────────────────────────────────────────
    group('copyWith', () {
      test('updates only specified fields', () {
        final user = UserModel(
          id: '1',
          fullName: 'Mays Asfour',
          email: 'admin@dms.local',
          phoneNumber: '+962791234567',
          role: UserRole.admin,
          createdAt: DateTime.now(),
        );
        final updated = user.copyWith(fullName: 'Updated Name');
        expect(updated.fullName, 'Updated Name');
        expect(updated.email, 'admin@dms.local'); // unchanged
        expect(updated.role, UserRole.admin);      // unchanged
        expect(updated.id, '1');                   // unchanged
      });

      test('preserves all fields when no args provided', () {
        final user = UserModel(
          id: '2',
          fullName: 'Citizen A',
          email: 'citizen@dms.local',
          phoneNumber: '0791234567',
          role: UserRole.citizen,
          createdAt: DateTime.now(),
        );
        final copy = user.copyWith();
        expect(copy.id, user.id);
        expect(copy.email, user.email);
        expect(copy.role, user.role);
        expect(copy.fullName, user.fullName);
      });

      test('role cannot be escalated via copyWith from citizen', () {
        final user = UserModel(
          id: '3',
          fullName: 'Bad Actor',
          email: 'hacker@dms.local',
          phoneNumber: '0791234567',
          role: UserRole.citizen,
          createdAt: DateTime.now(),
        );
        // copyWith without role arg — role stays citizen
        final unchanged = user.copyWith(fullName: 'Attempted Escalation');
        expect(unchanged.role, UserRole.citizen);
      });
    });
  });
}
