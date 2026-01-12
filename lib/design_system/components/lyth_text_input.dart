/// Lythaus Text Input Component
///
/// High-level text input field using design system tokens.
/// All styling must use tokens from the design system.
library;

import 'package:flutter/material.dart';

import '../theme/theme_build_context_x.dart';

/// Size variants for text inputs
enum LythTextInputSize {
  medium(height: 44, contentPadding: 12),
  large(height: 52, contentPadding: 16);

  final double height;
  final double contentPadding;

  const LythTextInputSize({required this.height, required this.contentPadding});
}

/// Semantic text input component
///
/// High-level wrapper around TextField providing consistent styling using design tokens.
/// Supports error states, icons, and helper text.
///
/// All styling (padding, border radius, colors) comes from the design system.
/// Do not add hardcoded colors, spacing, or border radius.
///
/// Usage:
/// ```dart
/// LythTextInput(
///   label: 'Email',
///   placeholder: 'you@example.com',
///   onChanged: (value) {},
///   prefixIcon: Icons.email,
/// )
///
/// LythTextInput.password(
///   label: 'Password',
///   onChanged: (value) {},
/// )
/// ```
class LythTextInput extends StatefulWidget {
  /// Input label
  final String? label;

  /// Placeholder text
  final String? placeholder;

  /// Current input value
  final String? value;

  /// Callback when value changes
  final ValueChanged<String>? onChanged;

  /// Callback when submitted
  final VoidCallback? onSubmitted;

  /// Input size
  final LythTextInputSize size;

  /// Leading icon
  final IconData? prefixIcon;

  /// Trailing icon
  final IconData? suffixIcon;

  /// Trailing icon callback
  final VoidCallback? suffixIconOnPressed;

  /// Helper text below input
  final String? helperText;

  /// Error text (shows error state)
  final String? errorText;

  /// Whether input is disabled
  final bool disabled;

  /// Text input type
  final TextInputType keyboardType;

  /// Max lines (null = multiline)
  final int? maxLines;

  /// Whether to obscure text (password field)
  final bool obscureText;

  /// Custom input controller
  final TextEditingController? controller;

  /// Focus node
  final FocusNode? focusNode;

  /// Text input action
  final TextInputAction? textInputAction;

  const LythTextInput({
    this.label,
    this.placeholder,
    this.value,
    this.onChanged,
    this.onSubmitted,
    this.size = LythTextInputSize.medium,
    this.prefixIcon,
    this.suffixIcon,
    this.suffixIconOnPressed,
    this.helperText,
    this.errorText,
    this.disabled = false,
    this.keyboardType = TextInputType.text,
    this.maxLines = 1,
    this.obscureText = false,
    this.controller,
    this.focusNode,
    this.textInputAction,
    super.key,
  });

  /// Create a password input field
  const LythTextInput.password({
    required String label,
    String? placeholder,
    required ValueChanged<String> onChanged,
    VoidCallback? onSubmitted,
    LythTextInputSize size = LythTextInputSize.medium,
    String? helperText,
    String? errorText,
    bool disabled = false,
    TextEditingController? controller,
    FocusNode? focusNode,
    super.key,
  }) : label = label,
       placeholder = placeholder,
       value = null,
       onChanged = onChanged,
       onSubmitted = onSubmitted,
       size = size,
       prefixIcon = Icons.lock,
       suffixIcon = null,
       suffixIconOnPressed = null,
       helperText = helperText,
       errorText = errorText,
       disabled = disabled,
       keyboardType = TextInputType.visiblePassword,
       maxLines = 1,
       obscureText = true,
       controller = controller,
       focusNode = focusNode,
       textInputAction = null;

  /// Create an email input field
  const LythTextInput.email({
    required String label,
    String? placeholder,
    required ValueChanged<String> onChanged,
    VoidCallback? onSubmitted,
    LythTextInputSize size = LythTextInputSize.medium,
    String? helperText,
    String? errorText,
    bool disabled = false,
    TextEditingController? controller,
    FocusNode? focusNode,
    super.key,
  }) : label = label,
       placeholder = placeholder,
       value = null,
       onChanged = onChanged,
       onSubmitted = onSubmitted,
       size = size,
       prefixIcon = Icons.email,
       suffixIcon = null,
       suffixIconOnPressed = null,
       helperText = helperText,
       errorText = errorText,
       disabled = disabled,
       keyboardType = TextInputType.emailAddress,
       maxLines = 1,
       obscureText = false,
       controller = controller,
       focusNode = focusNode,
       textInputAction = TextInputAction.next;

