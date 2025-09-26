import 'package:flutter/material.dart';

class UpgradePrompt extends StatelessWidget {
  final String currentTier;
  final VoidCallback? onUpgrade;
  const UpgradePrompt({super.key, required this.currentTier, this.onUpgrade});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Upgrade to unlock more',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Your current tier "$currentTier" limits post length and media.',
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                ElevatedButton(
                  onPressed: () {
                    if (onUpgrade != null) {
                      onUpgrade!();
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Upgrade flow coming soon. Check back shortly!',
                          ),
                        ),
                      );
                    }
                  },
                  child: const Text('Upgrade'),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => Navigator.maybePop(context),
                  child: const Text('Not now'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
