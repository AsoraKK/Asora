import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/auth/domain/user.dart';

void main() {
  group('User Model', () {
    final baseJson = {
      'id': '123',
      'email': 'test@example.com',
      'role': 'admin',
      'tier': 'gold',
      'reputationScore': 42,
      'createdAt': '2024-01-01T12:00:00.000Z',
      'lastLoginAt': '2024-01-02T12:00:00.000Z',
      'isTemporary': false,
      'tokenExpires': '2024-01-03T12:00:00.000Z',
    };

    test('fromJson parses correctly', () {
      final user = User.fromJson(baseJson);
      expect(user.id, '123');
      expect(user.email, 'test@example.com');
      expect(user.role, UserRole.admin);
      expect(user.tier, UserTier.gold);
      expect(user.tokenExpires,
          DateTime.parse('2024-01-03T12:00:00.000Z'));
    });

    test('fromJson handles missing tokenExpires', () {
      final json = Map<String, dynamic>.from(baseJson)
        ..remove('tokenExpires');
      final user = User.fromJson(json);
      expect(user.tokenExpires, isNull);
    });

    test('fromJson handles null tokenExpires', () {
      final json = Map<String, dynamic>.from(baseJson)
        ..['tokenExpires'] = null;
      final user = User.fromJson(json);
      expect(user.tokenExpires, isNull);
    });

    test('toJson serializes correctly', () {
      final user = User.fromJson(baseJson);
      final json = user.toJson();
      expect(json['id'], baseJson['id']);
      expect(json['tokenExpires'], baseJson['tokenExpires']);
    });

    test('toJson handles null tokenExpires', () {
      final user = User.fromJson(baseJson).copyWith(tokenExpires: null);
      final json = user.toJson();
      expect(json['tokenExpires'], isNull);
    });

    test('fromJson defaults invalid role/tier', () {
      final json = Map<String, dynamic>.from(baseJson)
        ..['role'] = 'invalid_role'
        ..['tier'] = 'invalid_tier';
      final user = User.fromJson(json);
      expect(user.role, UserRole.user);
      expect(user.tier, UserTier.bronze);
    });

    test('copyWith updates fields', () {
      final user = User.fromJson(baseJson);
      final updated = user.copyWith(
        email: 'new@example.com',
        role: UserRole.moderator,
        tokenExpires: DateTime.parse('2024-01-04T12:00:00.000Z'),
      );
      expect(updated.email, 'new@example.com');
      expect(updated.role, UserRole.moderator);
      expect(
        updated.tokenExpires,
        DateTime.parse('2024-01-04T12:00:00.000Z'),
      );
      expect(updated.id, user.id);
    });

    test('equality compares all fields', () {
      final user1 = User.fromJson(baseJson);
      final user2 = User.fromJson(baseJson);
      final user3 = user1.copyWith(email: 'different@example.com');
      expect(user1, equals(user2));
      expect(user1, isNot(equals(user3)));
    });
  });

  group('UserRole parsing', () {
    test('parses valid roles', () {
      expect(UserRole.fromString('admin'), UserRole.admin);
      expect(UserRole.fromString('MODERATOR'), UserRole.moderator);
    });

    test('defaults on invalid role', () {
      expect(UserRole.fromString('unknown'), UserRole.user);
    });
  });

  group('UserTier parsing', () {
    test('parses valid tiers', () {
      expect(UserTier.fromString('gold'), UserTier.gold);
      expect(UserTier.fromString('PLATINUM'), UserTier.platinum);
    });

    test('defaults on invalid tier', () {
      expect(UserTier.fromString('unknown'), UserTier.bronze);
    });
  });
}
