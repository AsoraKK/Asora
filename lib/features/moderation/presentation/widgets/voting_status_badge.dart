// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:asora/features/moderation/domain/appeal.dart';

/// ASORA VOTING STATUS BADGE
///
/// 🎯 Purpose: Display voting status with color-coded badge
/// 🔍 Single Responsibility: Status visualization only

class VotingStatusBadge extends StatelessWidget {
  final VotingStatus status;

  const VotingStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final statusInfo = _getStatusInfo(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: statusInfo.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusInfo.color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(statusInfo.icon, size: 16, color: statusInfo.color),
          const SizedBox(width: 6),
          Text(
            statusInfo.label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: statusInfo.color,
            ),
          ),
        ],
      ),
    );
  }

  StatusInfo _getStatusInfo(VotingStatus status) {
    switch (status) {
      case VotingStatus.active:
        return StatusInfo(
          color: Colors.blue,
          icon: Icons.how_to_vote,
          label: 'Active Voting',
        );
      case VotingStatus.quorumReached:
        return StatusInfo(
          color: Colors.green,
          icon: Icons.check_circle,
          label: 'Quorum Reached',
        );
      case VotingStatus.timeExpired:
        return StatusInfo(
          color: Colors.orange,
          icon: Icons.access_time,
          label: 'Time Expired',
        );
      case VotingStatus.resolved:
        return StatusInfo(
          color: Colors.purple,
          icon: Icons.verified,
          label: 'Resolved',
        );
    }
  }
}

class StatusInfo {
  final Color color;
  final IconData icon;
  final String label;

  StatusInfo({required this.color, required this.icon, required this.label});
}
