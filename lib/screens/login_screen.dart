// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:asora/features/auth/presentation/email_auth_screen.dart';

/// Compatibility wrapper for callers that still navigate to the old screen.
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) => const EmailAuthScreen();
}
