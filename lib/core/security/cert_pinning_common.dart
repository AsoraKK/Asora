// ignore_for_file: public_member_api_docs

library;

import 'package:flutter/foundation.dart';

/// Strict pinning is deliberately disabled for the shared MVP. Re-enable only
/// with a proven current-and-backup public-gateway pin lifecycle.
const bool kEnableCertPinning = bool.fromEnvironment(
  'ENABLE_CERT_PINNING',
  defaultValue: false,
);

/// No SPKI pins are shipped during the MVP pinning deviation.
const Map<String, List<String>> kPinnedDomains = {};

/// Guard: strict pinning must never be enabled without valid host pins.
void assertValidPinnedDomains() {
  assert(
    !kEnableCertPinning ||
        (kPinnedDomains.isNotEmpty &&
            kPinnedDomains.values
                .expand((pins) => pins)
                .every(
                  (pin) =>
                      pin.isNotEmpty &&
                      !pin.contains('REPLACE_WITH_SPKI_PIN') &&
                      !pin.toUpperCase().contains('PLACEHOLDER') &&
                      !pin.toUpperCase().contains('TODO') &&
                      !pin.toUpperCase().contains('YOUR_SPKI_PIN_HERE'),
                )),
  );
}

/// Certificate pinning configuration info.
class CertPinningInfo {
  final bool enabled;
  final Map<String, List<String>> pins;
  final String buildMode;

  const CertPinningInfo({
    required this.enabled,
    required this.pins,
    required this.buildMode,
  });

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'pins': pins,
    'buildMode': buildMode,
    'pinnedDomains': pins.keys.toList(),
  };
}

/// Get current certificate pinning configuration.
CertPinningInfo getCertPinningInfo() {
  assertValidPinnedDomains();
  return const CertPinningInfo(
    enabled: kEnableCertPinning,
    pins: kPinnedDomains,
    buildMode: kDebugMode ? 'debug' : 'release',
  );
}
