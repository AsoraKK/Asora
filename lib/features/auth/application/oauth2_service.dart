// ignore_for_file: public_member_api_docs

/// ASORA OAUTH2 SERVICE WITH FLUTTER APPAUTH
///
/// 🎯 Purpose: OAuth2 authorization and token management backed by AppAuth
/// 🏗️ Architecture: Thin wrapper around flutter_appauth + secure storage
/// 🔐 Security: Authorization Code + PKCE, secure token persistence, refresh
/// 📱 Platform: Mobile/Desktop (falls back gracefully on Web)
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:flutter/services.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart' show LaunchMode;

import 'package:asora/core/auth/auth_session_manager.dart';

import 'package:asora/features/auth/domain/auth_failure.dart';
import 'package:asora/features/auth/domain/user.dart';

/// Centralized configuration for Microsoft Entra / OAuth2 endpoints used by the
/// Flutter client. The defaults mirror our Azure Functions wrappers so the
/// mobile app can talk to staging environments without manual overrides.
class OAuth2Config {
  static const String authorizationEndpoint = String.fromEnvironment(
    'OAUTH2_AUTHORIZATION_ENDPOINT',
    defaultValue: 'https://asorafunctions.azurewebsites.net/api/auth/authorize',
  );

  static const String tokenEndpoint = String.fromEnvironment(
    'OAUTH2_TOKEN_ENDPOINT',
    defaultValue: 'https://asorafunctions.azurewebsites.net/api/auth/token',
  );

  static const String userInfoEndpoint = String.fromEnvironment(
    'OAUTH2_USERINFO_ENDPOINT',
    defaultValue: 'https://asorafunctions.azurewebsites.net/api/auth/userinfo',
  );

  static const String endSessionEndpoint = String.fromEnvironment(
    'OAUTH2_END_SESSION_ENDPOINT',
    defaultValue: '',
  );

  static const String clientId = String.fromEnvironment(
    'OAUTH2_CLIENT_ID',
    defaultValue: 'asora-mobile-app',
  );

  static const String discoveryUrl = String.fromEnvironment(
    'OAUTH2_DISCOVERY_URL',
    defaultValue: '',
  );

  static const String logoutRedirectUri = String.fromEnvironment(
    'OAUTH2_LOGOUT_REDIRECT_URI',
    defaultValue: '',
  );

  static const String scopeString = String.fromEnvironment(
    'OAUTH2_SCOPE',
    defaultValue: 'openid email profile offline_access',
  );

  static List<String> get scopes {
    return scopeString
        .split(RegExp(r'\s+'))
        .where((scope) => scope.isNotEmpty)
        .toList(growable: false);
  }

  // Backwards-compatible alias used by older tests.
  static String get scope => scopeString;

  static String get redirectUri {
    if (kIsWeb) {
      return '${Uri.base.origin}/auth/callback';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'com.asora.app://oauth/callback';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return 'asora://oauth/callback';
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        return 'http://localhost:8080/oauth/callback';
      default:
        return 'asora://oauth/callback';
    }
  }

  static AuthorizationServiceConfiguration get serviceConfiguration {
    return AuthorizationServiceConfiguration(
      authorizationEndpoint: authorizationEndpoint,
      tokenEndpoint: tokenEndpoint,
      endSessionEndpoint: endSessionEndpoint.isNotEmpty
          ? endSessionEndpoint
          : null,
    );
  }

  static String? get postLogoutRedirectUri {
    if (logoutRedirectUri.isNotEmpty) {
      return logoutRedirectUri;
    }
    return kIsWeb ? null : redirectUri;
  }
}

/// OAuth2 service backed by flutter_appauth.
typedef LauncherFn = Future<bool> Function(Uri uri, {LaunchMode mode});

class OAuth2Service {
  OAuth2Service({
    FlutterAppAuth? appAuth,
    FlutterSecureStorage? secureStorage,
    http.Client? httpClient,
    this.launcher,
    this.sessionManager,
    this.debugForceWeb = false,
  }) : _appAuth = appAuth ?? const FlutterAppAuth(),
       _secureStorage = secureStorage ?? const FlutterSecureStorage(),
       _httpClient = httpClient ?? http.Client();

  final FlutterAppAuth _appAuth;
  final FlutterSecureStorage _secureStorage;
  final http.Client _httpClient;

  // Optional test/debug hooks that older tests rely on.
  final LauncherFn? launcher;
  final AuthSessionManager? sessionManager;
  final bool debugForceWeb;

  Completer<String>? _debugCompleter;

  static const String _accessTokenKey = 'oauth2_access_token';
  static const String _refreshTokenKey = 'oauth2_refresh_token';
  static const String _idTokenKey = 'oauth2_id_token';
  static const String _tokenExpiryKey = 'oauth2_token_expiry';
  static const String _userDataKey = 'oauth2_user_data';

