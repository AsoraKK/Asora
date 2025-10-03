import 'dart:convert';

import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/domain/user.dart';

class _MockFlutterAppAuth extends Mock implements FlutterAppAuth {}

class _MockSecureStorage extends Mock implements FlutterSecureStorage {}

class _MockHttpClient extends Mock implements http.Client {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _MockFlutterAppAuth appAuth;
  late _MockSecureStorage secureStorage;
  late _MockHttpClient httpClient;
  late OAuth2Service service;

  final userPayload = <String, dynamic>{
    'id': 'user-123',
    'email': 'user@example.com',
    'role': 'user',
    'tier': 'bronze',
    'reputationScore': 0,
    'createdAt': DateTime.utc(2024, 1, 1).toIso8601String(),
    'lastLoginAt': DateTime.utc(2024, 1, 1, 1).toIso8601String(),
    'isTemporary': false,
  };

  setUpAll(() {
    registerFallbackValue(
      AuthorizationTokenRequest(
        'fallback-client',
        'com.example.app://oauth',
        serviceConfiguration: const AuthorizationServiceConfiguration(
          authorizationEndpoint: 'https://example.com/auth',
          tokenEndpoint: 'https://example.com/token',
        ),
        scopes: const ['openid'],
      ),
    );
    registerFallbackValue(
      TokenRequest(
        'fallback-client',
        'com.example.app://oauth',
        refreshToken: 'refresh-token',
        serviceConfiguration: const AuthorizationServiceConfiguration(
          authorizationEndpoint: 'https://example.com/auth',
          tokenEndpoint: 'https://example.com/token',
        ),
        scopes: const ['openid'],
      ),
    );
    registerFallbackValue(
      EndSessionRequest(
        idTokenHint: 'id-token',
        postLogoutRedirectUrl: 'com.example.app://oauth',
        serviceConfiguration: const AuthorizationServiceConfiguration(
          authorizationEndpoint: 'https://example.com/auth',
          tokenEndpoint: 'https://example.com/token',
        ),
      ),
    );
    registerFallbackValue(Uri.parse('https://example.com/userinfo'));
  });

  setUp(() {
    appAuth = _MockFlutterAppAuth();
    secureStorage = _MockSecureStorage();
    httpClient = _MockHttpClient();

    service = OAuth2Service(
      appAuth: appAuth,
      secureStorage: secureStorage,
      httpClient: httpClient,
    );

    when(
      () => secureStorage.write(
        key: any(named: 'key'),
        value: any(named: 'value'),
      ),
    ).thenAnswer((_) async {});
    when(
      () => secureStorage.delete(key: any(named: 'key')),
    ).thenAnswer((_) async {});
    when(
      () => secureStorage.read(key: any(named: 'key')),
    ).thenAnswer((_) async => null);
  });

  test('signInWithOAuth2 stores tokens and returns user data', () async {
    final tokenResponse = AuthorizationTokenResponse(
      'access-token',
      'refresh-token',
      DateTime.now().add(const Duration(hours: 1)),
      'id-token',
      'Bearer',
      const ['openid'],
      const {},
      const {},
    );

    when(
      () => appAuth.authorizeAndExchangeCode(any()),
    ).thenAnswer((_) async => tokenResponse);
    when(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).thenAnswer((_) async => http.Response(jsonEncode(userPayload), 200));

    final user = await service.signInWithOAuth2();

    expect(user, isA<User>());
    expect(user.id, equals('user-123'));

    verify(
      () => secureStorage.write(
        key: 'oauth2_access_token',
        value: 'access-token',
      ),
    ).called(1);
    verify(
      () => secureStorage.write(
        key: 'oauth2_refresh_token',
        value: 'refresh-token',
      ),
    ).called(1);
    verify(
      () => secureStorage.write(
        key: 'oauth2_user_data',
        value: jsonEncode(userPayload),
      ),
    ).called(1);
  });

  test(
    'refreshToken clears credentials when no access token returned',
    () async {
      when(
        () => secureStorage.read(key: 'oauth2_refresh_token'),
      ).thenAnswer((_) async => 'refresh-token');

      final failedResponse = TokenResponse(
        null,
        null,
        null,
        null,
        null,
        null,
        const {},
      );

      when(() => appAuth.token(any())).thenAnswer((_) async => failedResponse);

      final result = await service.refreshToken();

      expect(result, isNull);
      verify(() => secureStorage.delete(key: 'oauth2_access_token')).called(1);
      verify(() => secureStorage.delete(key: 'oauth2_refresh_token')).called(1);
      verify(() => secureStorage.delete(key: 'oauth2_id_token')).called(1);
      verify(() => secureStorage.delete(key: 'oauth2_token_expiry')).called(1);
      verify(() => secureStorage.delete(key: 'oauth2_user_data')).called(1);
    },
  );
}
