// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/state/models/feed_models.dart';
import 'package:asora/ui/theme/spacing.dart';
import 'package:asora/ui/components/tier_badge.dart';

class FeedCard extends StatelessWidget {
  const FeedCard({
    super.key,
    required this.item,
    this.onTap,
    this.showSource = true,
  });

  final FeedItem item;
  final VoidCallback? onTap;
  final bool showSource;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final headline = theme.textTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w700,
    );
    final body = theme.textTheme.bodyMedium?.copyWith(height: 1.3);

    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: Spacing.md,
        vertical: Spacing.xs,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(Spacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (item.isPinned)
                    Padding(
                      padding: const EdgeInsets.only(right: Spacing.xs),
                      child: Icon(
                        Icons.push_pin_outlined,
                        size: 16,
                        color: theme.colorScheme.secondary,
                      ),
                    ),
                  Expanded(child: Text(item.title, style: headline)),
                  if (showSource)
                    Text(item.author, style: theme.textTheme.labelMedium),
                ],
              ),
              const SizedBox(height: Spacing.xs),
              if (item.imageUrl != null || item.videoThumbnailUrl != null)
                _MediaPreview(
                  imageUrl: item.imageUrl ?? item.videoThumbnailUrl!,
                  isVideo: item.videoThumbnailUrl != null,
                ),
              if (item.body.isNotEmpty) ...[
                const SizedBox(height: Spacing.xs),
                Text(item.body, style: body),
              ],
              const SizedBox(height: Spacing.xs),
              Wrap(
                spacing: Spacing.xs,
                runSpacing: Spacing.xxs,
                children: [
                  TierBadge(label: _contentLabel(item.contentType)),
                  ...item.tags.map(
                    (tag) => Chip(label: Text(tag), padding: EdgeInsets.zero),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _contentLabel(ContentType type) {
    switch (type) {
      case ContentType.text:
        return 'Text';
      case ContentType.image:
        return 'Image';
      case ContentType.video:
        return 'Video';
      case ContentType.mixed:
        return 'Mixed';
    }
  }
}

class _MediaPreview extends StatelessWidget {
  const _MediaPreview({required this.imageUrl, this.isVideo = false});

  final String imageUrl;
  final bool isVideo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Image.network(
              imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.4,
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.broken_image_outlined, size: 32),
              ),
            ),
          ),
          if (isVideo)
            Positioned(
              right: Spacing.sm,
              bottom: Spacing.sm,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: Spacing.sm,
                  vertical: Spacing.xxxs,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.play_arrow, size: 16, color: Colors.white),
                    SizedBox(width: Spacing.xxs),
                    Text(
                      'Preview',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
