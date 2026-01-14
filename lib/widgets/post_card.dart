// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/features/feed/presentation/post_insights_panel.dart';
import 'package:asora/widgets/post_actions.dart';
import 'package:asora/widgets/moderation_badges.dart';
import 'package:asora/widgets/appeal_dialog.dart';
import 'package:asora/widgets/reputation_badge.dart';

/// ASORA POST CARD WITH MODERATION INTEGRATION
///
/// 🎯 Purpose: Example post card showing complete moderation integration
/// ✅ Features: Post content, actions, moderation badges, appeal functionality
/// 🎨 Design: Clean card layout with moderation status indicators
/// 🔗 Integration: Demonstrates use of all moderation widgets

class PostCard extends ConsumerStatefulWidget {
  final Post post;
  final bool isOwnPost;
  final bool showAiScores;

  const PostCard({
    super.key,
    required this.post,
    this.isOwnPost = false,
    this.showAiScores = false,
  });

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard> {
  bool _bannerDismissed = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Moderation info banner (for own posts)
          if (widget.isOwnPost && !_bannerDismissed)
            ModerationInfoBanner(
              status: widget.post.moderationStatus,
              message: _getModerationMessage(),
              onAppeal: _canAppeal() ? _showAppealDialog : null,
              onDismiss: () {
                setState(() {
                  _bannerDismissed = true;
                });
              },
            ),

          // Post header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundImage: widget.post.author.avatarUrl != null
                      ? NetworkImage(widget.post.author.avatarUrl!)
                      : null,
                  child: widget.post.author.avatarUrl == null
                      ? Text(widget.post.author.displayName[0].toUpperCase())
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.post.author.displayName,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          // Author reputation badge
                          ReputationBadge(
                            score: widget.post.author.reputationScore,
                            size: ReputationBadgeSize.small,
                          ),
                        ],
                      ),
                      Text(
                        _formatTimeAgo(widget.post.createdAt),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),

                // Moderation badges
                ModerationBadges(
                  status: widget.post.moderationStatus,
                  aiScore: widget.post.aiScore,
                  showAiScore: widget.showAiScores,
                  appealStatus: widget.post.appealStatus,
                  onAppeal: widget.isOwnPost && _canAppeal()
                      ? _showAppealDialog
                      : null,
                  isOwnContent: widget.isOwnPost,
                ),
              ],
            ),
          ),

          // Post content
          if (widget.post.moderationStatus != ModerationStatus.hidden ||
              widget.isOwnPost)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.post.title != null) ...[
                    Text(
                      widget.post.title!,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(
                    widget.post.content,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),

                  // Media content (if any)
                  if (widget.post.mediaUrls.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _buildMediaContent(),
                  ],
                ],
              ),
            )
          else
            // Hidden content placeholder
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Column(
                children: [
                  Icon(Icons.visibility_off, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 8),
                  Text(
                    'Content Hidden',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.grey[600],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This content has been hidden due to community reports',
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: Colors.grey[500]),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),

          // Post actions
          if (widget.post.moderationStatus != ModerationStatus.hidden ||
              widget.isOwnPost)
            PostActions(
              contentId: widget.post.id,
              contentType: 'post',
              isLiked: widget.post.isLiked,
              likeCount: widget.post.likeCount,
              commentCount: widget.post.commentCount,
              onLike: () => _handleLike(),
              onComment: () => _handleComment(),
              onShare: () => _handleShare(),
            ),

          // Insights panel (only visible to post author or admin)
          // The panel itself handles authorization - returns empty if not allowed
          if (widget.isOwnPost) PostInsightsPanel(postId: widget.post.id),

          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildMediaContent() {
    if (widget.post.mediaUrls.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.grey[100],
      ),
      child: widget.post.mediaUrls.length == 1
          ? ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                widget.post.mediaUrls.first,
                width: double.infinity,
                height: 200,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: double.infinity,
                  height: 200,
                  color: Colors.grey[200],
                  child: const Icon(Icons.broken_image, size: 48),
                ),
              ),
            )
          : ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: widget.post.mediaUrls.length,
              itemBuilder: (context, index) => Container(
                width: 150,
                margin: EdgeInsets.only(
                  left: index == 0 ? 0 : 8,
                  right: index == widget.post.mediaUrls.length - 1 ? 0 : 8,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    widget.post.mediaUrls[index],
                    width: 150,
                    height: 200,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 150,
                      height: 200,
                      color: Colors.grey[200],
                      child: const Icon(Icons.broken_image),
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  String? _getModerationMessage() {
    switch (widget.post.moderationStatus) {
      case ModerationStatus.flagged:
        return 'Your post has been flagged by the community. It is still visible.';
      case ModerationStatus.hidden:
        final appealStatus = widget.post.appealStatus?.toLowerCase();
        if (appealStatus == 'pending' || appealStatus == 'under_review') {
          return 'Your post is blocked pending an appeal outcome.';
        }
        return 'Your post has been blocked. You can appeal this decision if you believe it was made in error.';
      case ModerationStatus.communityRejected:
        return 'The community voted to keep your post blocked after your appeal.';
      case ModerationStatus.communityApproved:
        return 'Great news! The community voted to approve your appealed content.';
      default:
        return null;
    }
  }

  bool _canAppeal() {
    return (widget.post.moderationStatus == ModerationStatus.hidden ||
            widget.post.moderationStatus == ModerationStatus.flagged ||
            widget.post.moderationStatus ==
                ModerationStatus.communityRejected) &&
        widget.post.appealStatus == null;
  }

  Future<void> _showAppealDialog() async {
    final result = await showAppealDialog(
      context: context,
      contentId: widget.post.id,
      contentType: 'post',
      contentPreview:
          widget.post.title ?? widget.post.content.substring(0, 100),
      currentStatus: widget.post.moderationStatus,
    );

    if (result == true && mounted) {
      // Refresh post data or show success message
      setState(() {
        // Update appeal status - in a real app, you'd refresh from the server
      });
    }
  }

  void _handleLike() {
    // Implement like functionality
    debugPrint('Like pressed for post ${widget.post.id}');
  }

  void _handleComment() {
    // Navigate to comments or show comment sheet
    debugPrint('Comment pressed for post ${widget.post.id}');
  }

  void _handleShare() {
    // Implement share functionality
    debugPrint('Share pressed for post ${widget.post.id}');
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}

/// Post model for demonstration
class Post {
  final String id;
  final String? title;
  final String content;
  final Author author;
  final DateTime createdAt;
  final List<String> mediaUrls;
  final ModerationStatus moderationStatus;
  final double? aiScore;
  final String? appealStatus;
  final bool isLiked;
  final int likeCount;
  final int commentCount;

  const Post({
    required this.id,
    this.title,
    required this.content,
    required this.author,
    required this.createdAt,
    this.mediaUrls = const [],
    this.moderationStatus = ModerationStatus.clean,
    this.aiScore,
    this.appealStatus,
    this.isLiked = false,
    this.likeCount = 0,
    this.commentCount = 0,
  });
}

/// Author model for demonstration
class Author {
  final String id;
  final String displayName;
  final String? avatarUrl;
  final int reputationScore;

  const Author({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    this.reputationScore = 0,
  });

  /// Create Author from JSON response
  factory Author.fromJson(Map<String, dynamic> json) {
    return Author(
      id: json['id'] as String? ?? json['authorId'] as String,
      displayName:
          json['displayName'] as String? ??
          json['name'] as String? ??
          'Unknown',
      avatarUrl: json['avatarUrl'] as String?,
      // API sends reputation_score, cached data uses reputationScore
      reputationScore:
          json['reputation_score'] as int? ??
          json['reputationScore'] as int? ??
          0,
    );
  }
}
