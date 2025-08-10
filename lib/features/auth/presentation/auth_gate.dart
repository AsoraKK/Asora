import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/application/auth_providers.dart';
import '../../auth/application/auth_state.dart';
import '../../../screens/feed_screen.dart';
import 'auth_choice_screen.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    // Show simple choice screen while loading/unauthenticated
    if (authState.status == AuthStatus.loading) {
      return const AuthChoiceScreen();
    }

    if (authState.status == AuthStatus.guest ||
        authState.status == AuthStatus.authed) {
      return const FeedScreen();
    }

    return const SizedBox.shrink();
  }
}
