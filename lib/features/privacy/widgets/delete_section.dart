// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_card.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';

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
    final spacing = context.spacing;

    return LythCard(
      backgroundColor: colors.errorContainer,
      borderColor: colors.error.withValues(alpha: 0.3),
      padding: EdgeInsets.all(spacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.delete_forever_outlined, color: colors.error),
              SizedBox(width: spacing.md),
              Text(
                'Delete your account',
                style: textTheme.titleLarge?.copyWith(
                  color: colors.onErrorContainer,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          SizedBox(height: spacing.md),
          Text(
            'This removes your profile and content. This action cannot be undone.',
            style: textTheme.bodyMedium?.copyWith(
              color: colors.onErrorContainer,
            ),
          ),
          SizedBox(height: spacing.lg),
          SizedBox(
            width: double.infinity,
            child: LythButton.destructive(
              label: isProcessing ? 'Deleting account…' : 'Delete account',
              onPressed: isProcessing ? null : onDelete,
              isLoading: isProcessing,
            ),
          ),
        ],
      ),
    );
  }
}
