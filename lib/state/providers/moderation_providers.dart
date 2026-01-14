// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/data/mock/mock_moderation.dart';
import 'package:asora/state/models/moderation.dart';

final moderationQueueProvider = StateProvider<List<ModerationCase>>(
  (ref) => mockModerationQueue,
);

final appealsProvider = StateProvider<List<AppealCase>>((ref) => mockAppeals);

final moderationStatsProvider = Provider<ModerationStats>(
  (ref) => mockModerationStats,
);
