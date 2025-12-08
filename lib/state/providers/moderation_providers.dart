import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/mock/mock_moderation.dart';
import '../models/moderation.dart';

final moderationQueueProvider = StateProvider<List<ModerationCase>>(
  (ref) => mockModerationQueue,
);

final appealsProvider = StateProvider<List<AppealCase>>((ref) => mockAppeals);

final moderationStatsProvider = Provider<ModerationStats>(
  (ref) => mockModerationStats,
);
