// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';

class EmailVerificationScreen extends ConsumerStatefulWidget {
  const EmailVerificationScreen({super.key, required this.token});
  final String token;

  @override
  ConsumerState<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState
    extends ConsumerState<EmailVerificationScreen> {
  late final Future<void> _verification;

  @override
  void initState() {
    super.initState();
    _verification = ref
        .read(enhancedAuthServiceProvider)
        .verifyEmailToken(widget.token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify email')),
      body: Center(
        child: FutureBuilder<void>(
          future: _verification,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const CircularProgressIndicator();
            }
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                snapshot.hasError
                    ? 'This verification link is invalid or expired.'
                    : 'Email verified. You can now sign in.',
                textAlign: TextAlign.center,
              ),
            );
          },
        ),
      ),
    );
  }
}

class PasswordResetScreen extends ConsumerStatefulWidget {
  const PasswordResetScreen({super.key, required this.token});
  final String token;

  @override
  ConsumerState<PasswordResetScreen> createState() =>
      _PasswordResetScreenState();
}

class _PasswordResetScreenState extends ConsumerState<PasswordResetScreen> {
  final _password = TextEditingController();
  bool _busy = false;
  String? _message;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _reset() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref
          .read(enhancedAuthServiceProvider)
          .resetEmailPassword(widget.token, _password.text);
      _message = 'Password reset. You can now sign in.';
    } catch (_) {
      _message = 'This reset link is invalid or expired.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  key: const Key('reset-password'),
                  controller: _password,
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: const InputDecoration(labelText: 'New password'),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : _reset,
                  child: Text(_busy ? 'Please wait…' : 'Reset password'),
                ),
                if (_message != null) ...[
                  const SizedBox(height: 16),
                  Text(_message!, textAlign: TextAlign.center),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
