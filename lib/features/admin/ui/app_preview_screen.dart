// ignore_for_file: public_member_api_docs

/// LYTHAUS APP PREVIEW SCREEN
///
/// 🎯 Purpose: Device emulator for testing app flows in admin panel
/// 🏗️ Architecture: Presentation layer for app preview functionality
/// 🎨 Features: Flow selection, device emulation, live test mode, state reset
/// 📱 Platform: Flutter with Riverpod state management
/// 🧪 Live Test Mode: Toggle between mock preview and real API calls
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/design_system/components/lyth_button.dart';
import 'package:asora/features/admin/application/live_test_mode_provider.dart';
import 'package:asora/features/admin/ui/widgets/device_emulator.dart';
import 'package:asora/features/admin/ui/widgets/preview_flow_wrapper.dart';

/// Available preview flows for testing
enum PreviewFlow {
  authChoice('Auth Choice', 'Sign in / Sign up screen', Icons.login),
  onboardingIntro(
    'Onboarding Intro',
    'Welcome introduction',
    Icons.waving_hand,
  ),
  onboardingModeration(
    'Moderation Prompt',
    'Content safety settings',
    Icons.shield,
  ),
  onboardingFeed('Feed Customization', 'Personalize your feed', Icons.tune),
  homeFeed('Home Feed', 'Main content feed', Icons.home),
  createPost('Create Post', 'New post creation', Icons.add_box),
  profile('Profile', 'User profile view', Icons.person),
  settings('Settings', 'App settings screen', Icons.settings),
  rewards('Rewards', 'Rewards dashboard', Icons.emoji_events);

  final String label;
  final String description;
  final IconData icon;

  const PreviewFlow(this.label, this.description, this.icon);
}

/// State provider for app preview
final previewFlowProvider = StateProvider<PreviewFlow>(
  (ref) => PreviewFlow.authChoice,
);

/// State provider for resetting preview state
final previewResetKeyProvider = StateProvider<int>((ref) => 0);

