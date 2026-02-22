// ignore_for_file: public_member_api_docs

/// LYTHAUS ADMIN BUDGET SCREEN
///
/// 🎯 Purpose: UI for adjusting the monthly Azure budget from the admin dashboard
/// 🏗️ Architecture: Presentation layer with Riverpod state management
/// 🎨 Features: Slider for budget amount, save/reload, status display
/// 📱 Platform: Flutter with Material 3
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:asora/features/admin/api/admin_api_client.dart';
import 'package:asora/core/network/dio_client.dart';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

enum BudgetScreenStatus { loading, idle, dirty, saving, saved, error }

class BudgetScreenState {
  const BudgetScreenState({
    this.status = BudgetScreenStatus.loading,
    this.serverBudget,
    this.draftAmount,
    this.errorMessage,
    this.azureSynced,
  });

  final BudgetScreenStatus status;
  final BudgetInfo? serverBudget;
  final double? draftAmount;
  final String? errorMessage;
  final bool? azureSynced;

  bool get isDirty =>
      draftAmount != null &&
      serverBudget != null &&
      (draftAmount! - serverBudget!.amount).abs() > 0.01;

  BudgetScreenState copyWith({
    BudgetScreenStatus? status,
    BudgetInfo? serverBudget,
    double? draftAmount,
    String? errorMessage,
    bool? azureSynced,
  }) {
    return BudgetScreenState(
      status: status ?? this.status,
      serverBudget: serverBudget ?? this.serverBudget,
      draftAmount: draftAmount ?? this.draftAmount,
      errorMessage: errorMessage,
      azureSynced: azureSynced ?? this.azureSynced,
    );
  }
}

class BudgetScreenNotifier extends StateNotifier<BudgetScreenState> {
  BudgetScreenNotifier(this._client) : super(const BudgetScreenState()) {
    load();
  }

  final AdminApiClient _client;

