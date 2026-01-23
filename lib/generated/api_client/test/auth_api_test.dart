import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';


/// tests for AuthApi
void main() {
  final instance = AsoraApiClient().getAuthApi();

  group(AuthApi, () {
    // Validate an invite code
    //
    // Validates an invite code without revealing status details.
    //
    //Future<InviteValidationResponse> authInviteValidate({ String code }) async
    test('test authInviteValidate', () async {
      // TODO
    });

  });
}
