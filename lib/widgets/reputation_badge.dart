// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

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
  static Color getTierColor(int score) {
    if (score >= 1000) {
      return const Color(0xFF60A5FA); // Platinum - light blue
    }
    if (score >= 500) {
      return const Color(0xFFFBBF24); // Gold
    }
    if (score >= 100) {
      return const Color(0xFF9CA3AF); // Silver
    }
    return const Color(0xFFD97706); // Bronze
  }

  /// Get the background color (lighter version of tier color)
  static Color getBackgroundColor(int score) {
    if (score >= 1000) {
      return const Color(0xFF60A5FA).withValues(alpha: 0.15);
    }
    if (score >= 500) {
      return const Color(0xFFFBBF24).withValues(alpha: 0.15);
    }
    if (score >= 100) {
      return const Color(0xFF9CA3AF).withValues(alpha: 0.15);
    }
    return const Color(0xFFD97706).withValues(alpha: 0.15);
  }

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
    final tierColor = getTierColor(score);
    final backgroundColor = getBackgroundColor(score);
    final icon = getTierIcon(score);

    // Size-specific dimensions
    final (
      double iconSize,
      double fontSize,
      double paddingH,
      double paddingV,
    ) = switch (size) {
      ReputationBadgeSize.small => (12.0, 11.0, 6.0, 2.0),
      ReputationBadgeSize.medium => (16.0, 13.0, 8.0, 4.0),
      ReputationBadgeSize.large => (20.0, 15.0, 12.0, 6.0),
    };

    return Tooltip(
      message: '${getTierName(score)} tier • $score reputation',
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: paddingH, vertical: paddingV),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: tierColor.withValues(alpha: 0.3), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: iconSize, color: tierColor),
            const SizedBox(width: 4),
            Text(
              showLabel ? 'Rep: $score' : '$score',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w600,
                color: tierColor,
              ),
            ),
          ],
        ),
      ),
    );
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
