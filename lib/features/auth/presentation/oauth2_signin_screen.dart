// ignore_for_file: public_member_api_docs

/// LYTHAUS OAUTH2 SIGN-IN SCREEN
///
/// 🎯 Purpose: OAuth2 authentication UI with PKCE flow
/// 🏗️ Architecture: Flutter UI with Riverpod state management
/// 🔐 Security: OAuth2 PKCE flow with secure token storage
/// 📱 Platform: Multi-platform OAuth2 authentication
/// 🤖 OAuth2: Complete sign-in experience with error handling
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/components/lyth_snackbar.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

/// OAuth2 sign-in screen with PKCE authentication
class OAuth2SignInScreen extends ConsumerWidget {
  const OAuth2SignInScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final isLoading = ref.watch(isAuthLoadingProvider);
    final spacing = context.spacing;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(spacing.xxl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo and title
              _buildHeader(context),
              SizedBox(height: spacing.huge),

              // OAuth2 sign-in button
              _buildOAuth2SignInButton(context, ref, isLoading),
              SizedBox(height: spacing.xxl),

              // Error handling
              authState.when(
                data: (_) => const SizedBox.shrink(),
                loading: () => const SizedBox.shrink(),
                error: (error, _) => _buildErrorMessage(context, error),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(context.radius.lg),
          ),
          child: Icon(
            Icons.security,
            color: Theme.of(context).colorScheme.primary,
            size: 40,
          ),
        ),
        SizedBox(height: context.spacing.xl),
        Text(
          'Welcome to Lythaus',
          style: Theme.of(
            context,
          ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        SizedBox(height: context.spacing.sm),
        Text(
          'Sign in securely with Google',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.7),
          ),
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
    return LythButton.primary(
      label: 'Sign in with Google',
      icon: Icons.security,
      onPressed: isLoading ? null : () => _handleOAuth2SignIn(context, ref),
      isLoading: isLoading,
    );
  }

  Widget _buildErrorMessage(BuildContext context, Object error) {
    String message = 'An unexpected error occurred';

    if (error is AuthFailure) {
      message = error.message;
    } else {
      message = error.toString();
    }

    return Container(
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        border: Border.all(color: Theme.of(context).colorScheme.error),
        borderRadius: BorderRadius.circular(context.radius.md),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error,
            color: Theme.of(context).colorScheme.onErrorContainer,
            size: 20,
          ),
          SizedBox(width: context.spacing.sm),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
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
        LythSnackbar.success(
          context: context,
          message: 'Successfully signed in with OAuth2!',
        );
      }
    } catch (error) {
      // Error will be handled by the error state in the UI
      debugPrint('OAuth2 sign-in error: $error');
    }
  }
}
