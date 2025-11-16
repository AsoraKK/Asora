import 'package:flutter_test/flutter_test.dart';

import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_consent.dart';
import 'package:asora/core/analytics/consent_aware_analytics_client.dart';

/// Simple mock analytics client for testing
class MockAnalyticsClient implements AnalyticsClient {
  final List<LoggedEvent> loggedEvents = [];
  final List<String?> userIds = [];
  final List<Map<String, Object?>> userProperties = [];
  int resetCount = 0;

  @override
  Future<void> logEvent(String name, {Map<String, Object?>? properties}) async {
    loggedEvents.add(LoggedEvent(name, properties));
  }

  @override
  Future<void> setUserId(String? userId) async {
    userIds.add(userId);
  }

  @override
  Future<void> setUserProperties(Map<String, Object?> properties) async {
    userProperties.add(properties);
  }

  @override
  Future<void> reset() async {
    resetCount++;
  }
}

class LoggedEvent {
  LoggedEvent(this.name, this.properties);
  final String name;
  final Map<String, Object?>? properties;
}

void main() {
  group('ConsentAwareAnalyticsClient', () {
    group('When consent is enabled', () {
      test('logEvent forwards to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.onboarding,
          ),
        );

        await client.logEvent('test_event', properties: {'key': 'value'});

        expect(mockClient.loggedEvents, hasLength(1));
        expect(mockClient.loggedEvents.first.name, 'test_event');
        expect(mockClient.loggedEvents.first.properties, {'key': 'value'});
      });

      test('setUserId forwards to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.onboarding,
          ),
        );

        await client.setUserId('user123');

        expect(mockClient.userIds, ['user123']);
      });

      test('setUserProperties forwards to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.onboarding,
          ),
        );

        await client.setUserProperties({'plan': 'premium'});

        expect(mockClient.userProperties, hasLength(1));
        expect(mockClient.userProperties.first, {'plan': 'premium'});
      });

      test('reset forwards to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.onboarding,
          ),
        );

        await client.reset();

        expect(mockClient.resetCount, 1);
      });
    });

    group('When consent is disabled', () {
      test('logEvent does not forward to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.unknown,
          ),
        );

        await client.logEvent('test_event');

        expect(mockClient.loggedEvents, isEmpty);
      });

      test('setUserId does not forward to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.unknown,
          ),
        );

        await client.setUserId('user123');

        expect(mockClient.userIds, isEmpty);
      });

      test('setUserProperties does not forward to inner client', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.unknown,
          ),
        );

        await client.setUserProperties({'plan': 'premium'});

        expect(mockClient.userProperties, isEmpty);
      });

      test('reset does not forward to inner client when disabled', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.unknown,
          ),
        );

        await client.reset();

        expect(mockClient.resetCount, 0);
      });
    });

    group('Consent state transitions', () {
      test('updateConsent enables tracking', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.unknown,
          ),
        );

        // Initially disabled
        await client.logEvent('before');
        expect(mockClient.loggedEvents, isEmpty);

        // Enable consent
        client.updateConsent(
          AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.privacySettings,
          ),
        );

        // Now enabled
        await client.logEvent('after');
        expect(mockClient.loggedEvents, hasLength(1));
        expect(mockClient.loggedEvents.first.name, 'after');
      });

      test('updateConsent disables tracking', () async {
        final mockClient = MockAnalyticsClient();
        final client = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.onboarding,
          ),
        );

        // Initially enabled
        await client.logEvent('before');
        expect(mockClient.loggedEvents, hasLength(1));

        // Disable consent
        client.updateConsent(
          AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.privacySettings,
          ),
        );

        // Now disabled
        await client.logEvent('after');
        expect(mockClient.loggedEvents, hasLength(1)); // Still only 1 event
      });
    });

    group('State queries', () {
      test('isEnabled returns correct state', () {
        final mockClient = MockAnalyticsClient();

        final enabledClient = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: true,
            updatedAt: DateTime.now(),
            source: ConsentSource.onboarding,
          ),
        );
        expect(enabledClient.isEnabled, isTrue);

        final disabledClient = ConsentAwareAnalyticsClient(
          innerClient: mockClient,
          consent: AnalyticsConsent(
            enabled: false,
            updatedAt: DateTime.now(),
            source: ConsentSource.unknown,
          ),
        );
        expect(disabledClient.isEnabled, isFalse);
      });
    });
  });
}
