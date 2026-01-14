// ignore_for_file: public_member_api_docs

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asora/data/mock/mock_rewards.dart';
import 'package:asora/state/models/reputation.dart';

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
