import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'screens/moderation_demo_page.dart';

void main() {
  runApp(
    ProviderScope(
      child: MaterialApp(
        title: 'Asora',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
          useMaterial3: true,
        ),
        home: const ModerationDemoPage(), // Demo page for testing
        routes: {'/demo': (context) => const ModerationDemoPage()},
      ),
    ),
  );
}
