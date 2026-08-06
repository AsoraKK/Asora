import 'package:test/test.dart';
import 'package:lythaus_api_client/lythaus_api_client.dart';


/// tests for AuthApi
void main() {
  final instance = LythausApiClient().getAuthApi();

  group(AuthApi, () {
    // OAuth2 authorization endpoint
    //
    // Initiates the OAuth 2.0 Authorization Code flow. On success, issues a 302 redirect to the `redirect_uri` with an authorization `code` and the `state` parameter echoed back.
    //
    //Future<String> authAuthorize(String responseType, String clientId, String redirectUri, { String state, String codeChallenge, String codeChallengeMethod, String scope }) async
    test('test authAuthorize', () async {
      // TODO
    });

    // Sign in with a verified email identity
    //
    // Legacy email/password login contract retained for compatibility during the Cloudflare-native migration. New clients should use the native authentication flow.
    //
    //Future<OAuthTokenResponse> authEmailLogin(EmailLoginRequest emailLoginRequest) async
    test('test authEmailLogin', () async {
      // TODO
    });

    // Validate an invite code
    //
    // Validates an invite code without revealing status details.
    //
    //Future<InviteValidationResponse> authInviteValidate({ String code }) async
    test('test authInviteValidate', () async {
      // TODO
    });

    // Verify authentication token is valid
    //
    //Future<JsonObject> authPing() async
    test('test authPing', () async {
      // TODO
    });

    // Redeem an invite code to activate account
    //
    // Allows an authenticated but inactive user to redeem a valid invite code. On success the user is activated and a fresh token pair is returned.
    //
    //Future<RedeemInviteResponse> authRedeemInvite(RedeemInviteRequest redeemInviteRequest) async
    test('test authRedeemInvite', () async {
      // TODO
    });

    // Rotate a refresh token
    //
    //Future<JsonObject> authRefresh(JsonObject body) async
    test('test authRefresh', () async {
      // TODO
    });

    // Revoke an active session
    //
    //Future<JsonObject> authSessionsRevoke(JsonObject body) async
    test('test authSessionsRevoke', () async {
      // TODO
    });

    // Issue OAuth2 tokens
    //
    // Exchange an authorization code or refresh token for an access token and refresh token. Implements OAuth 2.0 Authorization Code with PKCE (RFC 7636) and Refresh Token grants.
    //
    //Future<OAuthTokenResponse> authToken(AuthTokenRequest authTokenRequest) async
    test('test authToken', () async {
      // TODO
    });

    // OIDC UserInfo endpoint
    //
    // Returns claims about the authenticated user per OpenID Connect Core 1.0.
    //
    //Future<UserInfoResponse> authUserInfo() async
    test('test authUserInfo', () async {
      // TODO
    });

    // OIDC UserInfo endpoint (POST)
    //
    // POST variant of the UserInfo endpoint for clients that cannot use query strings.
    //
    //Future<UserInfoResponse> authUserInfoPost() async
    test('test authUserInfoPost', () async {
      // TODO
    });

  });
}
