/// ASORA ADMIN CONFIG SCREEN
///
/// 🎯 Purpose: UI for admin configuration management
/// 🏗️ Architecture: Presentation layer - displays state and handles user input
/// 🎨 Features: Sliders, status chips, Save/Discard/Reload, error states
/// 📱 Platform: Flutter with Riverpod state management
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../domain/admin_config_models.dart';
import '../state/admin_config_controller.dart';

/// Admin configuration screen
class AdminConfigScreen extends ConsumerWidget {
  const AdminConfigScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(adminConfigEditorProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Config'),
        actions: [
          // Reload button
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload from server',
            onPressed:
                state.status == AdminConfigStatus.loading ||
                    state.status == AdminConfigStatus.saving
                ? null
                : () => ref.read(adminConfigEditorProvider.notifier).reload(),
          ),
        ],
      ),
      body: _buildBody(context, ref, state),
      bottomNavigationBar: _buildBottomBar(context, ref, state),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    AdminConfigEditorState state,
  ) {
    switch (state.status) {
      case AdminConfigStatus.loading:
        return const Center(child: CircularProgressIndicator());

      case AdminConfigStatus.error when state.serverSnapshot == null:
        return _buildFullError(context, ref, state);

      default:
        if (state.serverSnapshot == null || state.draftConfig == null) {
          return const Center(child: Text('No configuration loaded'));
        }
        return _buildConfigEditor(context, ref, state);
    }
  }

  Widget _buildFullError(
    BuildContext context,
    WidgetRef ref,
    AdminConfigEditorState state,
  ) {
    final error = state.error;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load configuration',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              error?.message ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            if (error?.isRetryable ?? true)
              FilledButton.icon(
                onPressed: () =>
                    ref.read(adminConfigEditorProvider.notifier).reload(),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfigEditor(
    BuildContext context,
    WidgetRef ref,
    AdminConfigEditorState state,
  ) {
    final envelope = state.serverSnapshot!;
    final draft = state.draftConfig!;
    final notifier = ref.read(adminConfigEditorProvider.notifier);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header with metadata
        _buildHeader(context, state, envelope),
        const SizedBox(height: 8),

        // Status chip
        _buildStatusChip(context, state),
        const SizedBox(height: 16),

        // Error banner (if any)
        if (state.error != null) _buildErrorBanner(context, ref, state),

        // Moderation section
        _buildSectionHeader(context, 'Moderation'),
        _buildModerationSliders(context, draft, notifier),
        const Divider(height: 32),

        // Feature flags section
        _buildSectionHeader(context, 'Feature Flags'),
        _buildFeatureFlagSwitches(context, draft, notifier),
        const SizedBox(height: 80), // Space for bottom bar
      ],
    );
  }

  Widget _buildHeader(
    BuildContext context,
    AdminConfigEditorState state,
    AdminConfigEnvelope envelope,
  ) {
    final dateFormat = DateFormat.yMMMd().add_jm();
    final localTime = envelope.lastUpdatedAt.toLocal();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.settings, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Version ${envelope.version}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Last updated: ${dateFormat.format(localTime)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              'By: ${envelope.lastUpdatedBy.displayLabel}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(BuildContext context, AdminConfigEditorState state) {
    final (label, color, icon) = switch (state.status) {
      AdminConfigStatus.loading => (
        'Loading...',
        Colors.grey,
        Icons.hourglass_empty,
      ),
      AdminConfigStatus.idle => (
        'Idle',
        Colors.green,
        Icons.check_circle_outline,
      ),
      AdminConfigStatus.dirty => ('Unsaved changes', Colors.orange, Icons.edit),
      AdminConfigStatus.saving => (
        'Saving...',
        Colors.blue,
        Icons.cloud_upload,
      ),
      AdminConfigStatus.saved => ('Saved', Colors.green, Icons.check_circle),
      AdminConfigStatus.error => ('Error', Colors.red, Icons.error_outline),
    };

    return Align(
      alignment: Alignment.centerLeft,
      child: Chip(
        avatar: state.status == AdminConfigStatus.saving
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(icon, size: 18, color: color),
        label: Text(label),
        backgroundColor: color.withValues(alpha: 0.1),
        side: BorderSide(color: color.withValues(alpha: 0.3)),
      ),
    );
  }

  Widget _buildErrorBanner(
    BuildContext context,
    WidgetRef ref,
    AdminConfigEditorState state,
  ) {
    final error = state.error!;

    return Card(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  error.isVersionConflict ? Icons.sync_problem : Icons.error,
                  color: Theme.of(context).colorScheme.onErrorContainer,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    error.isVersionConflict
                        ? 'Config changed on server'
                        : 'Error saving',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onErrorContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              error.message,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (error.isVersionConflict)
                  FilledButton.tonal(
                    onPressed: () =>
                        ref.read(adminConfigEditorProvider.notifier).reload(),
                    child: const Text('Reload'),
                  )
                else if (error.isRetryable)
                  FilledButton.tonal(
                    onPressed: () =>
                        ref.read(adminConfigEditorProvider.notifier).save(),
                    child: const Text('Retry'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        title,
        style: Theme.of(
          context,
        ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildModerationSliders(
    BuildContext context,
    AdminConfig draft,
    AdminConfigEditorNotifier notifier,
  ) {
    final moderation = draft.moderation;

    return Column(
      children: [
        _buildSlider(
          context: context,
          label: 'AI Temperature',
          value: moderation.temperature,
          min: 0.0,
          max: 1.0,
          divisions: 20,
          onChanged: (v) =>
              notifier.updateModeration(moderation.copyWith(temperature: v)),
        ),
        _buildSlider(
          context: context,
          label: 'Toxicity Threshold',
          value: moderation.toxicityThreshold,
          min: 0.0,
          max: 1.0,
          divisions: 20,
          onChanged: (v) => notifier.updateModeration(
            moderation.copyWith(toxicityThreshold: v),
          ),
        ),
        _buildSlider(
          context: context,
          label: 'Auto-Reject Threshold',
          value: moderation.autoRejectThreshold,
          min: 0.0,
          max: 1.0,
          divisions: 20,
          onChanged: (v) => notifier.updateModeration(
            moderation.copyWith(autoRejectThreshold: v),
          ),
        ),
        _buildSwitch(
          context: context,
          label: 'Hive AI Enabled',
          subtitle: 'Primary content moderation service',
          value: moderation.enableHiveAi,
          onChanged: (v) =>
              notifier.updateModeration(moderation.copyWith(enableHiveAi: v)),
        ),
        _buildSwitch(
          context: context,
          label: 'Azure Content Safety',
          subtitle: 'Fallback moderation service',
          value: moderation.enableAzureContentSafety,
          onChanged: (v) => notifier.updateModeration(
            moderation.copyWith(enableAzureContentSafety: v),
          ),
        ),
      ],
    );
  }

  Widget _buildFeatureFlagSwitches(
    BuildContext context,
    AdminConfig draft,
    AdminConfigEditorNotifier notifier,
  ) {
    final flags = draft.featureFlags;

    return Column(
      children: [
        _buildSwitch(
          context: context,
          label: 'Appeals Enabled',
          subtitle: 'Allow users to appeal moderation decisions',
          value: flags.appealsEnabled,
          onChanged: (v) =>
              notifier.updateFeatureFlags(flags.copyWith(appealsEnabled: v)),
        ),
        _buildSwitch(
          context: context,
          label: 'Community Voting',
          subtitle: 'Enable community voting on appeals',
          value: flags.communityVotingEnabled,
          onChanged: (v) => notifier.updateFeatureFlags(
            flags.copyWith(communityVotingEnabled: v),
          ),
        ),
        _buildSwitch(
          context: context,
          label: 'Push Notifications',
          subtitle: 'Global push notification toggle',
          value: flags.pushNotificationsEnabled,
          onChanged: (v) => notifier.updateFeatureFlags(
            flags.copyWith(pushNotificationsEnabled: v),
          ),
        ),
        _buildSwitch(
          context: context,
          label: 'Maintenance Mode',
          subtitle: 'Put app in read-only maintenance mode',
          value: flags.maintenanceMode,
          onChanged: (v) =>
              notifier.updateFeatureFlags(flags.copyWith(maintenanceMode: v)),
          isDestructive: true,
        ),
      ],
    );
  }

  Widget _buildSlider({
    required BuildContext context,
    required String label,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required ValueChanged<double> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label),
              Text(
                value.toStringAsFixed(2),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            label: value.toStringAsFixed(2),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildSwitch({
    required BuildContext context,
    required String label,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool isDestructive = false,
  }) {
    return SwitchListTile(
      title: Text(
        label,
        style: isDestructive
            ? TextStyle(color: Theme.of(context).colorScheme.error)
            : null,
      ),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
    );
  }

  Widget _buildBottomBar(
    BuildContext context,
    WidgetRef ref,
    AdminConfigEditorState state,
  ) {
    final notifier = ref.read(adminConfigEditorProvider.notifier);

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border(
            top: BorderSide(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
        ),
        child: Row(
          children: [
            // Discard button
            OutlinedButton(
              onPressed: state.canDiscard ? () => notifier.discard() : null,
              child: const Text('Discard'),
            ),
            const SizedBox(width: 16),

            // Save button
            Expanded(
              child: FilledButton(
                onPressed: state.canSave ? () => notifier.save() : null,
                child: state.status == AdminConfigStatus.saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Save'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
