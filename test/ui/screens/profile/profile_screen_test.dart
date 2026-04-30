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
import 'package:asora/ui/screens/profile/profile_screen.dart';

const _fakeUser = PublicUser(
  id: 'user-1',
  displayName: 'Jane Doe',
  handle: '@janedoe',
  tier: 'silver',
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
  });
}
