// ignore_for_file: public_member_api_docs

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:dio/dio.dart';
import 'package:opentelemetry/api.dart';

/// Authentication configuration loaded from backend or environment
@immutable
class AuthConfig {
  final String tenant;
  final String? tenantId; // Optional: prefer tenantId for CIAM URLs
  final String clientId;
  final String policy;
  final String authorityHost;
  final List<String> scopes;
  final Map<String, String> redirectUris;
  final List<String> knownAuthorities;
  final String? googleIdpHint;

  const AuthConfig({
    required this.tenant,
    this.tenantId,
    required this.clientId,
    required this.policy,
    required this.authorityHost,
    required this.scopes,
    required this.redirectUris,
    required this.knownAuthorities,
    this.googleIdpHint,
  });

  factory AuthConfig.fromJson(Map<String, dynamic> json) {
    return AuthConfig(
      tenant: json['tenant'] as String,
      tenantId: json['tenantId'] as String?,
      clientId: json['clientId'] as String,
      policy: json['policy'] as String,
      authorityHost: json['authorityHost'] as String,
      scopes: (json['scopes'] as List<dynamic>).cast<String>(),
      redirectUris: Map<String, String>.from(json['redirectUris'] as Map),
      knownAuthorities: (json['knownAuthorities'] as List<dynamic>)
          .cast<String>(),
      googleIdpHint: json['googleIdpHint'] as String?,
    );
  }

  /// Build endpoints. Prefer CIAM tenantId path when available; fallback to tenant name
  String get _tenantPath =>
      (tenantId != null && tenantId!.isNotEmpty) ? tenantId! : tenant;

  /// Policy-specific discovery URL (recommended for B2C/CIAM)
  String get discoveryUrl =>
      'https://$authorityHost/$_tenantPath/v2.0/.well-known/openid-configuration?p=$policy';

  /// Token issuer (not policy-bound; for reference/logging only)
  String get issuer => 'https://$authorityHost/$_tenantPath/v2.0';
  String get authorizationEndpoint =>
      'https://$authorityHost/$_tenantPath/oauth2/v2.0/authorize';
  String get tokenEndpoint =>
      'https://$authorityHost/$_tenantPath/oauth2/v2.0/token';
  String get endSessionEndpoint =>
      'https://$authorityHost/$_tenantPath/oauth2/v2.0/logout';

  /// Get platform-appropriate redirect URI
  String get redirectUri {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return redirectUris['android'] ?? _fallbackRedirectUri;
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      return redirectUris['ios'] ?? _fallbackRedirectUri;
    }
    return _fallbackRedirectUri;
  }

  String get _fallbackRedirectUri => 'msal$clientId://auth'; // Fallback pattern

  /// Create from dart-define environment variables
  factory AuthConfig.fromEnvironment() {
    return AuthConfig(
      tenant: const String.fromEnvironment(
        'AD_B2C_TENANT',
        defaultValue: 'asoraauthlife.onmicrosoft.com',
      ),
      tenantId:
          const String.fromEnvironment(
            'AD_B2C_TENANT_ID',
            defaultValue: '',
          ).isEmpty
          ? null
          : const String.fromEnvironment('AD_B2C_TENANT_ID'),
      clientId: const String.fromEnvironment(
        'AD_B2C_CLIENT_ID',
        defaultValue: 'c07bb257-aaf0-4179-be95-fce516f92e8c',
      ),
      policy: const String.fromEnvironment(
        'AD_B2C_SIGNIN_POLICY',
        defaultValue: 'B2C_1_signupsignin',
      ),
      authorityHost: const String.fromEnvironment(
        'AD_B2C_AUTHORITY_HOST',
        defaultValue: 'asoraauthlife.ciamlogin.com',
      ),
      scopes: const String.fromEnvironment(
        'AD_B2C_SCOPES',
        defaultValue: 'openid offline_access email profile',
      ).split(' '),
      redirectUris: const {
        'android': String.fromEnvironment(
          'AD_B2C_REDIRECT_URI_ANDROID',
          defaultValue: 'com.asora.app://oauth/callback',
        ),
        'ios': String.fromEnvironment(
          'AD_B2C_REDIRECT_URI_IOS',
          defaultValue: 'msalc07bb257-aaf0-4179-be95-fce516f92e8c://auth',
        ),
      },
      knownAuthorities: const String.fromEnvironment(
        'AD_B2C_KNOWN_AUTHORITIES',
        defaultValue: 'asoraauthlife.ciamlogin.com',
      ).split(','),
      googleIdpHint: const String.fromEnvironment(
        'AD_B2C_GOOGLE_IDP_HINT',
        defaultValue: 'Google',
      ),
    );
  }
}

/// Authentication result from sign-in
class AuthResult {
  final String accessToken;
  final String? refreshToken;
  final String? idToken;
  final DateTime expiresOn;
  final String? accountId;

