import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/environment_config.dart';
import '../../core/security/device_security_service.dart';
import '../../core/security/security_overrides.dart';
import '../../core/security/security_telemetry.dart';

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
                    overrides.timeRemaining?.inMinutes ?? 0 >= 0
                        ? '${overrides.timeRemaining?.inMinutes} min'
                        : 'none',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: () {
                      SecurityTelemetry.logConfigSnapshot(config);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Logged security config snapshot.'),
                        ),
                      );
                    },
                    child: const Text('Log security config'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
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
                    child: const Text('Override TLS pinning'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  ElevatedButton(
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
                    child: const Text('Override integrity guard'),
                  ),
                  const SizedBox(width: 12),
                  const ElevatedButton(
                    onPressed: kDebugMode
                        ? SecurityOverridesProvider.clear
                        : null,
                    child: Text('Clear overrides'),
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
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildKeyValue(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 14, color: Colors.black54),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
