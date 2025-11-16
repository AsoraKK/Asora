import 'package:flutter/material.dart';

/// ASORA URGENCY INDICATOR
///
/// 🎯 Purpose: Display urgency score with color-coded indicator
/// 🔍 Single Responsibility: Urgency visualization only
/// 📊 Policy: Shows NUMERIC score to appeal submitters (their own appeals)
///           Community voters see only qualitative labels (Critical/High/Medium/Low)
///           This prevents vote bias while keeping submitters informed

class UrgencyIndicator extends StatelessWidget {
  final int score;

  const UrgencyIndicator({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final color = _getUrgencyColor(score);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(
        'Urgency: $score/100',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }

  Color _getUrgencyColor(int urgency) {
    if (urgency >= 80) return Colors.red;
    if (urgency >= 60) return Colors.orange;
    if (urgency >= 40) return Colors.yellow[700]!;
    return Colors.green;
  }
}
