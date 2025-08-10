import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/auth_providers.dart';
import '../application/auth_state.dart';

class AuthChoiceScreen extends ConsumerWidget {
  const AuthChoiceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),
                  const Icon(Icons.auto_awesome, size: 56),
                  const SizedBox(height: 12),
                  Text(
                    'Welcome to Asora',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Browse the feed as a guest or sign in to interact.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 32),
                  FilledButton(
                    onPressed: () {
                      ref.read(authStateProvider.notifier).state =
                          const AuthState.guest();
                    },
                    child: const Text('Continue as guest'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      // Stub sign-in: set authed with a fake user id for now
                      ref.read(authStateProvider.notifier).state =
                          const AuthState.authed('demo-user');
                    },
                    icon: const Icon(Icons.login),
                    label: const Text('Sign in'),
                  ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Create account'),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