  @override
  State<LythTextInput> createState() => _LythTextInputState();
}

class _LythTextInputState extends State<LythTextInput> {
  late TextEditingController _controller;
  late FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller =
        widget.controller ?? TextEditingController(text: widget.value);
    _focusNode = widget.focusNode ?? FocusNode();
  }

  @override
  void didUpdateWidget(LythTextInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != null && widget.value != _controller.text) {
      _controller.text = widget.value!;
    }
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    }
    if (widget.focusNode == null) {
      _focusNode.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Label
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: context.colorScheme.onSurface,
            ),
          ),
          SizedBox(height: context.spacing.xs),
        ],

        // Input field
        SizedBox(
          height: widget.size.height,
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            enabled: !widget.disabled,
            onChanged: widget.onChanged,
            onSubmitted: widget.onSubmitted == null
                ? null
                : (_) => widget.onSubmitted!(),
            textInputAction: widget.textInputAction,
            keyboardType: widget.keyboardType,
            obscureText: widget.obscureText,
            maxLines: widget.maxLines,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: context.colorScheme.onSurface,
            ),
            decoration: InputDecoration(
              hintText: widget.placeholder,
              hintStyle: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: context.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
              prefixIcon: widget.prefixIcon != null
                  ? Icon(
                      widget.prefixIcon,
                      color: hasError
                          ? context.colorScheme.error
                          : context.colorScheme.onSurface.withValues(
                              alpha: 0.6,
                            ),
                    )
                  : null,
              suffixIcon: widget.suffixIcon != null
                  ? IconButton(
                      icon: Icon(
                        widget.suffixIcon,
                        color: hasError
                            ? context.colorScheme.error
                            : context.colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                      ),
                      onPressed: widget.suffixIconOnPressed,
                      splashRadius: 24,
                    )
                  : null,
              errorText: hasError ? widget.errorText : null,
              contentPadding: EdgeInsets.symmetric(
                horizontal: widget.size.contentPadding.toDouble(),
                vertical: (widget.size.height - 20) / 2,
              ),
              filled: true,
              fillColor: widget.disabled
                  ? context.colorScheme.surfaceContainer.withValues(alpha: 0.5)
                  : context.colorScheme.surfaceContainer,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(
                  context.radius.input.toDouble(),
                ),
                borderSide: BorderSide(
                  color: hasError
                      ? context.colorScheme.error
                      : context.colorScheme.outline.withValues(alpha: 0.2),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(
                  context.radius.input.toDouble(),
                ),
                borderSide: BorderSide(
                  color: hasError
                      ? context.colorScheme.error
                      : context.colorScheme.outline.withValues(alpha: 0.2),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(
                  context.radius.input.toDouble(),
                ),
                borderSide: BorderSide(
                  color: hasError
                      ? context.colorScheme.error
                      : context.colorScheme.primary,
                  width: 2,
                ),
              ),
              disabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(
                  context.radius.input.toDouble(),
                ),
                borderSide: BorderSide(
                  color: context.colorScheme.outline.withValues(alpha: 0.1),
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(
                  context.radius.input.toDouble(),
                ),
                borderSide: BorderSide(color: context.colorScheme.error),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(
                  context.radius.input.toDouble(),
                ),
                borderSide: BorderSide(
                  color: context.colorScheme.error,
                  width: 2,
                ),
              ),
            ),
          ),
        ),

        // Helper text / Error text
        if (widget.helperText != null || hasError) ...[
          SizedBox(height: context.spacing.xs),
          Text(
            hasError ? (widget.errorText ?? '') : (widget.helperText ?? ''),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: hasError
                  ? context.colorScheme.error
                  : context.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ],
    );
  }
}
