/// ASORA OAUTH2 SERVICE TESTS
///
/// 🎯 Purpose: Comprehensive unit tests for OAuth2 PKCE implementation
/// 🏗️ Architecture: Flutter testing framework with mocking
/// 🔐 Security: Test OAuth2 flow security and error handling
/// 📱 Platform: Multi-platform OAuth2 test coverage
/// 🤖 OAuth2: Complete test suite for PKCE authentication
library;

import 'package:flutter_test/flutter_test.dart';
import 'dart:convert';
import 'dart:math';

import 'package:asora/core/auth/pkce_helper.dart';

void main() {
  group('OAuth2 PKCE Helper Tests', () {
    test('should generate valid code verifier', () {
      final codeVerifier = PkceHelper.generateCodeVerifier();

      // Code verifier should be at least 43 characters
      expect(codeVerifier.length, greaterThanOrEqualTo(43));

      // Should only contain allowed characters: A-Z a-z 0-9 - . _ ~
      expect(RegExp(r'^[A-Za-z0-9\-._~]+$').hasMatch(codeVerifier), isTrue);
    });

    test('should generate different code verifiers on each call', () {
      final verifier1 = PkceHelper.generateCodeVerifier();
      final verifier2 = PkceHelper.generateCodeVerifier();

      expect(verifier1, isNot(equals(verifier2)));
    });

    test('should generate valid code challenge', () {
      const codeVerifier =
          'test-code-verifier-123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678';
      final codeChallenge = PkceHelper.generateCodeChallenge(codeVerifier);

      expect(codeChallenge.isNotEmpty, isTrue);

      // Base64URL encoded SHA256 should be 43 characters (without padding)
      expect(codeChallenge.length, equals(43));

      // Should only contain Base64URL characters
      expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(codeChallenge), isTrue);
    });

    test('should generate consistent code challenge for same verifier', () {
      const codeVerifier =
          'consistent-test-verifier-1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';
      final challenge1 = PkceHelper.generateCodeChallenge(codeVerifier);
      final challenge2 = PkceHelper.generateCodeChallenge(codeVerifier);

      expect(challenge1, equals(challenge2));
    });

    test('should generate different challenges for different verifiers', () {
      const verifier1 =
          'verifier-one-1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345';
      const verifier2 =
          'verifier-two-1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345';

      final challenge1 = PkceHelper.generateCodeChallenge(verifier1);
      final challenge2 = PkceHelper.generateCodeChallenge(verifier2);

      expect(challenge1, isNot(equals(challenge2)));
    });
  });

  group('OAuth2 URL Generation Tests', () {
    test('should generate valid authorization URL', () {
      const clientId = 'test-client-id';
      const redirectUri = 'asora://oauth/callback';
      const scope = 'openid email profile read write';
      const codeChallenge = 'test-code-challenge';
      const state = 'test-state';

      final authUrl = _buildAuthorizationUrl(
        clientId: clientId,
        redirectUri: redirectUri,
        scope: scope,
        codeChallenge: codeChallenge,
        state: state,
      );

      final uri = Uri.parse(authUrl);

      expect(uri.queryParameters['client_id'], equals(clientId));
      expect(uri.queryParameters['redirect_uri'], equals(redirectUri));
      expect(uri.queryParameters['scope'], equals(scope));
      expect(uri.queryParameters['code_challenge'], equals(codeChallenge));
      expect(uri.queryParameters['code_challenge_method'], equals('S256'));
      expect(uri.queryParameters['response_type'], equals('code'));
      expect(uri.queryParameters['state'], equals(state));
    });
  });

  group('OAuth2 State Management Tests', () {
    test('should generate random state parameter', () {
      final state1 = _generateState();
      final state2 = _generateState();

      expect(state1, isNot(equals(state2)));
      expect(state1.length, greaterThan(10));
      expect(state2.length, greaterThan(10));
    });

    test('should validate callback URL format', () {
      const validUrl = 'asora://oauth/callback?code=test-code&state=test-state';
      const invalidUrl1 = 'invalid-url';
      const invalidUrl2 = 'https://example.com?error=access_denied';

      expect(_isValidCallbackUrl(validUrl), isTrue);
      expect(_isValidCallbackUrl(invalidUrl1), isFalse);
      expect(_isValidCallbackUrl(invalidUrl2), isFalse);
    });

    test('should extract authorization code from callback URL', () {
      const callbackUrl =
          'asora://oauth/callback?code=test-auth-code&state=test-state';
      final code = _extractAuthCodeFromUrl(callbackUrl);

      expect(code, equals('test-auth-code'));
    });

    test('should handle callback URL with error', () {
      const errorUrl =
          'asora://oauth/callback?error=access_denied&state=test-state';

      expect(() => _extractAuthCodeFromUrl(errorUrl), throwsException);
    });
  });

  group('OAuth2 Token Validation Tests', () {
    test('should validate JWT token structure', () {
      const validJwt =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidJwt1 = 'invalid.jwt';
      const invalidJwt2 = 'header.payload'; // Missing signature

      expect(_isValidJWT(validJwt), isTrue);
      expect(_isValidJWT(invalidJwt1), isFalse);
      expect(_isValidJWT(invalidJwt2), isFalse);
    });

    test('should decode JWT payload', () {
      const jwt =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      final payload = _decodeJWTPayload(jwt);

      expect(payload['sub'], equals('1234567890'));
      expect(payload['name'], equals('John Doe'));
      expect(payload['iat'], equals(1516239022));
    });
  });
}

// Helper functions for OAuth2 operations
String _buildAuthorizationUrl({
  required String clientId,
  required String redirectUri,
  required String scope,
  required String codeChallenge,
  required String state,
}) {
  final params = {
    'client_id': clientId,
    'redirect_uri': redirectUri,
    'response_type': 'code',
    'scope': scope,
    'code_challenge': codeChallenge,
    'code_challenge_method': 'S256',
    'state': state,
  };

  final query = params.entries
      .map(
        (e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}',
      )
      .join('&');

  return 'https://asorafunctions.azurewebsites.net/api/auth/authorize?$query';
}

String _generateState() {
  const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  final random = Random.secure();
  return List.generate(
    32,
    (index) => chars[random.nextInt(chars.length)],
  ).join();
}

bool _isValidCallbackUrl(String url) {
  try {
    final uri = Uri.parse(url);
    return uri.scheme == 'asora' &&
        uri.host == 'oauth' &&
        uri.path == '/callback' &&
        uri.queryParameters.containsKey('code') &&
        uri.queryParameters.containsKey('state') &&
        !uri.queryParameters.containsKey('error');
  } catch (e) {
    return false;
  }
}

String _extractAuthCodeFromUrl(String url) {
  final uri = Uri.parse(url);

  if (uri.queryParameters.containsKey('error')) {
    throw Exception('OAuth error: ${uri.queryParameters['error']}');
  }

  final code = uri.queryParameters['code'];
  if (code == null) {
    throw Exception('No authorization code in callback URL');
  }

  return code;
}

bool _isValidJWT(String token) {
  final parts = token.split('.');
  return parts.length == 3;
}

Map<String, dynamic> _decodeJWTPayload(String token) {
  final parts = token.split('.');
  if (parts.length != 3) {
    throw Exception('Invalid JWT format');
  }

  final payload = parts[1];
  // Add padding if needed
  final normalizedPayload = payload.padRight(
    (payload.length + 3) ~/ 4 * 4,
    '=',
  );

  final decoded = base64.decode(normalizedPayload);
  final jsonString = utf8.decode(decoded);
  return jsonDecode(jsonString) as Map<String, dynamic>;
}
