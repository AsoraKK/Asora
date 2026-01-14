// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asora/core/security/device_integrity_guard.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/design_system/theme/theme_build_context_x.dart';
import 'package:asora/features/auth/application/auth_controller.dart';

/// Sign-in page with Email and Google B2C options
class SignInPage extends ConsumerWidget {
  const SignInPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final controller = ref.read(authControllerProvider.notifier);

    final scheme = Theme.of(context).colorScheme;
    final spacing = context.spacing;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: spacing.xxl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo and title
              Icon(Icons.account_circle, size: 80, color: scheme.primary),
              SizedBox(height: spacing.lg),
              Text(
                'Welcome to Lythaus',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              SizedBox(height: spacing.sm),
              Text(
                'Sign in to continue',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
              SizedBox(height: spacing.huge),

              // Email sign-in button
              LythButton.primary(
                label: 'Continue with Email',
                icon: Icons.email_outlined,
                onPressed: authState.isLoading
                    ? null
                    : () => runWithDeviceGuard(
                        context,
                        ref,
                        IntegrityUseCase.signIn,
                        () => controller.signInEmail(),
                      ),
              ),
              SizedBox(height: spacing.lg),

              // Google sign-in button
              LythButton.secondary(
                label: 'Continue with Google',
                icon: Icons.g_mobiledata,
                onPressed: authState.isLoading
                    ? null
                    : () {
                        runWithDeviceGuard(
                          context,
                          ref,
                          IntegrityUseCase.signIn,
                          () => controller.signInGoogle(),
                        );
                      },
              ),

              // Loading indicator
              if (authState.isLoading) ...[
                SizedBox(height: spacing.xl),
                const Center(child: CircularProgressIndicator()),
              ],

              // Error message
              if (authState.error != null) ...[
                SizedBox(height: spacing.xl),
                Container(
                  padding: EdgeInsets.all(spacing.md),
                  decoration: BoxDecoration(
                    color: scheme.errorContainer,
                    borderRadius: BorderRadius.circular(context.radius.md),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: scheme.error),
                      SizedBox(width: spacing.sm),
                      Expanded(
                        child: Text(
                          authState.error!,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: scheme.onErrorContainer,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              SizedBox(height: spacing.huge),

              // Terms and Privacy
              Text(
                'By continuing, you agree to our Terms of Service and Privacy Policy',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
