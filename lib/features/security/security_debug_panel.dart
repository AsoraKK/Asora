// ignore_for_file: public_member_api_docs

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/core/config/environment_config.dart';
import 'package:asora/core/security/device_security_service.dart';
import 'package:asora/core/security/security_overrides.dart';
import 'package:asora/core/security/security_telemetry.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_snackbar.dart';
import 'package:asora/design_system/components/lyth_card.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';

class SecurityDebugPanel extends ConsumerWidget {
  const SecurityDebugPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateAsync = ref.watch(deviceSecurityStateProvider);
    final config = EnvironmentConfig.fromEnvironment();
    final overrides = SecurityOverridesProvider.current;

    return Scaffold(
      appBar: AppBar(title: const Text('Security Debug Panel')),
      body: stateAsync.when(
        data: (state) => Padding(
          padding: const EdgeInsets.all(16),
          child: ListView(
            children: [
              _buildSection(
                title: 'Device Security State',
                children: [
                  _buildKeyValue(
                    'Rooted/Jailbroken',
                    '${state.isRootedOrJailbroken}',
                  ),
                  _buildKeyValue('Emulator', '${state.isEmulator}'),
                  _buildKeyValue('Debug build', '${state.isDebugBuild}'),
                  _buildKeyValue(
                    'Last checked',
                    state.lastCheckedAt.toIso8601String(),
                  ),
                ],
              ),
              _buildSection(
                title: 'Mobile Security Config',
                children: [
                  _buildKeyValue('Environment', config.environment.name),
                  _buildKeyValue(
                    'Strict device integrity',
                    '${config.security.strictDeviceIntegrity}',
                  ),
                  _buildKeyValue(
                    'Block rooted devices',
                    '${config.security.blockRootedDevices}',
                  ),
                  _buildKeyValue(
                    'Allow rooted in staging QA',
                    '${config.security.allowRootedInStagingForQa}',
                  ),
                ],
              ),
              _buildSection(
                title: 'TLS Pinning Config',
                children: [
                  _buildKeyValue(
                    'Enabled',
                    '${config.security.tlsPins.enabled}',
                  ),
                  _buildKeyValue(
                    'Strict mode',
                    '${config.security.tlsPins.strictMode}',
                  ),
                  _buildKeyValue(
                    'Pins configured',
                    '${config.security.tlsPins.spkiPinsBase64.length}',
                  ),
                ],
              ),
              _buildSection(
                title: 'Security Overrides',
                children: [
                  _buildKeyValue(
                    'Active',
                    '${SecurityOverridesProvider.hasActiveOverrides}',
                  ),
                  _buildKeyValue(
                    'Relax TLS pinning',
                    '${overrides.relaxTlsPinning}',
                  ),
                  _buildKeyValue(
                    'Relax integrity',
                    '${overrides.relaxDeviceIntegrity}',
                  ),
                  _buildKeyValue('Reason', overrides.overrideReason ?? 'n/a'),
                  _buildKeyValue(
                    'Expires in',
                    (overrides.timeRemaining?.inMinutes ?? 0) >= 0
                        ? '${overrides.timeRemaining?.inMinutes} min'
                        : 'none',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  LythButton.secondary(
                    label: 'Log security config',
                    onPressed: () {
                      SecurityTelemetry.logConfigSnapshot(config);
                      LythSnackbar.info(
                        context: context,
                        message: 'Logged security config snapshot.',
                      );
                    },
                  ),
                  SizedBox(width: context.spacing.md),
                  LythButton.secondary(
                    label: 'Override TLS pinning',
                    onPressed: kDebugMode
                        ? () {
                            SecurityOverridesProvider.set(
                              SecurityOverrideConfig.forQa(
                                reason: 'Debug TLS relax',
                                relaxTlsPinning: true,
                              ),
                            );
                          }
                        : null,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  LythButton.secondary(
                    label: 'Override integrity guard',
                    onPressed: kDebugMode
                        ? () {
                            SecurityOverridesProvider.set(
                              SecurityOverrideConfig.forQa(
                                reason: 'Debug integrity relax',
                                relaxDeviceIntegrity: true,
                              ),
                            );
                          }
                        : null,
                  ),
                  SizedBox(width: context.spacing.md),
                  LythButton.secondary(
                    label: 'Clear overrides',
                    onPressed: kDebugMode
                        ? SecurityOverridesProvider.clear
                        : null,
                  ),
                ],
              ),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Padding(
      padding: EdgeInsets.only(bottom: context.spacing.md),
      child: LythCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            SizedBox(height: context.spacing.sm),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildKeyValue(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: context.spacing.xs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
