// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/core/providers/repository_providers.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/features/moderation/domain/moderation_repository.dart';
import 'package:asora/features/moderation/presentation/widgets/appeal_card.dart';
import 'package:asora/features/moderation/presentation/widgets/analytics_overview_cards.dart';
import 'package:asora/features/moderation/presentation/widgets/content_type_breakdown.dart';
import 'package:asora/features/moderation/presentation/widgets/voting_status_breakdown.dart';
import 'package:asora/features/moderation/presentation/widgets/empty_state_widget.dart';
import 'package:asora/core/utils/date_formatter.dart';

/// ASORA APPEAL HISTORY PAGE
///
/// 🎯 Purpose: Personal dashboard for tracking user's appeal submissions
/// ✅ Features: Appeal timeline, status tracking, outcome history
/// 📊 Analytics: Success rates, response times, and patterns
/// 🔍 Filtering: By status, content type, and date range

class AppealHistoryPage extends ConsumerStatefulWidget {
  const AppealHistoryPage({super.key});

  @override
  ConsumerState<AppealHistoryPage> createState() => _AppealHistoryPageState();
}

class _AppealHistoryPageState extends ConsumerState<AppealHistoryPage>
    with TickerProviderStateMixin {
  List<Appeal> _appeals = [];
  bool _isLoading = true;
  String? _error;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAppeals();
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
            onPressed: _loadAppeals,
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
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return EmptyStateWidget(
        title: 'Failed to load appeals',
        subtitle: _error!,
        icon: Icons.error_outline,
        actionLabel: 'Retry',
        onAction: _loadAppeals,
      );
    }

    if (_appeals.isEmpty) {
      return EmptyStateWidget(
        title: 'No appeals yet',
        subtitle: 'Your submitted appeals will appear here',
        actionLabel: 'Submit First Appeal',
        onAction: _showNewAppealDialog,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAppeals,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _appeals.length,
        itemBuilder: (context, index) {
          final appeal = _appeals[index];
          return AppealCard(
            appeal: appeal,
            onViewDetails: () => _showAppealDetails(appeal),
          );
        },
      ),
    );
  }

  Widget _buildActiveAppeals() {
    final activeAppeals = _appeals
        .where((appeal) => appeal.votingStatus == VotingStatus.active)
        .toList();

    if (activeAppeals.isEmpty) {
      return const EmptyStateWidget(
        title: 'No active appeals',
        subtitle: 'Your active appeals will appear here',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: activeAppeals.length,
      itemBuilder: (context, index) {
        final appeal = activeAppeals[index];
        return AppealCard(
          appeal: appeal,
          showProgress: true,
          onViewDetails: () => _showAppealDetails(appeal),
        );
      },
    );
  }

  Widget _buildAnalytics() {
    if (_appeals.isEmpty) {
      return const EmptyStateWidget(
        title: 'No data for analytics',
        subtitle: 'Submit some appeals to see analytics data',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AnalyticsOverviewCards(appeals: _appeals),
          const SizedBox(height: 24),
          ContentTypeBreakdown(appeals: _appeals),
          const SizedBox(height: 24),
          VotingStatusBreakdown(appeals: _appeals),
        ],
      ),
    );
  }

  Future<void> _loadAppeals() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(moderationRepositoryProvider);
      final token = await ref.read(jwtProvider.future);
      if (token == null || token.isEmpty) {
        throw const ModerationException('User not authenticated');
      }

      final appeals = await repository.getMyAppeals(token: token);

      setState(() {
        _appeals = appeals;
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _isLoading = false;
        if (error is ModerationException) {
          _error = error.message;
        } else {
          _error = error.toString();
        }
      });
    }
  }

  void _showAppealDetails(Appeal appeal) {
    showDialog<void>(
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
              Text(
                'Submitted: ${DateFormatter.formatRelative(appeal.submittedAt)}',
              ),
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
