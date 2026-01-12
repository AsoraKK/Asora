/// Lythaus Card Component
///
/// Container component for grouping related content.
/// All styling must use tokens from the design system.
library;

import 'package:flutter/material.dart';

import '../theme/theme_build_context_x.dart';
import '../tokens/spacing.dart';

/// Semantic card component
///
/// A high-level container widget for grouping related content.
/// Provides consistent padding, border radius, and styling from the design system.
///
/// Do not add hardcoded colors, spacing, or border radius.
///
/// Usage:
/// ```dart
/// LythCard(
///   child: Text('Card content'),
/// )
///
/// LythCard.clickable(
///   onTap: () {},
///   child: Column(
///     children: [...],
///   ),
/// )
/// ```
class LythCard extends StatelessWidget {
  /// Card content
  final Widget child;

  /// Card padding
  final EdgeInsets? padding;

  /// Whether card has a tappable state
  final bool clickable;

  /// Callback when card is tapped
  final VoidCallback? onTap;

  /// Callback when card is long-pressed
  final VoidCallback? onLongPress;

  /// Custom background color
  final Color? backgroundColor;

  /// Custom border color
  final Color? borderColor;

  const LythCard({
    required this.child,
    this.padding,
    this.clickable = false,
    this.onTap,
    this.onLongPress,
    this.backgroundColor,
    this.borderColor,
    super.key,
  });

  /// Create a clickable card
  const LythCard.clickable({
    required Widget child,
    required VoidCallback onTap,
    EdgeInsets? padding,
    VoidCallback? onLongPress,
    Color? backgroundColor,
    Color? borderColor,
    super.key,
  }) : clickable = true,
       onTap = onTap,
       onLongPress = onLongPress,
       child = child,
       padding = padding,
       backgroundColor = backgroundColor,
       borderColor = borderColor;

  @override
  Widget build(BuildContext context) {
    final padding =
        this.padding ?? EdgeInsets.all(LythSpacing.cardPadding.toDouble());
    final backgroundColor =
        this.backgroundColor ?? context.colorScheme.surfaceContainer;
    final borderColor =
        this.borderColor ?? context.colorScheme.outline.withValues(alpha: 0.1);

    Widget card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(context.radius.card.toDouble()),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: child,
    );

    if (!clickable && onTap == null && onLongPress == null) {
      return card;
    }

    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(context.radius.card.toDouble()),
      child: card,
    );
  }
}

/// Elevated card variant with shadow
class LythCardElevated extends StatelessWidget {
  /// Card content
  final Widget child;

  /// Card padding
  final EdgeInsets? padding;

  /// Whether card has a tappable state
  final bool clickable;

  /// Callback when card is tapped
  final VoidCallback? onTap;

  /// Callback when card is long-pressed
  final VoidCallback? onLongPress;

  /// Custom background color
  final Color? backgroundColor;

  /// Elevation/shadow
  final double elevation;

  const LythCardElevated({
    required this.child,
    this.padding,
    this.clickable = false,
    this.onTap,
    this.onLongPress,
    this.backgroundColor,
    this.elevation = 4,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final padding =
        this.padding ?? EdgeInsets.all(LythSpacing.cardPadding.toDouble());
    final backgroundColor = this.backgroundColor ?? context.colorScheme.surface;

    Widget card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(context.radius.card.toDouble()),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: elevation,
            offset: Offset(0, elevation / 2),
          ),
        ],
      ),
      child: child,
    );

    if (!clickable && onTap == null && onLongPress == null) {
      return card;
    }

    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: BorderRadius.circular(context.radius.card.toDouble()),
      child: card,
    );
  }
}
