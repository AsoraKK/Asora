import 'package:test/test.dart';
import 'package:asora_api_client/asora_api_client.dart';

// tests for AuthTokenRequest
void main() {
  final instance = AuthTokenRequestBuilder();
  // TODO add properties to the builder and call build()

  group(AuthTokenRequest, () {
    // Grant type
    // String grantType
    test('to test the property `grantType`', () async {
      // TODO
    });

    // Registered client identifier
    // String clientId
    test('to test the property `clientId`', () async {
      // TODO
    });

    // Authorization code (required for authorization_code grant)
    // String code
    test('to test the property `code`', () async {
      // TODO
    });

    // Must match the redirect URI used during authorization
    // String redirectUri
    test('to test the property `redirectUri`', () async {
      // TODO
    });

    // PKCE code verifier (required when code_challenge was provided)
    // String codeVerifier
    test('to test the property `codeVerifier`', () async {
      // TODO
    });

    // Refresh token (required for refresh_token grant)
    // String refreshToken
    test('to test the property `refreshToken`', () async {
      // TODO
    });
  });
}
