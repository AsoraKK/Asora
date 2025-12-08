import 'package:flutter/material.dart';

import '../theme/spacing.dart';
import '../utils/motion.dart';

class AsoraTopBar extends StatelessWidget implements PreferredSizeWidget {
  const AsoraTopBar({
    super.key,
    required this.title,
    this.onLogoTap,
    this.onTitleTap,
    this.onSearchTap,
    this.onTrendingTap,
    this.showDivider = false,
  });

  final String title;
  final VoidCallback? onLogoTap;
  final VoidCallback? onTitleTap;
  final VoidCallback? onSearchTap;
  final VoidCallback? onTrendingTap;
  final bool showDivider;

  @override
  Size get preferredSize => const Size.fromHeight(48);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: preferredSize.height,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: showDivider
            ? Border(bottom: BorderSide(color: theme.dividerColor, width: 1))
            : null,
      ),
      padding: const EdgeInsets.symmetric(horizontal: Spacing.md),
      child: Row(
        children: [
          InkWell(
            onTap: onLogoTap,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(Spacing.xs),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.blur_on,
                size: 18,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(width: Spacing.sm),
          Expanded(
            child: GestureDetector(
              onTap: onTitleTap,
              child: Center(
                child: AnimatedSwitcher(
                  duration: baseMotion,
                  child: Text(
                    title,
                    key: ValueKey(title),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Row(
            children: [
              IconButton(
                iconSize: 20,
                onPressed: onSearchTap,
                icon: Icon(
                  Icons.search,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.82),
                ),
              ),
              IconButton(
                iconSize: 20,
                onPressed: onTrendingTap,
                icon: Icon(
                  Icons.trending_up_outlined,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.82),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
