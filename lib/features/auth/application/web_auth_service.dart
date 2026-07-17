// ignore_for_file: public_member_api_docs

import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb, visibleForTesting;
import 'package:http/http.dart' as http;

import 'package:asora/core/auth/pkce_helper.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/application/web_token_storage.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/core/config/web_release_guard.dart';

/// Handles the OAuth2 authorization code flow on web using browser redirects
/// instead of flutter_appauth (which only works on mobile/desktop).
///
/// Flow:
/// 1. [startSignIn] builds PKCE challenge, persists code_verifier in
///    sessionStorage, and redirects the browser to the authorization endpoint.
/// 2. After the auth server authenticates the user, the browser is redirected back to
///    `/auth/callback?code=XXX&state=YYY`.
/// 3. [handleCallback] exchanges the authorization code for tokens via HTTP
///    POST, persists them in sessionStorage, and fetches the user profile.
class WebAuthService {
  WebAuthService({http.Client? httpClient, WebTokenStorage? storage})
    : _httpClient = httpClient ?? http.Client(),
      _storage = storage ?? WebTokenStorage();

  final http.Client _httpClient;
  final WebTokenStorage _storage;

  static const _codeVerifierKey = 'pkce_code_verifier';
  static const _stateKey = 'pkce_state';
  static const _nonceKey = 'oidc_nonce';
  static const _providerKey = 'auth_provider';
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _idTokenKey = 'id_token';
  static const _tokenExpiryKey = 'token_expiry';
  static const _userDataKey = 'user_data';

  /// Initiate the OAuth2 sign-in by redirecting the browser.
  /// This method does not return — the page navigates away.
  // VM coverage cannot invoke this browser redirect. Browser E2E covers it.
  // coverage:ignore-start browser-only redirect
  void startSignIn({OAuth2Provider provider = OAuth2Provider.google}) {
    assert(kIsWeb, 'WebAuthService.startSignIn must only be called on web');
    final authUrl = prepareAuthorizationRequest(provider: provider);
    webRedirectTo(authUrl.toString());
  }

  /// Builds and persists one browser authorization transaction.
  @visibleForTesting
  Uri prepareAuthorizationRequest({
    OAuth2Provider provider = OAuth2Provider.google,
  }) {
    _validateReleaseWebEndpoints();
    requireMvpAuthProvider(provider);

    final codeVerifier = PkceHelper.generateCodeVerifier();
    final codeChallenge = PkceHelper.generateCodeChallenge(codeVerifier);
    final state = PkceHelper.generateState();
    final nonce = PkceHelper.generateCodeVerifier();

    // Persist PKCE values in sessionStorage so they survive the redirect.
    _storage.write(_codeVerifierKey, codeVerifier);
    _storage.write(_stateKey, state);
    _storage.write(_nonceKey, nonce);
    _storage.write(_providerKey, provider.name);

    final additionalParams = <String, String>{};
    final idpHint = _idpHintForProvider(provider);
    if (idpHint.isNotEmpty) {
      additionalParams['idp'] = idpHint;
    }

    final queryParams = <String, String>{
      'response_type': 'code',
      'client_id': OAuth2Config.clientId,
      'redirect_uri': OAuth2Config.redirectUri,
      'scope': OAuth2Config.scopeString,
      'code_challenge': codeChallenge,
      'code_challenge_method': 'S256',
      'state': state,
      'nonce': nonce,
      ...additionalParams,
    };

    return Uri.parse(
      OAuth2Config.authorizationEndpoint,
    ).replace(queryParameters: queryParams);
  }
  // coverage:ignore-end browser-only redirect

