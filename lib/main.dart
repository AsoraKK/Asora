import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'design_system/index.dart';
import 'features/auth/presentation/auth_gate.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
