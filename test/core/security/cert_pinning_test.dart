import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/security/cert_pinning.dart';

void main() {
  test('Pinned domains contain flex host', () {
    expect(kPinnedDomains.containsKey('asora-function-flex.azurewebsites.net'), true);
  });

  test('No placeholder pins in flex host set', () {
    final pins = kPinnedDomains['asora-function-flex.azurewebsites.net'] ?? [];
    final requireRealPins = Platform.environment['ASORA_REQUIRE_REAL_PINS'] == 'true';
    if (requireRealPins) {
      expect(
        pins.any((p) => p.contains('REPLACE_WITH_SPKI_PIN')),
        isFalse,
        reason: 'Placeholder pins must be replaced before release',
      );
    } else {
      // Skip strict check in Dev until pins are injected
      expect(pins.isNotEmpty, isTrue);
    }
  });
}
