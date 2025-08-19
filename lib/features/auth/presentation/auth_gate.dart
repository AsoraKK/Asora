import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/application/auth_providers.dart';
import '../../../screens/feed_screen.dart';
import 'auth_choice_screen.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        // If we have a user, show the feed screen
        // If user is null, show the auth choice screen
        return user != null ? const FeedScreen() : const AuthChoiceScreen();
      },
      loading: () => const AuthChoiceScreen(), // Show auth screen while loading
      error: (error, stack) =>
          const AuthChoiceScreen(), // Show auth screen on error
    );
  }
}
