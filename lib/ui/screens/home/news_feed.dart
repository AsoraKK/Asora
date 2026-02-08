// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/feed_models.dart';
import 'package:asora/ui/components/news_card.dart';
import 'package:asora/ui/theme/spacing.dart';

class NewsFeed extends ConsumerWidget {
  const NewsFeed({
    super.key,
    required this.feed,
    required this.items,
    this.hasMore = false,
    this.isLoadingMore = false,
    this.onLoadMore,
    this.onRefresh,
    this.currentUserId,
    this.onEditItem,
  });

  final FeedModel feed;
  final List<FeedItem> items;
  final bool hasMore;
  final bool isLoadingMore;
  final VoidCallback? onLoadMore;
  final Future<void> Function()? onRefresh;
  final String? currentUserId;
  final Future<void> Function(FeedItem item)? onEditItem;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: onRefresh ?? () async {},
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (onLoadMore == null || !hasMore || isLoadingMore) {
            return false;
          }
          if (notification.metrics.pixels >=
              notification.metrics.maxScrollExtent - 200) {
            onLoadMore!.call();
          }
          return false;
        },
        child: CustomScrollView(
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
              itemBuilder: (context, index) {
                final item = items[index];
                final canEdit =
                    currentUserId != null && currentUserId == item.authorId;
                return NewsCard(
                  item: item,
                  canEdit: canEdit,
                  onEdit: canEdit && onEditItem != null
                      ? () => onEditItem!(item)
                      : null,
                );
              },
              separatorBuilder: (_, __) => const SizedBox(height: Spacing.xs),
              itemCount: items.length,
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: Spacing.md),
                child: Center(
                  child: isLoadingMore
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const SizedBox.shrink(),
                ),
              ),
            ),
            const SliverPadding(padding: EdgeInsets.only(bottom: Spacing.xl)),
          ],
        ),
      ),
    );
  }
}
