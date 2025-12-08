import 'package:flutter/material.dart';

import '../../components/create_post_modal.dart';
import '../../theme/spacing.dart';

class CreateScreen extends StatelessWidget {
  const CreateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create')),
      body: const Padding(
        padding: EdgeInsets.all(Spacing.md),
        child: CreatePostModal(),
      ),
    );
  }
}
