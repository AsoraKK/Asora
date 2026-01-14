// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/moderation/application/moderation_providers.dart';
import 'package:asora/features/moderation/domain/moderation_repository.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_snackbar.dart';
import 'package:asora/design_system/components/lyth_text_field.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';

/// ASORA POST ACTIONS WIDGET
///
/// 🎯 Purpose: Action buttons for posts/comments including flag reporting
/// ✅ Features: Like, Share, Comment, Flag/Report functionality
/// 🔐 Security: JWT authentication for flag submissions
/// 📱 UX: Confirmation dialogs and success/error feedback
/// 🚀 Integration: Connects to Azure Functions moderation backend

class PostActions extends ConsumerWidget {
  final String contentId;
  final String contentType; // 'post' or 'comment'
  final VoidCallback? onLike;
  final VoidCallback? onComment;
  final VoidCallback? onShare;
  final bool isLiked;
  final int likeCount;
  final int commentCount;

  const PostActions({
    super.key,
    required this.contentId,
    required this.contentType,
    this.onLike,
    this.onComment,
    this.onShare,
    this.isLiked = false,
    this.likeCount = 0,
    this.commentCount = 0,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Like button
        _ActionButton(
          icon: isLiked ? Icons.favorite : Icons.favorite_border,
          label: _formatCount(likeCount),
          color: isLiked ? Theme.of(context).colorScheme.error : null,
          onPressed: onLike,
        ),

        // Comment button
        _ActionButton(
          icon: Icons.chat_bubble_outline,
          label: _formatCount(commentCount),
          onPressed: onComment,
        ),

        // Share button
        _ActionButton(
          icon: Icons.share_outlined,
          label: 'Share',
          onPressed: onShare,
        ),

        // Flag/Report button
        _FlagButton(contentId: contentId, contentType: contentType),
      ],
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    } else {
      return count.toString();
    }
  }
}

/// Generic action button widget
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final Color? color;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.onPressed,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final spacing = context.spacing;
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(context.radius.md),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: spacing.lg,
          vertical: spacing.sm,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: color ?? Theme.of(context).iconTheme.color,
            ),
            SizedBox(height: spacing.xs),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: color ?? Theme.of(context).textTheme.bodySmall?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Flag/Report button with confirmation dialog
class _FlagButton extends ConsumerWidget {
  final String contentId;
  final String contentType;

  const _FlagButton({required this.contentId, required this.contentType});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _ActionButton(
      icon: Icons.flag_outlined,
      label: 'Report',
      onPressed: () => _showFlagDialog(context, ref),
    );
  }

  Future<void> _showFlagDialog(BuildContext context, WidgetRef ref) async {
    String selectedReason = 'community_violation';
    String? additionalDetails;

    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.flag, color: Theme.of(context).colorScheme.primary),
              SizedBox(width: context.spacing.sm),
              const Text('Report Content'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Why are you reporting this $contentType?',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                SizedBox(height: context.spacing.lg),

                // Reason selection
                ...FlagReason.values.map((reason) {
                  final isSelected = selectedReason == reason.value;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      isSelected
                          ? Icons.radio_button_checked
                          : Icons.radio_button_unchecked,
                      color: isSelected
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    title: Text(reason.displayName),
                    subtitle: Text(
                      reason.description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    onTap: () {
                      setState(() {
                        selectedReason = reason.value;
                      });
                    },
                  );
                }),

                SizedBox(height: context.spacing.lg),

                // Additional details (optional)
                LythTextField(
                  label: 'Additional details (optional)',
                  placeholder: 'Provide more context about the issue...',
                  maxLines: 3,
                  onChanged: (value) {
                    additionalDetails = value.isEmpty ? null : value;
                  },
                ),

                SizedBox(height: context.spacing.lg),

                // Disclaimer
                Container(
                  padding: EdgeInsets.all(context.spacing.md),
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(context.radius.md),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      SizedBox(width: context.spacing.sm),
                      Expanded(
                        child: Text(
                          'Reports are reviewed by our moderation team and community. '
                          'False reports may affect your account standing.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            LythButton.tertiary(
              label: 'Cancel',
              onPressed: () => Navigator.pop(dialogContext, false),
            ),
            LythButton.primary(
              label: 'Submit Report',
              onPressed: () => Navigator.pop(dialogContext, true),
            ),
          ],
        ),
      ),
    );

    if (result == true && context.mounted) {
      await _submitFlag(context, ref, selectedReason, additionalDetails);
    }
  }

  Future<void> _submitFlag(
    BuildContext context,
    WidgetRef ref,
    String reason,
    String? additionalDetails,
  ) async {
    // Show loading indicator
    if (context.mounted) {
      LythSnackbar.info(
        context: context,
        message: 'Submitting report...',
        duration: const Duration(seconds: 2),
      );
    }

    try {
      final client = ref.read(moderationClientProvider);
      final token = await ref.read(jwtProvider.future);
      if (token == null || token.isEmpty) {
        throw const ModerationException('User not authenticated');
      }

      final result = await client.flagContent(
        contentId: contentId,
        contentType: contentType,
        reason: reason,
        additionalDetails: additionalDetails,
        token: token,
      );

      if (context.mounted) {
        final message = result['message'] as String?;
        ScaffoldMessenger.of(context).clearSnackBars();
        LythSnackbar.success(
          context: context,
          message: message ?? 'Report submitted successfully',
        );
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();

        String errorMessage = 'Failed to submit report';
        if (error is DioException) {
          if (error.response?.statusCode == 401) {
            errorMessage = 'Please log in to report content';
          } else if (error.response?.statusCode == 429) {
            errorMessage =
                'Too many reports. Please wait before reporting again.';
          } else if (error.response?.data is Map &&
              (error.response!.data as Map)['error'] is String) {
            errorMessage = (error.response!.data as Map)['error'] as String;
          }
        } else if (error is ModerationException) {
          errorMessage = error.message;
        } else {
          errorMessage = error.toString();
        }

        LythSnackbar.error(
          context: context,
          message: errorMessage,
          action: SnackBarAction(
            label: 'Retry',
            onPressed: () =>
                _submitFlag(context, ref, reason, additionalDetails),
          ),
        );
      }
    }
  }
}

/// Flag reasons enum with display names and descriptions
enum FlagReason {
  communityViolation(
    'community_violation',
    'Community Guidelines Violation',
    'Content violates community rules or guidelines',
  ),
  spam(
    'spam',
    'Spam or Fake Content',
    'Promotional content, fake information, or repetitive posts',
  ),
  harassment(
    'harassment',
    'Harassment or Bullying',
    'Content that targets or harasses individuals',
  ),
  hateContent(
    'hate_content',
    'Hate Speech or Discrimination',
    'Content promoting hatred or discrimination',
  ),
  inappropriateContent(
    'inappropriate_content',
    'Inappropriate Content',
    'Adult content, violence, or other inappropriate material',
  ),
  misinformation(
    'misinformation',
    'Misinformation',
    'False or misleading information',
  ),
  other('other', 'Other', 'Report for a reason not listed above');

  const FlagReason(this.value, this.displayName, this.description);

  final String value;
  final String displayName;
  final String description;
}
