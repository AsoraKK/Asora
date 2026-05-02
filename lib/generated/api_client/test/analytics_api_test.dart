import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for AnalyticsApi
void main() {
  final instance = AsoraApiClient().getAnalyticsApi();

  group(AnalyticsApi, () {
    // Ingest client-side analytics events
    //
    //Future<JsonObject> analyticsEventsCreate(JsonObject body) async
    test('test analyticsEventsCreate', () async {
      // TODO
    });
  });
}
