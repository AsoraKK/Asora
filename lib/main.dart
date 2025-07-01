import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/auth/presentation/auth_screen.dart';

void main() {
  runApp(
    ProviderScope(
      child: MaterialApp(
        title: 'Asora',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        ),
        home: const AuthScreen(),
      ),
    ),
  );
}