  /// Initiates the OAuth2 Authorization Code flow via AppAuth and returns the
  /// authenticated [User].
  Future<User> signInWithOAuth2() async {
    if (kIsWeb) {
      throw AuthFailure.platformError(
        'Microsoft Entra sign-in is not supported on web builds yet.',
      );
    }

    try {
      final response = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          OAuth2Config.clientId,
          OAuth2Config.redirectUri,
          scopes: OAuth2Config.scopes,
          promptValues: const ['login'],
          serviceConfiguration: OAuth2Config.discoveryUrl.isEmpty
              ? OAuth2Config.serviceConfiguration
              : null,
          discoveryUrl: OAuth2Config.discoveryUrl.isNotEmpty
              ? OAuth2Config.discoveryUrl
              : null,
        ),
      );

      if (response.accessToken == null) {
        throw AuthFailure.cancelledByUser();
      }

      await _persistTokenResponse(response);

      final user = await _fetchAndCacheUser(response.accessToken!);
      if (user == null) {
        throw AuthFailure.serverError('Failed to load user profile');
      }

      return user;
    } on AuthFailure {
      rethrow;
    } on PlatformException catch (error) {
      final message = error.message?.toLowerCase() ?? '';
      if (message.contains('cancelled') || message.contains('canceled')) {
        throw AuthFailure.cancelledByUser();
      }
      throw AuthFailure.platformError(
        'OAuth2 platform error: ${error.message ?? error.code}',
      );
    } catch (error) {
      throw AuthFailure.platformError(
        'OAuth2 sign-in failed: ${error.toString()}',
      );
    }
  }

  /// Refresh access token using the stored refresh token. Returns the refreshed
  /// [User] or `null` when refresh fails.
  Future<User?> refreshToken() async {
    if (kIsWeb) return null;

    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }

    try {
      final response = await _appAuth.token(
        TokenRequest(
          OAuth2Config.clientId,
          OAuth2Config.redirectUri,
          refreshToken: refreshToken,
          scopes: OAuth2Config.scopes,
          serviceConfiguration: OAuth2Config.discoveryUrl.isEmpty
              ? OAuth2Config.serviceConfiguration
              : null,
          discoveryUrl: OAuth2Config.discoveryUrl.isNotEmpty
              ? OAuth2Config.discoveryUrl
              : null,
        ),
      );

      if (response.accessToken == null) {
        await _clearStoredTokens();
        return null;
      }

      await _persistTokenResponse(response);
      return await _fetchAndCacheUser(response.accessToken!);
    } on PlatformException {
      await _clearStoredTokens();
      return null;
    } catch (_) {
      await _clearStoredTokens();
      return null;
    }
  }

  /// Returns the cached user or fetches it using the stored access token.
  Future<User?> getUserInfo() async {
    final cached = await getStoredUser();
    if (cached != null) {
      return cached;
    }

    final accessToken = await getAccessToken();
    if (accessToken == null) {
      return null;
    }

    return await _fetchAndCacheUser(accessToken);
  }

  /// Retrieves the cached [User] without hitting the network.
  Future<User?> getStoredUser() async {
    final userJson = await _secureStorage.read(key: _userDataKey);
    if (userJson == null) {
      return null;
    }

    try {
      final decoded = jsonDecode(userJson);
      if (decoded is Map<String, dynamic>) {
        return User.fromJson(decoded);
      }
    } catch (_) {}
    await _secureStorage.delete(key: _userDataKey);
    return null;
  }

  /// True when a non-expired access token is present.
  Future<bool> isSignedIn() async => _isTokenValid();

  /// Returns the access token, refreshing when necessary.
  Future<String?> getAccessToken() async {
    if (!await _isTokenValid()) {
      final refreshedUser = await refreshToken();
      if (refreshedUser == null) {
        return null;
      }
    }

    return await _secureStorage.read(key: _accessTokenKey);
  }

  /// Clears persisted tokens and performs a best-effort end session request.
  Future<void> signOut() async {
    // Perform end session request if id token is available
    final idToken = await _secureStorage.read(key: _idTokenKey);
    if (idToken != null && idToken.isNotEmpty) {
      try {
        await _appAuth.endSession(
          EndSessionRequest(
            idTokenHint: idToken,
            postLogoutRedirectUrl: OAuth2Config.postLogoutRedirectUri,
            serviceConfiguration: OAuth2Config.discoveryUrl.isEmpty
                ? OAuth2Config.serviceConfiguration
                : null,
          ),
        );
      } catch (_) {
        // best effort
      }
    }

    // Clear stored tokens
    await _clearStoredTokens();
  }

  Future<void> _persistTokenResponse(TokenResponse response) async {
    await _secureStorage.write(
      key: _accessTokenKey,
      value: response.accessToken,
    );

    if (response.refreshToken != null) {
      await _secureStorage.write(
        key: _refreshTokenKey,
        value: response.refreshToken,
      );
    }

    if (response.idToken != null) {
      await _secureStorage.write(key: _idTokenKey, value: response.idToken);
    }

    final expiresAt =
        response.accessTokenExpirationDateTime ??
        DateTime.now().add(const Duration(minutes: 5));
    await _secureStorage.write(
      key: _tokenExpiryKey,
      value: expiresAt.toIso8601String(),
    );
  }

  Future<User?> _fetchAndCacheUser(String accessToken) async {
    try {
      final response = await _httpClient.get(
        Uri.parse(OAuth2Config.userInfoEndpoint),
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Accept': 'application/json',
        },
      );

      if (response.statusCode != 200) {
        return null;
      }

      final body = jsonDecode(response.body);
      Map<String, dynamic>? data;
      if (body is Map<String, dynamic>) {
        if (body['user'] is Map<String, dynamic>) {
          data = body['user'] as Map<String, dynamic>;
        } else {
          data = body;
        }
      }

      if (data == null || data.isEmpty) {
        return null;
      }

      final user = User.fromJson(data);
      await _secureStorage.write(key: _userDataKey, value: jsonEncode(data));
      return user;
    } catch (_) {
      return null;
    }
  }

  Future<bool> _isTokenValid() async {
    final expiryIso = await _secureStorage.read(key: _tokenExpiryKey);
    final accessToken = await _secureStorage.read(key: _accessTokenKey);
    if (expiryIso == null || accessToken == null) {
      return false;
    }

    try {
      final expiry = DateTime.parse(expiryIso);
      // Refresh slightly before expiry to avoid race conditions.
      return DateTime.now().isBefore(
        expiry.subtract(const Duration(seconds: 30)),
      );
    } catch (_) {
      await _secureStorage.delete(key: _tokenExpiryKey);
      return false;
    }
  }

  Future<void> _clearStoredTokens() async {
    await Future.wait([
      _secureStorage.delete(key: _accessTokenKey),
      _secureStorage.delete(key: _refreshTokenKey),
      _secureStorage.delete(key: _idTokenKey),
      _secureStorage.delete(key: _tokenExpiryKey),
      _secureStorage.delete(key: _userDataKey),
    ]);
  }

  // -----------------
  // Debug / Test APIs
  // -----------------

  /// Build the raw authorization URL used by the AppAuth flow. This is
  /// intended for debug/testing only and mirrors how AppAuth would construct
  /// the authorization request when discovery isn't used.
  String debugBuildAuthorizationUrl({
    required String codeChallenge,
    required String state,
    required String nonce,
  }) {
    final params = {
      'response_type': 'code',
      'client_id': OAuth2Config.clientId,
      'redirect_uri': OAuth2Config.redirectUri,
      'scope': OAuth2Config.scope,
      'code_challenge': codeChallenge,
      'code_challenge_method': 'S256',
      'state': state,
      'nonce': nonce,
    };

    final uri = Uri.parse(
      OAuth2Config.authorizationEndpoint,
    ).replace(queryParameters: params);

    return uri.toString();
  }

  /// Start the authorization flow but return a future that completes when
  /// [debugHandleCallback] is invoked. Useful for unit tests that simulate
  /// deep link call-backs.
  Future<String> debugStartAndWaitForCode() {
    _debugCompleter = Completer<String>();

    // If we're forcing the web path for tests, simulate opening the href via
    // the optional launcher (or no-op) and rely on debugSetupCallbackListener
    // to read the href.
    if (debugForceWeb) {
      final href = getWebHref();
      if (href != null) {
        final uri = Uri.parse(href);
        launcher?.call(uri, mode: LaunchMode.platformDefault);
      }
    }

    return _debugCompleter!.future;
  }

  /// Handle a deep-link callback during tests by parsing the supplied [uri]
  /// and completing the internal completer with the code or throwing an
  /// [AuthFailure] on error.
  void debugHandleCallback(Uri uri) {
    final qp = uri.queryParameters;
    if (qp.containsKey('error')) {
      final desc = qp['error_description'] ?? qp['error'] ?? '';
      _debugCompleter?.completeError(AuthFailure.serverError(desc));
      return;
    }

    final code = qp['code'];
    if (code == null) {
      _debugCompleter?.completeError(AuthFailure.serverError('no_code'));
      return;
    }

    _debugCompleter?.complete(code);
  }

  /// For web tests, set up a listener that parses the current href and then
  /// completes the debug completer. Tests can override [getWebHref] to
  /// control the href returned.
  void debugSetupCallbackListener() {
    final href = getWebHref();
    if (href == null) return;
    final uri = Uri.parse(href);
    // Defer to next microtask to simulate listener timing.
    scheduleMicrotask(() => debugHandleCallback(uri));
  }

  /// Returns a debug web href for tests. Override in subclasses to provide a
  /// test-specific href. By default returns null.
  String? getWebHref() => null;
}
