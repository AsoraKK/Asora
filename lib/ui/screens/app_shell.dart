import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/providers/settings_providers.dart';
import '../components/asora_bottom_nav.dart';
import 'create/create_modal.dart';
import 'create/create_screen.dart';
import 'home/home_feed_navigator.dart';
import 'profile/profile_screen.dart';
import 'rewards/rewards_dashboard.dart';

class AsoraAppShell extends ConsumerStatefulWidget {
  const AsoraAppShell({super.key});

  @override
  ConsumerState<AsoraAppShell> createState() => _AsoraAppShellState();
}

class _AsoraAppShellState extends ConsumerState<AsoraAppShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final _ = ref.watch(
      leftHandedModeProvider,
    ); // trigger rebuild on mirror toggle

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          HomeFeedNavigator(),
          RewardsDashboardScreen(),
          CreateScreen(),
          _NotificationsPlaceholder(),
          ProfileScreen(),
        ],
      ),
      bottomNavigationBar: AsoraBottomNav(
        currentIndex: _currentIndex,
        onTap: (index) {
          if (index == 2) {
            CreateModalScreen.show(context);
            return;
          }
          setState(() => _currentIndex = index);
        },
      ),
    );
  }
}

class _NotificationsPlaceholder extends StatelessWidget {
  const _NotificationsPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Notifications coming soon')),
    );
  }
}
