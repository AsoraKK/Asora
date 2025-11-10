import 'package:flutter/material.dart';

/// Destructive action card for account deletion.
class PrivacyDeleteSection extends StatelessWidget {
  const PrivacyDeleteSection({
    super.key,
    required this.onDelete,
    required this.isProcessing,
  });

  final VoidCallback onDelete;
  final bool isProcessing;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      color: colors.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.delete_forever_outlined, color: colors.error),
                const SizedBox(width: 12),
                Text(
                  'Delete your account',
                  style: textTheme.titleLarge?.copyWith(
                    color: colors.onErrorContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'This removes your profile and content. This action cannot be undone.',
              style: textTheme.bodyMedium?.copyWith(
                color: colors.onErrorContainer,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: isProcessing ? null : onDelete,
                style: OutlinedButton.styleFrom(
                  foregroundColor: colors.error,
                  side: BorderSide(color: colors.error),
                  minimumSize: const Size.fromHeight(48),
                ),
                child: isProcessing
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          SizedBox(width: 12),
                          Text('Deleting account…'),
                        ],
                      )
                    : const Text('Delete account'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
