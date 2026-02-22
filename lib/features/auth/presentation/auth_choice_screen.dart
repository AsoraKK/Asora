// ignore_for_file: public_member_api_docs

// ignore_for_file: use_build_context_synchronously

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

  Future<void> _handleSignIn(BuildContext context) async {
    await _analyticsClient.logEvent(
      AnalyticsEvents.authChoiceSelected,
      properties: {AnalyticsEvents.propMethod: 'sign_in'},
    );
    final provider = await _showProviderPicker(context, isCreateFlow: false);
    if (provider == null) {
      return;
    }
    final analytics = _analyticsClient;
    await analytics.logEvent(
      AnalyticsEvents.authStarted,
      properties: {AnalyticsEvents.propMethod: provider.name},
    );
    try {
      await runWithDeviceGuard(
        context,
        ref,
        IntegrityUseCase.signIn,
        () => ref.read(authStateProvider.notifier).signInWithProvider(provider),
      );
      if (!mounted) return;
      await analytics.logEvent(
        AnalyticsEvents.authCompleted,
        properties: {
          AnalyticsEvents.propMethod: provider.name,
          AnalyticsEvents.propIsNewUser: false,
        },
      );
    } catch (error) {
      if (!mounted) return;
      await analytics.logEvent(
        AnalyticsEvents.errorEncountered,
        properties: {
          AnalyticsEvents.propErrorType: 'auth',
          AnalyticsEvents.propRecoverable: true,
        },
      );
      rethrow;
    }
  }

  Future<void> _handleCreateAccount(BuildContext context) async {
    await _analyticsClient.logEvent(
      AnalyticsEvents.authChoiceSelected,
      properties: {AnalyticsEvents.propMethod: 'create_account'},
    );
    final provider = await _showProviderPicker(context, isCreateFlow: true);
    if (provider == null) {
      return;
    }
    final analytics = _analyticsClient;
    await analytics.logEvent(
      AnalyticsEvents.authStarted,
      properties: {AnalyticsEvents.propMethod: '${provider.name}_create'},
    );
    try {
      await runWithDeviceGuard(
        context,
        ref,
        IntegrityUseCase.signUp,
        () => ref.read(authStateProvider.notifier).signInWithProvider(provider),
      );
      if (!mounted) return;
      await analytics.logEvent(
        AnalyticsEvents.authCompleted,
        properties: {
          AnalyticsEvents.propMethod: '${provider.name}_create',
          AnalyticsEvents.propIsNewUser: true,
        },
      );
    } catch (error) {
      if (!mounted) return;
      await analytics.logEvent(
        AnalyticsEvents.errorEncountered,
        properties: {
          AnalyticsEvents.propErrorType: 'auth',
          AnalyticsEvents.propRecoverable: true,
        },
      );
      rethrow;
    }
  }

  Future<OAuth2Provider?> _showProviderPicker(
    BuildContext context, {
    required bool isCreateFlow,
  }) {
    final title = isCreateFlow ? 'Create account with' : 'Sign in with';
    return showModalBottomSheet<OAuth2Provider>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(sheetContext).textTheme.titleMedium),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.g_mobiledata),
              title: const Text('Google'),
              onTap: () =>
                  Navigator.of(sheetContext).pop(OAuth2Provider.google),
            ),
            ListTile(
              leading: const Icon(Icons.apple),
              title: const Text('Apple'),
              onTap: () => Navigator.of(sheetContext).pop(OAuth2Provider.apple),
            ),
            ListTile(
              leading: const Icon(Icons.public),
              title: const Text('World ID'),
              onTap: () => Navigator.of(sheetContext).pop(OAuth2Provider.world),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleGuestContinue() async {
    _analyticsClient.logEvent(
      AnalyticsEvents.authChoiceSelected,
      properties: {AnalyticsEvents.propMethod: 'guest'},
    );
    _analyticsClient.logEvent(
      AnalyticsEvents.authCompleted,
      properties: {
        AnalyticsEvents.propMethod: 'guest',
        AnalyticsEvents.propIsNewUser: false,
      },
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
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),
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
                    'Browse the feed as a guest or sign in to interact.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 32),
                  LythButton.primary(
                    label: 'Continue as guest',
                    onPressed: _handleGuestContinue,
                  ),
                  const SizedBox(height: 12),
                  LythButton.secondary(
                    label: 'Sign in',
                    onPressed: () => _handleSignIn(context),
                    icon: Icons.login,
                  ),
                  const SizedBox(height: 24),
                  LythButton.tertiary(
                    label: 'Create account',
                    onPressed: () => _handleCreateAccount(context),
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
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
