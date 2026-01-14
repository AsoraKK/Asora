// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/feed_models.dart';
import 'package:asora/ui/components/feed_card.dart';
import 'package:asora/ui/theme/spacing.dart';

class DiscoverFeed extends ConsumerWidget {
  const DiscoverFeed({super.key, required this.feed, required this.items});

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
              'Discover calm, trustworthy updates tailored to you.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ),
        SliverList.separated(
          itemBuilder: (context, index) => FeedCard(item: items[index]),
          separatorBuilder: (_, __) => const SizedBox(height: Spacing.xs),
          itemCount: items.length,
        ),
        const SliverPadding(padding: EdgeInsets.only(bottom: Spacing.xl)),
      ],
    );
  }
}
