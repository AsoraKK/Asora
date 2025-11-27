/// ASORA NOTIFICATIONS - SETTINGS SCREEN
///
/// Notification preferences management:
/// - Category toggles (social, news, marketing)
/// - Quiet hours grid (24-hour touch selector)
/// - Timezone display
/// - Device management
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/notification_models.dart';
import '../application/notification_providers.dart';

class NotificationsSettingsScreen extends ConsumerWidget {
  const NotificationsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferencesAsync = ref.watch(preferencesControllerProvider);
    final devicesAsync = ref.watch(devicesControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Notification Settings')),
      body: preferencesAsync.when(
        data: (preferences) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _CategoryTogglesSection(
              preferences: preferences,
              onUpdate: (prefs) async {
                try {
                  await ref
                      .read(preferencesControllerProvider.notifier)
                      .update(prefs);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Preferences updated'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to update: $e'),
                        backgroundColor: Theme.of(context).colorScheme.error,
                      ),
                    );
                  }
                }
              },
            ),
            const SizedBox(height: 24),
            _QuietHoursSection(
              preferences: preferences,
              onUpdate: (prefs) async {
                try {
                  await ref
                      .read(preferencesControllerProvider.notifier)
                      .update(prefs);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to update: $e')),
                    );
                  }
                }
              },
            ),
            const SizedBox(height: 24),
            devicesAsync.when(
              data: (devices) => _DevicesSection(
                devices: devices,
                onRevoke: (deviceId) async {
                  try {
                    await ref
                        .read(devicesControllerProvider.notifier)
                        .revoke(deviceId);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Device removed')),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to remove: $e')),
                      );
                    }
                  }
                },
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error loading devices: $e')),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error loading preferences: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ref.read(preferencesControllerProvider.notifier).load();
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// CATEGORY TOGGLES
// ============================================================================

class _CategoryTogglesSection extends StatelessWidget {
  final UserNotificationPreferences preferences;
  final Function(UserNotificationPreferences) onUpdate;

  const _CategoryTogglesSection({
    required this.preferences,
    required this.onUpdate,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Categories',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Choose which types of notifications you want to receive',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 16),
        _CategoryToggle(
          icon: Icons.people_outline,
          title: 'Social Updates',
          subtitle: 'Comments, likes, follows, and friend activity',
          value: preferences.categories.social,
          onChanged: (value) {
            onUpdate(
              preferences.copyWith(
                categories: preferences.categories.copyWith(social: value),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        _CategoryToggle(
          icon: Icons.article_outlined,
          title: 'News & Updates',
          subtitle: 'App news and feature announcements',
          value: preferences.categories.news,
          onChanged: (value) {
            onUpdate(
              preferences.copyWith(
                categories: preferences.categories.copyWith(news: value),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        _CategoryToggle(
          icon: Icons.campaign_outlined,
          title: 'Marketing',
          subtitle: 'Special offers and promotions',
          value: preferences.categories.marketing,
          onChanged: (value) {
            onUpdate(
              preferences.copyWith(
                categories: preferences.categories.copyWith(marketing: value),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(
                Icons.info_outline,
                size: 20,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Safety and security notifications are always enabled',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoryToggle extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _CategoryToggle({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: SwitchListTile(
        secondary: Icon(icon, color: theme.colorScheme.primary),
        title: Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(subtitle),
        value: value,
        onChanged: onChanged,
      ),
    );
  }
}

// ============================================================================
// QUIET HOURS GRID
// ============================================================================

class _QuietHoursSection extends StatelessWidget {
  final UserNotificationPreferences preferences;
  final Function(UserNotificationPreferences) onUpdate;

  const _QuietHoursSection({required this.preferences, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quiet Hours',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Tap hours to toggle quiet mode (safety alerts will still come through)',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.access_time, size: 16, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Text(
              'Timezone: ${preferences.timezone}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _QuietHoursGrid(
          quietHours: preferences.quietHours,
          onHourToggled: (hour) {
            onUpdate(
              preferences.copyWith(
                quietHours: preferences.quietHours.withHourToggled(hour),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _QuietHoursGrid extends StatelessWidget {
  final QuietHours quietHours;
  final ValueChanged<int> onHourToggled;

  const _QuietHoursGrid({
    required this.quietHours,
    required this.onHourToggled,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          // Grid of 24 hour cells (4 rows x 6 columns)
          for (int row = 0; row < 4; row++)
            Padding(
              padding: EdgeInsets.only(bottom: row < 3 ? 8 : 0),
              child: Row(
                children: [
                  for (int col = 0; col < 6; col++)
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(right: col < 5 ? 8 : 0),
                        child: _HourCell(
                          hour: row * 6 + col,
                          isQuiet: quietHours.isQuietAt(row * 6 + col),
                          onTap: () => onHourToggled(row * 6 + col),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          // Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 8),
              Text('Quiet', style: theme.textTheme.bodySmall),
              const SizedBox(width: 24),
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh,
                  border: Border.all(color: theme.colorScheme.outline),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 8),
              Text('Active', style: theme.textTheme.bodySmall),
            ],
          ),
        ],
      ),
    );
  }
}

class _HourCell extends StatelessWidget {
  final int hour;
  final bool isQuiet;
  final VoidCallback onTap;

  const _HourCell({
    required this.hour,
    required this.isQuiet,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hourText = hour.toString().padLeft(2, '0');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: isQuiet
              ? theme.colorScheme.primary
              : theme.colorScheme.surfaceContainerHigh,
          border: Border.all(
            color: isQuiet
                ? theme.colorScheme.primary
                : theme.colorScheme.outline,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text(
            hourText,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: isQuiet
                  ? theme.colorScheme.onPrimary
                  : theme.colorScheme.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// DEVICES SECTION
// ============================================================================

class _DevicesSection extends StatelessWidget {
  final List<UserDeviceToken> devices;
  final Future<void> Function(String deviceId) onRevoke;

  const _DevicesSection({required this.devices, required this.onRevoke});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Devices',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Manage devices receiving push notifications (max 3)',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 16),
        if (devices.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border.all(color: theme.colorScheme.outlineVariant),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.devices_outlined,
                    size: 48,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'No devices registered',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          ...devices.map(
            (device) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _DeviceCard(device: device, onRevoke: onRevoke),
            ),
          ),
      ],
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final UserDeviceToken device;
  final Future<void> Function(String deviceId) onRevoke;

  const _DeviceCard({required this.device, required this.onRevoke});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final platform = device.platform == 'fcm' ? 'Android' : 'iOS';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            device.platform == 'fcm' ? Icons.phone_android : Icons.phone_iphone,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  device.label ?? platform,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Last seen: ${_formatLastSeen(device.lastSeenAt)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => onRevoke(device.id),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  String _formatLastSeen(DateTime lastSeen) {
    final now = DateTime.now();
    final diff = now.difference(lastSeen);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${lastSeen.month}/${lastSeen.day}/${lastSeen.year}';
  }
}
