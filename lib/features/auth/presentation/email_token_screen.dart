// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/web_token_storage.dart';
import 'package:asora/features/auth/domain/auth_failure.dart';

class EmailVerificationScreen extends ConsumerStatefulWidget {
  const EmailVerificationScreen({super.key, required this.token});
  final String token;

  @override
  ConsumerState<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState
    extends ConsumerState<EmailVerificationScreen> {
  String? _token;
  String? _message;
  bool _busy = false;
  bool _complete = false;

  @override
  void initState() {
    super.initState();
    _token = widget.token.isEmpty ? null : widget.token;
    if (_token != null) clearWebEmailActionUrl();
  }

  Future<void> _verify() async {
    final token = _token;
    if (token == null || _busy || _complete) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final status = await ref.read(enhancedAuthServiceProvider).verifyEmailToken(token);
      if (!mounted) return;
      setState(() {
        _complete = true;
        _token = null;
        _message = status == 'already_verified'
            ? 'Email is already verified. You can now sign in.'
            : 'Email verified. You can now sign in.';
      });
    } on AuthFailure catch (error) {
      if (mounted) {
        setState(() {
          _message = error.message;
          if (!error.retryable) _token = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _message = 'Verification is temporarily unavailable. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify email')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _complete
                      ? _message!
                      : _message ??
                          (_token == null
                              ? 'This verification link is incomplete. Reopen the email and try again.'
                              : 'Confirm that you want to verify this email address.'),
                  textAlign: TextAlign.center,
                ),
                if (_token != null && !_complete) ...[
                  const SizedBox(height: 24),
                  FilledButton(
                    key: const Key('confirm-email-verification'),
                    onPressed: _busy ? null : _verify,
                    child: Text(_busy ? 'Please waitâ€¦' : 'Verify email'),
                  ),
                ],
              ],
            ),
          ),
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
  void initState() {
    super.initState();
    if (widget.token.isNotEmpty) clearWebEmailActionUrl();
  }

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
