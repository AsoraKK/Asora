// ignore_for_file: public_member_api_docs

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/notifications/presentation/notifications_screen.dart';
import 'package:asora/features/feed/presentation/create_post_screen.dart';
import 'package:asora/services/service_providers.dart';
import 'package:asora/state/providers/settings_providers.dart';
import 'package:asora/ui/components/asora_bottom_nav.dart';
import 'package:asora/ui/screens/create/create_screen.dart';
import 'package:asora/ui/screens/home/home_feed_navigator.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';
import 'package:asora/ui/screens/rewards/rewards_dashboard.dart';

class AsoraAppShell extends ConsumerStatefulWidget {
  const AsoraAppShell({super.key});

  @override
  ConsumerState<AsoraAppShell> createState() => _AsoraAppShellState();
}

class _AsoraAppShellState extends ConsumerState<AsoraAppShell> {
  int _currentIndex = 0;
  StreamSubscription<String>? _tokenRefreshSubscription;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_initializeNotifications);
  }

  Future<void> _initializeNotifications() async {
    try {
      final pushService = ref.read(pushNotificationServiceProvider);
      await pushService.initialize();
      final deviceTokenService = ref.read(deviceTokenServiceProvider);
      await deviceTokenService.registerDeviceToken();
      _tokenRefreshSubscription = pushService.onTokenRefresh.listen((_) async {
        try {
          await deviceTokenService.registerDeviceToken();
        } catch (_) {
          // Best-effort refresh registration; keep shell responsive.
        }
      });
    } catch (_) {
      // Notification initialization is best-effort.
    }
  }

  @override
  void dispose() {
    _tokenRefreshSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final _ = ref.watch(
      leftHandedModeProvider,
    ); // trigger rebuild on mirror toggle
    const tabs = <Widget>[
      HomeFeedNavigator(),
      RewardsDashboardScreen(),
      CreateScreen(),
      NotificationsScreen(),
      ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          for (var i = 0; i < tabs.length; i += 1)
            TickerMode(enabled: _currentIndex == i, child: tabs[i]),
        ],
      ),
      bottomNavigationBar: AsoraBottomNav(
        currentIndex: _currentIndex,
        onTap: (index) {
          if (index == 2) {
            Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const CreatePostScreen()),
            );
            return;
          }
          setState(() => _currentIndex = index);
        },
      ),
    );
  }
}
