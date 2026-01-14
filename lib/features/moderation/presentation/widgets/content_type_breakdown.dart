// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/core/utils/content_type_helper.dart';
import 'package:asora/design_system/components/lyth_card.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/features/moderation/domain/appeal.dart';

/// ASORA CONTENT TYPE BREAKDOWN WIDGET
///
/// 🎯 Purpose: Display breakdown of appeals by content type
/// 🔍 Single Responsibility: Content type analytics only

class ContentTypeBreakdown extends StatelessWidget {
  final List<Appeal> appeals;

  const ContentTypeBreakdown({super.key, required this.appeals});

  @override
  Widget build(BuildContext context) {
    final contentTypes = _calculateContentTypeBreakdown();

    return LythCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Appeals by Content Type',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          SizedBox(height: context.spacing.lg),
          ...contentTypes.entries.map(
            (entry) => _buildContentTypeRow(context, entry),
          ),
        ],
      ),
    );
  }

  Widget _buildContentTypeRow(
    BuildContext context,
    MapEntry<String, int> entry,
  ) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: context.spacing.xs),
      child: Row(
        children: [
          Icon(
            ContentTypeHelper.getIcon(entry.key),
            size: 16,
            color: Theme.of(context).colorScheme.primary,
          ),
          SizedBox(width: context.spacing.sm),
          Text(entry.key.toUpperCase()),
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

  Map<String, int> _calculateContentTypeBreakdown() {
    final contentTypes = <String, int>{};
    for (final appeal in appeals) {
      contentTypes[appeal.contentType] =
          (contentTypes[appeal.contentType] ?? 0) + 1;
    }
    return contentTypes;
  }
}