  const AuthResult({
    required this.accessToken,
    this.refreshToken,
    this.idToken,
    required this.expiresOn,
    this.accountId,
  });

  bool get isExpired => DateTime.now().isAfter(expiresOn);
}

/// Authentication state for UI
enum AuthState { unauthenticated, authenticating, authenticated, error }

/// Domain auth errors
enum AuthError {
  cancelled,
  network,
  policyNotFound,
  accountUnavailable,
  transient,
  unknown,
}

class AuthException implements Exception {
  final AuthError error;
  final String message;
  final Object? originalError;

  const AuthException(this.error, this.message, [this.originalError]);

  @override
  String toString() => 'AuthException: $message (${error.name})';
}

/// OAuth2 service using MSAL for Azure AD B2C/CIAM with PKCE
class OAuth2Service {
  final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  final String? _configEndpoint;
  final Tracer _tracer;
  final FlutterAppAuth _appAuth = const FlutterAppAuth();

  AuthConfig? _config;
  final StreamController<AuthState> _authStateController =
      StreamController<AuthState>.broadcast();

  AuthState _currentState = AuthState.unauthenticated;

  OAuth2Service({
    required Dio dio,
    required FlutterSecureStorage secureStorage,
    String? configEndpoint,
    Tracer? tracer,
  }) : _dio = dio,
       _secureStorage = secureStorage,
       _configEndpoint = configEndpoint,
       _tracer = tracer ?? globalTracerProvider.getTracer('oauth2_service');

  /// Get current auth state stream
  Stream<AuthState> get authState => _authStateController.stream;

  /// Get current auth state value
  AuthState get currentState => _currentState;

  @visibleForTesting
  void updateState(AuthState newState) {
    _currentState = newState;
    _authStateController.add(newState);
  }

  /// Initialize the service (load config and setup MSAL)
  Future<void> initialize() async {
    final span = _tracer.startSpan('auth.initialize');
    try {
      _config = await _loadConfig();

      // Check if we have a cached account
      final cachedToken = await _secureStorage.read(key: 'access_token');
      if (cachedToken != null) {
        // Validate token is not expired
        final expiresOn = await _secureStorage.read(key: 'expires_on');
        if (expiresOn != null) {
          final expiry = DateTime.parse(expiresOn);
          if (DateTime.now().isBefore(expiry)) {
            updateState(AuthState.authenticated);
          }
        }
      }
    } catch (e, stackTrace) {
      span.recordException(e, stackTrace: stackTrace);
      debugPrint('OAuth2Service initialization error: $e');
    } finally {
      span.end();
    }
  }

  /// Load config from server or fallback to environment
  Future<AuthConfig> _loadConfig() async {
    final span = _tracer.startSpan('auth.config.fetch');
    try {
      if (_configEndpoint != null) {
        final response = await _dio.get<Map<String, dynamic>>(_configEndpoint);
        if (response.statusCode == 200) {
          return AuthConfig.fromJson(response.data as Map<String, dynamic>);
        }
      }
    } catch (e, stackTrace) {
      span.recordException(e, stackTrace: stackTrace);
      debugPrint('Failed to load config from server: $e, using fallback');
    } finally {
      span.end();
    }

    // Fallback to environment variables
    return AuthConfig.fromEnvironment();
  }

  /// Sign in with Email (standard B2C flow)
  Future<AuthResult> signInEmail() async {
    final span = _tracer.startSpan('auth.login.start');

    try {
      updateState(AuthState.authenticating);

      if (_config == null) {
        throw const AuthException(AuthError.unknown, 'Config not loaded');
      }

      final result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          _config!.clientId,
          _config!.redirectUri,
          // Use policy-specific discovery for CIAM/B2C
          discoveryUrl: _config!.discoveryUrl,
          scopes: _config!.scopes,
          // Always include policy
          additionalParameters: {'p': _config!.policy},
        ),
      );

      final authResult = _mapAppAuthResult(result);
      await cacheToken(authResult);

      updateState(AuthState.authenticated);

