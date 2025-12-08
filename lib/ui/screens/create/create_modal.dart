import 'package:flutter/material.dart';

import '../../components/create_post_modal.dart';

class CreateModalScreen extends StatelessWidget {
  const CreateModalScreen({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => const Padding(
        padding: EdgeInsets.only(bottom: 24),
        child: CreatePostModal(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const CreatePostModal();
  }
}
