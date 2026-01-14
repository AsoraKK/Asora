// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/features/moderation/application/moderation_providers.dart';

/// ASORA APPEAL VOTING CARD
///
/// 🎯 Purpose: Interactive card for community voting on appealed content
/// ✅ Features: Content preview, voting buttons, progress display
/// 🔐 Security: User eligibility validation and vote tracking
/// 📱 UX: Real-time feedback and responsive design
/// 🏗️ Architecture: Presentation layer widget - Clean Architecture compliant

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

                // Appeal reason
                _buildAppealSection(),

                const SizedBox(height: 16),

                // Voting progress
                if (widget.appeal.votingProgress != null)
                  _buildVotingProgress(),

                const SizedBox(height: 16),

                // Voting buttons
                _buildVotingButtons(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUrgencyBadge() {
    final urgency = widget.appeal.urgencyScore;
    final color = _getUrgencyColor(urgency);
    String label;

    if (urgency >= 80) {
      label = 'Critical';
    } else if (urgency >= 60) {
      label = 'High';
    } else if (urgency >= 40) {
      label = 'Medium';
    } else {
      label = 'Low';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTimeRemaining() {
    final progress = widget.appeal.votingProgress;
    if (progress?.timeRemaining == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.access_time, size: 14, color: Colors.orange),
          const SizedBox(width: 4),
          Text(
            progress!.timeRemaining!,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.orange,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getContentIcon(widget.appeal.contentType),
                size: 16,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                'Original ${widget.appeal.contentType}',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (widget.appeal.contentTitle != null) ...[
            Text(
              widget.appeal.contentTitle!,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              maxLines: widget.showFullContent ? null : 2,
              overflow: widget.showFullContent ? null : TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
          ],
          Text(
            widget.appeal.contentPreview,
            style: Theme.of(context).textTheme.bodyMedium,
            maxLines: widget.showFullContent ? null : 3,
            overflow: widget.showFullContent ? null : TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildModerationInfo() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.flag, size: 16, color: Colors.red),
              const SizedBox(width: 8),
              Text(
                'Flagged for: ${widget.appeal.flagReason}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.red[700],
                ),
              ),
            ],
          ),
          if (widget.appeal.flagCategories.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: widget.appeal.flagCategories.map((category) {
                return Chip(
                  label: Text(category, style: const TextStyle(fontSize: 12)),
                  backgroundColor: Colors.red.withValues(alpha: 0.1),
                  side: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAppealSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel, size: 16, color: Colors.blue),
              const SizedBox(width: 8),
              Text(
                'Appeal: ${widget.appeal.appealType.replaceAll('_', ' ').toUpperCase()}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[700],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            widget.appeal.appealReason,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (widget.appeal.userStatement.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '"${widget.appeal.userStatement}"',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontStyle: FontStyle.italic),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVotingProgress() {
    final progress = widget.appeal.votingProgress!;
    final approvalRate = progress.approvalRate;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.how_to_vote, size: 16),
              const SizedBox(width: 8),
              Text(
                'Community Voting',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Text(
                '${progress.totalVotes} votes',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (progress.totalVotes > 0) ...[
            LinearProgressIndicator(
              value: approvalRate / 100,
              backgroundColor: Colors.red.withValues(alpha: 0.3),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  '${progress.approveVotes} approve (${approvalRate.toStringAsFixed(1)}%)',
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
            Text(
              'Be the first to vote on this appeal',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
            ),
          ],
          if (progress.quorumMet) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.green),
              ),
              child: const Text(
                'Quorum reached',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVotingButtons() {
    // Check if user has already voted
    if (_localUserVote != null) {
      return _buildVotedState();
    }

    // Check if user can vote
    if (!widget.appeal.canUserVote) {
      return _buildIneligibleState();
    }

    // Show voting buttons
    return _buildActiveVotingButtons();
  }

  Widget _buildVotedState() {
    final isApprove = _localUserVote == 'approve';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (isApprove ? Colors.green : Colors.red).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: (isApprove ? Colors.green : Colors.red).withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isApprove ? Icons.thumb_up : Icons.thumb_down,
            color: isApprove ? Colors.green : Colors.red,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            'You voted to ${isApprove ? 'approve' : 'reject'} this appeal',
            style: TextStyle(
              color: isApprove ? Colors.green[700] : Colors.red[700],
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIneligibleState() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.block, color: Colors.grey, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              widget.appeal.voteIneligibilityReason ??
                  'You cannot vote on this appeal',
              style: const TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveVotingButtons() {
    final row = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        ElevatedButton.icon(
          onPressed: _isVoting ? null : () => _submitVote('approve'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
          ),
          icon: _isVoting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Icon(Icons.thumb_up),
          label: const Text('Approve'),
        ),
        const SizedBox(width: 12),
        ElevatedButton.icon(
          onPressed: _isVoting ? null : () => _submitVote('reject'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          icon: _isVoting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Icon(Icons.thumb_down),
          label: const Text('Reject'),
        ),
      ],
    );
    return row;
  }

  Future<void> _submitVote(String vote) async {
    setState(() {
      _isVoting = true;
    });

    try {
      final submission = VoteSubmission(
        appealId: widget.appeal.appealId,
        vote: vote,
      );

      final result = await ref.read(submitVoteProvider(submission).future);

      if (result.success) {
        setState(() {
          _localUserVote = vote;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Vote submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );
        }

        widget.onVoteSubmitted?.call();
      } else {
        throw Exception(result.message ?? 'Failed to submit vote');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit vote: $error'),
            backgroundColor: Colors.red,
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

  IconData _getContentIcon(String contentType) {
    switch (contentType.toLowerCase()) {
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
