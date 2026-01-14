// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/feed_models.dart';
import 'package:asora/ui/components/feed_card.dart';
import 'package:asora/ui/theme/spacing.dart';

class CustomFeedView extends ConsumerWidget {
  const CustomFeedView({super.key, required this.feed, required this.items});

  final FeedModel feed;
  final List<FeedItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = [
      ...feed.refinements.includeKeywords.map((k) => '+$k'),
      ...feed.refinements.excludeKeywords.map((k) => '-$k'),
    ];
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: Spacing.md,
              vertical: Spacing.sm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Custom feed',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: Spacing.xs),
                Wrap(
                  spacing: Spacing.xs,
                  children: filters
                      .map(
                        (f) => Chip(label: Text(f), padding: EdgeInsets.zero),
                      )
                      .toList(),
                ),
              ],
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
