// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

enum EmailAuthMode { signIn, register, forgotPassword }

class EmailAuthScreen extends ConsumerStatefulWidget {
  const EmailAuthScreen({super.key, this.initialMode = EmailAuthMode.signIn});

  final EmailAuthMode initialMode;

  @override
  ConsumerState<EmailAuthScreen> createState() => _EmailAuthScreenState();
}

class _EmailAuthScreenState extends ConsumerState<EmailAuthScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  late EmailAuthMode _mode;
  bool _busy = false;
  String? _message;
  String? _error;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _message = null;
      _error = null;
    });
    try {
      final email = _email.text.trim();
      if (_mode == EmailAuthMode.signIn) {
        await ref
            .read(authStateProvider.notifier)
            .signInWithEmail(email, _password.text);
        if (mounted) Navigator.of(context).pop();
        return;
      }
      final service = ref.read(enhancedAuthServiceProvider);
      if (_mode == EmailAuthMode.register) {
        await service.registerWithEmail(email, _password.text);
        _message = 'Check your email to verify your account.';
      } else {
        await service.requestPasswordReset(email);
        _message = 'If the account exists, a reset email will be sent.';
      }
    } on AuthFailure catch (error) {
      _error = error.message;
    } catch (_) {
      _error = 'The request could not be completed. Please try again.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resendVerification() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(enhancedAuthServiceProvider)
          .resendEmailVerification(_email.text.trim());
      _message =
          'If the address is eligible, a verification email will be sent.';
    } on AuthFailure catch (error) {
      _error = error.message;
    } catch (_) {
      _error = 'The request could not be completed. Please try again.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = switch (_mode) {
      EmailAuthMode.signIn => 'Sign in with email',
      EmailAuthMode.register => 'Create an email account',
      EmailAuthMode.forgotPassword => 'Reset your password',
    };
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      key: const Key('email-auth-email'),
                      controller: _email,
                      autofillHints: const [AutofillHints.email],
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: _mode == EmailAuthMode.forgotPassword
                          ? TextInputAction.done
                          : TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email address',
                      ),
                    ),
                    if (_mode != EmailAuthMode.forgotPassword) ...[
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('email-auth-password'),
                        controller: _password,
                        autofillHints: _mode == EmailAuthMode.register
                            ? const [AutofillHints.newPassword]
                            : const [AutofillHints.password],
                        obscureText: true,
                        onSubmitted: (_) => _submit(),
                        decoration: const InputDecoration(
                          labelText: 'Password',
                        ),
                      ),
                      if (_mode == EmailAuthMode.register) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'Use at least 12 characters and three character types.',
                        ),
                      ],
                    ],
                    if (_message != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _message!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                    if (_mode == EmailAuthMode.register && _message != null)
                      TextButton(
                        key: const Key('email-auth-resend-verification'),
                        onPressed: _busy ? null : _resendVerification,
                        child: const Text('Resend verification email'),
                      ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: Text(_busy ? 'Please wait…' : title),
                    ),
                    if (_mode == EmailAuthMode.signIn) ...[
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => setState(
                                () => _mode = EmailAuthMode.forgotPassword,
                              ),
                        child: const Text('Forgot password?'),
                      ),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => setState(
                                () => _mode = EmailAuthMode.register,
                              ),
                        child: const Text('Create account'),
                      ),
                    ] else
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () =>
                                  setState(() => _mode = EmailAuthMode.signIn),
                        child: const Text('Back to sign in'),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
