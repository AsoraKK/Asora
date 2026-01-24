import 'package:asora/features/profile/domain/public_user.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('handleLabel returns handle when present', () {
    const user = PublicUser(
      id: 'user-123456',
      displayName: 'Lythaus User',
      handle: '@lythaus',
      tier: 'gold',
    );

    expect(user.handleLabel, '@lythaus');
  });

  test('handleLabel falls back to id token', () {
    const user = PublicUser(
      id: 'abc12345',
      displayName: 'Fallback User',
      tier: 'free',
    );

    expect(user.handleLabel, '@abc123');
  });

  test('fromJson applies defaults for optional fields', () {
    final user = PublicUser.fromJson({'id': 'u1', 'displayName': 'Test'});

    expect(user.tier, 'free');
    expect(user.reputationScore, 0);
    expect(user.journalistVerified, isFalse);
    expect(user.badges, isEmpty);
  });
}
