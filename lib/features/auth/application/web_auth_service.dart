// ignore_for_file: public_member_api_docs

import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/application/web_token_storage.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';

/// Handles the OAuth2 authorization code flow on web using browser redirects
/// instead of flutter_appauth (which only works on mobile/desktop).
///
/// Flow:
/// 1. [startSignIn] builds PKCE challenge, persists code_verifier in
///    sessionStorage, and redirects the browser to the authorization endpoint.
/// 2. After B2C authenticates the user, the browser is redirected back to
///    `/auth/callback?code=XXX&state=YYY`.
/// 3. [handleCallback] exchanges the authorization code for tokens via HTTP
///    POST, persists them in sessionStorage, and fetches the user profile.
class WebAuthService {
  WebAuthService({http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;
  final WebTokenStorage _storage = WebTokenStorage();

  static const _codeVerifierKey = 'pkce_code_verifier';
  static const _stateKey = 'pkce_state';
  static const _providerKey = 'auth_provider';
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _idTokenKey = 'id_token';
  static const _tokenExpiryKey = 'token_expiry';
  static const _userDataKey = 'user_data';

  /// Initiate the OAuth2 sign-in by redirecting the browser.
  /// This method does not return — the page navigates away.
  void startSignIn({OAuth2Provider provider = OAuth2Provider.google}) {
    assert(kIsWeb, 'WebAuthService.startSignIn must only be called on web');

    final codeVerifier = _generateCodeVerifier();
    final codeChallenge = _generateCodeChallenge(codeVerifier);
    final state = _generateState();

    // Persist PKCE values in sessionStorage so they survive the redirect.
    _storage.write(_codeVerifierKey, codeVerifier);
    _storage.write(_stateKey, state);
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
      ...additionalParams,
    };

    final authUrl = Uri.parse(
      OAuth2Config.authorizationEndpoint,
    ).replace(queryParameters: queryParams);

    webRedirectTo(authUrl.toString());
  }

  /// Handle the OAuth2 callback after the browser redirect.
  /// Exchanges the authorization code for tokens and returns the [User].
  Future<User> handleCallback(Uri callbackUri) async {
    final queryParams = callbackUri.queryParameters;

    // Check for error response from IdP.
    if (queryParams.containsKey('error')) {
      final errorDesc =
          queryParams['error_description'] ?? queryParams['error'] ?? '';
      _clearPkceState();
      throw AuthFailure.serverError('OAuth2 error: $errorDesc');
    }

    final code = queryParams['code'];
    if (code == null || code.isEmpty) {
      _clearPkceState();
      throw AuthFailure.serverError('Missing authorization code');
    }

    // Validate state to prevent CSRF.
    final returnedState = queryParams['state'];
    final expectedState = _storage.read(_stateKey);
    if (returnedState == null || returnedState != expectedState) {
      _clearPkceState();
      throw AuthFailure.serverError('OAuth2 state mismatch — possible CSRF');
    }

    final codeVerifier = _storage.read(_codeVerifierKey);
    if (codeVerifier == null || codeVerifier.isEmpty) {
      _clearPkceState();
      throw AuthFailure.serverError(
        'Missing PKCE code_verifier — session may have expired',
      );
    }

    // Exchange code for tokens.
    final tokenResponse = await _exchangeCodeForTokens(code, codeVerifier);
    _clearPkceState();

    final accessToken = tokenResponse['access_token'] as String?;
    if (accessToken == null || accessToken.isEmpty) {
      throw AuthFailure.serverError('Token exchange returned no access token');
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

  /// Clear all auth state (sign out).
  void signOut() {
    _storage.clearAll();
  }

  // ── Private helpers ──

  Future<Map<String, dynamic>> _exchangeCodeForTokens(
    String code,
    String codeVerifier,
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
      },
    );

    if (response.statusCode != 200) {
      throw AuthFailure.serverError(
        'Token exchange failed (${response.statusCode}): ${response.body}',
      );
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
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

      final body = jsonDecode(response.body);
      Map<String, dynamic>? data;
      if (body is Map<String, dynamic>) {
        data = (body['user'] is Map<String, dynamic>)
            ? body['user'] as Map<String, dynamic>
            : body;
      }
      if (data == null || data.isEmpty) return null;
      return User.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  void _clearPkceState() {
    _storage.delete(_codeVerifierKey);
    _storage.delete(_stateKey);
    _storage.delete(_providerKey);
  }

  String _idpHintForProvider(OAuth2Provider provider) {
    switch (provider) {
      case OAuth2Provider.google:
        return OAuth2Config.googleIdpHint;
      case OAuth2Provider.apple:
        return OAuth2Config.appleIdpHint;
      case OAuth2Provider.world:
        return OAuth2Config.worldIdpHint;
      case OAuth2Provider.email:
        return '';
    }
  }

  static String _generateCodeVerifier() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }

  static String _generateCodeChallenge(String verifier) {
    final bytes = utf8.encode(verifier);
    final digest = sha256.convert(bytes);
    return base64UrlEncode(digest.bytes).replaceAll('=', '');
  }

  static String _generateState() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }
}
