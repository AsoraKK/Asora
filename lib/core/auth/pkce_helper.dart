import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';

/// Helper class for generating PKCE (Proof Key for Code Exchange) parameters
/// Used in OAuth2 authorization code flow with PKCE extension
class PkceHelper {
  /// Generate a cryptographically secure code verifier
  /// Returns a URL-safe base64 encoded random string of 43-128 characters
  /// [length] - Optional length parameter (defaults to 43 if not specified)
  static String generateCodeVerifier({int? length}) {
    final targetLength = length ?? 43;

    // Ensure length is within valid range for PKCE (43-128 characters)
    if (targetLength < 43 || targetLength > 128) {
      throw ArgumentError(
        'Code verifier length must be between 43 and 128 characters',
      );
    }

    final random = Random.secure();
    // Calculate how many bytes we need to generate the target length
    final bytesNeeded = ((targetLength * 3) / 4).ceil();
    final bytes = List<int>.generate(bytesNeeded, (_) => random.nextInt(256));
    final encoded = base64Url.encode(bytes).replaceAll('=', '');

    // Trim or pad to exact length if needed
    if (encoded.length > targetLength) {
      return encoded.substring(0, targetLength);
    } else if (encoded.length < targetLength) {
      // Pad with additional secure random characters if needed
      final additionalBytes = List<int>.generate(
        targetLength - encoded.length,
        (_) => random.nextInt(256),
      );
      final additional = base64Url.encode(additionalBytes).replaceAll('=', '');
      return (encoded + additional).substring(0, targetLength);
    }

    return encoded;
  }

  /// Generate a code challenge from a code verifier using SHA256
  /// Returns a URL-safe base64 encoded SHA256 hash of the code verifier
  static String generateCodeChallenge(String codeVerifier) {
    final bytes = utf8.encode(codeVerifier);
    final digest = sha256.convert(bytes);
    return base64Url.encode(digest.bytes).replaceAll('=', '');
  }

  /// Generate both code verifier and challenge as a pair
  /// Returns a map with 'verifier' and 'challenge' keys
  static Map<String, String> generatePkcePair() {
    final verifier = generateCodeVerifier();
    final challenge = generateCodeChallenge(verifier);
    return {'verifier': verifier, 'challenge': challenge};
  }

  /// Validate that a code challenge matches a code verifier
  /// Returns true if the challenge is the correct SHA256 hash of the verifier
  static bool validateCodeChallenge(String codeVerifier, String codeChallenge) {
    final expectedChallenge = generateCodeChallenge(codeVerifier);
    return expectedChallenge == codeChallenge;
  }

  /// Generate a random state parameter for OAuth2 requests
  /// Returns a URL-safe base64 encoded random string for CSRF protection
  static String generateState() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return base64Url.encode(bytes).replaceAll('=', '');
  }
}
