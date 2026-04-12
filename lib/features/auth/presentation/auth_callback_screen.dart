// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/web_auth_service.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

/// Provider for the shared [WebAuthService] instance.
final webAuthServiceProvider = Provider<WebAuthService>((ref) {
  return WebAuthService();
});

/// Screen shown at `/auth/callback` after the OAuth2 IdP redirects the
/// browser back. Reads `code` and `state` from the URL, exchanges the code
/// for tokens, and then navigates to the app shell or back to login.
class AuthCallbackScreen extends ConsumerStatefulWidget {
  const AuthCallbackScreen({super.key});

  @override
  ConsumerState<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends ConsumerState<AuthCallbackScreen> {
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _handleCallback());
  }

  Future<void> _handleCallback() async {
    try {
      final webAuth = ref.read(webAuthServiceProvider);
      final callbackUri = Uri.base;

      final user = await webAuth.handleCallback(callbackUri);

      if (!mounted) return;

      // Update auth state so GoRouter redirect picks it up.
      final authNotifier = ref.read(authStateProvider.notifier);
      authNotifier.setUser(user);

      // Navigate to home.
      if (mounted) context.go('/');
    } on AuthFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = 'Sign-in failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: _error != null
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Back to sign in'),
                  ),
                ],
              )
            : const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Completing sign-in…'),
                ],
              ),
      ),
    );
  }
}
