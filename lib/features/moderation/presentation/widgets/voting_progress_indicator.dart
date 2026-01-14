// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:asora/features/moderation/domain/appeal.dart';

/// ASORA VOTING PROGRESS INDICATOR
///
/// 🎯 Purpose: Display voting progress with progress bar and statistics
/// 🔍 Single Responsibility: Progress visualization only

class VotingProgressIndicator extends StatelessWidget {
  final VotingProgress progress;

  const VotingProgressIndicator({super.key, required this.progress});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(context),
        const SizedBox(height: 8),
        if (progress.totalVotes > 0) ...[
          _buildProgressBar(),
          const SizedBox(height: 4),
          _buildVoteBreakdown(),
        ] else ...[
          _buildWaitingMessage(context),
        ],
        if (progress.timeRemaining != null) ...[
          const SizedBox(height: 4),
          _buildTimeRemaining(context),
        ],
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Icon(
          Icons.how_to_vote,
          size: 16,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(width: 8),
        Text(
          'Community Voting Progress',
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
    );
  }

  Widget _buildProgressBar() {
    return LinearProgressIndicator(
      value: progress.approvalRate / 100,
      backgroundColor: Colors.red.withValues(alpha: 0.3),
      valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
    );
  }

  Widget _buildVoteBreakdown() {
    return Row(
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
    );
  }

  Widget _buildWaitingMessage(BuildContext context) {
    return Text(
      'Waiting for community votes...',
      style: Theme.of(
        context,
      ).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
    );
  }

  Widget _buildTimeRemaining(BuildContext context) {
    return Text(
      'Time remaining: ${progress.timeRemaining}',
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
        color: Theme.of(context).colorScheme.outline,
      ),
    );
  }
}
