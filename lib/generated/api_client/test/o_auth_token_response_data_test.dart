import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

// tests for OAuthTokenResponseData
void main() {
  final instance = OAuthTokenResponseDataBuilder();
  // TODO add properties to the builder and call build()

  group(OAuthTokenResponseData, () {
    // Short-lived JWT bearer token (15 min)
    // String accessToken
    test('to test the property `accessToken`', () async {
      // TODO
    });

    // Long-lived opaque refresh token (7 days)
    // String refreshToken
    test('to test the property `refreshToken`', () async {
      // TODO
    });

    // String tokenType
    test('to test the property `tokenType`', () async {
      // TODO
    });

    // Access token lifetime in seconds
    // int expiresIn
    test('to test the property `expiresIn`', () async {
      // TODO
    });
  });
}
