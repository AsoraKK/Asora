// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_service.dart'; // ← KEEP
import 'package:asora/features/auth/domain/auth_failure.dart';

/// Simple authentication screen with a Google sign-in button.
class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoading = ref.watch(_loadingProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Center(
        child: isLoading
            ? const CircularProgressIndicator()
            : ElevatedButton(
                onPressed: () => _handleSignIn(context, ref),
                child: const Text('Sign in with Google'),
              ),
      ),
    );
  }

  Future<void> _handleSignIn(BuildContext context, WidgetRef ref) async {
    ref.read(_loadingProvider.notifier).state = true;

    final service = ref.read(authServiceProvider);
    try {
      final user = await service.signInWithGoogle();
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Logged in as ${user.email}')));
      }
    } on AuthFailure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      ref.read(_loadingProvider.notifier).state = false;
    }
  }
}

final _loadingProvider = StateProvider<bool>((ref) => false);
