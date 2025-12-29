import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/profile/application/profile_providers.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';

void main() {
  testWidgets('profile screen prompts sign in when unauthenticated', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [currentUserProvider.overrideWith((ref) => null)],
        child: const MaterialApp(home: ProfileScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Sign in to view your profile details.'), findsOneWidget);
  });

  testWidgets('profile screen renders user details and stats', (tester) async {
    final user = User(
      id: 'user-1',
      email: 'ada@example.com',
      role: UserRole.user,
      tier: UserTier.gold,
      reputationScore: 120,
      createdAt: DateTime(2024, 1, 1),
      lastLoginAt: DateTime(2024, 1, 2),
    );
    final profile = PublicUser(
      id: 'user-1',
      displayName: 'Ada Lovelace',
      handle: '@ada',
      tier: 'gold',
      reputationScore: 120,
      journalistVerified: true,
      badges: const ['Founding member'],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => user),
          publicUserProvider(
            user.id,
          ).overrideWith((ref) => Future.value(profile)),
        ],
        child: const MaterialApp(home: ProfileScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Ada Lovelace'), findsWidgets);
    expect(find.text('@ada'), findsOneWidget);
    expect(find.text('120 points'), findsOneWidget);
    expect(find.text('Founding member'), findsOneWidget);
    expect(find.text('Moderation hub'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });

  testWidgets('profile screen shows error state on load failure', (
    tester,
  ) async {
    final user = User(
      id: 'user-2',
      email: 'error@example.com',
      role: UserRole.user,
      tier: UserTier.bronze,
      reputationScore: 0,
      createdAt: DateTime(2024, 1, 1),
      lastLoginAt: DateTime(2024, 1, 2),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => user),
          publicUserProvider(
            user.id,
          ).overrideWith((ref) => Future.error(Exception('no profile'))),
        ],
        child: const MaterialApp(home: ProfileScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.textContaining('Unable to load profile'), findsOneWidget);
  });
}
