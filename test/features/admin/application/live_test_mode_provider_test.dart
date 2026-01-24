import 'package:asora/features/admin/application/live_test_mode_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('LiveTestModeNotifier', () {
    test('starts disabled with session metadata', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final state = container.read(liveTestModeProvider);

      expect(state.isEnabled, isFalse);
      expect(state.sessionId, isNotEmpty);
      expect(state.markAsTestPosts, isTrue);
      expect(state.autoCleanup, isFalse);
      expect(state.getApiHeaders(), isEmpty);
    });

    test('toggle enables and disables live mode', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(liveTestModeProvider.notifier);

      notifier.toggle();
      final enabled = container.read(liveTestModeProvider);
      expect(enabled.isEnabled, isTrue);
      expect(enabled.sessionId, isNotEmpty);
      expect(enabled.getApiHeaders(), contains(TestModeHeaders.testMode));

      notifier.toggle();
      final disabled = container.read(liveTestModeProvider);
      expect(disabled.isEnabled, isFalse);
      expect(disabled.getApiHeaders(), isEmpty);
    });

    test('startNewSession updates session id', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(liveTestModeProvider.notifier);

      final initialSession = container.read(liveTestModeProvider).sessionId;
      await Future<void>.delayed(const Duration(milliseconds: 2));
      notifier.startNewSession();
      final nextSession = container.read(liveTestModeProvider).sessionId;

      expect(nextSession, isNot(initialSession));
    });

    test('testSessionIdProvider reflects enable state', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(liveTestModeProvider.notifier);

      expect(container.read(testSessionIdProvider), isNull);
      notifier.enable();
      expect(container.read(testSessionIdProvider), isNotNull);
      notifier.disable();
      expect(container.read(testSessionIdProvider), isNull);
    });
  });
}
