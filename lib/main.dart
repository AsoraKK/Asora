// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/scheduler.dart';

import 'package:asora/core/analytics/analytics_events.dart';
import 'package:asora/core/analytics/analytics_providers.dart';
import 'package:asora/core/routing/app_router.dart';
import 'package:asora/design_system/index.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/auth/domain/user.dart';
import 'package:asora/core/logging/app_logger.dart';
import 'package:asora/core/observability/crash_reporting.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final crashReporting = CrashReportingService(
    sink: FirebaseCrashSink(),
    logger: AppLogger('CrashReporting'),
  );
  await crashReporting.initialize();
  runApp(const ProviderScope(child: AsoraApp()));
}

class AsoraApp extends ConsumerStatefulWidget {
  const AsoraApp({super.key});

  @override
  ConsumerState<AsoraApp> createState() => _AsoraAppState();
}

class _AsoraAppState extends ConsumerState<AsoraApp> {
  bool _appStartedLogged = false;
  ProviderSubscription<AsyncValue<User?>>? _authStateSub;

  @override
  void initState() {
    super.initState();
    SchedulerBinding.instance.addPostFrameCallback((_) {
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
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Lythaus',
      theme: LythausTheme.light(),
      darkTheme: LythausTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
