// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:asora/widgets/appeal_sheet.dart';

class BlockedPostCard extends StatelessWidget {
  final String postId;
  const BlockedPostCard({super.key, required this.postId});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This post was blocked',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                builder: (_) => AppealSheet(postId: postId),
              ),
              child: const Text('Appeal decision'),
            ),
          ],
        ),
      ),
    );
  }
}
