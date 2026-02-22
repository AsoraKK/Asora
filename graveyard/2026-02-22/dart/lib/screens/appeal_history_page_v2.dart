// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/moderation/presentation/screens/appeal_history_screen.dart';

class AppealHistoryPage extends ConsumerWidget {
  const AppealHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const AppealHistoryScreen();
  }
}
