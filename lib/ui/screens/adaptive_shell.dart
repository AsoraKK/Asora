// ignore_for_file: public_member_api_docs

/// Adaptive shell that switches between bottom navigation (mobile) and
/// navigation rail (desktop/tablet) at the 768 px breakpoint.
library;

import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/features/notifications/presentation/notifications_screen.dart';
import 'package:asora/services/service_providers.dart';
import 'package:asora/state/providers/settings_providers.dart';
import 'package:asora/ui/components/asora_bottom_nav.dart';
import 'package:asora/ui/screens/create/create_screen.dart';
import 'package:asora/ui/screens/home/home_feed_navigator.dart';
import 'package:asora/ui/screens/profile/profile_screen.dart';

/// Breakpoint (logical pixels) at which the shell switches from bottom
/// navigation to a navigation rail.
const double kDesktopBreakpoint = 768;

class AdaptiveShell extends ConsumerStatefulWidget {
  const AdaptiveShell({super.key});

  @override
  ConsumerState<AdaptiveShell> createState() => _AdaptiveShellState();
}

class _AdaptiveShellState extends ConsumerState<AdaptiveShell> {
  int _currentIndex = 0;
  StreamSubscription<String>? _tokenRefreshSubscription;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_initializeNotifications);
  }

  Future<void> _initializeNotifications() async {
    // Push notifications via FCM are not supported on web yet.
    if (kIsWeb) return;

    try {
      final pushService = ref.read(pushNotificationServiceProvider);
      await pushService.initialize();
      final deviceTokenService = ref.read(deviceTokenServiceProvider);
      await deviceTokenService.registerDeviceToken();
      _tokenRefreshSubscription = pushService.onTokenRefresh.listen((_) async {
        try {
          await deviceTokenService.registerDeviceToken();
        } catch (_) {
          // Best-effort refresh registration.
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

  void _onTabTapped(int index) {
    final isGuest = ref.read(guestModeProvider);
    if (isGuest && index == 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign in to create a post.')),
      );
      return;
    }
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(leftHandedModeProvider); // rebuild on mirror toggle

    const tabs = <Widget>[
      HomeFeedNavigator(),
      CreateScreen(),
      NotificationsScreen(),
      ProfileScreen(),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= kDesktopBreakpoint) {
          return _buildDesktopLayout(tabs);
        }
        return _buildMobileLayout(tabs);
      },
    );
  }

  Widget _buildDesktopLayout(List<Widget> tabs) {
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _currentIndex,
            onDestinationSelected: _onTabTapped,
            labelType: NavigationRailLabelType.all,
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.explore_outlined),
                selectedIcon: Icon(Icons.explore),
                label: Text('Discover'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.add_circle_outline),
                selectedIcon: Icon(Icons.add_circle),
                label: Text('Create'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.notifications_outlined),
                selectedIcon: Icon(Icons.notifications),
                label: Text('Alerts'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: Text('Profile'),
              ),
            ],
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: [
                for (var i = 0; i < tabs.length; i += 1)
                  TickerMode(enabled: _currentIndex == i, child: tabs[i]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileLayout(List<Widget> tabs) {
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
        onTap: _onTabTapped,
      ),
    );
  }
}
