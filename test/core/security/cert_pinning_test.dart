import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/security/cert_pinning.dart';

void main() {
  test('Pinned domains contain flex host', () {
    expect(kPinnedDomains.containsKey('asora-function-flex.azurewebsites.net'), true);
  });

  test('No placeholder pins in flex host set', () {
    final pins = kPinnedDomains['asora-function-flex.azurewebsites.net'] ?? [];
    for (final p in pins) {
      expect(p.contains('REPLACE_WITH_SPKI_PIN'), false);
    }
  });
}

