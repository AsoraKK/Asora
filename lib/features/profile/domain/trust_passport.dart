// ignore_for_file: public_member_api_docs

import 'package:flutter/foundation.dart';

@immutable
class TrustPassport {
  final String userId;
  final String transparencyStreakCategory;
  final String appealsResolvedFairlyLabel;
  final String jurorReliabilityTier;
  final TrustPassportCounts counts;

  const TrustPassport({
    required this.userId,
    required this.transparencyStreakCategory,
    required this.appealsResolvedFairlyLabel,
    required this.jurorReliabilityTier,
    required this.counts,
  });

  factory TrustPassport.fromJson(Map<String, dynamic> json) {
    return TrustPassport(
      userId: json['userId'] as String,
      transparencyStreakCategory:
          json['transparencyStreakCategory'] as String? ?? 'Rare',
      appealsResolvedFairlyLabel:
          json['appealsResolvedFairlyLabel'] as String? ??
          'Appeals resolved fairly',
      jurorReliabilityTier: json['jurorReliabilityTier'] as String? ?? 'Bronze',
      counts: TrustPassportCounts.fromJson(
        json['counts'] is Map<String, dynamic>
            ? json['counts'] as Map<String, dynamic>
            : json['counts'] is Map
                ? Map<String, dynamic>.from(json['counts'] as Map)
                : const <String, dynamic>{},
      ),
    );
  }
}

@immutable
class TrustPassportCounts {
  final int totalPosts;
  final int postsWithSignals;
  final int appealsResolved;
  final int appealsApproved;
  final int appealsRejected;
  final int votesCast;
  final int alignedVotes;

  const TrustPassportCounts({
    this.totalPosts = 0,
    this.postsWithSignals = 0,
    this.appealsResolved = 0,
    this.appealsApproved = 0,
    this.appealsRejected = 0,
    this.votesCast = 0,
    this.alignedVotes = 0,
  });

  factory TrustPassportCounts.fromJson(Map<String, dynamic> json) {
    final transparency = json['transparency'] as Map?;
    final appeals = json['appeals'] as Map?;
    final juror = json['juror'] as Map?;

    int asInt(Object? value) => (value as num?)?.toInt() ?? 0;

    return TrustPassportCounts(
      totalPosts: asInt(transparency?['totalPosts']),
      postsWithSignals: asInt(transparency?['postsWithSignals']),
      appealsResolved: asInt(appeals?['resolved']),
      appealsApproved: asInt(appeals?['approved']),
      appealsRejected: asInt(appeals?['rejected']),
      votesCast: asInt(juror?['votesCast']),
      alignedVotes: asInt(juror?['alignedVotes']),
    );
  }
}

