import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/application/auth_providers.dart';
import '../../../auth/domain/user.dart';
import '../../application/moderation_providers.dart';
import '../../domain/appeal.dart';
import '../../domain/moderation_repository.dart';
import '../widgets/appeal_voting_card.dart';

/// Moderation queue screen for moderators and admins.
///
/// Loads the community voting feed and lets privileged users
/// review appeals and submit votes without leaving the app.
class ModerationQueueScreen extends ConsumerWidget {
  const ModerationQueueScreen({super.key});

  static const VotingFeedParams _defaultParams = VotingFeedParams();

  Future<void> _refreshQueue(WidgetRef ref) async {
    ref.invalidate(votingFeedProvider(_defaultParams));
    await ref.read(votingFeedProvider(_defaultParams).future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Moderation Queue')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, stackTrace) => Scaffold(
        appBar: AppBar(title: const Text('Moderation Queue')),
        body: _QueueError(
          message: 'Authentication error: ${error.toString()}',
          onRetry: () async {
            await ref.read(authStateProvider.notifier).refreshToken();
          },
        ),
      ),
      data: (user) {
        if (user == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Moderation Queue')),
            body: const _UnauthorizedState(),
          );
        }

        final isModerator =
            user.role == UserRole.moderator || user.role == UserRole.admin;
        if (!isModerator) {
          return Scaffold(
            appBar: AppBar(title: const Text('Moderation Queue')),
            body: const _UnauthorizedState(),
          );
        }

        final queue = ref.watch(votingFeedProvider(_defaultParams));

        return Scaffold(
          appBar: AppBar(title: const Text('Moderation Queue')),
          body: RefreshIndicator(
            onRefresh: () => _refreshQueue(ref),
            child: queue.when(
              data: (response) => _QueueBody(
                response: response,
                onVoteSubmitted: (appeal) async {
                  final appealId = appeal.appealId;
                  final shortId = appealId.length > 8
                      ? '${appealId.substring(0, 8)}…'
                      : appealId;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Vote recorded for appeal $shortId'),
                    ),
                  );
                  await _refreshQueue(ref);
                },
              ),
              loading: () => const _QueueLoading(),
              error: (error, stackTrace) => _QueueError(
                message: error is ModerationException
                    ? error.message
                    : 'Unable to load the moderation queue. Please try again.',
                onRetry: () => _refreshQueue(ref),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _QueueBody extends StatelessWidget {
  const _QueueBody({required this.response, required this.onVoteSubmitted});

  final AppealResponse response;
  final ValueChanged<Appeal> onVoteSubmitted;

  @override
  Widget build(BuildContext context) {
    final appeals = response.appeals;

    if (appeals.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: const [_EmptyQueueState()],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 32),
      itemCount: appeals.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return _QueueSummary(summary: response.summary);
        }

        final appeal = appeals[index - 1];
        return AppealVotingCard(
          appeal: appeal,
          onVoteSubmitted: () => onVoteSubmitted(appeal),
        );
      },
    );
  }
}

class _QueueSummary extends StatelessWidget {
  const _QueueSummary({required this.summary});

  final AppealSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Queue health',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 16,
                runSpacing: 12,
                children: [
                  _SummaryMetric(
                    icon: Icons.gavel,
                    label: 'Active appeals',
                    value: summary.totalActive.toString(),
                  ),
                  _SummaryMetric(
                    icon: Icons.how_to_vote,
                    label: 'Total votes',
                    value: summary.totalVotes.toString(),
                  ),
                  _SummaryMetric(
                    icon: Icons.check_circle_outline,
                    label: 'Your votes',
                    value: summary.userVotes.toString(),
                  ),
                  _SummaryMetric(
                    icon: Icons.timer_outlined,
                    label: 'Avg resolution',
                    value:
                        '${summary.averageResolutionTime.toStringAsFixed(1)}h',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryMetric extends StatelessWidget {
  const _SummaryMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.primary),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ],
    );
  }
}

class _QueueLoading extends StatelessWidget {
  const _QueueLoading();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: const [
        SizedBox(height: 160),
        Center(child: CircularProgressIndicator()),
      ],
    );
  }
}

class _QueueError extends StatelessWidget {
  const _QueueError({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ],
    );
  }
}

class _UnauthorizedState extends StatelessWidget {
  const _UnauthorizedState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.verified_user_outlined,
              size: 64,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Moderator access required',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'You need a moderator or admin role to view the review queue.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyQueueState extends StatelessWidget {
  const _EmptyQueueState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.celebration_outlined,
          size: 64,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'Nothing to review right now!',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'All flagged content has been resolved. We\'ll notify you when new appeals arrive.',
          style: theme.textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
