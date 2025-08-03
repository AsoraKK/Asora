import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../application/moderation_providers.dart';
import '../../domain/appeal.dart';

/// ASORA APPEAL HISTORY SCREEN
///
/// 🎯 Purpose: Personal dashboard for tracking user's appeal submissions
/// ✅ Features: Appeal timeline, status tracking, outcome history
/// 📊 Analytics: Success rates, response times, and patterns
/// 🔍 Filtering: By status, content type, and date range
/// 🏗️ Architecture: Presentation layer - Clean Architecture compliant

class AppealHistoryScreen extends ConsumerStatefulWidget {
  const AppealHistoryScreen({super.key});

  @override
  ConsumerState<AppealHistoryScreen> createState() =>
      _AppealHistoryScreenState();
}

class _AppealHistoryScreenState extends ConsumerState<AppealHistoryScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appeals'),
        centerTitle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(myAppealsProvider),
            tooltip: 'Refresh',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'All', icon: Icon(Icons.list)),
            Tab(text: 'Active', icon: Icon(Icons.pending_actions)),
            Tab(text: 'Analytics', icon: Icon(Icons.analytics)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAllAppeals(),
          _buildActiveAppeals(),
          _buildAnalytics(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showNewAppealDialog(),
        icon: const Icon(Icons.add),
        label: const Text('New Appeal'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
    );
  }

  Widget _buildAllAppeals() {
    final appealsAsyncValue = ref.watch(myAppealsProvider);

    return appealsAsyncValue.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => _buildErrorState(error.toString()),
      data: (appeals) {
        if (appeals.isEmpty) {
          return _buildEmptyState();
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(myAppealsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: appeals.length,
            itemBuilder: (context, index) {
              final appeal = appeals[index];
              return _buildAppealCard(appeal);
            },
          ),
        );
      },
    );
  }

  Widget _buildActiveAppeals() {
    final appealsAsyncValue = ref.watch(myAppealsProvider);

    return appealsAsyncValue.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => _buildErrorState(error.toString()),
      data: (appeals) {
        final activeAppeals = appeals
            .where((appeal) => appeal.votingStatus == VotingStatus.active)
            .toList();

        if (activeAppeals.isEmpty) {
          return _buildEmptyState('No active appeals');
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: activeAppeals.length,
          itemBuilder: (context, index) {
            final appeal = activeAppeals[index];
            return _buildAppealCard(appeal, showProgress: true);
          },
        );
      },
    );
  }

  Widget _buildAnalytics() {
    final appealsAsyncValue = ref.watch(myAppealsProvider);

    return appealsAsyncValue.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => _buildErrorState(error.toString()),
      data: (appeals) {
        if (appeals.isEmpty) {
          return _buildEmptyState('No data for analytics');
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildOverviewCards(appeals),
              const SizedBox(height: 24),
              _buildContentTypeBreakdown(appeals),
              const SizedBox(height: 24),
              _buildVotingStatusBreakdown(appeals),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAppealCard(Appeal appeal, {bool showProgress = false}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status and date
            Row(
              children: [
                _buildStatusBadge(appeal.votingStatus),
                const Spacer(),
                Text(
                  _formatDate(appeal.submittedAt),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Content info
            Row(
              children: [
                Icon(
                  _getContentIcon(appeal.contentType),
                  size: 16,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  appeal.contentType.toUpperCase(),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 16),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: _getUrgencyColor(
                      appeal.urgencyScore,
                    ).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _getUrgencyColor(appeal.urgencyScore),
                    ),
                  ),
                  child: Text(
                    'Urgency: ${appeal.urgencyScore}/100',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: _getUrgencyColor(appeal.urgencyScore),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Content preview
            if (appeal.contentTitle != null) ...[
              Text(
                appeal.contentTitle!,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
            ],

            Text(
              appeal.contentPreview,
              style: Theme.of(context).textTheme.bodyMedium,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),

            const SizedBox(height: 12),

            // Appeal reason
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Appeal Type: ${appeal.appealType.replaceAll('_', ' ')}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    appeal.appealReason,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Progress indicator for active appeals
            if (showProgress && appeal.votingProgress != null) ...[
              const SizedBox(height: 12),
              _buildProgressIndicator(appeal.votingProgress!),
            ],

            const SizedBox(height: 12),

            // Action buttons
            Row(
              children: [
                TextButton.icon(
                  onPressed: () => _showAppealDetails(appeal),
                  icon: const Icon(Icons.visibility),
                  label: const Text('View Details'),
                ),
                const Spacer(),
                if (appeal.votingStatus == VotingStatus.active)
                  Icon(
                    Icons.schedule,
                    size: 16,
                    color: Theme.of(context).colorScheme.primary,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(VotingStatus status) {
    Color color;
    IconData icon;
    String label;

    switch (status) {
      case VotingStatus.active:
        color = Colors.blue;
        icon = Icons.how_to_vote;
        label = 'Active Voting';
        break;
      case VotingStatus.quorumReached:
        color = Colors.green;
        icon = Icons.check_circle;
        label = 'Quorum Reached';
        break;
      case VotingStatus.timeExpired:
        color = Colors.orange;
        icon = Icons.access_time;
        label = 'Time Expired';
        break;
      case VotingStatus.resolved:
        color = Colors.purple;
        icon = Icons.verified;
        label = 'Resolved';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(VotingProgress progress) {
    final approvalRate = progress.approvalRate;

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
        ),
        const SizedBox(height: 8),

        if (progress.totalVotes > 0) ...[
          LinearProgressIndicator(
            value: approvalRate / 100,
            backgroundColor: Colors.red.withValues(alpha: 0.3),
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
          ),
          const SizedBox(height: 4),
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
          Text(
            'Waiting for community votes...',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
          ),
        ],

        if (progress.timeRemaining != null) ...[
          const SizedBox(height: 4),
          Text(
            'Time remaining: ${progress.timeRemaining}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.outline,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildOverviewCards(List<Appeal> appeals) {
    final totalAppeals = appeals.length;
    final activeAppeals = appeals
        .where((a) => a.votingStatus == VotingStatus.active)
        .length;
    final resolvedAppeals = appeals
        .where((a) => a.votingStatus == VotingStatus.resolved)
        .length;
    final successRate = totalAppeals > 0
        ? (resolvedAppeals / totalAppeals * 100)
        : 0;

    return Row(
      children: [
        Expanded(
          child: _buildOverviewCard(
            'Total Appeals',
            totalAppeals.toString(),
            Icons.list,
            Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildOverviewCard(
            'Resolution Rate',
            '${successRate.toStringAsFixed(1)}%',
            Icons.trending_up,
            Colors.green,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildOverviewCard(
            'Active',
            activeAppeals.toString(),
            Icons.pending_actions,
            Colors.orange,
          ),
        ),
      ],
    );
  }

  Widget _buildOverviewCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContentTypeBreakdown(List<Appeal> appeals) {
    final contentTypes = <String, int>{};
    for (final appeal in appeals) {
      contentTypes[appeal.contentType] =
          (contentTypes[appeal.contentType] ?? 0) + 1;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Appeals by Content Type',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...contentTypes.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(
                      _getContentIcon(entry.key),
                      size: 16,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(entry.key.toUpperCase()),
                    const Spacer(),
                    Text(
                      entry.value.toString(),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVotingStatusBreakdown(List<Appeal> appeals) {
    final statusCounts = <VotingStatus, int>{};
    for (final appeal in appeals) {
      statusCounts[appeal.votingStatus] =
          (statusCounts[appeal.votingStatus] ?? 0) + 1;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Appeals by Status',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...statusCounts.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    _buildStatusBadge(entry.key),
                    const Spacer(),
                    Text(
                      entry.value.toString(),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            'Failed to load appeals',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => ref.invalidate(myAppealsProvider),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState([String? message]) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            message ?? 'No appeals yet',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Your submitted appeals will appear here',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showNewAppealDialog(),
            icon: const Icon(Icons.add),
            label: const Text('Submit First Appeal'),
          ),
        ],
      ),
    );
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

  Color _getUrgencyColor(int urgency) {
    if (urgency >= 80) return Colors.red;
    if (urgency >= 60) return Colors.orange;
    if (urgency >= 40) return Colors.yellow[700]!;
    return Colors.green;
  }

  String _formatDate(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 7) {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} days ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  void _showAppealDetails(Appeal appeal) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Appeal Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Status: ${appeal.votingStatus.name}'),
              const SizedBox(height: 8),
              Text('Content Type: ${appeal.contentType}'),
              const SizedBox(height: 8),
              Text('Submitted: ${_formatDate(appeal.submittedAt)}'),
              const SizedBox(height: 16),
              const Text(
                'Reason:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(appeal.appealReason),
              if (appeal.userStatement.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Statement:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(appeal.userStatement),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showNewAppealDialog() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('New appeal submission coming soon')),
    );
  }
}
