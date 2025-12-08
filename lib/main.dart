import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'ui/screens/app_shell.dart';
import 'ui/theme/asora_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: AsoraApp()));
}

class AsoraApp extends StatelessWidget {
  const AsoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Asora',
      theme: AsoraTheme.light(),
      darkTheme: AsoraTheme.dark(),
      themeMode: ThemeMode.dark,
      home: const AsoraAppShell(),
    );
  }
}
