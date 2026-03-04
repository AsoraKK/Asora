// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/ui/screens/app_shell.dart';
import 'package:asora/features/auth/presentation/auth_choice_screen.dart';

class AuthGate extends ConsumerStatefulWidget {
  const AuthGate({super.key});

  @override
  ConsumerState<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends ConsumerState<AuthGate> {
  bool _appStartedLogged = false;
  ProviderSubscription<AsyncValue<User?>>? _authStateSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _appStartedLogged) return;
      final analytics = ref.read(analyticsClientProvider);
      analytics.logEvent(AnalyticsEvents.appStarted);
      ref
          .read(analyticsEventTrackerProvider)
          .logEventOnce(analytics, AnalyticsEvents.onboardingStart);
      _appStartedLogged = true;
    });

    _authStateSub = ref.listenManual<AsyncValue<User?>>(authStateProvider, (
      previous,
      next,
    ) {
      final analytics = ref.read(analyticsClientProvider);
      final user = next.valueOrNull;
      analytics.setUserId(user?.id);
    });
  }

  @override
  void dispose() {
    _authStateSub?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final isGuest = ref.watch(guestModeProvider);

    return authState.when(
      data: (user) {
        return user != null || isGuest
            ? const AsoraAppShell()
            : const AuthChoiceScreen();
      },
      loading: () => isGuest ? const AsoraAppShell() : const AuthChoiceScreen(),
      error: (error, stack) =>
          isGuest ? const AsoraAppShell() : const AuthChoiceScreen(),
    );
  }
}
