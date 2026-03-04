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

  test('refreshToken returns null when no refresh token stored', () async {
    when(
      () => secureStorage.read(key: 'oauth2_refresh_token'),
    ).thenAnswer((_) async => null);

    final result = await service.refreshToken();

    expect(result, isNull);
    verifyNever(() => appAuth.token(any()));
  });

  test('refreshToken returns null when refresh token is empty', () async {
    when(
      () => secureStorage.read(key: 'oauth2_refresh_token'),
    ).thenAnswer((_) async => '');

    final result = await service.refreshToken();

    expect(result, isNull);
    verifyNever(() => appAuth.token(any()));
  });

  test('getUserInfo returns cached user when available', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => jsonEncode(userPayload));

    final user = await service.getUserInfo();

    expect(user, isA<User>());
    expect(user?.id, equals('user-123'));
    verifyNever(() => secureStorage.read(key: 'oauth2_access_token'));
  });

  test('getUserInfo fetches from network when cache empty', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => null);
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).thenAnswer((_) async => http.Response(jsonEncode(userPayload), 200));

    final user = await service.getUserInfo();

    expect(user, isA<User>());
    verify(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).called(1);
  });

  test('getUserInfo returns null when no token available', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => null);
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => null);

    final user = await service.getUserInfo();

    expect(user, isNull);
  });

  test('getStoredUser handles malformed JSON', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => '{invalid-json}');

    final user = await service.getStoredUser();

    expect(user, isNull);
    verify(() => secureStorage.delete(key: 'oauth2_user_data')).called(1);
  });

  test('isSignedIn returns true when token valid', () async {
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');

    final result = await service.isSignedIn();

    expect(result, isTrue);
  });

  test('isSignedIn returns false when token expired', () async {
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');

    final result = await service.isSignedIn();

    expect(result, isFalse);
  });

  test('isSignedIn returns false when no expiry stored', () async {
    when(
      () => secureStorage.read(key: 'oauth2_token_expiry'),
    ).thenAnswer((_) async => null);

    final result = await service.isSignedIn();

    expect(result, isFalse);
  });

  test('isSignedIn handles invalid expiry format', () async {
    when(
      () => secureStorage.read(key: 'oauth2_token_expiry'),
    ).thenAnswer((_) async => 'invalid-date');
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');

    final result = await service.isSignedIn();

    expect(result, isFalse);
    verify(() => secureStorage.delete(key: 'oauth2_token_expiry')).called(1);
  });

  test('getAccessToken refreshes when token expired', () async {
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'new-token');
    when(
      () => secureStorage.read(key: 'oauth2_refresh_token'),
    ).thenAnswer((_) async => 'refresh-token');

    final refreshedResponse = TokenResponse(
      'new-token',
      'new-refresh',
      DateTime.now().add(const Duration(hours: 1)),
      'new-id-token',
      'Bearer',
      const ['openid'],
      const {},
    );

    when(() => appAuth.token(any())).thenAnswer((_) async => refreshedResponse);
    when(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).thenAnswer((_) async => http.Response(jsonEncode(userPayload), 200));

    final token = await service.getAccessToken();

    expect(token, equals('new-token'));
    verify(() => appAuth.token(any())).called(1);
  });

  test('getAccessToken returns null when refresh fails', () async {
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'old-token');
    when(
      () => secureStorage.read(key: 'oauth2_refresh_token'),
    ).thenAnswer((_) async => null);

    final token = await service.getAccessToken();

    expect(token, isNull);
  });

  test('signOut performs end session request when configured', () async {
    when(
      () => secureStorage.read(key: 'oauth2_id_token'),
    ).thenAnswer((_) async => 'id-token');
    when(
      () => appAuth.endSession(any()),
    ).thenAnswer((_) async => EndSessionResponse(null));

    await service.signOut();

    verify(() => appAuth.endSession(any())).called(1);
    verify(() => secureStorage.delete(key: 'oauth2_access_token')).called(1);
    verify(() => secureStorage.delete(key: 'oauth2_refresh_token')).called(1);
    verify(() => secureStorage.delete(key: 'oauth2_id_token')).called(1);
  });

  test('signOut clears tokens even when end session fails', () async {
    when(
      () => secureStorage.read(key: 'oauth2_id_token'),
    ).thenAnswer((_) async => 'id-token');
    when(
      () => appAuth.endSession(any()),
    ).thenThrow(Exception('End session failed'));

    await service.signOut();

    verify(() => secureStorage.delete(key: 'oauth2_access_token')).called(1);
    verify(() => secureStorage.delete(key: 'oauth2_refresh_token')).called(1);
  });

  test('signOut skips end session when no id token', () async {
    when(
      () => secureStorage.read(key: 'oauth2_id_token'),
    ).thenAnswer((_) async => null);

    await service.signOut();

    verifyNever(() => appAuth.endSession(any()));
    verify(() => secureStorage.delete(key: 'oauth2_access_token')).called(1);
  });

  test('_fetchAndCacheUser handles response with nested user object', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => null);
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).thenAnswer(
      (_) async => http.Response(jsonEncode({'user': userPayload}), 200),
    );

    final user = await service.getUserInfo();

    expect(user, isA<User>());
    expect(user?.id, equals('user-123'));
  });

  test('_fetchAndCacheUser returns null on network error', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => null);
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).thenAnswer((_) async => http.Response('Error', 500));

    final user = await service.getUserInfo();

    expect(user, isNull);
  });

  test('_fetchAndCacheUser returns null on empty response', () async {
    when(
      () => secureStorage.read(key: 'oauth2_user_data'),
    ).thenAnswer((_) async => null);
    when(
      () => secureStorage.read(key: 'oauth2_access_token'),
    ).thenAnswer((_) async => 'access-token');
    when(() => secureStorage.read(key: 'oauth2_token_expiry')).thenAnswer(
      (_) async =>
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
    );
    when(
      () => httpClient.get(any(), headers: any(named: 'headers')),
    ).thenAnswer((_) async => http.Response(jsonEncode({}), 200));

    final user = await service.getUserInfo();

    expect(user, isNull);
  });
}
