import 'package:flutter/material.dart';

import '../../state/models/feed_models.dart';
import '../theme/spacing.dart';
import 'feed_card.dart';
import 'tier_badge.dart';

class NewsCard extends StatelessWidget {
  const NewsCard({super.key, required this.item});

  final FeedItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Stack(
      children: [
        FeedCard(item: item, showSource: true),
        const Positioned(
          top: Spacing.sm,
          right: Spacing.lg,
          child: TierBadge(label: 'News', highlight: true),
        ),
        if (item.isPinned)
          Positioned(
            top: Spacing.sm,
            left: Spacing.sm,
            child: Icon(
              Icons.workspace_premium_outlined,
              color: theme.colorScheme.secondary,
            ),
          ),
      ],
    );
  }
}
