/// ASORA OAUTH2 SIGN-IN SCREEN
///
/// 🎯 Purpose: OAuth2 authentication UI with PKCE flow
/// 🏗️ Architecture: Flutter UI with Riverpod state management
/// 🔐 Security: OAuth2 PKCE flow with secure token storage
/// 📱 Platform: Multi-platform OAuth2 authentication
/// 🤖 OAuth2: Complete sign-in experience with error handling
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/auth_providers.dart';
import '../domain/auth_failure.dart';

/// OAuth2 sign-in screen with PKCE authentication
class OAuth2SignInScreen extends ConsumerWidget {
  const OAuth2SignInScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final isLoading = ref.watch(isAuthLoadingProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo and title
              _buildHeader(),
              const SizedBox(height: 48),

              // OAuth2 sign-in button
              _buildOAuth2SignInButton(context, ref, isLoading),
              const SizedBox(height: 16),

              // Alternative email sign-in
              _buildEmailSignInSection(context, ref, isLoading),
              const SizedBox(height: 32),

              // Error handling
              authState.when(
                data: (_) => const SizedBox.shrink(),
                loading: () => const SizedBox.shrink(),
                error: (error, _) => _buildErrorMessage(error),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.blue.shade600,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(Icons.security, color: Colors.white, size: 40),
        ),
        const SizedBox(height: 24),
        const Text(
          'Welcome to Asora',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Sign in securely with OAuth2',
          style: TextStyle(fontSize: 16, color: Colors.black54),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildOAuth2SignInButton(
    BuildContext context,
    WidgetRef ref,
    bool isLoading,
  ) {
    return ElevatedButton(
      onPressed: isLoading ? null : () => _handleOAuth2SignIn(context, ref),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blue.shade600,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
      ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.security, size: 20),
                SizedBox(width: 8),
                Text(
                  'Sign in with OAuth2',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ],
            ),
    );
  }

  Widget _buildEmailSignInSection(
    BuildContext context,
    WidgetRef ref,
    bool isLoading,
  ) {
    return Column(
      children: [
        const Divider(color: Colors.grey),
        const SizedBox(height: 16),
        const Text(
          'Or sign in with email',
          style: TextStyle(color: Colors.black54, fontSize: 14),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: isLoading
              ? null
              : () => _showEmailSignInDialog(context, ref),
          style: TextButton.styleFrom(
            foregroundColor: Colors.blue.shade600,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: Colors.blue.shade600),
            ),
          ),
          child: const Text(
            'Email Sign In',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildErrorMessage(Object error) {
    String message = 'An unexpected error occurred';

    if (error is AuthFailure) {
      message = error.message;
    } else {
      message = error.toString();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        border: Border.all(color: Colors.red.shade200),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error, color: Colors.red.shade600, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: Colors.red.shade800, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleOAuth2SignIn(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(authStateProvider.notifier).signInWithOAuth2();

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Text('Successfully signed in with OAuth2!'),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (error) {
      // Error will be handled by the error state in the UI
      debugPrint('OAuth2 sign-in error: $error');
    }
  }

  void _showEmailSignInDialog(BuildContext context, WidgetRef ref) {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Email Sign In'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: passwordController,
              decoration: const InputDecoration(
                labelText: 'Password',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final email = emailController.text.trim();
              final password = passwordController.text.trim();

              if (email.isNotEmpty && password.isNotEmpty) {
                Navigator.of(context).pop();
                await ref
                    .read(authStateProvider.notifier)
                    .signInWithEmail(email, password);
              }
            },
            child: const Text('Sign In'),
          ),
        ],
      ),
    );
  }
}
