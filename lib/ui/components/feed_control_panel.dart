import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/models/feed_models.dart';
import '../../state/providers/feed_providers.dart';
import '../theme/spacing.dart';

class FeedControlPanel extends ConsumerWidget {
  const FeedControlPanel({
    super.key,
    required this.onSelect,
    required this.onCreateCustom,
  });

  final ValueChanged<FeedModel> onSelect;
  final VoidCallback onCreateCustom;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feeds = ref.watch(feedListProvider);
    final current = ref.watch(currentFeedProvider);

    return Padding(
      padding: const EdgeInsets.all(Spacing.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Feeds',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: Spacing.sm),
          ...feeds.map(
            (feed) => ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: Spacing.sm,
              ),
              title: Text(feed.name),
              subtitle: Text(_subtitle(feed)),
              trailing: feed.isHome
                  ? const Icon(Icons.home_filled, size: 18)
                  : null,
              selected: feed.id == current.id,
              onTap: () => onSelect(feed),
            ),
          ),
          const SizedBox(height: Spacing.sm),
          FilledButton.icon(
            onPressed: onCreateCustom,
            icon: const Icon(Icons.tune_rounded),
            label: const Text('Build custom feed'),
          ),
        ],
      ),
    );
  }

  String _subtitle(FeedModel feed) {
    switch (feed.type) {
      case FeedType.discover:
        return 'Curated discover';
      case FeedType.news:
        return 'Hybrid news';
      case FeedType.custom:
        return 'Custom filters';
      case FeedType.moderation:
        return 'Moderation only';
    }
  }
}
