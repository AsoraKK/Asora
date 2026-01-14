// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/design_system/components/lyth_card.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/features/moderation/domain/appeal.dart';
import 'package:asora/features/moderation/presentation/widgets/voting_status_badge.dart';

/// ASORA VOTING STATUS BREAKDOWN WIDGET
///
/// 🎯 Purpose: Display breakdown of appeals by voting status
/// 🔍 Single Responsibility: Status analytics only

class VotingStatusBreakdown extends StatelessWidget {
  final List<Appeal> appeals;

  const VotingStatusBreakdown({super.key, required this.appeals});

  @override
  Widget build(BuildContext context) {
    final statusCounts = _calculateStatusBreakdown();

    return LythCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Appeals by Status',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          SizedBox(height: context.spacing.lg),
          ...statusCounts.entries.map((entry) => _buildStatusRow(context, entry)),
        ],
      ),
    );
  }

  Widget _buildStatusRow(BuildContext context, MapEntry<VotingStatus, int> entry) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: context.spacing.xs),
      child: Row(
        children: [
          VotingStatusBadge(status: entry.key),
          const Spacer(),
          Text(
            entry.value.toString(),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Map<VotingStatus, int> _calculateStatusBreakdown() {
    final statusCounts = <VotingStatus, int>{};
    for (final appeal in appeals) {
      statusCounts[appeal.votingStatus] =
          (statusCounts[appeal.votingStatus] ?? 0) + 1;
    }
    return statusCounts;
  }
}
