import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/auth_controller.dart';

/// Sign-in page with Email and Google B2C options
class SignInPage extends ConsumerWidget {
  const SignInPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final controller = ref.read(authControllerProvider.notifier);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo and title
              const Icon(
                Icons.account_circle,
                size: 80,
                color: Color(0xFF1976D2),
              ),
              const SizedBox(height: 16),
              const Text(
                'Welcome to Asora',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF212121),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sign in to continue',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Color(0xFF757575)),
              ),
              const SizedBox(height: 48),

              // Email sign-in button
              _buildSignInButton(
                context: context,
                label: 'Continue with Email',
                icon: Icons.email_outlined,
                onPressed: authState.isLoading
                    ? null
                    : () => controller.signInEmail(),
                backgroundColor: const Color(0xFF1976D2),
                textColor: Colors.white,
              ),
              const SizedBox(height: 16),

              // Google sign-in button
              _buildSignInButton(
                context: context,
                label: 'Continue with Google',
                icon: Icons.g_mobiledata,
                onPressed: authState.isLoading
                    ? null
                    : () => controller.signInGoogle(),
                backgroundColor: Colors.white,
                textColor: const Color(0xFF212121),
                borderColor: const Color(0xFFE0E0E0),
              ),

              // Loading indicator
              if (authState.isLoading) ...[
                const SizedBox(height: 24),
                const Center(child: CircularProgressIndicator()),
              ],

              // Error message
              if (authState.error != null) ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFD32F2F)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          authState.error!,
                          style: const TextStyle(
                            color: Color(0xFFD32F2F),
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 48),

              // Terms and Privacy
              Text(
                'By continuing, you agree to our Terms of Service and Privacy Policy',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSignInButton({
    required BuildContext context,
    required String label,
    required IconData icon,
    required VoidCallback? onPressed,
    required Color backgroundColor,
    required Color textColor,
    Color? borderColor,
  }) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, color: textColor),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        foregroundColor: textColor,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: borderColor != null
              ? BorderSide(color: borderColor, width: 1)
              : BorderSide.none,
        ),
        elevation: borderColor != null ? 0 : 2,
      ),
    );
  }
}
