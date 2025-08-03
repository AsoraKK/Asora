import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../features/moderation/application/moderation_providers.dart';

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
          color: isLiked ? Colors.red : null,
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
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: color ?? Theme.of(context).iconTheme.color,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
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
          title: const Row(
            children: [
              Icon(Icons.flag, color: Colors.orange),
              SizedBox(width: 8),
              Text('Report Content'),
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
                const SizedBox(height: 16),

                // Reason selection
                ...FlagReason.values.map(
                  (reason) => RadioListTile<String>(
                    title: Text(reason.displayName),
                    subtitle: Text(
                      reason.description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    value: reason.value,
                    groupValue: selectedReason,
                    onChanged: (value) {
                      setState(() {
                        selectedReason = value!;
                      });
                    },
                  ),
                ),

                const SizedBox(height: 16),

                // Additional details (optional)
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Additional details (optional)',
                    hintText: 'Provide more context about the issue...',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  onChanged: (value) {
                    additionalDetails = value.isEmpty ? null : value;
                  },
                ),

                const SizedBox(height: 16),

                // Disclaimer
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      const SizedBox(width: 8),
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
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
              ),
              child: const Text('Submit Report'),
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 16),
              Text('Submitting report...'),
            ],
          ),
          duration: Duration(seconds: 2),
        ),
      );
    }

    try {
      final client = ref.read(moderationClientProvider);
      final token = ref.read(jwtProvider);

      if (token == null) {
        throw Exception('Please log in to report content');
      }

      final result = await client.flagContent(
        contentId: contentId,
        contentType: contentType,
        reason: reason,
        additionalDetails: additionalDetails,
        token: token,
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    result['message'] ?? 'Report submitted successfully',
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
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
          } else if (error.response?.data?['error'] != null) {
            errorMessage = error.response!.data['error'];
          }
        } else {
          errorMessage = error.toString();
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white),
                const SizedBox(width: 16),
                Expanded(child: Text(errorMessage)),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: () =>
                  _submitFlag(context, ref, reason, additionalDetails),
            ),
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
