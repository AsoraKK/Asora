import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';


/// tests for SubscriptionApi
void main() {
  final instance = AsoraApiClient().getSubscriptionApi();

  group(SubscriptionApi, () {
    // Get current user subscription status
    //
    // Return the authenticated user's subscription tier and alpha entitlements, including custom feed count, News Board access, posting restriction, and reputation reward limits.
    //
    //Future<SubscriptionStatus> subscriptionStatus() async
    test('test subscriptionStatus', () async {
      // TODO
    });

  });
}
