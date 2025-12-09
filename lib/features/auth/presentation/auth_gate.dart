import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_providers.dart';
import '../../../core/analytics/analytics_events.dart';
import '../../../core/analytics/analytics_providers.dart';
import '../../../ui/screens/app_shell.dart';
import 'auth_choice_screen.dart';

class AuthGate extends ConsumerStatefulWidget {
  const AuthGate({super.key});

  @override
  ConsumerState<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends ConsumerState<AuthGate> {
  bool _appStartedLogged = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _appStartedLogged) return;
      ref.read(analyticsClientProvider).logEvent(AnalyticsEvents.appStarted);
      _appStartedLogged = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        return user != null ? const AsoraAppShell() : const AuthChoiceScreen();
      },
      loading: () => const AuthChoiceScreen(),
      error: (error, stack) => const AuthChoiceScreen(),
    );
  }
}