  /// Handle the OAuth2 callback after the browser redirect.
  /// Exchanges the authorization code for tokens and returns the [User].
  Future<User> handleCallback(Uri callbackUri) async {
    _validateReleaseWebEndpoints();
    final queryParams = callbackUri.queryParameters;
    clearWebCallbackQuery();

    // Check for error response from IdP.
    if (queryParams.containsKey('error')) {
      _clearPkceState();
      throw AuthFailure.callbackInvalid();
    }

    final code = queryParams['code'];
    if (code == null || code.isEmpty) {
      _clearPkceState();
      throw AuthFailure.callbackInvalid();
    }

    // Validate state to prevent CSRF.
    final returnedState = queryParams['state'];
    final expectedState = _storage.read(_stateKey);
    if (returnedState == null || returnedState != expectedState) {
      _clearPkceState();
      throw AuthFailure.callbackInvalid();
    }

    final codeVerifier = _storage.read(_codeVerifierKey);
    if (codeVerifier == null || codeVerifier.isEmpty) {
      _clearPkceState();
      throw AuthFailure.callbackInvalid();
    }

    // Exchange code for tokens. A failed exchange is terminal for this
    // browser transaction, so clear the single-use PKCE state before rethrowing.
    late final Map<String, dynamic> tokenResponse;
    try {
      tokenResponse = await _exchangeCodeForTokens(
        code,
        codeVerifier,
        returnedState,
      );
    } catch (_) {
      _clearPkceState();
      rethrow;
    }
    _clearPkceState();

    final accessToken = tokenResponse['access_token'] as String?;
    if (accessToken == null || accessToken.isEmpty) {
      throw AuthFailure.callbackInvalid();
    }

    // Persist tokens in sessionStorage.
    _storage.write(_accessTokenKey, accessToken);

    final refreshToken = tokenResponse['refresh_token'] as String?;
    if (refreshToken != null && refreshToken.isNotEmpty) {
      _storage.write(_refreshTokenKey, refreshToken);
    }

    final idToken = tokenResponse['id_token'] as String?;
    if (idToken != null && idToken.isNotEmpty) {
      _storage.write(_idTokenKey, idToken);
    }

    final expiresIn = tokenResponse['expires_in'];
    if (expiresIn != null) {
      final expiry = DateTime.now().add(
        Duration(
          seconds: expiresIn is int ? expiresIn : int.parse('$expiresIn'),
        ),
      );
      _storage.write(_tokenExpiryKey, expiry.toIso8601String());
    }

    // Fetch user profile.
    final user = await _fetchUser(accessToken);
    if (user == null) {
      throw AuthFailure.serverError(
        'Failed to load user profile after sign-in',
      );
    }

    _storage.write(_userDataKey, jsonEncode(user.toJson()));
    return user;
  }

  /// Returns the stored access token, or null if not signed in.
  String? getAccessToken() => _storage.read(_accessTokenKey);

  /// Store a token pair issued by the email/password endpoint in the same
  /// session-scoped store used by the OAuth callback.
  void storeDirectSession({
    required String accessToken,
    required String refreshToken,
    required int expiresIn,
    required User user,
  }) {
    _storage.write(_accessTokenKey, accessToken);
    _storage.write(_refreshTokenKey, refreshToken);
    _storage.write(
      _tokenExpiryKey,
      DateTime.now().add(Duration(seconds: expiresIn)).toIso8601String(),
    );
    _storage.write(_userDataKey, jsonEncode(user.toJson()));
  }

