import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/mock/mock_rewards.dart';
import '../models/reputation.dart';

class ReputationController extends StateNotifier<UserReputation> {
  ReputationController() : super(mockReputation);

  void addXp(int delta) {
    state = state.copyWith(xp: state.xp + delta);
  }

  void assignTier(ReputationTier tier) {
    state = state.copyWith(tier: tier);
  }
}

final reputationProvider =
    StateNotifierProvider<ReputationController, UserReputation>(
      (ref) => ReputationController(),
    );

final reputationTiersProvider = Provider<List<ReputationTier>>(
  (ref) => mockReputationTiers,
);
