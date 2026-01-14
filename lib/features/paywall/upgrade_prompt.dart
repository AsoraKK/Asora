// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_card.dart';
import 'package:asora/design_system/components/lyth_snackbar.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';

class UpgradePrompt extends StatelessWidget {
  final String currentTier;
  final VoidCallback? onUpgrade;
  const UpgradePrompt({super.key, required this.currentTier, this.onUpgrade});

  @override
  Widget build(BuildContext context) {
    return LythCard(
      backgroundColor:
          Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Upgrade to unlock more',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: context.spacing.sm),
          Text(
            'Your current tier "$currentTier" limits post length and media.',
          ),
          SizedBox(height: context.spacing.sm),
          Row(
            children: [
              LythButton.primary(
                label: 'Upgrade',
                onPressed: () {
                  if (onUpgrade != null) {
                    onUpgrade!();
                  } else {
                    LythSnackbar.info(
                      context: context,
                      message:
                          'Upgrade flow coming soon. Check back shortly!',
                    );
                  }
                },
              ),
              SizedBox(width: context.spacing.sm),
              LythButton.tertiary(
                label: 'Not now',
                onPressed: () => Navigator.maybePop(context),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
