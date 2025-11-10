import 'package:flutter/material.dart';

class PrivacyBlockingOverlay extends StatelessWidget {
  const PrivacyBlockingOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black.withValues(alpha: 0.35),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text('Deleting account…'),
          ],
        ),
      ),
    );
  }
}