  Future<void> load() async {
    state = state.copyWith(status: BudgetScreenStatus.loading);
    try {
      final budget = await _client.getBudget();
      state = BudgetScreenState(
        status: BudgetScreenStatus.idle,
        serverBudget: budget,
        draftAmount: budget.amount,
      );
    } on AdminApiException catch (e) {
      state = BudgetScreenState(
        status: BudgetScreenStatus.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = BudgetScreenState(
        status: BudgetScreenStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  void setDraftAmount(double amount) {
    state = state.copyWith(
      status:
          state.isDirty ||
              (amount - (state.serverBudget?.amount ?? 0)).abs() > 0.01
          ? BudgetScreenStatus.dirty
          : BudgetScreenStatus.idle,
      draftAmount: amount,
    );
  }

  void discard() {
    if (state.serverBudget != null) {
      state = state.copyWith(
        status: BudgetScreenStatus.idle,
        draftAmount: state.serverBudget!.amount,
      );
    }
  }

  Future<void> save() async {
    if (state.draftAmount == null) return;
    state = state.copyWith(status: BudgetScreenStatus.saving);
    try {
      final result = await _client.updateBudget(state.draftAmount!);
      state = BudgetScreenState(
        status: BudgetScreenStatus.saved,
        serverBudget: result.budget,
        draftAmount: result.budget.amount,
        azureSynced: result.azureSynced,
      );
      // After brief delay, return to idle
      await Future<void>.delayed(const Duration(seconds: 2));
      if (state.status == BudgetScreenStatus.saved) {
        state = state.copyWith(status: BudgetScreenStatus.idle);
      }
    } on AdminApiException catch (e) {
      state = state.copyWith(
        status: BudgetScreenStatus.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: BudgetScreenStatus.error,
        errorMessage: e.toString(),
      );
    }
  }
}

final budgetScreenProvider =
    StateNotifierProvider<BudgetScreenNotifier, BudgetScreenState>((ref) {
      final dio = ref.watch(secureDioProvider);
      final client = AdminApiClient(dio);
      return BudgetScreenNotifier(client);
    });

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class BudgetScreen extends ConsumerWidget {
  const BudgetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(budgetScreenProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Budget Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload from server',
            onPressed:
                state.status == BudgetScreenStatus.loading ||
                    state.status == BudgetScreenStatus.saving
                ? null
                : () => ref.read(budgetScreenProvider.notifier).load(),
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
    BudgetScreenState state,
  ) {
    if (state.status == BudgetScreenStatus.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.status == BudgetScreenStatus.error &&
        state.serverBudget == null) {
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
                'Failed to load budget',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                state.errorMessage ?? 'Unknown error',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => ref.read(budgetScreenProvider.notifier).load(),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (state.serverBudget == null) {
      return const Center(child: Text('No budget configuration loaded'));
    }

    return _buildEditor(context, ref, state);
  }

  Widget _buildEditor(
    BuildContext context,
    WidgetRef ref,
    BudgetScreenState state,
  ) {
    final budget = state.serverBudget!;
    final draftAmount = state.draftAmount ?? budget.amount;
    final theme = Theme.of(context);
    final dateFormat = DateFormat.yMMMd().add_jm();
    final notifier = ref.read(budgetScreenProvider.notifier);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status chip
        _buildStatusChip(context, state),
        const SizedBox(height: 16),

        // Error banner
        if (state.errorMessage != null &&
            state.status == BudgetScreenStatus.error)
          _buildErrorBanner(context, state),

        // Azure sync status
        if (state.azureSynced != null) ...[
          _buildSyncBanner(context, state.azureSynced!),
          const SizedBox(height: 16),
        ],

        // Budget amount card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.account_balance_wallet,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Monthly Budget',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Large amount display
                Center(
                  child: Text(
                    '\$${draftAmount.toInt()}',
                    style: theme.textTheme.displayMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: state.isDirty
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurface,
                    ),
                  ),
                ),
                Center(
                  child: Text(
                    'per month',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Slider
                Slider(
                  value: draftAmount.clamp(10, 1000),
                  min: 10,
                  max: 1000,
                  divisions: 99,
                  label: '\$${draftAmount.toInt()}',
                  onChanged: state.status == BudgetScreenStatus.saving
                      ? null
                      : (value) => notifier.setDraftAmount(
                          (value / 10).round() * 10.0,
                        ),
                ),

                // Min/Max labels
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '\$10',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                      Text(
                        '\$1,000',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Quick presets
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [50, 100, 200, 500].map((preset) {
                    final isSelected = (draftAmount - preset).abs() < 1;
                    return ChoiceChip(
                      label: Text('\$$preset'),
                      selected: isSelected,
                      onSelected: state.status == BudgetScreenStatus.saving
                          ? null
                          : (_) => notifier.setDraftAmount(preset.toDouble()),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Alert thresholds card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.notifications_active,
                      color: theme.colorScheme.secondary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Alert Thresholds',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Actual thresholds
                if (budget.thresholds['actual']?.isNotEmpty ?? false) ...[
                  Text(
                    'Actual spend alerts',
                    style: theme.textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: budget.thresholds['actual']!.map((threshold) {
                      final amount = (draftAmount * threshold / 100).toInt();
                      return Chip(
                        avatar: Icon(
                          threshold >= 100 ? Icons.warning : Icons.info_outline,
                          size: 18,
                          color: threshold >= 100
                              ? theme.colorScheme.error
                              : theme.colorScheme.primary,
                        ),
                        label: Text('$threshold% (\$$amount)'),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                ],

                // Forecasted thresholds
                if (budget.thresholds['forecasted']?.isNotEmpty ?? false) ...[
                  Text('Forecast alerts', style: theme.textTheme.labelLarge),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: budget.thresholds['forecasted']!.map((threshold) {
                      final amount = (draftAmount * threshold / 100).toInt();
                      return Chip(
                        avatar: Icon(
                          Icons.trending_up,
                          size: 18,
                          color: theme.colorScheme.tertiary,
                        ),
                        label: Text('$threshold% (\$$amount)'),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Info card
        Card(
          color: theme.colorScheme.surfaceContainerHighest,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 18,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Text('Budget Details', style: theme.textTheme.titleSmall),
                  ],
                ),
                const SizedBox(height: 12),
                _infoRow(theme, 'Azure Budget', budget.azureBudgetName),
                _infoRow(theme, 'Resource Group', budget.resourceGroup),
                _infoRow(theme, 'Notification Email', budget.notificationEmail),
                _infoRow(
                  theme,
                  'Last Updated',
                  dateFormat.format(budget.updatedAt.toLocal()),
                ),
                _infoRow(theme, 'Updated By', budget.updatedBy),
              ],
            ),
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _infoRow(ThemeData theme, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodySmall)),
        ],
      ),
    );
  }

  Widget _buildStatusChip(BuildContext context, BudgetScreenState state) {
    final (label, color, icon) = switch (state.status) {
      BudgetScreenStatus.loading => (
        'Loading...',
        Colors.grey,
        Icons.hourglass_empty,
      ),
      BudgetScreenStatus.idle => (
        'Synced',
        Colors.green,
        Icons.check_circle_outline,
      ),
      BudgetScreenStatus.dirty => (
        'Unsaved changes',
        Colors.orange,
        Icons.edit,
      ),
      BudgetScreenStatus.saving => (
        'Saving...',
        Colors.blue,
        Icons.cloud_upload,
      ),
      BudgetScreenStatus.saved => ('Saved', Colors.green, Icons.check_circle),
      BudgetScreenStatus.error => ('Error', Colors.red, Icons.error_outline),
    };

    return Align(
      alignment: Alignment.centerLeft,
      child: Chip(
        avatar: state.status == BudgetScreenStatus.saving
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

  Widget _buildErrorBanner(BuildContext context, BudgetScreenState state) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Card(
        color: Theme.of(context).colorScheme.errorContainer,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Icon(
                Icons.error,
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  state.errorMessage ?? 'An error occurred',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncBanner(BuildContext context, bool synced) {
    final theme = Theme.of(context);
    return Card(
      color: synced
          ? theme.colorScheme.primaryContainer
          : theme.colorScheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              synced ? Icons.cloud_done : Icons.cloud_off,
              color: synced
                  ? theme.colorScheme.onPrimaryContainer
                  : theme.colorScheme.onTertiaryContainer,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                synced
                    ? 'Azure budget updated successfully'
                    : 'Saved locally. Azure budget sync unavailable (will sync on next deploy).',
                style: TextStyle(
                  color: synced
                      ? theme.colorScheme.onPrimaryContainer
                      : theme.colorScheme.onTertiaryContainer,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(
    BuildContext context,
    WidgetRef ref,
    BudgetScreenState state,
  ) {
    if (state.serverBudget == null) return const SizedBox.shrink();

    final showActions =
        state.isDirty ||
        state.status == BudgetScreenStatus.saving ||
        state.status == BudgetScreenStatus.saved;

    if (!showActions) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          // Discard button
          TextButton(
            onPressed: state.status == BudgetScreenStatus.saving
                ? null
                : () => ref.read(budgetScreenProvider.notifier).discard(),
            child: const Text('Discard'),
          ),
          const SizedBox(width: 12),
          // Save button
          FilledButton.icon(
            onPressed:
                state.status == BudgetScreenStatus.saving || !state.isDirty
                ? null
                : () => ref.read(budgetScreenProvider.notifier).save(),
            icon: state.status == BudgetScreenStatus.saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.save),
            label: Text(
              state.status == BudgetScreenStatus.saving
                  ? 'Saving...'
                  : 'Save Budget',
            ),
          ),
        ],
      ),
    );
  }
}
