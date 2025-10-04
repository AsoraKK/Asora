import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/auth_service.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthService extends Mock implements AuthService {}

class _MockOAuth2Service extends Mock implements OAuth2Service {}

void main() {
  late ProviderContainer container;
  late _MockAuthService authService;
  late _MockOAuth2Service oauth2Service;

  setUp(() {
    authService = _MockAuthService();
    oauth2Service = _MockOAuth2Service();
    when(() => oauth2Service.getAccessToken()).thenAnswer((_) async => null);
    container = ProviderContainer(
      overrides: [
        enhancedAuthServiceProvider.overrideWithValue(authService),
        oauth2ServiceProvider.overrideWithValue(oauth2Service),
      ],
    );
  });

  tearDown(() {
    container.dispose();
  });

  test('jwtProvider caches token until invalidated', () async {
    when(() => authService.getJwtToken()).thenAnswer((_) async => 'token-1');

    final first = await container.read(jwtProvider.future);
    expect(first, 'token-1');

    final second = await container.read(jwtProvider.future);
    expect(second, 'token-1');

    verify(() => authService.getJwtToken()).called(1);
  });

  test('jwtProvider refetches when tokenVersion increments', () async {
    when(() => authService.getJwtToken()).thenAnswer((_) async => 'token-1');

    final first = await container.read(jwtProvider.future);
    expect(first, 'token-1');

    when(() => authService.getJwtToken()).thenAnswer((_) async => 'token-2');

    container.read(tokenVersionProvider.notifier).state++;

    final second = await container.read(jwtProvider.future);
    expect(second, 'token-2');
    verify(() => authService.getJwtToken()).called(2);
  });
}