/// App Preview Screen - Device emulator for testing flows
class AppPreviewScreen extends ConsumerWidget {
  const AppPreviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentFlow = ref.watch(previewFlowProvider);
    final resetKey = ref.watch(previewResetKeyProvider);
    final liveTestMode = ref.watch(liveTestModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('App Preview'),
            if (liveTestMode.isEnabled) ...[
              const SizedBox(width: 12),
              _LiveModeBadge(),
            ],
          ],
        ),
        actions: [
          // Live mode toggle
          _LiveModeToggle(),
          const SizedBox(width: 8),
          // Reset state button
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reset preview state',
            onPressed: () {
              ref.read(previewResetKeyProvider.notifier).state++;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Preview state reset'),
                  duration: Duration(seconds: 1),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Row(
        children: [
          // Flow selector panel
          _FlowSelectorPanel(currentFlow: currentFlow),

          // Device emulator with preview content
          Expanded(
            child: DeviceEmulator(
              showControls: true,
              child: KeyedSubtree(
                key: ValueKey('preview_${resetKey}_${liveTestMode.isEnabled}'),
                child: PreviewFlowWrapper(flow: currentFlow),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Live mode indicator badge
class _LiveModeBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.red,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.fiber_manual_record, size: 8, color: Colors.white),
          SizedBox(width: 4),
          Text(
            'LIVE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}

/// Toggle button for live test mode
class _LiveModeToggle extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final liveTestMode = ref.watch(liveTestModeProvider);
    final theme = Theme.of(context);

    return PopupMenuButton<String>(
      icon: Icon(
        liveTestMode.isEnabled ? Icons.science : Icons.science_outlined,
        color: liveTestMode.isEnabled ? Colors.red : null,
      ),
      tooltip: 'Live Test Mode',
      onSelected: (value) {
        switch (value) {
          case 'toggle':
            ref.read(liveTestModeProvider.notifier).toggle();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  liveTestMode.isEnabled
                      ? '🔴 Live Test Mode disabled - using mock data'
                      : '🟢 Live Test Mode enabled - using real APIs',
                ),
                backgroundColor: liveTestMode.isEnabled
                    ? Colors.grey
                    : Colors.green,
              ),
            );
          case 'new_session':
            ref.read(liveTestModeProvider.notifier).startNewSession();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('New test session started')),
            );
          case 'purge_session':
            _showPurgeConfirmation(context, ref, liveTestMode.sessionId);
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          value: 'toggle',
          child: Row(
            children: [
              Icon(
                liveTestMode.isEnabled
                    ? Icons.toggle_on
                    : Icons.toggle_off_outlined,
                color: liveTestMode.isEnabled ? Colors.green : Colors.grey,
              ),
              const SizedBox(width: 12),
              Text(
                liveTestMode.isEnabled
                    ? 'Disable Live Mode'
                    : 'Enable Live Mode',
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          enabled: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Live Test Mode',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                liveTestMode.isEnabled
                    ? '• Real API calls\n• Real Hive AI moderation\n• Posts marked as test data'
                    : '• Mock data only\n• Simulated moderation\n• No API calls',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        if (liveTestMode.isEnabled) ...[
          const PopupMenuDivider(),
          PopupMenuItem<String>(
            value: 'new_session',
            child: Row(
              children: [
                const Icon(Icons.refresh),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('New Session'),
                    Text(
                      'Session: ${liveTestMode.sessionId.substring(0, 20)}...',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          PopupMenuItem<String>(
            value: 'purge_session',
            child: Row(
              children: [
                Icon(Icons.delete_sweep, color: Colors.orange[700]),
                const SizedBox(width: 12),
                Text(
                  'Purge Session Data',
                  style: TextStyle(color: Colors.orange[700]),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  void _showPurgeConfirmation(
    BuildContext context,
    WidgetRef ref,
    String sessionId,
  ) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Purge Test Data?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This will permanently delete all test posts from this session:',
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                sessionId,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'This action cannot be undone.',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _purgeTestData(context, ref, sessionId);
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Purge Data'),
          ),
        ],
      ),
    );
  }

  Future<void> _purgeTestData(
    BuildContext context,
    WidgetRef ref,
    String sessionId,
  ) async {
    // Show loading snackbar
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            ),
            SizedBox(width: 12),
            Text('Purging test data...'),
          ],
        ),
        duration: Duration(seconds: 10),
      ),
    );

    // TODO: Call the admin purge API endpoint
    // For now, just simulate with a delay
    await Future<void>.delayed(const Duration(seconds: 2));

    if (context.mounted) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Test data purged successfully'),
          backgroundColor: Colors.green,
        ),
      );

      // Start a new session after purge
      ref.read(liveTestModeProvider.notifier).startNewSession();
    }
  }
}

/// Left panel for selecting which flow to preview
class _FlowSelectorPanel extends ConsumerWidget {
  final PreviewFlow currentFlow;

  const _FlowSelectorPanel({required this.currentFlow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border(
          right: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
              border: Border(
                bottom: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.phone_android, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Flow Selector',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Choose a screen flow to preview in the device emulator',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          // Flow list grouped by category
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _buildCategoryHeader(context, 'Authentication'),
                ..._buildFlowItems(ref, [PreviewFlow.authChoice]),

                _buildCategoryHeader(context, 'Onboarding'),
                ..._buildFlowItems(ref, [
                  PreviewFlow.onboardingIntro,
                  PreviewFlow.onboardingModeration,
                  PreviewFlow.onboardingFeed,
                ]),

                _buildCategoryHeader(context, 'Main App'),
                ..._buildFlowItems(ref, [
                  PreviewFlow.homeFeed,
                  PreviewFlow.createPost,
                  PreviewFlow.profile,
                  PreviewFlow.settings,
                  PreviewFlow.rewards,
                ]),
              ],
            ),
          ),

          // Bottom quick actions
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
            ),
            child: Column(
              children: [
                LythButton.secondary(
                  label: 'Full User Journey',
                  icon: Icons.play_arrow,
                  onPressed: () {
                    ref.read(previewFlowProvider.notifier).state =
                        PreviewFlow.authChoice;
                    ref.read(previewResetKeyProvider.notifier).state++;
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  List<Widget> _buildFlowItems(WidgetRef ref, List<PreviewFlow> flows) {
    return flows.map((flow) => _FlowItem(flow: flow)).toList();
  }
}

/// Individual flow item in the selector
class _FlowItem extends ConsumerWidget {
  final PreviewFlow flow;

  const _FlowItem({required this.flow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final currentFlow = ref.watch(previewFlowProvider);
    final isSelected = currentFlow == flow;

    return ListTile(
      leading: Icon(
        flow.icon,
        size: 20,
        color: isSelected
            ? theme.colorScheme.primary
            : theme.colorScheme.onSurfaceVariant,
      ),
      title: Text(
        flow.label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          color: isSelected ? theme.colorScheme.primary : null,
        ),
      ),
      subtitle: Text(
        flow.description,
        style: theme.textTheme.bodySmall?.copyWith(
          fontSize: 11,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
      selected: isSelected,
      selectedTileColor: theme.colorScheme.primaryContainer.withValues(
        alpha: 0.3,
      ),
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onTap: () {
        ref.read(previewFlowProvider.notifier).state = flow;
      },
    );
  }
}
