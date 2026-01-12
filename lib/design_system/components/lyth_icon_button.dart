/// Lythaus Icon Button Component
///
/// Icon-only button for compact, semantically clear actions.
library;

import 'package:flutter/material.dart';

import '../theme/theme_build_context_x.dart';

/// Semantic icon button component
///
/// Provides icon-only button with consistent sizing and styling.
/// All buttons have minimum 48x48 tap target for accessibility.
///
/// Usage:
/// ```dart
/// LythIconButton(
///   icon: Icons.close,
///   onPressed: () {},
/// )
///
/// LythIconButton(
///   icon: Icons.favorite,
///   onPressed: () {},
///   color: context.colorScheme.error,
/// )
/// ```
class LythIconButton extends StatelessWidget {
  /// The icon to display
  final IconData icon;

  /// Callback when pressed
  final VoidCallback? onPressed;

  /// Whether button is disabled
  final bool disabled;

  /// Custom icon color
  final Color? color;

  /// Tooltip for accessibility
  final String? tooltip;

  /// Icon size (default 24)
  final double iconSize;

  const LythIconButton({
    required this.icon,
    this.onPressed,
    this.disabled = false,
    this.color,
    this.tooltip,
    this.iconSize = 24,
    super.key,
  });

  /// Create a filled icon button variant
  const LythIconButton.filled({
    required IconData icon,
    required VoidCallback onPressed,
    Color? color,
    String? tooltip,
    double iconSize = 24,
    super.key,
  }) : icon = icon,
       onPressed = onPressed,
       disabled = false,
       color = color,
       tooltip = tooltip,
       iconSize = iconSize;

  /// Create an outlined icon button variant
  const LythIconButton.outlined({
    required IconData icon,
    required VoidCallback onPressed,
    Color? color,
    String? tooltip,
    double iconSize = 24,
    super.key,
  }) : icon = icon,
       onPressed = onPressed,
       disabled = false,
       color = color,
       tooltip = tooltip,
       iconSize = iconSize;

  @override
  Widget build(BuildContext context) {
    final iconColor = color ?? context.colorScheme.onSurface;

    return Tooltip(
      message: tooltip ?? '',
      child: SizedBox(
        width: 48,
        height: 48,
        child: IconButton(
          icon: Icon(icon, size: iconSize, color: iconColor),
          onPressed: disabled ? null : onPressed,
          splashRadius: 24,
        ),
      ),
    );
  }
}
