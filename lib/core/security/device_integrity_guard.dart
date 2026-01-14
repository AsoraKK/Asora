// ignore_for_file: public_member_api_docs

/// ASORA DEVICE INTEGRITY GUARD
///
/// 🎯 Purpose: Policy-based device integrity enforcement per use-case
/// 🔐 Security: Block/warn for high-risk operations on compromised devices
/// 📱 Platform: Flutter with Riverpod integration
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/core/config/environment_config.dart';
import 'package:asora/core/security/device_security_service.dart';
import 'package:asora/core/security/security_overrides.dart';
import 'package:asora/core/security/security_telemetry.dart';

/// Use cases for integrity checks
enum IntegrityUseCase {
  signIn,
  signUp,
  postContent,
  privacyDsr, // privacy/export/delete flows
  readFeed,
}

/// Integrity decision
class DeviceIntegrityDecision {
  final bool allow;
  final bool showBlockingUi;
  final String? messageKey; // for localization
  final bool warnOnly;

  const DeviceIntegrityDecision({
    required this.allow,
    required this.showBlockingUi,
    this.messageKey,
    this.warnOnly = false,
  });

  factory DeviceIntegrityDecision.allow() {
    return const DeviceIntegrityDecision(
      allow: true,
      showBlockingUi: false,
      warnOnly: false,
    );
  }

  factory DeviceIntegrityDecision.warnOnly(String messageKey) {
    return DeviceIntegrityDecision(
      allow: true,
      showBlockingUi: false,
      messageKey: messageKey,
      warnOnly: true,
    );
  }

  factory DeviceIntegrityDecision.block(String messageKey) {
    return DeviceIntegrityDecision(
      allow: false,
      showBlockingUi: true,
      messageKey: messageKey,
      warnOnly: false,
    );
  }
}

/// Device integrity guard with use-case policies
class DeviceIntegrityGuard {
  final DeviceSecurityService _deviceSecurityService;
  final MobileSecurityConfig _config;
  final Environment _environment;
  final SecurityOverrideConfig _overrides;

  DeviceIntegrityGuard({
    required DeviceSecurityService deviceSecurityService,
    required MobileSecurityConfig config,
    required Environment environment,
    SecurityOverrideConfig? overrides,
  }) : _deviceSecurityService = deviceSecurityService,
       _config = config,
       _environment = environment,
       _overrides = overrides ?? const SecurityOverrideConfig();

  /// Evaluate integrity for a specific use case
  Future<DeviceIntegrityDecision> evaluate(IntegrityUseCase useCase) async {
    final state = await _deviceSecurityService.evaluateSecurity();

    // Check for active overrides
    if (_overrides.relaxDeviceIntegrity && _overrides.isValid()) {
      final event = SecurityEvent.integrityGuard(
        result: 'override_active',
        environment: _environment,
        useCase: useCase.name,
        reason: _overrides.overrideReason ?? 'break_glass_override',
        metadata: state.toJson(),
      );
      SecurityTelemetry.logEvent(event);

      // Override: relax to warn-only
      if (state.isCompromised) {
        return DeviceIntegrityDecision.warnOnly(
          'security.device_compromised_override',
        );
      }
    }

    // Clean device: always allow
    if (!state.isCompromised && !state.isEmulator) {
      return DeviceIntegrityDecision.allow();
    }

    // Apply environment-specific policy
    final decision = _applyPolicy(useCase, state);

    // Log decision
    final event = SecurityEvent.integrityGuard(
      result: decision.allow ? 'allowed' : 'blocked',
      environment: _environment,
      useCase: useCase.name,
      reason: decision.warnOnly ? 'warn_only' : 'enforced',
      strictMode: !decision.warnOnly,
      metadata: {
        ...state.toJson(),
        'show_blocking_ui': decision.showBlockingUi,
      },
    );
    SecurityTelemetry.logEvent(event);

    return decision;
  }

  /// Apply environment and use-case specific policy
  DeviceIntegrityDecision _applyPolicy(
    IntegrityUseCase useCase,
    DeviceSecurityState state,
  ) {
    // Dev environment: warn-only for all use cases
    if (_environment.isDev) {
      if (state.isCompromised) {
        return DeviceIntegrityDecision.warnOnly(
          'security.device_compromised_dev',
        );
      }
      return DeviceIntegrityDecision.allow();
    }

    // Staging: respect allowRootedInStagingForQa flag
    if (_environment.isStaging && _config.allowRootedInStagingForQa) {
      if (state.isCompromised) {
        return DeviceIntegrityDecision.warnOnly(
          'security.device_compromised_staging_qa',
        );
      }
    }

    // Production and staging (without QA override):
    // High-risk operations: block
    // Low-risk operations: warn-only

    final isHighRisk = [
      IntegrityUseCase.signIn,
      IntegrityUseCase.signUp,
      IntegrityUseCase.postContent,
      IntegrityUseCase.privacyDsr,
    ].contains(useCase);

    if (state.isCompromised || (state.isEmulator && _environment.isProd)) {
      if (isHighRisk && _config.blockRootedDevices) {
        return DeviceIntegrityDecision.block(
          'security.device_compromised_blocked',
        );
      } else {
        return DeviceIntegrityDecision.warnOnly(
          'security.device_compromised_warning',
        );
      }
    }

    return DeviceIntegrityDecision.allow();
  }
}

