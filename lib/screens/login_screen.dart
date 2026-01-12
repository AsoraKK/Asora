import 'package:flutter/material.dart';

import '../design_system/components/index.dart';
import '../design_system/theme/theme_build_context_x.dart';
import '../features/auth/application/auth_service.dart';
import '../features/auth/domain/auth_failure.dart';
import '../features/auth/domain/user.dart';

/// Login screen for Lythaus authentication
class LoginScreen extends StatefulWidget {
  /// Creates a login screen
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;
  String? _emailError;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();

    if (email.isEmpty) {
      setState(() {
        _emailError = 'Please enter your email';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _emailError = null;
    });

    try {
      final user = await _authService.loginWithEmail(
        email,
        'defaultPassword', // Replace with actual password input
      );

      if (mounted) {
        LythSnackbar.success(
          context: context,
          message: 'Welcome ${user.email}!',
        );

        // Show user details in a dialog for demonstration
        await _showUserDialog(user);
      }
    } on AuthFailure catch (e) {
      _showError('Login failed: ${e.message}');
    } catch (e) {
      _showError('An error occurred: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showError(String message) {
    if (mounted) {
      setState(() {
        _emailError = message;
      });
      LythSnackbar.error(context: context, message: message);
    }
  }

  Future<void> _showUserDialog(User user) async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('User Profile'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Email: ${user.email}'),
            Text('Role: ${user.role}'),
            Text('Tier: ${user.tier}'),
            Text('Reputation: ${user.reputationScore}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login'), centerTitle: true),
      body: Padding(
        padding: EdgeInsets.all(context.spacing.lg.toDouble()),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LythIcon(
              Icons.lock_outline,
              size: LythIconSize.xlarge,
              semanticColor: 'primary',
            ),
            SizedBox(height: context.spacing.xxl.toDouble()),
            Text(
              'Welcome to Lythaus',
              style: context.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: context.spacing.xxl.toDouble()),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _handleLogin(),
              decoration: InputDecoration(
                labelText: 'Email',
                errorText: _emailError,
                border: const OutlineInputBorder(),
              ),
            ),
            SizedBox(height: context.spacing.xl.toDouble()),
            if (_isLoading)
              const LythButton(
                label: 'Logging in...',
                variant: LythButtonVariant.primary,
                isLoading: true,
              )
            else
              LythButton(
                label: 'Login',
                variant: LythButtonVariant.primary,
                onPressed: _handleLogin,
              ),
            SizedBox(height: context.spacing.md.toDouble()),
            LythButton(
              label: 'Logout (for testing)',
              variant: LythButtonVariant.tertiary,
              onPressed: () {
                _authService.logout();
                LythSnackbar.info(context: context, message: 'Logged out');
              },
            ),
          ],
        ),
      ),
    );
  }
}
