/// ASORA NOTIFICATIONS - PERMISSION PRE-PROMPT
///
/// Pre-prompt UI following iOS best practices:
/// - Shows before requesting OS permission
/// - Explains value proposition
/// - Allows "Not Now" and "Enable Notifications"
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/notification_permission_service.dart';
import '../domain/notification_models.dart';

class NotificationPermissionPrompt extends ConsumerStatefulWidget {
  final VoidCallback? onPermissionGranted;
  final VoidCallback? onPermissionDenied;

  const NotificationPermissionPrompt({
    super.key,
    this.onPermissionGranted,
    this.onPermissionDenied,
  });

  @override
  ConsumerState<NotificationPermissionPrompt> createState() =>
      _NotificationPermissionPromptState();
}

class _NotificationPermissionPromptState
    extends ConsumerState<NotificationPermissionPrompt> {
  final _permissionService = NotificationPermissionService();
  bool _isRequesting = false;

  Future<void> _handleEnableNotifications() async {
    if (_isRequesting) return;

    setState(() => _isRequesting = true);

    try {
      final status = await _permissionService.requestPermission();

      if (status == NotificationPermissionStatus.authorized ||
          status == NotificationPermissionStatus.provisional) {
        widget.onPermissionGranted?.call();
      } else {
        widget.onPermissionDenied?.call();
      }
    } finally {
      if (mounted) {
        setState(() => _isRequesting = false);
      }
    }
  }

  void _handleNotNow() {
    widget.onPermissionDenied?.call();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  MediaQuery.of(context).padding.bottom -
                  48, // padding
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 32),

                // Illustration
                Icon(
                  Icons.notifications_active_outlined,
                  size: 100,
                  color: colorScheme.primary,
                ),

                const SizedBox(height: 24),

                // Title
                Text(
                  'Stay Connected',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 12),

                // Body text
                Text(
                  'Get notified when people interact with your posts, when friends '
                  'post new content, and important updates about your account.',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 24),

                // Benefits list
                const _BenefitItem(
                  icon: Icons.people_outline,
                  title: 'Social Updates',
                  subtitle: 'Comments, likes, and new followers',
                ),

                const SizedBox(height: 12),

                const _BenefitItem(
                  icon: Icons.security_outlined,
                  title: 'Security Alerts',
                  subtitle: 'Important account and safety notifications',
                ),

                const SizedBox(height: 12),

                const _BenefitItem(
                  icon: Icons.tune_outlined,
                  title: 'Full Control',
                  subtitle: 'Customize categories and quiet hours anytime',
                ),

                const SizedBox(height: 32),

                // Enable button
                FilledButton(
                  onPressed: _isRequesting ? null : _handleEnableNotifications,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isRequesting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enable Notifications'),
                ),

                const SizedBox(height: 12),

                // Not now button
                TextButton(
                  onPressed: _isRequesting ? null : _handleNotNow,
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Not Now'),
                ),

                const SizedBox(height: 12),

                // Privacy note
                Text(
                  'You can change notification preferences in Settings at any time.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BenefitItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _BenefitItem({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 24, color: colorScheme.onPrimaryContainer),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