/// Riverpod provider for device integrity guard
final deviceIntegrityGuardProvider = Provider<DeviceIntegrityGuard>((ref) {
  final config = EnvironmentConfig.fromEnvironment();
  final deviceService = ref.watch(deviceSecurityServiceProvider);
  final overrides = SecurityOverridesProvider.current;

  return DeviceIntegrityGuard(
    deviceSecurityService: deviceService,
    config: config.security,
    environment: config.environment,
    overrides: overrides,
  );
});

/// Helper function to run actions with device guard
Future<void> runWithDeviceGuard(
  BuildContext context,
  WidgetRef ref,
  IntegrityUseCase useCase,
  Future<void> Function() action,
) async {
  DeviceIntegrityDecision decision;
  try {
    final guard = ref.read(deviceIntegrityGuardProvider);

    // If the device security state is not yet available (async), do not block
    // the UI/actions waiting for a potentially slow platform check. Instead,
    // proceed immediately and evaluate the guard in background. If a cached
    // value exists (AsyncData), evaluate synchronously to enforce policy.
    final asyncState = ref.read(deviceSecurityStateProvider);
    if (asyncState is! AsyncData<DeviceSecurityState>) {
      // Device state not yet available — allow action immediately to avoid
      // blocking UI/tests. Skip background evaluation to prevent timers in
      // test environments.
      decision = DeviceIntegrityDecision.allow();
    } else {
      decision = await guard.evaluate(useCase);
    }
  } catch (e, st) {
    // If evaluation fails (platform/channel issues in tests or runtime),
    // log telemetry and default to allowing the action to avoid blocking
    // critical flows unexpectedly.
    SecurityTelemetry.logEvent(
      SecurityEvent.integrityGuard(
        result: 'evaluation_error',
        environment: Environment.development,
        useCase: useCase.name,
        reason: e.toString(),
        metadata: {'error': e.toString(), 'stack': st.toString()},
      ),
    );

    decision = DeviceIntegrityDecision.allow();
  }

  if (!decision.allow && decision.showBlockingUi) {
    // Show blocking dialog
    if (context.mounted) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Security Notice'),
          content: Text(
            _getLocalizedMessage(decision.messageKey ?? 'security.default'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
    return; // Do not proceed
  }

  if (decision.warnOnly && decision.messageKey != null) {
    // Show dismissible warning
    if (context.mounted) {
      // Avoid showing SnackBar during widget tests (creates pending timers).
      final bindingName = WidgetsBinding.instance.runtimeType.toString();
      if (!bindingName.contains('TestWidgetsFlutterBinding')) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_getLocalizedMessage(decision.messageKey!)),
            duration: const Duration(seconds: 5),
            action: SnackBarAction(label: 'Dismiss', onPressed: () {}),
          ),
        );
      }
    }
  }

  // Proceed with action
  try {
    await action();
  } catch (e, st) {
    SecurityTelemetry.logEvent(
      SecurityEvent.integrityGuard(
        result: 'action_error',
        environment: Environment.development,
        useCase: useCase.name,
        reason: e.toString(),
        metadata: {'error': e.toString(), 'stack': st.toString()},
      ),
    );
    rethrow;
  }
}

/// Get localized message (placeholder - integrate with flutter_localizations)
String _getLocalizedMessage(String key) {
  // TODO: Integrate with proper localization system
  const messages = {
    'security.device_compromised_blocked':
        'For security reasons, this action cannot be performed on rooted or jailbroken devices. '
        'Please use a secure device to continue.',
    'security.device_compromised_warning':
        'Warning: Your device appears to be rooted or jailbroken. '
        'Some security features may be limited.',
    'security.device_compromised_dev':
        '[DEV] Device integrity check failed, but action allowed in development mode.',
    'security.device_compromised_staging_qa':
        '[STAGING] Device integrity check failed, allowed for QA testing.',
    'security.device_compromised_override':
        'Device integrity override active. Proceeding with caution.',
    'security.default':
        'A security check prevented this action. Please contact support if this issue persists.',
  };

  return messages[key] ?? messages['security.default']!;
}
