import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../services/moderation_service.dart';
import '../models/appeal.dart';

/// ASORA APPEAL VOTING CARD
///
/// 🎯 Purpose: Interactive card for community voting on appealed content
/// ✅ Features: Content preview, voting buttons, progress display
/// 🔐 Security: User eligibility validation and vote tracking
/// 📱 UX: Real-time feedback and responsive design

class AppealVotingCard extends ConsumerStatefulWidget {
  final Appeal appeal;
  final VoidCallback? onVoteSubmitted;
  final bool showFullContent;

  const AppealVotingCard({
    super.key,
    required this.appeal,
    this.onVoteSubmitted,
    this.showFullContent = false,
  });

  @override
  ConsumerState<AppealVotingCard> createState() => _AppealVotingCardState();
}

class _AppealVotingCardState extends ConsumerState<AppealVotingCard> {
  bool _isVoting = false;
  String? _localUserVote;

  @override
  void initState() {
    super.initState();
    _localUserVote = widget.appeal.userVote;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with urgency indicator
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _getUrgencyColor(
                widget.appeal.urgencyScore,
              ).withValues(alpha: 0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                _buildUrgencyBadge(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Appeal for ${widget.appeal.contentType}',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: _getUrgencyColor(widget.appeal.urgencyScore),
                        ),
                      ),
                      Text(
                        'by ${widget.appeal.submitterName} • ${_formatTimeAgo(widget.appeal.submittedAt)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (widget.appeal.votingProgress != null) _buildTimeRemaining(),
              ],
            ),
          ),

          // Content preview
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Original content
                _buildContentSection(),

                const SizedBox(height: 16),

                // Moderation info
                _buildModerationInfo(),

                const SizedBox(height: 16),

                // Appeal details
                _buildAppealDetails(),

                if (widget.appeal.votingProgress != null) ...[
                  const SizedBox(height: 16),
                  _buildVotingProgress(),
                ],
              ],
            ),
          ),

          // Voting actions or results
          _buildVotingSection(),
        ],
      ),
    );
  }

  Widget _buildUrgencyBadge() {
    final urgency = widget.appeal.urgencyScore;
    String label;
    IconData icon;

    if (urgency >= 80) {
      label = 'URGENT';
      icon = Icons.priority_high;
    } else if (urgency >= 60) {
      label = 'HIGH';
      icon = Icons.trending_up;
    } else if (urgency >= 40) {
      label = 'MEDIUM';
      icon = Icons.remove;
    } else {
      label = 'LOW';
      icon = Icons.trending_down;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getUrgencyColor(urgency),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeRemaining() {
    final progress = widget.appeal.votingProgress!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.schedule,
            size: 14,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          const SizedBox(width: 4),
          Text(
            progress.timeRemaining ?? 'Processing',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurface,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              _getContentTypeIcon(),
              size: 16,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 8),
            Text(
              'Original Content',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (widget.appeal.contentTitle != null) ...[
          Text(
            widget.appeal.contentTitle!,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
        ],

        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Theme.of(
                context,
              ).colorScheme.outline.withValues(alpha: 0.3),
            ),
          ),
          child: Text(
            widget.appeal.contentPreview,
            style: Theme.of(context).textTheme.bodyMedium,
            maxLines: widget.showFullContent ? null : 3,
            overflow: widget.showFullContent ? null : TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildModerationInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.gavel, size: 16, color: Colors.orange),
            const SizedBox(width: 8),
            Text(
              'Moderation Details',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Flag reason and categories
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            _buildInfoChip(
              'Reason: ${widget.appeal.flagReason}',
              Icons.flag,
              Colors.orange,
            ),
            _buildInfoChip(
              '${widget.appeal.flagCount} reports',
              Icons.report,
              Colors.red,
            ),
            if (widget.appeal.aiScore != null)
              _buildInfoChip(
                'AI: ${(widget.appeal.aiScore! * 100).round()}%',
                Icons.psychology,
                widget.appeal.aiScore! > 0.7
                    ? Colors.red
                    : widget.appeal.aiScore! > 0.4
                    ? Colors.orange
                    : Colors.green,
              ),
          ],
        ),

        // Flag categories
        if (widget.appeal.flagCategories.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: widget.appeal.flagCategories
                .map(
                  (category) => Chip(
                    label: Text(category, style: const TextStyle(fontSize: 12)),
                    backgroundColor: Theme.of(
                      context,
                    ).colorScheme.errorContainer,
                    side: BorderSide.none,
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildAppealDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.contact_support,
              size: 16,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 8),
            Text(
              'Appeal Details',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Appeal type
        _buildInfoChip(
          'Type: ${widget.appeal.appealType.replaceAll('_', ' ')}',
          Icons.category,
          Colors.blue,
        ),

        const SizedBox(height: 8),

        // Appeal reason
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(
              context,
            ).colorScheme.primaryContainer.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Appeal Reason:',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                widget.appeal.appealReason,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (widget.appeal.userStatement.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'User Statement:',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.appeal.userStatement,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontStyle: FontStyle.italic),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVotingProgress() {
    final progress = widget.appeal.votingProgress!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.how_to_vote,
              size: 16,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 8),
            Text(
              'Community Voting',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            Text(
              '${progress.totalVotes} votes',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Progress bar
        if (progress.totalVotes > 0) ...[
          LinearProgressIndicator(
            value: progress.approvalRate / 100,
            backgroundColor: Colors.red.withValues(alpha: 0.3),
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '${progress.approveVotes} approve',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.green,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Text(
                '${progress.rejectVotes} reject',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.red,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ] else ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'No votes yet. Be the first to vote!',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
              textAlign: TextAlign.center,
            ),
          ),
        ],

        // Quorum status
        if (progress.quorumMet) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle, size: 16, color: Colors.green),
                SizedBox(width: 4),
                Text(
                  'Quorum reached - result will be processed soon',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildVotingSection() {
    final hasVoted = _localUserVote != null;

    if (hasVoted) {
      return _buildVoteResultSection();
    } else if (!widget.appeal.canUserVote) {
      return _buildIneligibleSection();
    } else {
      return _buildVotingButtons();
    }
  }

  Widget _buildVoteResultSection() {
    final isApprove = _localUserVote == 'approve';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: (isApprove ? Colors.green : Colors.red).withValues(alpha: 0.1),
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Row(
        children: [
          Icon(
            isApprove ? Icons.thumb_up : Icons.thumb_down,
            color: isApprove ? Colors.green : Colors.red,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You voted to ${isApprove ? 'approve' : 'reject'} this appeal',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isApprove ? Colors.green : Colors.red,
                  ),
                ),
                Text(
                  'Thank you for participating in community moderation',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Icon(
            Icons.check_circle,
            color: isApprove ? Colors.green : Colors.red,
          ),
        ],
      ),
    );
  }

  Widget _buildIneligibleSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.1),
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Row(
        children: [
          const Icon(Icons.block, color: Colors.grey),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cannot vote on this appeal',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[700],
                  ),
                ),
                Text(
                  widget.appeal.voteIneligibilityReason ??
                      'You are not eligible to vote on this content',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVotingButtons() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Cast your vote',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Should this content be restored?',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isVoting ? null : () => _submitVote('approve'),
                  icon: _isVoting && _localUserVote == 'approve'
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.thumb_up),
                  label: const Text('Approve'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isVoting ? null : () => _submitVote('reject'),
                  icon: _isVoting && _localUserVote == 'reject'
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.thumb_down),
                  label: const Text('Reject'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitVote(String vote) async {
    if (_isVoting) return;

    setState(() {
      _isVoting = true;
      _localUserVote = vote; // Optimistically update UI
    });

    try {
      final client = ref.read(moderationClientProvider);
      final token = ref.read(jwtProvider);

      if (token == null) {
        throw Exception('Please log in to vote');
      }

      final result = await client.submitVote(
        appealId: widget.appeal.appealId,
        vote: vote,
        token: token,
      );

      if (result['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      result['message'] ?? 'Vote submitted successfully',
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );

          widget.onVoteSubmitted?.call();
        }
      } else {
        throw Exception(result['message'] ?? 'Failed to submit vote');
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _localUserVote = null; // Revert optimistic update
        });

        String errorMessage = 'Failed to submit vote';
        if (error is DioException) {
          if (error.response?.statusCode == 401) {
            errorMessage = 'Please log in to vote';
          } else if (error.response?.statusCode == 409) {
            errorMessage = 'You have already voted on this appeal';
          } else if (error.response?.statusCode == 429) {
            errorMessage = 'Please wait before voting again';
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
              onPressed: () => _submitVote(vote),
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isVoting = false;
        });
      }
    }
  }

  Color _getUrgencyColor(int urgency) {
    if (urgency >= 80) return Colors.red;
    if (urgency >= 60) return Colors.orange;
    if (urgency >= 40) return Colors.yellow[700]!;
    return Colors.green;
  }

  IconData _getContentTypeIcon() {
    switch (widget.appeal.contentType.toLowerCase()) {
      case 'post':
        return Icons.article;
      case 'comment':
        return Icons.comment;
      case 'user':
        return Icons.person;
      default:
        return Icons.content_copy;
    }
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
