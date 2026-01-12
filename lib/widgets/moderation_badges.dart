import 'package:flutter/material.dart';
import '../features/moderation/domain/appeal.dart';

/// ASORA MODERATION BADGES
///
/// 🎯 Purpose: Display moderation status and AI scores on content
/// ✅ Features: Flagged warnings, AI confidence scores, appeal status
/// 🎨 Design: Subtle badges with color coding and icons
/// 🔒 Privacy: Optional toggle for AI scores (user preference)

class ModerationBadges extends StatelessWidget {
  final ModerationStatus status;
  final double? aiScore;
  final bool showAiScore;
  final String? appealStatus;
  final VoidCallback? onAppeal;
  final bool isOwnContent;

  const ModerationBadges({
    super.key,
    required this.status,
    this.aiScore,
    this.showAiScore = false,
    this.appealStatus,
    this.onAppeal,
    this.isOwnContent = false,
  });

  @override
  Widget build(BuildContext context) {
    final badges = <Widget>[];

    // Main moderation status badge
    final statusBadge = _buildStatusBadge(context);
    if (statusBadge != null) {
      badges.add(statusBadge);
    }

    // AI score badge (if enabled and available)
    if (showAiScore && aiScore != null) {
      badges.add(_buildAiScoreBadge(context));
    }

    // Appeal status badge (for own content)
    if (isOwnContent && appealStatus != null) {
      badges.add(_buildAppealBadge(context));
    }

    if (badges.isEmpty) return const SizedBox.shrink();

    return Wrap(spacing: 8, runSpacing: 4, children: badges);
  }

  Widget? _buildStatusBadge(BuildContext context) {
    IconData? icon;
    Color? backgroundColor;
    Color? textColor;
    String? text;

    switch (status) {
      case ModerationStatus.flagged:
        icon = Icons.flag;
        backgroundColor = Colors.orange.shade100;
        textColor = Colors.orange.shade800;
        text = 'Flagged';
        break;

      case ModerationStatus.hidden:
        icon = Icons.visibility_off;
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        text = 'Blocked';
        break;

      case ModerationStatus.communityApproved:
        icon = Icons.check_circle;
        backgroundColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        text = 'Community Approved';
        break;

      case ModerationStatus.communityRejected:
        icon = Icons.cancel;
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        text = 'Community Rejected';
        break;

      case ModerationStatus.clean:
        // No badge for clean content
        return null;
    }

    return _Badge(
      icon: icon,
      text: text,
      backgroundColor: backgroundColor,
      textColor: textColor,
    );
  }

  Widget _buildAiScoreBadge(BuildContext context) {
    final score = aiScore!;
    final percentage = (score * 100).round();

    // Color coding based on AI confidence
    Color backgroundColor;
    Color textColor;
    IconData icon;

    if (score >= 0.8) {
      // High confidence (likely violation)
      backgroundColor = Colors.red.shade100;
      textColor = Colors.red.shade800;
      icon = Icons.warning;
    } else if (score >= 0.6) {
      // Medium confidence
      backgroundColor = Colors.orange.shade100;
      textColor = Colors.orange.shade800;
      icon = Icons.info;
    } else if (score >= 0.4) {
      // Low-medium confidence
      backgroundColor = Colors.yellow.shade100;
      textColor = Colors.yellow.shade800;
      icon = Icons.help_outline;
    } else {
      // Low confidence (likely clean)
      backgroundColor = Colors.green.shade100;
      textColor = Colors.green.shade800;
      icon = Icons.check;
    }

    return _Badge(
      icon: icon,
      text: 'AI: $percentage%',
      backgroundColor: backgroundColor,
      textColor: textColor,
    );
  }

  Widget _buildAppealBadge(BuildContext context) {
    IconData icon;
    Color backgroundColor;
    Color textColor;
    String text;

    switch (appealStatus) {
      case 'pending':
      case 'under_review':
        icon = Icons.schedule;
        backgroundColor = Colors.blue.shade100;
        textColor = Colors.blue.shade800;
        text = 'Appeal Pending';
        break;

      case 'approved':
        icon = Icons.check_circle;
        backgroundColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        text = 'Appeal Approved';
        break;

      case 'rejected':
        icon = Icons.cancel;
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        text = 'Appeal Rejected';
        break;

      case 'expired':
        icon = Icons.access_time;
        backgroundColor = Colors.grey.shade100;
        textColor = Colors.grey.shade800;
        text = 'Appeal Expired';
        break;

      default:
        return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: onAppeal,
      child: _Badge(
        icon: icon,
        text: text,
        backgroundColor: backgroundColor,
        textColor: textColor,
        interactive: onAppeal != null,
      ),
    );
  }
}

/// Individual badge widget
class _Badge extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color backgroundColor;
  final Color textColor;
  final bool interactive;

  const _Badge({
    required this.icon,
    required this.text,
    required this.backgroundColor,
    required this.textColor,
    this.interactive = false,
  });

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: textColor.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
          if (interactive) ...[
            const SizedBox(width: 4),
            Icon(Icons.arrow_forward_ios, size: 10, color: textColor),
          ],
        ],
      ),
    );

    if (interactive) {
      return Material(
        color: Colors.transparent,
        child: InkWell(borderRadius: BorderRadius.circular(12), child: badge),
      );
    }

    return badge;
  }
}

/// Helper widget for showing moderation info in a dismissible banner
class ModerationInfoBanner extends StatelessWidget {
  final ModerationStatus status;
  final String? message;
  final VoidCallback? onAppeal;
  final VoidCallback? onDismiss;

  const ModerationInfoBanner({
    super.key,
    required this.status,
    this.message,
    this.onAppeal,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    if (status == ModerationStatus.clean) {
      return const SizedBox.shrink();
    }

    Color backgroundColor;
    Color textColor;
    IconData icon;
    String title;

    switch (status) {
      case ModerationStatus.flagged:
        backgroundColor = Colors.orange.shade50;
        textColor = Colors.orange.shade800;
        icon = Icons.flag;
        title = 'Content Flagged';
        break;

      case ModerationStatus.hidden:
        backgroundColor = Colors.red.shade50;
        textColor = Colors.red.shade800;
        icon = Icons.visibility_off;
        title = 'Content Blocked';
        break;

      case ModerationStatus.communityApproved:
        backgroundColor = Colors.green.shade50;
        textColor = Colors.green.shade800;
        icon = Icons.check_circle;
        title = 'Community Approved';
        break;

      case ModerationStatus.communityRejected:
        backgroundColor = Colors.red.shade50;
        textColor = Colors.red.shade800;
        icon = Icons.cancel;
        title = 'Community Rejected';
        break;

      case ModerationStatus.clean:
        return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: textColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: textColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
                if (message != null) ...[
                  const SizedBox(height: 4),
                  Text(message!, style: TextStyle(color: textColor)),
                ],
                if (onAppeal != null) ...[
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: onAppeal,
                    icon: const Icon(Icons.gavel, size: 16),
                    label: const Text('Appeal Decision'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: textColor,
                      foregroundColor: backgroundColor,
                      textStyle: const TextStyle(fontSize: 12),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (onDismiss != null)
            IconButton(
              onPressed: onDismiss,
              icon: Icon(Icons.close, color: textColor, size: 18),
              constraints: const BoxConstraints(),
              padding: EdgeInsets.zero,
            ),
        ],
      ),
    );
  }
}
