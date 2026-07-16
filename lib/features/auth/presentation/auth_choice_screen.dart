// ignore_for_file: public_member_api_docs

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/scheduler.dart';

import 'package:asora/core/analytics/analytics_client.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/core/security/device_integrity_guard.dart';
import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/screens/security_debug_screen.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/application/oauth2_service.dart';
import 'package:asora/features/auth/presentation/email_auth_screen.dart';
import 'package:asora/features/auth/presentation/invite_redeem_screen.dart';

class AuthChoiceScreen extends ConsumerStatefulWidget {
  const AuthChoiceScreen({super.key});

  @override
  ConsumerState<AuthChoiceScreen> createState() => _AuthChoiceScreenState();
}

class _AuthChoiceScreenState extends ConsumerState<AuthChoiceScreen> {
  late final AnalyticsClient _analyticsClient;
  bool _screenViewLogged = false;

  @override
  void initState() {
    super.initState();
    _analyticsClient = ref.read(analyticsClientProvider);
    SchedulerBinding.instance.addPostFrameCallback((_) => _logScreenView());
  }

  void _logScreenView() {
    if (_screenViewLogged) return;
    _analyticsClient.logEvent(
      AnalyticsEvents.screenView,
      properties: {
        AnalyticsEvents.propScreenName: 'auth_choice',
        AnalyticsEvents.propReferrer: 'app_entry',
      },
    );
    _screenViewLogged = true;
  }

  Future<void> _handleGoogle() async {
    await _analyticsClient.logEvent(
      AnalyticsEvents.authChoiceSelected,
      properties: {AnalyticsEvents.propMethod: 'google'},
    );
    if (!mounted) return;
    await runWithDeviceGuard(
      context,
      ref,
      IntegrityUseCase.signIn,
      () => ref
          .read(authStateProvider.notifier)
          .signInWithProvider(OAuth2Provider.google),
    );
  }

  Future<void> _handleEmail() async {
    await _analyticsClient.logEvent(
      AnalyticsEvents.authChoiceSelected,
      properties: {AnalyticsEvents.propMethod: 'email'},
    );
    if (!mounted) return;
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const EmailAuthScreen()));
  }

  Future<void> _handleGuestContinue() async {
    await _analyticsClient.logEvent(
      AnalyticsEvents.authChoiceSelected,
      properties: {AnalyticsEvents.propMethod: 'guest'},
    );
    await ref.read(authStateProvider.notifier).continueAsGuest();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.auto_awesome, size: 56),
                  const SizedBox(height: 12),
                  Text(
                    'Welcome to Lythaus',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Browse as a guest or use one of the secure MVP sign-in methods.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 32),
                  LythButton.primary(
                    label: 'Continue with Google',
                    icon: Icons.g_mobiledata,
                    onPressed: _handleGoogle,
                  ),
                  const SizedBox(height: 12),
                  LythButton.secondary(
                    label: 'Continue with email',
                    icon: Icons.email_outlined,
                    onPressed: _handleEmail,
                  ),
                  const SizedBox(height: 20),
                  LythButton.tertiary(
                    label: 'Continue as guest',
                    onPressed: _handleGuestContinue,
                  ),
                  const SizedBox(height: 12),
                  LythButton.tertiary(
                    label: 'Redeem invite',
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const InviteRedeemScreen(),
                        ),
                      );
                    },
                  ),
                  if (kDebugMode) ...[
                    const SizedBox(height: 16),
                    LythButton.secondary(
                      label: 'Security Debug',
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const SecurityDebugScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
