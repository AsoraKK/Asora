// ignore_for_file: public_member_api_docs

import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/config/environment_config.dart';

/// SPKI Pin Provisioning Gate Tests
///
/// These tests enforce that staging and production environments have SPKI pins
/// populated before GA launch.  They are SKIPPED in regular CI runs to avoid
/// blocking merges while the environments are being provisioned.
///
/// To enforce them (e.g. in the launch-readiness gate), set the environment
/// variable SPKI_GATE=true before running flutter test:
///
///   SPKI_GATE=true flutter test test/security/environment_spki_pin_test.dart
///
/// To populate the pins:
///   1. Ensure the target Azure Function App is deployed and reachable.
///   2. Run the extraction script for each environment:
///
///        ./scripts/extract-spki-pins.sh \
///            asora-function-staging.northeurope-01.azurewebsites.net
///
///        ./scripts/extract-spki-pins.sh \
///            asora-function-prod.northeurope-01.azurewebsites.net
///
///        # Also extract the intermediate CA pin as a backup:
///        CERT_INDEX=1 ./scripts/extract-spki-pins.sh \
///            asora-function-prod.northeurope-01.azurewebsites.net
///
///   3. Paste the base64 output into the corresponding spkiPinsBase64 arrays
///      in lib/core/config/environment_config.dart.
///   4. Also add the pins to mobile-expected-pins.json and
///      lib/core/security/cert_pinning_common.dart (kPinnedDomains).
///
/// Full procedure: docs/runbooks/tls-pinning-rotation.md

const _stagingHost =
    'asora-function-staging.northeurope-01.azurewebsites.net';
const _prodHost = 'asora-function-prod.northeurope-01.azurewebsites.net';

void main() {
  // Skip unless the caller explicitly opts in to the launch-gate.
  // The launch-readiness-gate.yml workflow sets SPKI_GATE=true.
  final enforceGate = Platform.environment['SPKI_GATE'] == 'true';
  const gateSkipReason =
      'Set SPKI_GATE=true to run launch-gate SPKI pin checks';

  group('SPKI pin provisioning gate [launch-gate]', () {
    // ── Staging ──────────────────────────────────────────────────────────────

    test(
      'staging spkiPinsBase64 is non-empty [LAUNCH BLOCKER]',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config =
            EnvironmentConfig.configForEnvironment(Environment.staging);
        expect(
          config.security.tlsPins.spkiPinsBase64,
          isNotEmpty,
          reason: '''
LAUNCH BLOCKER: staging spkiPinsBase64 is empty in environment_config.dart.

Staging API host: $_stagingHost
TLS pinning is currently FAIL-OPEN — all staging TLS connections are accepted without verification.

Extract the pin:
  ./scripts/extract-spki-pins.sh $_stagingHost

Then populate _stagingMobileSecurity.tlsPins.spkiPinsBase64 in:
  lib/core/config/environment_config.dart

Also update:
  mobile-expected-pins.json
  lib/core/security/cert_pinning_common.dart (kPinnedDomains)

See docs/runbooks/tls-pinning-rotation.md for the full procedure.
''',
        );
      },
    );

    test(
      'staging pins have valid base64 format and no placeholders',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config =
            EnvironmentConfig.configForEnvironment(Environment.staging);
        final pinPattern = RegExp(r'^[A-Za-z0-9+/=]{43,44}$');

        for (final pin in config.security.tlsPins.spkiPinsBase64) {
          expect(
            pin.toUpperCase().contains('TODO') ||
                pin.toUpperCase().contains('PLACEHOLDER') ||
                pin.toUpperCase().contains('REPLACE'),
            isFalse,
            reason: 'Placeholder found in staging pin: $pin',
          );
          expect(
            pinPattern.hasMatch(pin),
            isTrue,
            reason:
                'Invalid base64 SHA-256 format for staging pin: $pin '
                '(expected 43-44 base64 chars)',
          );
        }
      },
    );

    // ── Production ────────────────────────────────────────────────────────────

    test(
      'production spkiPinsBase64 is non-empty [LAUNCH BLOCKER]',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config =
            EnvironmentConfig.configForEnvironment(Environment.production);
        expect(
          config.security.tlsPins.spkiPinsBase64,
          isNotEmpty,
          reason: '''
LAUNCH BLOCKER: production spkiPinsBase64 is empty in environment_config.dart.

Production API host: $_prodHost
TLS pinning is currently FAIL-OPEN — all production TLS connections are accepted without verification.

Extract the leaf pin and a backup (intermediate CA):
  ./scripts/extract-spki-pins.sh $_prodHost
  CERT_INDEX=1 ./scripts/extract-spki-pins.sh $_prodHost

Then populate _prodMobileSecurity.tlsPins.spkiPinsBase64 in:
  lib/core/config/environment_config.dart

Include at least two pins (leaf + one backup) to survive cert rotation.

Also update:
  mobile-expected-pins.json
  lib/core/security/cert_pinning_common.dart (kPinnedDomains)

See docs/runbooks/tls-pinning-rotation.md for the full procedure.
''',
        );
      },
    );

    test(
      'production pins have valid base64 format and no placeholders',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config =
            EnvironmentConfig.configForEnvironment(Environment.production);
        final pinPattern = RegExp(r'^[A-Za-z0-9+/=]{43,44}$');

        for (final pin in config.security.tlsPins.spkiPinsBase64) {
          expect(
            pin.toUpperCase().contains('TODO') ||
                pin.toUpperCase().contains('PLACEHOLDER') ||
                pin.toUpperCase().contains('REPLACE'),
            isFalse,
            reason: 'Placeholder found in production pin: $pin',
          );
          expect(
            pinPattern.hasMatch(pin),
            isTrue,
            reason:
                'Invalid base64 SHA-256 format for production pin: $pin '
                '(expected 43-44 base64 chars)',
          );
        }
      },
    );

    test(
      'production has at least two pins (primary + backup for rotation)',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config =
            EnvironmentConfig.configForEnvironment(Environment.production);
        expect(
          config.security.tlsPins.spkiPinsBase64.length >= 2,
          isTrue,
          reason:
              'Production must have at least 2 SPKI pins (leaf + backup) '
              'to survive certificate rotation without a forced app update. '
              'Extract the intermediate CA pin with: '
              'CERT_INDEX=1 ./scripts/extract-spki-pins.sh $_prodHost',
        );
      },
    );
  });
}
