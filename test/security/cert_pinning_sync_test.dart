import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/security/cert_pinning.dart';

void main() {
  test('kPinnedDomains matches mobile-expected-pins.json', () {
    final file = File('mobile-expected-pins.json');
    expect(
      file.existsSync(),
      isTrue,
      reason: 'mobile-expected-pins.json must exist at repo root',
    );

    final raw = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    final expected = raw.map(
      (key, value) =>
          MapEntry(key, (value as List).map((pin) => pin.toString()).toSet()),
    );

    final actual = kPinnedDomains.map(
      (key, value) => MapEntry(
        key,
        value.map((pin) {
          if (pin.startsWith('sha256/')) {
            return pin.substring('sha256/'.length);
          }
          return pin;
        }).toSet(),
      ),
    );

    expect(
      actual.keys.toSet(),
      equals(expected.keys.toSet()),
      reason: 'Pinned host list must match mobile-expected-pins.json',
    );

    for (final entry in expected.entries) {
      final actualPins = actual[entry.key] ?? <String>{};
      expect(
        actualPins,
        equals(entry.value),
        reason: 'Pins mismatch for host ${entry.key}',
      );
    }
  });
}
