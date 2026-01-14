// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/features/moderation/presentation/widgets/moderator_guard.dart';
import 'package:asora/features/moderation/presentation/moderation_console/moderation_audit_tab.dart';
import 'package:asora/features/moderation/presentation/moderation_console/moderation_queue_tab.dart';

class ModerationConsoleScreen extends ConsumerStatefulWidget {
  const ModerationConsoleScreen({super.key});

  static const List<Tab> _tabs = [
    Tab(icon: Icon(Icons.view_list), text: 'Queue'),
    Tab(icon: Icon(Icons.insights), text: 'Audit'),
    Tab(icon: Icon(Icons.flash_on_outlined), text: 'Insights'),
  ];

  @override
  ConsumerState<ModerationConsoleScreen> createState() =>
      _ModerationConsoleScreenState();
}

class _ModerationConsoleScreenState
    extends ConsumerState<ModerationConsoleScreen> {
  late final AnalyticsClient _analyticsClient;
  bool _hasLoggedView = false;

  @override
  void initState() {
    super.initState();
    _analyticsClient = ref.read(analyticsClientProvider);
    WidgetsBinding.instance.addPostFrameCallback((_) => _logView());
  }

  void _logView() {
    if (_hasLoggedView) return;
    _analyticsClient.logEvent(
      AnalyticsEvents.screenView,
      properties: {
        AnalyticsEvents.propScreenName: 'moderation_console',
        AnalyticsEvents.propReferrer: 'feed',
      },
    );
    _analyticsClient.logEvent(AnalyticsEvents.moderationConsoleOpened);
    _hasLoggedView = true;
  }

  @override
  Widget build(BuildContext context) {
    return ModeratorGuard(
      title: 'Moderation',
      child: DefaultTabController(
        length: ModerationConsoleScreen._tabs.length,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Moderation Console'),
            centerTitle: false,
            bottom: const TabBar(tabs: ModerationConsoleScreen._tabs),
          ),
          body: const TabBarView(
            children: [
              ModerationQueueTab(),
              ModerationAuditTab(),
              _InsightsTab(),
            ],
          ),
        ),
      ),
    );
  }
}

class _InsightsTab extends StatelessWidget {
  const _InsightsTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.flash_on_outlined,
            size: 72,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(height: 16),
          Text(
            'Insights coming soon',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Dashboards for escalation load, policy tests, and queue health are coming in the next release.',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
