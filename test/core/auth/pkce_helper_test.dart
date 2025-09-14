import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/auth/pkce_helper.dart';

void main() {
  group('PkceHelper', () {
    group('generateCodeVerifier', () {
      test('generates verifier with default length 43', () {
        final verifier = PkceHelper.generateCodeVerifier();
        expect(verifier.length, equals(43));
      });

      test('generates verifier with custom length', () {
        final verifier = PkceHelper.generateCodeVerifier(length: 64);
        expect(verifier.length, equals(64));
      });

      test('throws error for length below 43', () {
        expect(
          () => PkceHelper.generateCodeVerifier(length: 42),
          throwsA(isA<ArgumentError>()),
        );
      });

      test('throws error for length above 128', () {
        expect(
          () => PkceHelper.generateCodeVerifier(length: 129),
          throwsA(isA<ArgumentError>()),
        );
      });

      test('generates URL-safe characters only', () {
        final verifier = PkceHelper.generateCodeVerifier();
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(verifier), isTrue);
      });

      test('generates different verifiers on each call', () {
        final verifier1 = PkceHelper.generateCodeVerifier();
        final verifier2 = PkceHelper.generateCodeVerifier();
        expect(verifier1, isNot(equals(verifier2)));
      });

      test('handles edge case lengths correctly', () {
        final verifier43 = PkceHelper.generateCodeVerifier(length: 43);
        final verifier128 = PkceHelper.generateCodeVerifier(length: 128);
        
        expect(verifier43.length, equals(43));
        expect(verifier128.length, equals(128));
      });

      test('handles length requiring padding', () {
        final verifier = PkceHelper.generateCodeVerifier(length: 50);
        expect(verifier.length, equals(50));
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(verifier), isTrue);
      });

      test('handles minimum length 43', () {
        final verifier = PkceHelper.generateCodeVerifier(length: 43);
        expect(verifier.length, equals(43));
      });

      test('handles maximum length 128', () {
        final verifier = PkceHelper.generateCodeVerifier(length: 128);
        expect(verifier.length, equals(128));
      });

      test('handles length requiring exact bytes calculation', () {
        final verifier = PkceHelper.generateCodeVerifier(length: 64);
        expect(verifier.length, equals(64));
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(verifier), isTrue);
      });
    });

    group('generateCodeChallenge', () {
      test('generates challenge from verifier', () {
        const verifier = 'test-verifier-1234567890123456789012345678901234567890';
        final challenge = PkceHelper.generateCodeChallenge(verifier);
        
        expect(challenge.isNotEmpty, isTrue);
        expect(challenge.length, equals(43)); // Base64URL without padding
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(challenge), isTrue);
      });

      test('generates consistent challenge for same verifier', () {
        const verifier = 'consistent-verifier-1234567890123456789012345678901234';
        final challenge1 = PkceHelper.generateCodeChallenge(verifier);
        final challenge2 = PkceHelper.generateCodeChallenge(verifier);
        
        expect(challenge1, equals(challenge2));
      });

      test('generates different challenges for different verifiers', () {
        const verifier1 = 'verifier-one-1234567890123456789012345678901234567';
        const verifier2 = 'verifier-two-1234567890123456789012345678901234567';
        
        final challenge1 = PkceHelper.generateCodeChallenge(verifier1);
        final challenge2 = PkceHelper.generateCodeChallenge(verifier2);
        
        expect(challenge1, isNot(equals(challenge2)));
      });

      test('handles empty verifier gracefully', () {
        final challenge = PkceHelper.generateCodeChallenge('');
        expect(challenge.isNotEmpty, isTrue);
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(challenge), isTrue);
      });

      test('handles very short verifier', () {
        final challenge = PkceHelper.generateCodeChallenge('a');
        expect(challenge.isNotEmpty, isTrue);
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(challenge), isTrue);
      });
    });

    group('generatePkcePair', () {
      test('generates matching verifier and challenge pair', () {
        final pair = PkceHelper.generatePkcePair();
        
        expect(pair.containsKey('verifier'), isTrue);
        expect(pair.containsKey('challenge'), isTrue);
        expect(pair['verifier'], isNotNull);
        expect(pair['challenge'], isNotNull);
        
        final verifier = pair['verifier']!;
        final challenge = pair['challenge']!;
        
        // Verify challenge matches verifier
        final expectedChallenge = PkceHelper.generateCodeChallenge(verifier);
        expect(challenge, equals(expectedChallenge));
      });

      test('generates different pairs on each call', () {
        final pair1 = PkceHelper.generatePkcePair();
        final pair2 = PkceHelper.generatePkcePair();
        
        expect(pair1['verifier'], isNot(equals(pair2['verifier'])));
        expect(pair1['challenge'], isNot(equals(pair2['challenge'])));
      });
    });

    group('validateCodeChallenge', () {
      test('validates correct challenge against verifier', () {
        const verifier = 'test-verifier-1234567890123456789012345678901234567890';
        final challenge = PkceHelper.generateCodeChallenge(verifier);
        
        expect(PkceHelper.validateCodeChallenge(verifier, challenge), isTrue);
      });

      test('rejects incorrect challenge', () {
        const verifier = 'test-verifier-1234567890123456789012345678901234567890';
        const wrongChallenge = 'wrong-challenge-123456789012345678901234567890';
        
        expect(PkceHelper.validateCodeChallenge(verifier, wrongChallenge), isFalse);
      });

      test('validates with generated pair', () {
        final pair = PkceHelper.generatePkcePair();
        final verifier = pair['verifier']!;
        final challenge = pair['challenge']!;
        
        expect(PkceHelper.validateCodeChallenge(verifier, challenge), isTrue);
      });
    });

    group('generateState', () {
      test('generates state parameter', () {
        final state = PkceHelper.generateState();
        
        expect(state.isNotEmpty, isTrue);
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(state), isTrue);
      });

      test('generates different states on each call', () {
        final state1 = PkceHelper.generateState();
        final state2 = PkceHelper.generateState();
        
        expect(state1, isNot(equals(state2)));
      });

      test('generates URL-safe characters only', () {
        final state = PkceHelper.generateState();
        expect(RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(state), isTrue);
      });

      test('generates reasonable length state', () {
        final state = PkceHelper.generateState();
        // Should be at least 16 characters for security
        expect(state.length, greaterThanOrEqualTo(16));
      });
    });
  });
}