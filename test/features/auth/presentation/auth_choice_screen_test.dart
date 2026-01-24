import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/core/config/environment_config.dart';
import 'package:asora/core/security/device_integrity_guard.dart';
import 'package:asora/core/security/device_security_service.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';

class _FakeAnalyticsClient implements AnalyticsClient {
  final List<String> loggedEvents = [];

  @override
  Future<void> logEvent(String name, {Map<String, Object?>? properties}) async {
    loggedEvents.add(name);
  }

  @override
  Future<void> reset() async {}

  @override
  Future<void> setUserId(String? userId) async {}

  @override
  Future<void> setUserProperties(Map<String, Object?> properties) async {}
}

class _MockAuthStateNotifier extends StateNotifier<AsyncValue<User?>>
    with Mock
    implements AuthStateNotifier {
  _MockAuthStateNotifier() : super(const AsyncValue.data(null));
}

class _FakeDeviceSecurityService implements DeviceSecurityService {
  @override
  void clearCache() {}

  @override
  Future<DeviceSecurityState> evaluateSecurity() async {
    return DeviceSecurityState(
      isRootedOrJailbroken: false,
      isEmulator: false,
      isDebugBuild: true,
      lastCheckedAt: DateTime(2024, 1, 1),
    );
  }
}

DeviceIntegrityGuard _buildIntegrityGuard() {
  final config = EnvironmentConfig.fromEnvironment();
  return DeviceIntegrityGuard(
    deviceSecurityService: _FakeDeviceSecurityService(),
    config: config.security,
    environment: config.environment,
  );
}

void main() {
  testWidgets('auth choice screen renders primary actions', (tester) async {
    // Use a taller surface to prevent overflow
    await tester.binding.setSurfaceSize(const Size(400, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          analyticsClientProvider.overrideWithValue(
            const NullAnalyticsClient(),
          ),
        ],
        child: const MaterialApp(home: AuthChoiceScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Welcome to Lythaus'), findsOneWidget);
    expect(find.text('Continue as guest'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(find.text('Security Debug'), findsOneWidget);
  });

  testWidgets('continue as guest logs analytics and signs out', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final analytics = _FakeAnalyticsClient();
    final notifier = _MockAuthStateNotifier();
    when(() => notifier.signOut()).thenAnswer((_) async {});

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          analyticsClientProvider.overrideWithValue(analytics),
          authStateProvider.overrideWith((ref) => notifier),
        ],
        child: const MaterialApp(home: AuthChoiceScreen()),
      ),
    );

    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue as guest'));
    await tester.pump();

    verify(() => notifier.signOut()).called(1);
    expect(analytics.loggedEvents, contains(AnalyticsEvents.authCompleted));
  });

  testWidgets('sign in logs analytics and triggers auth notifier', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(400, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final analytics = _FakeAnalyticsClient();
    final notifier = _MockAuthStateNotifier();
    when(() => notifier.signInWithOAuth2()).thenAnswer((_) async {});

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          analyticsClientProvider.overrideWithValue(analytics),
          authStateProvider.overrideWith((ref) => notifier),
          deviceIntegrityGuardProvider.overrideWith(
            (ref) => _buildIntegrityGuard(),
          ),
          deviceSecurityStateProvider.overrideWith(
            (ref) => _FakeDeviceSecurityService().evaluateSecurity(),
          ),
        ],
        child: const MaterialApp(home: AuthChoiceScreen()),
      ),
    );

    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign in'));
    await tester.pump();

    verify(() => notifier.signInWithOAuth2()).called(1);
    expect(analytics.loggedEvents, contains(AnalyticsEvents.authStarted));
    expect(analytics.loggedEvents, contains(AnalyticsEvents.authCompleted));
  });
}
