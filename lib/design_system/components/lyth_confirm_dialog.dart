/// Lythaus Confirm Dialog Component
///
/// High-level dialog for confirmations and destructive actions.
library;

import 'package:flutter/material.dart';

import '../theme/theme_build_context_x.dart';
import 'lyth_button.dart';

/// Semantic confirmation dialog
///
/// Provides a high-level dialog for user confirmations and decisions.
/// Automatically handles layout, spacing, and button positioning.
///
/// Usage:
/// ```dart
/// showDialog(
///   context: context,
///   builder: (context) => LythConfirmDialog(
///     title: 'Delete Item?',
///     message: 'This action cannot be undone.',
///     confirmLabel: 'Delete',
///     onConfirm: () => _delete(),
///   ),
/// )
/// ```
class LythConfirmDialog extends StatelessWidget {
  /// Dialog title
  final String title;

  /// Dialog message body
  final String? message;

  /// Confirm button label
  final String confirmLabel;

  /// Callback when confirmed
  final VoidCallback onConfirm;

  /// Cancel button label (default 'Cancel')
  final String cancelLabel;

  /// Callback when cancelled
  final VoidCallback? onCancel;

  /// Whether confirm action is destructive (red)
  final bool isDestructive;

  /// Custom icon
  final IconData? icon;

  const LythConfirmDialog({
    required this.title,
    required this.confirmLabel,
    required this.onConfirm,
    this.message,
    this.cancelLabel = 'Cancel',
    this.onCancel,
    this.isDestructive = false,
    this.icon,
    super.key,
  });

  /// Create a destructive confirmation dialog
  const LythConfirmDialog.destructive({
    required String title,
    required String confirmLabel,
    required VoidCallback onConfirm,
    String? message,
    String cancelLabel = 'Cancel',
    VoidCallback? onCancel,
    IconData? icon,
    super.key,
  }) : title = title,
       confirmLabel = confirmLabel,
       onConfirm = onConfirm,
       message = message,
       cancelLabel = cancelLabel,
       onCancel = onCancel,
       isDestructive = true,
       icon = icon;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(title),
      icon: icon != null ? Icon(icon) : null,
      content: message != null
          ? Text(message!, style: context.textTheme.bodyMedium)
          : null,
      actions: [
        LythButton.secondary(
          label: cancelLabel,
          onPressed: () {
            onCancel?.call();
            Navigator.pop(context);
          },
        ),
        LythButton(
          label: confirmLabel,
          variant: isDestructive
              ? LythButtonVariant.destructive
              : LythButtonVariant.primary,
          onPressed: () {
            onConfirm();
            Navigator.pop(context);
          },
        ),
      ],
    );
  }
}
