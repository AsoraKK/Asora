import 'package:flutter/material.dart';

import '../../theme/spacing.dart';

/// AI scan screen shown when content is flagged for moderation review
class AiScanScreen extends StatefulWidget {
  const AiScanScreen({
    super.key,
    required this.content,
    required this.onApprove,
    required this.onCancel,
  });

  final String content;
  final VoidCallback onApprove;
  final VoidCallback onCancel;

  @override
  State<AiScanScreen> createState() => _AiScanScreenState();
}

class _AiScanScreenState extends State<AiScanScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animationController.forward();

    // Simulate AI scan completion after 2 seconds
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Safety Check'),
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(Spacing.lg),
        child: Column(
          children: [
            const Spacer(),
            _AnimatedScanIcon(animation: _animationController),
            const SizedBox(height: Spacing.lg),
            Text(
              'Scanning your post...',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Spacing.sm),
            Text(
              'Our AI is checking for community policy violations.',
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const Spacer(),
            _ScanResult(
              content: widget.content,
              onApprove: widget.onApprove,
              onCancel: widget.onCancel,
            ),
          ],
        ),
      ),
    );
  }
}

/// Animated scan icon
class _AnimatedScanIcon extends StatelessWidget {
  const _AnimatedScanIcon({required this.animation});

  final AnimationController animation;

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween<double>(
        begin: 0.0,
        end: 1.0,
      ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutBack)),
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
        ),
        child: Icon(
          Icons.verified_user_outlined,
          size: 40,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }
}

/// Result section (approval or flag info)
class _ScanResult extends StatelessWidget {
  const _ScanResult({
    required this.content,
    required this.onApprove,
    required this.onCancel,
  });

  final String content;
  final VoidCallback onApprove;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    // For now, always show "safe to post" - in real impl, this would be dynamic
    return Column(
      children: [
        Card(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
          child: Padding(
            padding: const EdgeInsets.all(Spacing.md),
            child: Row(
              children: [
                Icon(
                  Icons.check_circle,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: Spacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Safe to post',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: Spacing.xxs),
                      Text(
                        'Your post meets community guidelines.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: Spacing.lg),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: onCancel,
                child: const Text('Edit'),
              ),
            ),
            const SizedBox(width: Spacing.sm),
            Expanded(
              child: FilledButton(
                onPressed: onApprove,
                child: const Text('Post'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
