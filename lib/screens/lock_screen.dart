import 'package:flutter/material.dart';

class FirstPostLockScreen extends StatelessWidget {
  const FirstPostLockScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: Colors.amber),
              const SizedBox(height: 24),
              const Text(
                "Create your first post to unlock reading",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                "New users need to create their first post within 48 hours to continue using Asora.",
                style: TextStyle(fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => Navigator.pushNamed(context, "/compose"),
                child: const Text("Create first post"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
