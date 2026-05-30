// ignore_for_file: public_member_api_docs

// ─────────────────────────────────────────────────────────────────────────────
// ReactionType enum
// ─────────────────────────────────────────────────────────────────────────────

/// Mirrors the backend `ReactionType` union.
enum ReactionType {
  helpful,
  // ignore: constant_identifier_names
  well_sourced,
  thoughtful,
  agree,
  disagree,
  misleading,
  // ignore: constant_identifier_names
  low_effort,
  report;

  /// Human-readable label for display in the reaction bar.
  String get label {
    switch (this) {
      case ReactionType.helpful:
        return 'Helpful';
      case ReactionType.well_sourced:
        return 'Well Sourced';
      case ReactionType.thoughtful:
        return 'Thoughtful';
      case ReactionType.agree:
        return 'Agree';
      case ReactionType.disagree:
        return 'Disagree';
      case ReactionType.misleading:
        return 'Misleading';
      case ReactionType.low_effort:
        return 'Low Effort';
      case ReactionType.report:
        return 'Report';
    }
  }

  /// Wire value sent to / received from the API.
  String get apiValue {
    switch (this) {
      case ReactionType.well_sourced:
        return 'well_sourced';
      case ReactionType.low_effort:
        return 'low_effort';
      default:
        return name;
    }
  }

  /// Positive (+), negative (-), or neutral (0) direction.
  int get direction {
    switch (this) {
      case ReactionType.helpful:
      case ReactionType.well_sourced:
      case ReactionType.thoughtful:
      case ReactionType.agree:
        return 1;
      case ReactionType.misleading:
      case ReactionType.low_effort:
      case ReactionType.disagree:
        return -1;
      case ReactionType.report:
        return 0;
    }
  }

  bool get isNegative => direction < 0;
  bool get isPositive => direction > 0;

  static ReactionType? fromApi(String value) {
    for (final e in ReactionType.values) {
      if (e.apiValue == value) return e;
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ReactionSummary — aggregate counts returned by feed/post endpoints
// ─────────────────────────────────────────────────────────────────────────────

class ReactionSummary {
  const ReactionSummary({this.counts = const {}, this.myReactionType});

  final Map<String, int> counts;
  final String? myReactionType;

  factory ReactionSummary.fromJson(Map<String, dynamic> json) {
    final rawCounts = json['counts'];
    final counts = rawCounts is Map<String, dynamic>
        ? rawCounts.map((k, v) => MapEntry(k, (v as num).toInt()))
        : <String, int>{};
    return ReactionSummary(
      counts: counts,
      myReactionType: json['myReactionType'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'counts': counts,
    if (myReactionType != null) 'myReactionType': myReactionType,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SubmitReactionRequest — sent to POST /api/reactions
// ─────────────────────────────────────────────────────────────────────────────

class SubmitReactionRequest {
  const SubmitReactionRequest({
    required this.targetContentId,
    required this.targetUserId,
    required this.reactionType,
  });

  final String targetContentId;
  final String targetUserId;
  final String reactionType;

  factory SubmitReactionRequest.fromJson(Map<String, dynamic> json) =>
      SubmitReactionRequest(
        targetContentId: json['targetContentId'] as String,
        targetUserId: json['targetUserId'] as String,
        reactionType: json['reactionType'] as String,
      );

  Map<String, dynamic> toJson() => {
    'targetContentId': targetContentId,
    'targetUserId': targetUserId,
    'reactionType': reactionType,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SubmitReactionResponse — returned by POST /api/reactions
// ─────────────────────────────────────────────────────────────────────────────

class SubmitReactionResponse {
  const SubmitReactionResponse({
    required this.reactionId,
    required this.reactionType,
    required this.includedInReputation,
    required this.antiGamingStatus,
  });

  final String reactionId;
  final String reactionType;
  final bool includedInReputation;
  final String antiGamingStatus;

  factory SubmitReactionResponse.fromJson(Map<String, dynamic> json) =>
      SubmitReactionResponse(
        reactionId: json['reactionId'] as String,
        reactionType: json['reactionType'] as String,
        includedInReputation: json['includedInReputation'] as bool,
        antiGamingStatus: json['antiGamingStatus'] as String,
      );

  Map<String, dynamic> toJson() => {
    'reactionId': reactionId,
    'reactionType': reactionType,
    'includedInReputation': includedInReputation,
    'antiGamingStatus': antiGamingStatus,
  };
}
