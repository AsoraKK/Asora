import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for SubscriptionApi
void main() {
  final instance = AsoraApiClient().getSubscriptionApi();

  group(SubscriptionApi, () {
    // Get current user subscription status
    //
    //Future<JsonObject> subscriptionStatus() async
    test('test subscriptionStatus', () async {
      // TODO
    });
  });
}
