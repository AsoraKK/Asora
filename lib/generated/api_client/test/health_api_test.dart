import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

/// tests for HealthApi
void main() {
  final instance = AsoraApiClient().getHealthApi();

  group(HealthApi, () {
    // Service health probe
    //
    // Liveness/readiness check. No auth.
    //
    //Future<GetHealth200Response> getHealth() async
    test('test getHealth', () async {
      // TODO
    });
  });
}