  /// Returns the stored user, or null.
  User? getStoredUser() {
    final json = _storage.read(_userDataKey);
    if (json == null) return null;
    try {
      return User.fromJson(jsonDecode(json) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Whether the user has a non-expired access token.
  bool isSignedIn() {
    final token = _storage.read(_accessTokenKey);
    if (token == null) return false;

    final expiryStr = _storage.read(_tokenExpiryKey);
    if (expiryStr == null) return true; // no expiry info, assume valid

    try {
      final expiry = DateTime.parse(expiryStr);
      return DateTime.now().isBefore(
        expiry.subtract(const Duration(seconds: 30)),
      );
    } catch (_) {
      return false;
    }
  }

  /// Revoke the server session and always clear browser authentication state.
  Future<void> signOut() async {
    final accessToken = _storage.read(_accessTokenKey);
    try {
      if (accessToken != null && accessToken.isNotEmpty) {
        await _httpClient.post(
          _sessionRevokeUri(),
          headers: {
            'Authorization': 'Bearer $accessToken',
            'Content-Type': 'application/json',
          },
        );
      }
    } catch (_) {
      // Logout remains best-effort, but browser state is always cleared.
    } finally {
      _storage.clearAll();
    }
  }

  /// Rotate the stored refresh token through the Lythaus token endpoint.
  Future<User?> refreshSession() async {
    final refreshToken = _storage.read(_refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) return null;

    try {
      final response = await _httpClient.post(
        Uri.parse(OAuth2Config.tokenEndpoint),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: {
          'grant_type': 'refresh_token',
          'refresh_token': refreshToken,
          'client_id': OAuth2Config.clientId,
        },
      );
      if (response.statusCode != 200) return null;

      final tokenResponse = _decodeResponseMap(response.body);
      final accessToken = tokenResponse['access_token'] as String?;
      final rotatedRefreshToken = tokenResponse['refresh_token'] as String?;
      if (accessToken == null ||
          accessToken.isEmpty ||
          rotatedRefreshToken == null ||
          rotatedRefreshToken.isEmpty ||
          rotatedRefreshToken == refreshToken) {
        return null;
      }

      final expiresIn = tokenResponse['expires_in'];
      final seconds = expiresIn is int ? expiresIn : int.tryParse('$expiresIn');
      if (seconds == null) return null;
      _storage.write(_accessTokenKey, accessToken);
      _storage.write(_refreshTokenKey, rotatedRefreshToken);
      _storage.write(
        _tokenExpiryKey,
        DateTime.now().add(Duration(seconds: seconds)).toIso8601String(),
      );

      final user = await _fetchUser(accessToken);
      if (user == null) return null;
      _storage.write(_userDataKey, jsonEncode(user.toJson()));
      return user;
    } catch (_) {
      return null;
    }
  }

  // ── Private helpers ──

  Future<Map<String, dynamic>> _exchangeCodeForTokens(
    String code,
    String codeVerifier,
    String state,
  ) async {
    final response = await _httpClient.post(
      Uri.parse(OAuth2Config.tokenEndpoint),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': OAuth2Config.redirectUri,
        'client_id': OAuth2Config.clientId,
        'code_verifier': codeVerifier,
        'state': state,
      },
    );

    if (response.statusCode != 200) {
      throw AuthFailure.callbackInvalid();
    }

    return _decodeResponseMap(response.body);
  }

  Future<User?> _fetchUser(String accessToken) async {
    try {
      final response = await _httpClient.get(
        Uri.parse(OAuth2Config.userInfoEndpoint),
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode != 200) return null;

      final body = _decodeResponseMap(response.body);
      Map<String, dynamic>? data;
      data = (body['user'] is Map<String, dynamic>)
          ? body['user'] as Map<String, dynamic>
          : body;
      if (data.isEmpty) return null;
      return User.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _decodeResponseMap(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Expected a JSON object');
    }
    final data = decoded['data'];
    return data is Map<String, dynamic> ? data : decoded;
  }

  Uri _sessionRevokeUri() {
    final tokenUri = Uri.parse(OAuth2Config.tokenEndpoint);
    const suffix = '/auth/token';
    if (!tokenUri.path.endsWith(suffix)) {
      throw const FormatException('Unexpected token endpoint path');
    }
    return tokenUri.replace(
      path:
          '${tokenUri.path.substring(0, tokenUri.path.length - suffix.length)}/auth/sessions/revoke',
      query: null,
      fragment: null,
    );
  }

  void _clearPkceState() {
    _storage.delete(_codeVerifierKey);
    _storage.delete(_stateKey);
    _storage.delete(_nonceKey);
    _storage.delete(_providerKey);
  }

  void _validateReleaseWebEndpoints() {
    if (!isReleaseWebBuild) return;
    requirePublicHttpsOrigin(
      'OAUTH2_AUTHORIZATION_ENDPOINT',
      OAuth2Config.authorizationEndpoint,
    );
    requirePublicHttpsOrigin(
      'OAUTH2_TOKEN_ENDPOINT',
      OAuth2Config.tokenEndpoint,
    );
    requirePublicHttpsOrigin(
      'OAUTH2_USERINFO_ENDPOINT',
      OAuth2Config.userInfoEndpoint,
    );
  }

  // Called exclusively by the browser redirect flow above.
  // coverage:ignore-start browser-only provider hint
  String _idpHintForProvider(OAuth2Provider provider) {
    switch (provider) {
      case OAuth2Provider.google:
        return OAuth2Config.googleIdpHint;
      case OAuth2Provider.apple:
        throw AuthFailure.providerUnavailable();
      case OAuth2Provider.world:
        throw AuthFailure.providerUnavailable();
      case OAuth2Provider.email:
        return '';
    }
  }

  // coverage:ignore-end browser-only provider hint
}
