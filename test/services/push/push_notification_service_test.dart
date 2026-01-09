import 'package:asora/services/push/push_notification_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Fake implementation for testing basic interface contracts
class FakePushNotificationService extends Fake
    implements PushNotificationService {
  @override
  String? get currentToken => null;

  @override
  String get platform => 'fcm';

  @override
  Stream<Map<String, dynamic>> get onNotificationTapped => const Stream.empty();

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();

  @override
  Future<void> initialize() async {}

  @override
  Future<void> subscribeToTopic(String topic) async {}

  @override
  Future<void> unsubscribeFromTopic(String topic) async {}

  @override
  void dispose() {}
}

void main() {
  group('PushNotificationService', () {
    late FakePushNotificationService service;

    setUp(() {
      service = FakePushNotificationService();
    });

    test('currentToken returns null initially', () {
      expect(service.currentToken, isNull);
    });

    test('platform returns expected identifier', () {
      expect(service.platform, equals('fcm'));
    });

    test('onNotificationTapped returns a valid stream', () {
      expect(service.onNotificationTapped, isNotNull);
    });

    test('onTokenRefresh returns a valid stream', () {
      expect(service.onTokenRefresh, isNotNull);
    });

    test('dispose completes without error', () async {
      expect(() => service.dispose(), returnsNormally);
    });

    test('initialize completes without error', () async {
      await expectLater(service.initialize(), completes);
    });

    test('subscribeToTopic completes without error', () async {
      await expectLater(service.subscribeToTopic('test_topic'), completes);
    });

    test('unsubscribeFromTopic completes without error', () async {
      await expectLater(service.unsubscribeFromTopic('test_topic'), completes);
    });
  });
}
