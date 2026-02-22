// ignore_for_file: public_member_api_docs

/// LYTHAUS ADMIN CONTROL PANEL SHELL
///
/// 🎯 Purpose: Main navigation shell for admin control panel
/// 🏗️ Architecture: Presentation layer with NavigationRail for desktop
/// 🎨 Features: Tab-based navigation, responsive layout
/// 📱 Platform: Flutter with Riverpod state management
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/features/admin/ui/admin_config_screen.dart';
import 'package:asora/features/admin/ui/app_preview_screen.dart';
import 'package:asora/features/admin/ui/budget_screen.dart';
import 'package:asora/screens/admin/moderation_weights_screen.dart';

/// Navigation tabs available in the control panel
enum ControlPanelTab {
  appPreview(
    'App Preview',
    Icons.phone_android,
    'Test app flows in device emulator',
  ),
  config('Configuration', Icons.tune, 'Moderation settings and feature flags'),
  moderationWeights(
    'Moderation Weights',
    Icons.balance,
    'Per-class threshold management',
  ),
  budget('Budget', Icons.account_balance_wallet, 'Monthly budget management'),
  analytics('Analytics', Icons.analytics, 'Usage metrics and insights'),
  users('Users', Icons.people, 'User management'),
  audit('Audit Log', Icons.history, 'Activity history');

  final String label;
  final IconData icon;
  final String description;

  const ControlPanelTab(this.label, this.icon, this.description);
}

/// State provider for selected control panel tab
final controlPanelTabProvider = StateProvider<ControlPanelTab>(
  (ref) => ControlPanelTab.appPreview,
);

/// Main Control Panel Shell with navigation
class ControlPanelShell extends ConsumerWidget {
  const ControlPanelShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedTab = ref.watch(controlPanelTabProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: Row(
        children: [
          // Navigation Rail for desktop/tablet
          NavigationRail(
            extended: MediaQuery.of(context).size.width > 1200,
            minExtendedWidth: 200,
            backgroundColor: theme.colorScheme.surfaceContainerLow,
            selectedIndex: selectedTab.index,
            onDestinationSelected: (index) {
              ref.read(controlPanelTabProvider.notifier).state =
                  ControlPanelTab.values[index];
            },
            leading: _buildNavHeader(context),
            destinations: ControlPanelTab.values.map((tab) {
              return NavigationRailDestination(
                icon: Icon(tab.icon),
                selectedIcon: Icon(tab.icon, color: theme.colorScheme.primary),
                label: Text(tab.label),
              );
            }).toList(),
          ),

          // Divider
          VerticalDivider(
            thickness: 1,
            width: 1,
            color: theme.colorScheme.outlineVariant,
          ),

          // Content area
          Expanded(child: _buildContent(selectedTab)),
        ],
      ),
    );
  }

  Widget _buildNavHeader(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.admin_panel_settings,
              color: theme.colorScheme.onPrimary,
            ),
          ),
          const SizedBox(height: 8),
          if (MediaQuery.of(context).size.width > 1200)
            Text(
              'Control Panel',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent(ControlPanelTab tab) {
    return switch (tab) {
      ControlPanelTab.appPreview => const AppPreviewScreen(),
      ControlPanelTab.config => const AdminConfigScreen(),
      ControlPanelTab.moderationWeights => const ModerationWeightsScreen(),
      ControlPanelTab.budget => const BudgetScreen(),
      ControlPanelTab.analytics => const _PlaceholderScreen(
        title: 'Analytics',
        icon: Icons.analytics,
        description: 'Usage metrics and insights coming soon.',
      ),
      ControlPanelTab.users => const _PlaceholderScreen(
        title: 'User Management',
        icon: Icons.people,
        description: 'User management features coming soon.',
      ),
      ControlPanelTab.audit => const _PlaceholderScreen(
        title: 'Audit Log',
        icon: Icons.history,
        description: 'Activity history and audit trail coming soon.',
      ),
    };
  }
}

/// Placeholder screen for unimplemented tabs
class _PlaceholderScreen extends StatelessWidget {
  final String title;
  final IconData icon;
  final String description;

  const _PlaceholderScreen({
    required this.title,
    required this.icon,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 80, color: theme.colorScheme.outlineVariant),
            const SizedBox(height: 24),
            Text(title, style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              description,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
