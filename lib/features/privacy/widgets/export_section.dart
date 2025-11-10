import 'package:flutter/material.dart';

import 'cooldown_row.dart';

/// Card widget for the privacy export flow.
class PrivacyExportSection extends StatelessWidget {
  const PrivacyExportSection({
    super.key,
    required this.isBusy,
    required this.isCoolingDown,
    required this.buttonLabel,
    required this.onRequest,
    required this.cooldownRow,
    required this.onRefresh,
  });

  final bool isBusy;
  final bool isCoolingDown;
  final String buttonLabel;
  final VoidCallback? onRequest;
  final VoidCallback onRefresh;
  final PrivacyCooldownRow cooldownRow;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lock_person_outlined, color: colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  'Export your data',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Request a copy of your account data. We email a download link.',
              style: textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onRequest,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                child: _buildButtonChild(context),
              ),
            ),
            const SizedBox(height: 12),
            cooldownRow,
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh status'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildButtonChild(BuildContext context) {
    if (isBusy) {
      return const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
          SizedBox(width: 12),
          Text('Export requested'),
        ],
      );
    }

    return Text(
      buttonLabel,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
        color: isCoolingDown
            ? Theme.of(context).colorScheme.onSurfaceVariant
            : null,
      ),
    );
  }
}
