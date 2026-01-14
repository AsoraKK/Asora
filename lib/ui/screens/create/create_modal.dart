// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

import 'package:asora/ui/components/create_post_modal.dart';

class CreateModalScreen extends StatelessWidget {
  const CreateModalScreen({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
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
