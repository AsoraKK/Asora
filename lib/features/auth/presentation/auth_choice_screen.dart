import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/security/device_integrity_guard.dart';
import '../../../screens/security_debug_screen.dart';
import '../application/auth_providers.dart';

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
                      ref.read(authStateProvider.notifier).signOut();
                    },
                    child: const Text('Continue as guest'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async => runWithDeviceGuard(
                      context,
                      ref,
                      IntegrityUseCase.signIn,
                      () => ref
                          .read(authStateProvider.notifier)
                          .signInWithOAuth2(),
                    ),
                    icon: const Icon(Icons.login),
                    label: const Text('Sign in'),
                  ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: () => runWithDeviceGuard(
                      context,
                      ref,
                      IntegrityUseCase.signUp,
                      () async {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Create account flow coming soon.'),
                          ),
                        );
                      },
                    ),
                    child: const Text('Create account'),
                  ),
                  if (kDebugMode) ...[
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const SecurityDebugScreen(),
                          ),
                        );
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.orange,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                      child: const Text('Security Debug'),
                    ),
                  ],
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
