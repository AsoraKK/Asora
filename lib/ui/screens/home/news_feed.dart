import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/models/feed_models.dart';
import '../../components/news_card.dart';
import '../../theme/spacing.dart';

class NewsFeed extends ConsumerWidget {
  const NewsFeed({super.key, required this.feed, required this.items});

  final FeedModel feed;
  final List<FeedItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: Spacing.md,
              vertical: Spacing.sm,
            ),
            child: Text(
              'Hybrid newsroom + high reputation contributors.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ),
        SliverList.separated(
          itemBuilder: (context, index) => NewsCard(item: items[index]),
          separatorBuilder: (_, __) => const SizedBox(height: Spacing.xs),
          itemCount: items.length,
        ),
        const SliverPadding(padding: EdgeInsets.only(bottom: Spacing.xl)),
      ],
    );
  }
}
