import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/auth/domain/user.dart';

void main() {
  group('User model', () {
    test('fromJson/toJson roundtrip', () {
      final json = {
        'id': 'u1',
        'email': 'u1@example.com',
        'role': 'moderator',
        'tier': 'silver',
        'reputationScore': 42,
        'createdAt': '2024-01-01T00:00:00.000Z',
        'lastLoginAt': '2024-01-02T00:00:00.000Z',
        'isTemporary': true,
        'tokenExpires': '2024-01-03T00:00:00.000Z',
      };

      final user = User.fromJson(json);
      expect(user.id, 'u1');
      expect(user.email, 'u1@example.com');
      expect(user.role, UserRole.moderator);
      expect(user.tier, UserTier.silver);
      expect(user.reputationScore, 42);
      expect(user.isTemporary, true);
      expect(user.tokenExpires, isNotNull);

      final back = user.toJson();
      expect(back['id'], 'u1');
      expect(back['role'], 'moderator');
      expect(back['tier'], 'silver');
    });

    test('copyWith and equality', () {
      final base = User(
        id: 'id',
        email: 'a@b.com',
        role: UserRole.user,
        tier: UserTier.bronze,
        reputationScore: 0,
        createdAt: DateTime.parse('2024-01-01T00:00:00.000Z'),
        lastLoginAt: DateTime.parse('2024-01-01T00:00:00.000Z'),
      );

      final same = base.copyWith();
      expect(same, equals(base));

      final changed = base.copyWith(email: 'c@d.com', tier: UserTier.gold);
      expect(changed.email, 'c@d.com');
      expect(changed.tier, UserTier.gold);
      expect(changed == base, isFalse);
    });

    test('role/tier fromString defaults', () {
      expect(UserRole.fromString('ADMIN'), UserRole.admin);
      expect(UserRole.fromString('unknown'), UserRole.user);
      expect(UserTier.fromString('GOLD'), UserTier.gold);
      expect(UserTier.fromString('n/a'), UserTier.bronze);
    });
  });
}
