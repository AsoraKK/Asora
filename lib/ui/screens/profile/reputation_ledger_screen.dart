// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/core/network/dio_client.dart';
import 'package:asora/features/auth/application/auth_providers.dart';
import 'package:asora/state/models/reputation.dart';
import 'package:asora/ui/theme/spacing.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Provider (filter-aware, cursor-paginated)
// ─────────────────────────────────────────────────────────────────────────────

/// Fetch one page of ledger entries for the given [filter].
/// Returns `(entries, nextCursor)`.
final _ledgerPageProvider =
    FutureProvider.family<
      ({List<LedgerEntry> entries, String? nextCursor}),
      String
    >((ref, filter) async {
      final token = await ref.watch(jwtProvider.future);
      if (token == null || token.isEmpty) {
        return (entries: const <LedgerEntry>[], nextCursor: null);
      }
      try {
        final dio = ref.read(secureDioProvider);
        final response = await dio.get<Map<String, dynamic>>(
          '/reputation/me/ledger',
          queryParameters: {'filter': filter, 'limit': '20'},
        );
        final data = response.data ?? {};
        final entriesJson = data['entries'] as List<dynamic>? ?? [];
        final entries = entriesJson
            .map((e) => LedgerEntry.fromJson(e as Map<String, dynamic>))
            .toList();
        return (entries: entries, nextCursor: data['nextCursor'] as String?);
      } catch (_) {
        return (entries: const <LedgerEntry>[], nextCursor: null);
      }
    });

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class ReputationLedgerScreen extends ConsumerStatefulWidget {
  const ReputationLedgerScreen({super.key});

  @override
  ConsumerState<ReputationLedgerScreen> createState() =>
      _ReputationLedgerScreenState();
}

class _ReputationLedgerScreenState extends ConsumerState<ReputationLedgerScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  static const _filters = ['all', 'positive', 'negative', 'appeal'];
  static const _filterLabels = ['All', 'Positive', 'Negative', 'Appeals'];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _filters.length, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reputation History'),
        bottom: TabBar(
          controller: _tabs,
          tabs: _filterLabels.map((l) => Tab(text: l)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: _filters
            .map((filter) => _LedgerList(filter: filter))
            .toList(),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-tab list
// ─────────────────────────────────────────────────────────────────────────────

class _LedgerList extends ConsumerWidget {
  const _LedgerList({required this.filter});
  final String filter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncPage = ref.watch(_ledgerPageProvider(filter));
    return asyncPage.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Could not load reputation history.'),
            const SizedBox(height: Spacing.sm),
            TextButton(
              onPressed: () => ref.refresh(_ledgerPageProvider(filter)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (page) {
        final entries = page.entries;
        if (entries.isEmpty) {
          return const Center(child: Text('No entries yet.'));
        }
        return RefreshIndicator(
          onRefresh: () async => ref.refresh(_ledgerPageProvider(filter)),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: Spacing.sm),
            itemCount: entries.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) => _LedgerEntryTile(entry: entries[i]),
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual entry tile
// ─────────────────────────────────────────────────────────────────────────────

class _LedgerEntryTile extends StatelessWidget {
  const _LedgerEntryTile({required this.entry});
  final LedgerEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isPositive = entry.eventCategory == 'positive';
    final isNegative = entry.eventCategory == 'negative';

    final bandColor = isPositive
        ? Colors.green.shade600
        : isNegative
        ? scheme.error
        : scheme.onSurfaceVariant;

    final bandIcon = isPositive
        ? Icons.arrow_upward
        : isNegative
        ? Icons.arrow_downward
        : Icons.remove;

    final dateStr = _formatDate(entry.createdAt);

    return ListTile(
      leading: CircleAvatar(
        radius: 18,
        backgroundColor: bandColor.withValues(alpha: 0.12),
        child: Icon(bandIcon, size: 16, color: bandColor),
      ),
      title: Text(
        entry.publicLabel,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        '$dateStr · ${_pillarLabel(entry.pillar)}',
        style: theme.textTheme.bodySmall?.copyWith(
          color: scheme.onSurfaceVariant,
        ),
      ),
      trailing: entry.appealable && entry.appealStatus == null
          ? Tooltip(
              message: 'Eligible for appeal',
              child: Icon(
                Icons.gavel_outlined,
                size: 16,
                color: scheme.outline,
              ),
            )
          : null,
    );
  }

  static String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inDays > 30) {
      return '${dt.day}/${dt.month}/${dt.year}';
    }
    if (diff.inDays >= 1) return '${diff.inDays}d ago';
    if (diff.inHours >= 1) return '${diff.inHours}h ago';
    return '${diff.inMinutes}m ago';
  }

  static String _pillarLabel(String pillar) {
    return switch (pillar) {
      'human_contribution' => 'Human contribution',
      'content_quality' => 'Content quality',
      'behaviour_trust' => 'Behaviour',
      'interaction_quality' => 'Interactions',
      'verification_strength' => 'Verification',
      'community_trust' => 'Community',
      _ => pillar,
    };
  }
}
