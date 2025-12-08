import 'dart:math' as math;

import 'package:flutter/material.dart';

class XPProgressRing extends StatelessWidget {
  const XPProgressRing({
    super.key,
    required this.progress,
    required this.tierLabel,
    this.size = 96,
  });

  final double progress;
  final String tierLabel;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: size,
      width: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size.square(size),
            painter: _RingPainter(
              progress: progress.clamp(0, 1),
              color: theme.colorScheme.primary,
              background: theme.colorScheme.primary.withValues(alpha: 0.08),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${(progress * 100).round()}%',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(tierLabel, style: theme.textTheme.labelMedium),
            ],
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.progress,
    required this.color,
    required this.background,
  });

  final double progress;
  final Color color;
  final Color background;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.08;
    final rect = Offset.zero & size;
    const startAngle = -math.pi / 2;
    final sweep = 2 * math.pi * progress;

    final backgroundPaint = Paint()
      ..color = background
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(rect, startAngle, 2 * math.pi, false, backgroundPaint);

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = stroke;
    canvas.drawArc(rect, startAngle, sweep, false, paint);
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}
