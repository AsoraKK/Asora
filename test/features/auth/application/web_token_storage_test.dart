import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/auth/application/web_token_storage.dart';

void main() {
  group('WebTokenStorage (stub)', () {
    late WebTokenStorage storage;

    setUp(() {
      storage = WebTokenStorage();
    });

    test('read returns null', () {
      expect(storage.read('any_key'), isNull);
    });

    test('write does not throw', () {
      expect(() => storage.write('key', 'value'), returnsNormally);
    });

    test('delete does not throw', () {
      expect(() => storage.delete('key'), returnsNormally);
    });

    test('clearAll does not throw', () {
      expect(() => storage.clearAll(), returnsNormally);
    });
  });

  group('webRedirectTo (stub)', () {
    test('does not throw', () {
      expect(() => webRedirectTo('https://example.com'), returnsNormally);
    });
  });

  group('getWebLocationHref (stub)', () {
    test('returns empty string', () {
      expect(getWebLocationHref(), isEmpty);
    });
  });

  group('getWebOrigin (stub)', () {
    test('returns empty string', () {
      expect(getWebOrigin(), isEmpty);
    });
  });
}
