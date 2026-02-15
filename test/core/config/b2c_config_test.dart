// ignore_for_file: public_member_api_docs
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/core/config/b2c_config.dart';

void main() {
  group('kB2CConfig structure', () {
    test('contains required auth keys', () {
      expect(kB2CConfig, contains('tenant'));
      expect(kB2CConfig, contains('clientId'));
      expect(kB2CConfig, contains('policy'));
      expect(kB2CConfig, contains('authorityHost'));
      expect(kB2CConfig, contains('scopes'));
      expect(kB2CConfig, contains('redirectUris'));
      expect(kB2CConfig, contains('knownAuthorities'));
      expect(kB2CConfig, contains('googleIdpHint'));
    });

    test('tenant points to B2C tenant', () {
      expect(kB2CConfig['tenant'], isA<String>());
      expect(kB2CConfig['tenant'] as String, contains('onmicrosoft.com'));
    });

    test('clientId is a valid GUID string', () {
      final clientId = kB2CConfig['clientId'] as String;
      expect(clientId, matches(RegExp(r'^[a-f0-9\-]{36}$')));
    });

    test('policy starts with B2C_', () {
      final policy = kB2CConfig['policy'] as String;
      expect(policy, startsWith('B2C_'));
    });

    test('scopes contains required OIDC scopes', () {
      final scopes = kB2CConfig['scopes'] as List;
      expect(scopes, contains('openid'));
      expect(scopes, contains('offline_access'));
    });

    test('redirectUris contains android and ios', () {
      final redirectUris = kB2CConfig['redirectUris'] as Map;
      expect(redirectUris, contains('android'));
      expect(redirectUris, contains('ios'));
    });

    test('knownAuthorities is non-empty', () {
      final authorities = kB2CConfig['knownAuthorities'] as List;
      expect(authorities, isNotEmpty);
      expect(authorities.first, isA<String>());
    });

    test('googleIdpHint is Google', () {
      expect(kB2CConfig['googleIdpHint'], 'Google');
    });
  });
}
