import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/lock_screen.dart';

// Placeholder provider - replace with your actual user provider
final meProvider = FutureProvider<UserProfile>((ref) async {
  // NOTE(asora-auth): replace with real /api/me call once backend contract stabilizes
  await Future.delayed(const Duration(seconds: 1));
  return const UserProfile(accountLocked: false);
});

class UserProfile {
  final bool accountLocked;
  final String? accountCreatedAt;

  const UserProfile({required this.accountLocked, this.accountCreatedAt});
}

class ReadGate extends ConsumerWidget {
  final Widget child;
  const ReadGate({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    return me.when(
      data: (u) => u.accountLocked ? const FirstPostLockScreen() : child,
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) => child, // Allow access on error
    );
  }
}
