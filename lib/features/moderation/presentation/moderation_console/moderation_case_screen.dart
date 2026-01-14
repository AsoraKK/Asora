// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/moderation/domain/moderation_case.dart';
import 'package:asora/features/moderation/domain/moderation_decision.dart';
import 'package:asora/features/moderation/presentation/providers/moderation_console_providers.dart';
import 'package:asora/features/moderation/presentation/moderation_console/widgets/moderation_audit_timeline.dart';
import 'package:asora/features/moderation/presentation/moderation_console/widgets/moderation_decision_panel.dart';

class ModerationCaseScreen extends ConsumerWidget {
  const ModerationCaseScreen({super.key, required this.caseId});

  final String caseId;

  static const List<String> _escalationQueues = [
    'Trust & Safety',
    'Legal',
    'Policy QA',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(moderationCaseProvider(caseId));
    final notifier = ref.read(moderationCaseProvider(caseId).notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Moderation Case')),
      body: Builder(
        builder: (context) {
          if (state.isLoading && state.caseDetail == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.errorMessage != null && state.caseDetail == null) {
            return Center(child: Text(state.errorMessage!));
          }

          final caseDetail = state.caseDetail;
          if (caseDetail == null) {
            return const Center(child: Text('Case data is unavailable.'));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      state.errorMessage!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                _buildHeader(caseDetail),
                const SizedBox(height: 16),
                _buildContentPanel(caseDetail, context),
                const SizedBox(height: 16),
                _buildReportSection(caseDetail),
                const SizedBox(height: 16),
                if (caseDetail.appealDetails != null)
                  _buildAppealSummary(caseDetail.appealDetails!),
                const SizedBox(height: 16),
                ModerationDecisionPanel(
                  isSubmitting: state.decisionSubmitting,
                  onSubmit: (input) async {
                    await notifier.submitDecision(input);
                  },
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.arrow_upward),
                  label: Text(
                    caseDetail.escalation != null
                        ? 'Escalated to ${caseDetail.escalation!.targetQueue}'
                        : 'Escalate Case',
                  ),
                  onPressed: state.escalating
                      ? null
                      : () async {
                          final result = await _showEscalationDialog(context);
                          if (result != null) {
                            await notifier.escalate(result);
                          }
                        },
                ),
                const SizedBox(height: 24),
                Text(
                  'Audit trail',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                ModerationAuditTimeline(entries: caseDetail.auditTrail),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(ModerationCase data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              data.contentType.toUpperCase(),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                Chip(label: Text(data.status)),
                Chip(label: Text(data.queue)),
                Chip(label: Text(data.severity.name)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContentPanel(ModerationCase data, BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Content', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              data.contentText,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (data.mediaUrl != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 180,
                width: double.infinity,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.black12,
                    image: DecorationImage(
                      image: NetworkImage(data.mediaUrl!),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildReportSection(ModerationCase data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Reports',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (data.reports.isEmpty)
              const Text('No detailed reports available.')
            else
              ...data.reports.map(
                (report) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.flag),
                  title: Text(report.reason),
                  subtitle: Text('${report.count} report(s)'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppealSummary(ModerationAppealDetails appeal) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Appeal & Community vote',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(appeal.summary),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value:
                        appeal.overturnVotes /
                        (appeal.overturnVotes + appeal.upholdVotes + 1),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Overturn: ${appeal.overturnVotes}'),
                    Text('Uphold: ${appeal.upholdVotes}'),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<ModerationEscalationInput?> _showEscalationDialog(
    BuildContext context,
  ) {
    final reasonController = TextEditingController();
    String targetQueue = _escalationQueues.first;

    return showDialog<ModerationEscalationInput>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Escalate case'),
        content: StatefulBuilder(
          builder: (context, setState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(labelText: 'Reason'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: targetQueue,
                items: _escalationQueues
                    .map(
                      (queue) =>
                          DropdownMenuItem(value: queue, child: Text(queue)),
                    )
                    .toList(),
                decoration: const InputDecoration(labelText: 'Target queue'),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      targetQueue = value;
                    });
                  }
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please provide a reason.')),
                );
                return;
              }
              Navigator.of(context).pop(
                ModerationEscalationInput(
                  reason: reason,
                  targetQueue: targetQueue,
                ),
              );
            },
            child: const Text('Escalate'),
          ),
        ],
      ),
    );
  }
}
