// ignore_for_file: public_member_api_docs

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:asora/core/config/environment_config.dart';

/// SPKI Pin Provisioning Gate Tests
///
/// These tests enforce that staging and production pin lifecycle states stay
/// explicit. Planned environments may remain empty until the Azure hostnames
/// are provisioned; live environments must carry populated pins.
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
///   4. Promote the lifecycle state from planned to live.
///   5. Also add the pins to mobile-expected-pins.json and
///      lib/core/security/cert_pinning_common.dart (kPinnedDomains).
///
/// Full procedure: docs/runbooks/tls-pinning-rotation.md

void main() {
  final enforceGate = Platform.environment['SPKI_GATE'] == 'true';
  const gateSkipReason =
      'Set SPKI_GATE=true to run launch-gate SPKI pin checks';

  group('SPKI pin provisioning gate [launch-gate]', () {
    test(
      'staging pins are planned until the host is provisioned',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config = EnvironmentConfig.configForEnvironment(
          Environment.staging,
        );

        expect(
          config.security.tlsPins.lifecycleState,
          PinLifecycleState.planned,
        );
        expect(config.security.tlsPins.spkiPinsBase64, isEmpty);
      },
    );

    test(
      'staging pins are validated when promoted to live',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config = EnvironmentConfig.configForEnvironment(
          Environment.staging,
        );

        if (config.security.tlsPins.lifecycleState != PinLifecycleState.live) {
          expect(config.security.tlsPins.spkiPinsBase64, isEmpty);
          return;
        }

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

    test(
      'production pins are planned until the host is provisioned',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config = EnvironmentConfig.configForEnvironment(
          Environment.production,
        );

        expect(
          config.security.tlsPins.lifecycleState,
          PinLifecycleState.planned,
        );
        expect(config.security.tlsPins.spkiPinsBase64, isEmpty);
      },
    );

    test(
      'production pins are validated when promoted to live',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config = EnvironmentConfig.configForEnvironment(
          Environment.production,
        );

        if (config.security.tlsPins.lifecycleState != PinLifecycleState.live) {
          expect(config.security.tlsPins.spkiPinsBase64, isEmpty);
          return;
        }

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
      'production requires at least two pins when live',
      skip: enforceGate ? null : gateSkipReason,
      () {
        final config = EnvironmentConfig.configForEnvironment(
          Environment.production,
        );

        if (config.security.tlsPins.lifecycleState != PinLifecycleState.live) {
          expect(config.security.tlsPins.spkiPinsBase64, isEmpty);
          return;
        }

        expect(
          config.security.tlsPins.spkiPinsBase64.length >= 2,
          isTrue,
          reason:
              'Production must have at least 2 SPKI pins (leaf + backup) '
              'to survive certificate rotation without a forced app update. '
              'Extract the intermediate CA pin with: '
              'CERT_INDEX=1 ./scripts/extract-spki-pins.sh '
              'asora-function-prod.northeurope-01.azurewebsites.net',
        );
      },
    );
  });
}