      return authResult;
    } on PlatformException catch (e) {
      span.recordException(e);
      updateState(AuthState.error);
      throw mapAppAuthException(e);
    } catch (e, stackTrace) {
      span.recordException(e, stackTrace: stackTrace);
      updateState(AuthState.error);
      rethrow;
    } finally {
      span.end();
    }
  }

  /// Sign in with Google (B2C flow with IdP hint)
  Future<AuthResult> signInGoogle() async {
    final span = _tracer.startSpan('auth.login.start');

    try {
      updateState(AuthState.authenticating);

      if (_config == null) {
        throw const AuthException(AuthError.unknown, 'Config not loaded');
      }

      // Build extra query params for Google IdP hint
      final additionalParams = <String, String>{
        // Always include policy
        'p': _config!.policy,
      };
      if (_config!.googleIdpHint != null) {
        additionalParams['idp'] = _config!.googleIdpHint!;
        additionalParams['prompt'] = 'login'; // Force re-auth for IdP
      }

      final result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          _config!.clientId,
          _config!.redirectUri,
          discoveryUrl: _config!.discoveryUrl,
          scopes: _config!.scopes,
          additionalParameters: additionalParams,
        ),
      );

      final authResult = _mapAppAuthResult(result);
      await cacheToken(authResult);

      updateState(AuthState.authenticated);

      return authResult;
    } on PlatformException catch (e) {
      span.recordException(e);
      updateState(AuthState.error);
      throw mapAppAuthException(e);
    } catch (e, stackTrace) {
      span.recordException(e, stackTrace: stackTrace);
      updateState(AuthState.error);
      rethrow;
    } finally {
      span.end();
    }
  }

  /// Get access token (from cache or refresh)
  Future<String?> getAccessToken({bool forceRefresh = false}) async {
    try {
      if (!forceRefresh) {
        // Try to get from cache
        final cachedToken = await _secureStorage.read(key: 'access_token');
        final expiresOn = await _secureStorage.read(key: 'expires_on');

        if (cachedToken != null && expiresOn != null) {
          final expiry = DateTime.parse(expiresOn);
          if (DateTime.now().add(const Duration(minutes: 5)).isBefore(expiry)) {
            // Token valid for at least 5 more minutes
            return cachedToken;
          }
        }
      }

      // Try silent refresh
      if (_config == null) {
        return null;
      }

      final refreshToken = await _secureStorage.read(key: 'refresh_token');
      if (refreshToken == null) {
        updateState(AuthState.unauthenticated);
        return null;
      }

      final result = await _appAuth.token(
        TokenRequest(
          _config!.clientId,
          _config!.redirectUri,
          discoveryUrl: _config!.discoveryUrl,
          refreshToken: refreshToken,
          scopes: _config!.scopes,
          additionalParameters: {'p': _config!.policy},
        ),
      );

      final authResult = _mapTokenResult(result);
      await cacheToken(authResult);
      return authResult.accessToken;
    } catch (e) {
      debugPrint('Failed to get access token: $e');
      return null;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    final span = _tracer.startSpan('auth.logout');
    try {
      // Clear secure storage
      await _secureStorage.delete(key: 'access_token');
      await _secureStorage.delete(key: 'refresh_token');
      await _secureStorage.delete(key: 'id_token');
      await _secureStorage.delete(key: 'expires_on');
      await _secureStorage.delete(key: 'account_id');

      updateState(AuthState.unauthenticated);
    } catch (e, stackTrace) {
      span.recordException(e, stackTrace: stackTrace);
      debugPrint('Sign out error: $e');
    } finally {
      span.end();
    }
  }

  /// Map AppAuth authorization result to domain AuthResult
  AuthResult _mapAppAuthResult(AuthorizationTokenResponse result) {
    return AuthResult(
      accessToken: result.accessToken!,
      refreshToken: result.refreshToken,
      idToken: result.idToken,
      expiresOn:
          result.accessTokenExpirationDateTime ??
          DateTime.now().add(const Duration(hours: 1)),
      accountId: null, // Extract from ID token if needed
    );
  }

  /// Map AppAuth token refresh result to domain AuthResult
  AuthResult _mapTokenResult(TokenResponse result) {
    return AuthResult(
      accessToken: result.accessToken!,
      refreshToken: result.refreshToken,
      idToken: result.idToken,
      expiresOn:
          result.accessTokenExpirationDateTime ??
          DateTime.now().add(const Duration(hours: 1)),
      accountId: null,
    );
  }

  /// Cache token in secure storage
  @visibleForTesting
  Future<void> cacheToken(AuthResult result) async {
    await _secureStorage.write(key: 'access_token', value: result.accessToken);
    if (result.idToken != null) {
      await _secureStorage.write(key: 'id_token', value: result.idToken);
    }
    await _secureStorage.write(
      key: 'expires_on',
      value: result.expiresOn.toIso8601String(),
    );
    if (result.accountId != null) {
      await _secureStorage.write(key: 'account_id', value: result.accountId);
    }
  }

  /// Map AppAuth exception to domain AuthException
  @visibleForTesting
  AuthException mapAppAuthException(PlatformException e) {
    final code = e.code.toLowerCase();
    final msg = e.message?.toLowerCase() ?? '';

    if (code.contains('user_cancel') || msg.contains('cancel')) {
      return AuthException(AuthError.cancelled, 'User cancelled', e);
    } else if (code.contains('network') || msg.contains('network')) {
      return AuthException(AuthError.network, 'Network error', e);
    } else if (msg.contains('policy') || msg.contains('aadb2c')) {
      return AuthException(AuthError.policyNotFound, 'B2C policy error', e);
    } else if (code.contains('no_account')) {
      return AuthException(AuthError.accountUnavailable, 'No account', e);
    }
    return AuthException(AuthError.unknown, e.message ?? 'Auth error', e);
  }

  void dispose() {
    _authStateController.close();
  }
}
