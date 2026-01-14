// ignore_for_file: public_member_api_docs

/// Lythaus Wordmark Widget
///
/// Animated wordmark displaying "Lyt haus" with a soft warm ivory glow pulse.
/// The animation respects the accessibility `disableAnimations` setting.
library;

import 'package:flutter/material.dart';

/// Displays the Lythaus wordmark with a pulsing glow effect.
///
/// Features:
/// - "Lyt haus" text in dull white (#E6E2D9 dark mode, #1A1A1A light mode)
/// - Warm ivory glow (#EDE3C8) that pulses every ~240 seconds
/// - Glow duration: ~8 seconds per pulse
/// - Respects reduce-motion accessibility setting
///
/// Usage:
/// ```dart
/// LythWordmark(
///   size: LythWordmarkSize.large,
/// )
/// ```
class LythWordmark extends StatefulWidget {
  /// Size of the wordmark
  final LythWordmarkSize size;

  /// Custom color override (typically not needed)
  final Color? color;

  const LythWordmark({
    this.size = LythWordmarkSize.medium,
    this.color,
    super.key,
  });

  @override
  State<LythWordmark> createState() => _LythWordmarkState();
}

enum LythWordmarkSize {
  small(32),
  medium(48),
  large(64),
  xlarge(96);

  final double height;

  const LythWordmarkSize(this.height);
}

class _LythWordmarkState extends State<LythWordmark>
    with TickerProviderStateMixin {
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimation();
  }

  void _initializeAnimation() {
    final disableAnimations = MediaQuery.disableAnimationsOf(context);

    if (disableAnimations) {
      // No animation when reduced motion is enabled
      _glowController = AnimationController(
        duration: const Duration(seconds: 1),
        vsync: this,
      );
      _glowAnimation = Tween<double>(begin: 0, end: 0).animate(_glowController);
    } else {
      // Pulse animation: 240 second interval, 8 second duration per pulse
      _glowController = AnimationController(
        duration: const Duration(seconds: 8),
        vsync: this,
      );

      // Create a repeating animation with proper intervals
      _glowAnimation = Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
      );

      // Schedule repeating pulses with 240-second interval
      _scheduleNextPulse();
    }
  }

  void _scheduleNextPulse() {
    Future.delayed(const Duration(seconds: 240), () {
      if (mounted && !MediaQuery.disableAnimationsOf(context)) {
        // Run the 8-second glow animation
        _glowController.forward(from: 0).then((_) {
          if (mounted) {
            _scheduleNextPulse();
          }
        });
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Check if reduce-motion setting changed
    final disableAnimations = MediaQuery.disableAnimationsOf(context);
    if (disableAnimations && _glowController.isAnimating) {
      _glowController.stop();
    }
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor =
        widget.color ??
        (isDark ? const Color(0xFFE6E2D9) : const Color(0xFF1A1A1A));
    const glowColor = Color(0xFFEDE3C8); // Warm ivory

    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Glow background layer (only visible during pulse)
            if (_glowAnimation.value > 0)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: glowColor.withValues(
                          alpha: 0.3 * _glowAnimation.value,
                        ),
                        blurRadius: 24 * _glowAnimation.value,
                        spreadRadius: 8 * _glowAnimation.value,
                      ),
                    ],
                  ),
                ),
              ),
            // Text layer
            Text(
              'Lyt haus',
              style: TextStyle(
                fontSize: widget.size.height * 0.6,
                fontWeight: FontWeight.w700,
                color: textColor,
                letterSpacing: 0.5,
                height: 1.2,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        );
      },
    );
  }
}

/// A simple, non-animated version of the wordmark for static contexts
class LythWordmarkStatic extends StatelessWidget {
  final LythWordmarkSize size;
  final Color? color;

  const LythWordmarkStatic({
    this.size = LythWordmarkSize.medium,
    this.color,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor =
        color ?? (isDark ? const Color(0xFFE6E2D9) : const Color(0xFF1A1A1A));

    return Text(
      'Lyt haus',
      style: TextStyle(
        fontSize: size.height * 0.6,
        fontWeight: FontWeight.w700,
        color: textColor,
        letterSpacing: 0.5,
        height: 1.2,
      ),
      textAlign: TextAlign.center,
    );
  }
}
