// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/design_system/theme/theme_build_context_x.dart';

/// Size variants for the reputation badge
enum ReputationBadgeSize {
  /// Small badge for inline use (e.g., post headers)
  small,

  /// Medium badge for profile cards
  medium,

  /// Large badge for profile pages
  large,
}

/// A widget that displays a user's reputation score as a badge.
///
/// The badge color and icon change based on the reputation tier:
/// - Bronze (0-99): Bronze/brown color
/// - Silver (100-499): Silver/gray color
/// - Gold (500-999): Gold/yellow color
/// - Platinum (1000+): Platinum/blue-white color
///
/// Example usage:
/// ```dart
/// ReputationBadge(
///   score: 150,
///   size: ReputationBadgeSize.small,
/// )
/// ```
class ReputationBadge extends StatelessWidget {
  /// The user's reputation score
  final int score;

  /// The size of the badge
  final ReputationBadgeSize size;

  /// Whether to show the full label (e.g., "Rep: 42") or just the number
  final bool showLabel;

  const ReputationBadge({
    super.key,
    required this.score,
    this.size = ReputationBadgeSize.small,
    this.showLabel = false,
  });

  /// Get the tier name based on score
  static String getTierName(int score) {
    if (score >= 1000) {
      return 'Platinum';
    }
    if (score >= 500) {
      return 'Gold';
    }
    if (score >= 100) {
      return 'Silver';
    }
    return 'Bronze';
  }

  /// Get the tier color based on score
  /// Get the icon for the tier
  static IconData getTierIcon(int score) {
    if (score >= 1000) {
      return Icons.workspace_premium;
    }
    if (score >= 500) {
      return Icons.stars;
    }
    if (score >= 100) {
      return Icons.military_tech;
    }
    return Icons.emoji_events_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.colorScheme;
    final tierColor = _tierColor(scheme, score);
    final backgroundColor = tierColor.withValues(alpha: 0.12);
    final icon = getTierIcon(score);

    // Size-specific dimensions
    final (
      double iconSize,
      TextStyle? textStyle,
      double paddingH,
      double paddingV,
    ) = switch (size) {
      ReputationBadgeSize.small => (
        12.0,
        context.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
        context.spacing.xs,
        context.spacing.xs / 2,
      ),
      ReputationBadgeSize.medium => (
        16.0,
        context.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
        context.spacing.sm,
        context.spacing.xs,
      ),
      ReputationBadgeSize.large => (
        20.0,
        context.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
        context.spacing.md,
        context.spacing.sm,
      ),
    };

    return Tooltip(
      message: '${getTierName(score)} tier • $score reputation',
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: paddingH, vertical: paddingV),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(context.radius.pill),
          border: Border.all(color: tierColor.withValues(alpha: 0.3), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: iconSize, color: tierColor),
            SizedBox(width: context.spacing.xs),
            Text(
              showLabel ? 'Rep: $score' : '$score',
              style: textStyle?.copyWith(color: tierColor),
            ),
          ],
        ),
      ),
    );
  }

  static Color _tierColor(ColorScheme scheme, int score) {
    if (score >= 1000) {
      return scheme.primary;
    }
    if (score >= 500) {
      return scheme.onSurface.withValues(alpha: 0.82);
    }
    if (score >= 100) {
      return scheme.onSurface.withValues(alpha: 0.7);
    }
    return scheme.onSurface.withValues(alpha: 0.58);
  }
}

/// Extension to format reputation scores for display
extension ReputationFormatting on int {
  /// Format large reputation scores (e.g., 1500 -> "1.5K")
  String toReputationString() {
    if (this >= 10000) {
      return '${(this / 1000).toStringAsFixed(0)}K';
    }
    if (this >= 1000) {
      return '${(this / 1000).toStringAsFixed(1)}K';
    }
    return toString();
  }
}
