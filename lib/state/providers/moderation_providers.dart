// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/state/models/moderation.dart';

/// Moderation queue — starts empty; populate via API calls from
/// the moderation console providers
/// (see [moderation_console_providers.dart] for the API-backed equivalents).
final moderationQueueProvider = StateProvider<List<ModerationCase>>(
  (ref) => <ModerationCase>[],
);

final appealsProvider =
    StateProvider<List<AppealCase>>((ref) => <AppealCase>[]);

final moderationStatsProvider = Provider<ModerationStats>(
  (ref) => const ModerationStats(
    queueSize: 0,
    appealOpen: 0,
    decisionsToday: 0,
  ),
);
