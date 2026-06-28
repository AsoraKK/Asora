/// Widget tests for ProfileScreen.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/profile/application/profile_providers.dart';
import 'package:asora/features/profile/domain/public_user.dart';
import 'package:asora/features/profile/domain/trust_passport.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';

const _fakeUser = PublicUser(
  id: 'user-1',
  displayName: 'Jane Doe',
  handle: '@janedoe',
  tier: 'silver',
);

const _ownerVisibleUser = PublicUser(
  id: 'user-1',
  displayName: 'Jane Doe',
  handle: '@janedoe',
  tier: 'gold',
  journalistVerified: true,
  badges: ['Trusted', 'Editor'],
  trustPassportVisibility: 'public_expanded',
  reputationScore: 321,
);

const _privatePassportUser = PublicUser(
  id: 'user-2',
  displayName: 'Private Person',
  handle: '@private',
  tier: 'bronze',
  trustPassportVisibility: 'private',
  reputationScore: 12,
);

final _fakeAuthUser = User(
  id: 'user-1',
  email: 'jane@example.com',
  role: UserRole.user,
  tier: UserTier.silver,
  reputationScore: 100,
  createdAt: DateTime.utc(2024),
  lastLoginAt: DateTime.utc(2024),
);

final _fakeAdminUser = _fakeAuthUser.copyWith(role: UserRole.admin);

Widget _buildApp({List<Override> overrides = const []}) {
  return ProviderScope(
    overrides: overrides,
    child: const MaterialApp(home: ProfileScreen()),
  );
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  // ── No user signed in ──────────────────────────────────────────────────────
  group('No signed-in user', () {
    testWidgets('shows sign-in prompt when no userId and no current user', (
      tester,
    ) async {
      await tester.pumpWidget(
        _buildApp(overrides: [currentUserProvider.overrideWithValue(null)]),
      );
      await tester.pump();

      expect(
        find.text('Sign in to view your profile details.'),
        findsOneWidget,
      );
    });

    testWidgets('shows Profile AppBar when no user', (tester) async {
      await tester.pumpWidget(
        _buildApp(overrides: [currentUserProvider.overrideWithValue(null)]),
      );
      await tester.pump();

      expect(find.text('Profile'), findsOneWidget);
    });
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  group('Loading state', () {
    testWidgets('shows CircularProgressIndicator while profile loads', (
      tester,
    ) async {
      final completer = Completer<PublicUser>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAuthUser),
            publicUserProvider(
              'user-1',
            ).overrideWith((ref) => completer.future),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen()),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      completer.complete(_fakeUser);
    });
  });

  // ── Error state ────────────────────────────────────────────────────────────
  group('Error state', () {
    testWidgets('shows error message when profile load fails', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAuthUser),
            publicUserProvider(
              'user-1',
            ).overrideWith((ref) async => throw Exception('Network failure')),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Unable to load profile'), findsOneWidget);
    });
  });

  // ── Success state ──────────────────────────────────────────────────────────
  group('Success state', () {
    testWidgets('shows displayName in AppBar', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAuthUser),
            publicUserProvider('user-1').overrideWith((ref) async => _fakeUser),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Jane Doe'), findsAtLeastNWidgets(1));
    });

    testWidgets('shows handle label', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAuthUser),
            publicUserProvider('user-1').overrideWith((ref) async => _fakeUser),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('@janedoe'), findsOneWidget);
    });

    testWidgets('owner sees profile actions but not staff tools by default', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAuthUser),
            publicUserProvider(
              'user-1',
            ).overrideWith((ref) async => _ownerVisibleUser),
            trustPassportProvider('user-1').overrideWith((ref) async {
              return const TrustPassport(
                userId: 'user-1',
                visibility: 'public_expanded',
                transparencyStreakCategory: 'Consistent',
                appealsResolvedFairlyLabel: '12/12 fair',
                jurorReliabilityTier: 'Gold',
                counts: TrustPassportCounts(
                  totalPosts: 12,
                  postsWithSignals: 8,
                  appealsResolved: 4,
                  appealsApproved: 3,
                  appealsRejected: 1,
                  votesCast: 20,
                  alignedVotes: 18,
                ),
              );
            }),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Editorial Contributor'), findsOneWidget);
      expect(find.text('Trusted'), findsOneWidget);
      expect(find.text('Editor'), findsOneWidget);
      expect(find.text('Moderation hub'), findsNothing);
      expect(find.text('Control Panel'), findsNothing);
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Reputation'), findsOneWidget);
    });

    testWidgets('admin owner sees staff tools', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAdminUser),
            publicUserProvider(
              'user-1',
            ).overrideWith((ref) async => _ownerVisibleUser),
            trustPassportProvider('user-1').overrideWith((ref) async {
              return const TrustPassport(
                userId: 'user-1',
                visibility: 'public_expanded',
                transparencyStreakCategory: 'Consistent',
                appealsResolvedFairlyLabel: '12/12 fair',
                jurorReliabilityTier: 'Gold',
                counts: TrustPassportCounts(
                  totalPosts: 12,
                  postsWithSignals: 8,
                  appealsResolved: 4,
                  appealsApproved: 3,
                  appealsRejected: 1,
                  votesCast: 20,
                  alignedVotes: 18,
                ),
              );
            }),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Moderation hub'), findsOneWidget);
      expect(find.text('Control Panel'), findsOneWidget);
    });

    testWidgets('non-owner with private passport sees safe message', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(_fakeAuthUser),
            publicUserProvider(
              'user-2',
            ).overrideWith((ref) async => _privatePassportUser),
            trustPassportProvider('user-2').overrideWith((ref) async {
              throw StateError(
                'should not load private passport for non-owner',
              );
            }),
            jwtProvider.overrideWith((ref) async => 'tok'),
          ],
          child: const MaterialApp(home: ProfileScreen(userId: 'user-2')),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(
        find.text('This user keeps trust passport details private.'),
        findsOneWidget,
      );
      expect(find.text('Trust Passport details'), findsNothing);
    });
  });
}
