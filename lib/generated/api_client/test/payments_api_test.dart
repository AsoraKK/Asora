import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for PaymentsApi
void main() {
  final instance = AsoraApiClient().getPaymentsApi();

  group(PaymentsApi, () {
    // Handle payment provider webhook
    //
    //Future<JsonObject> paymentsWebhook(JsonObject body) async
    test('test paymentsWebhook', () async {
      // TODO
    });
  });
}
