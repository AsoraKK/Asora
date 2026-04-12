// ignore_for_file: public_member_api_docs

library;

import 'package:flutter/foundation.dart';

/// Enable/disable certificate pinning based on build configuration
const bool kEnableCertPinning = bool.fromEnvironment(
  'ENABLE_CERT_PINNING',
  defaultValue: true,
);

/// SPKI pins for TLS certificate public keys (base64 SHA-256).
/// Include current leaf key and a backup (key rotation).
///
/// To (re)generate pins locally:
///   HOST=asora-function-dev.azurewebsites.net
///   openssl s_client -connect $HOST:443 -servername $HOST </dev/null 2>/dev/null \
///     | openssl x509 -pubkey -noout \
///     | openssl pkey -pubin -outform der \
///     | openssl dgst -sha256 -binary | base64
/// Keep in sync with mobile-expected-pins.json and platform configs.
const Map<String, List<String>> kPinnedDomains = {
  // Dev Function App origin
  'asora-function-dev.azurewebsites.net': [
    'q/NAtXjKO6gUw/KPFBywpWfsBpcnilAYw9+8tYUGkUE=',
    '0FNw187QQqH53n8SlDJcKmbWi6RgmVL7IR5W3s75n9Y=',
    'Eii21xSYPiPq5Qk1dN8OSAum+Q5Rm/fVuT0lG6nqBuk=',
    'Z3AiGp9DlTnC3kBo2OuHwOQioV4d2JMmVyTYkhwrGJo=',
    'vJ6M3i+5a+DFTIsiBT8oChn+90/pUsO3qQP9rkv0QdI=',
    'oyz1YegTss9+AE696+KzxtEGe2KMUXvj1XUUGvsr2CA=',
  ],
  // Legacy/dev hostname (if still called by any client)
  'asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net': [
    'sAgmPn4rf81EWKQFg+momPe9NFYswENqbsBnpcm16jM=',
    '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    'x4RU2Q1zHRX8ud1k4dfVdVS3SnE+v+yU9tFEWH+y5W0=',
  ],
};

/// Guard: never ship with placeholders.
void assertValidPinnedDomains() {
  assert(
    kPinnedDomains.values
        .expand((pins) => pins)
        .every(
          (pin) =>
              pin.isNotEmpty &&
              !pin.contains('REPLACE_WITH_SPKI_PIN') &&
              !pin.toUpperCase().contains('PLACEHOLDER') &&
              !pin.toUpperCase().contains('TODO') &&
              !pin.toUpperCase().contains('YOUR_SPKI_PIN_HERE'),
        ),
  );
}

/// Certificate pinning configuration info
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

/// Get current certificate pinning configuration
CertPinningInfo getCertPinningInfo() {
  assertValidPinnedDomains();
  return const CertPinningInfo(
    enabled: kEnableCertPinning,
    pins: kPinnedDomains,
    buildMode: kDebugMode ? 'debug' : 'release',
  );
}
