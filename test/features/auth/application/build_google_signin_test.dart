// test/features/auth/application/build_google_signin_test.dart
import 'package:flutter/foundation.dart'
    show debugDefaultTargetPlatformOverride, TargetPlatform;
import 'package:flutter_test/flutter_test.dart';

import 'package:asora/features/auth/application/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('_buildGoogleSignIn', () {
    tearDown(() {
      debugDefaultTargetPlatformOverride = null;
    });

    test('builds Android configuration', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;

      final signIn = buildGoogleSignInForTest();

      expect(signIn.clientId, 'android-client-id-not-set');
      expect(signIn.serverClientId, 'web-client-id-not-set');
      expect(signIn.scopes, containsAll(['email', 'profile', 'openid']));
    });

    test('builds desktop configuration', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.linux;

      final signIn = buildGoogleSignInForTest();

      expect(signIn.clientId, 'desktop-client-id-not-set');
      expect(signIn.serverClientId, 'web-client-id-not-set');
      expect(signIn.scopes, containsAll(['email', 'profile', 'openid']));
    });

    test('throws UnsupportedError for unsupported platform', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

      expect(() => buildGoogleSignInForTest(), throwsUnsupportedError);
    });
  });
}
