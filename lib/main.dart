import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'screens/feed_screen.dart';
import 'features/auth/presentation/auth_gate.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized(); // Ensure binding is initialized
  runApp(
    ProviderScope(
      child: MaterialApp(
        title: 'Asora',
        theme: AsoraTheme.light(),
        darkTheme: AsoraTheme.dark(),
        themeMode: ThemeMode.dark, // toggle to .light for light-mode demo
        home: const AuthGate(),
        routes: {'/feed': (context) => const FeedScreen()},
      ),
    ),
  );
}
