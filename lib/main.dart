// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/design_system/index.dart';
import 'package:asora/features/auth/presentation/auth_gate.dart';
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

class AsoraApp extends StatelessWidget {
  const AsoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lythaus',
      theme: LythausTheme.light(),
      darkTheme: LythausTheme.dark(),
      themeMode: ThemeMode.system,
      home: const AuthGate(),
    );
  }
}
