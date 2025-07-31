library appeal_models;

/// ASORA APPEAL MODELS
///
/// 🎯 Purpose: Data models for community voting and appeal system
/// 📊 Models: Appeal, Vote, VotingCard, AppealDetails
/// 🔐 Type Safety: Comprehensive validation and serialization
/// 📱 Platform: Flutter with JSON serialization support

/// Appeal model for community voting
class Appeal {
  final String appealId;
  final String contentId;
  final String contentType;
  final String? contentTitle;
  final String contentPreview;
  final String appealType;
  final String appealReason;
  final String userStatement;

  // Submitter info
  final String submitterId;
  final String submitterName;
  final DateTime submittedAt;
  final DateTime expiresAt;

  // Moderation info
  final String flagReason;
  final double? aiScore;
  final Map<String, dynamic>? aiAnalysis;
  final List<String> flagCategories;
  final int flagCount;

  // Voting status
  final VotingStatus votingStatus;
  final VotingProgress? votingProgress;
  final int urgencyScore;
  final String estimatedResolution;

  // User voting state
  final bool hasUserVoted;
  final String? userVote; // 'approve' or 'reject'
  final bool canUserVote;
  final String? voteIneligibilityReason;

  const Appeal({
    required this.appealId,
    required this.contentId,
    required this.contentType,
    this.contentTitle,
    required this.contentPreview,
    required this.appealType,
    required this.appealReason,
    required this.userStatement,
    required this.submitterId,
    required this.submitterName,
    required this.submittedAt,
    required this.expiresAt,
    required this.flagReason,
    this.aiScore,
    this.aiAnalysis,
    required this.flagCategories,
    required this.flagCount,
    required this.votingStatus,
    this.votingProgress,
    required this.urgencyScore,
    required this.estimatedResolution,
    required this.hasUserVoted,
    this.userVote,
    required this.canUserVote,
    this.voteIneligibilityReason,
  });

  factory Appeal.fromJson(Map<String, dynamic> json) {
    return Appeal(
      appealId: json['appealId'],
      contentId: json['contentId'],
      contentType: json['contentType'],
      contentTitle: json['contentTitle'],
      contentPreview: json['contentPreview'] ?? '',
      appealType: json['appealType'],
      appealReason: json['appealReason'],
      userStatement: json['userStatement'],
      submitterId: json['submitterId'],
      submitterName: json['submitterName'],
      submittedAt: DateTime.parse(json['submittedAt']),
      expiresAt: DateTime.parse(json['expiresAt']),
      flagReason: json['flagReason'],
      aiScore: json['aiScore']?.toDouble(),
      aiAnalysis: json['aiAnalysis'],
      flagCategories: List<String>.from(json['flagCategories'] ?? []),
      flagCount: json['flagCount'] ?? 0,
      votingStatus: VotingStatus.values.firstWhere(
        (e) => e.name == json['votingStatus'],
        orElse: () => VotingStatus.active,
      ),
      votingProgress: json['votingProgress'] != null
          ? VotingProgress.fromJson(json['votingProgress'])
          : null,
      urgencyScore: json['urgencyScore'] ?? 0,
      estimatedResolution: json['estimatedResolution'] ?? 'Unknown',
      hasUserVoted: json['hasUserVoted'] ?? false,
      userVote: json['userVote'],
      canUserVote: json['canUserVote'] ?? false,
      voteIneligibilityReason: json['voteIneligibilityReason'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'appealId': appealId,
      'contentId': contentId,
      'contentType': contentType,
      'contentTitle': contentTitle,
      'contentPreview': contentPreview,
      'appealType': appealType,
      'appealReason': appealReason,
      'userStatement': userStatement,
      'submitterId': submitterId,
      'submitterName': submitterName,
      'submittedAt': submittedAt.toIso8601String(),
      'expiresAt': expiresAt.toIso8601String(),
      'flagReason': flagReason,
      'aiScore': aiScore,
      'aiAnalysis': aiAnalysis,
      'flagCategories': flagCategories,
      'flagCount': flagCount,
      'votingStatus': votingStatus.name,
      'votingProgress': votingProgress?.toJson(),
      'urgencyScore': urgencyScore,
      'estimatedResolution': estimatedResolution,
      'hasUserVoted': hasUserVoted,
      'userVote': userVote,
      'canUserVote': canUserVote,
      'voteIneligibilityReason': voteIneligibilityReason,
    };
  }
}

/// Voting status enum
enum VotingStatus { active, quorumReached, timeExpired, resolved }

/// Extended voting progress with additional metadata
class VotingProgress {
  final int totalVotes;
  final int approveVotes;
  final int rejectVotes;
  final double approvalRate;
  final bool quorumMet;
  final String? timeRemaining;
  final String? estimatedResolution;
  final List<VoteBreakdown> voteBreakdown;

  const VotingProgress({
    required this.totalVotes,
    required this.approveVotes,
    required this.rejectVotes,
    required this.approvalRate,
    required this.quorumMet,
    this.timeRemaining,
    this.estimatedResolution,
    this.voteBreakdown = const [],
  });

  factory VotingProgress.fromJson(Map<String, dynamic> json) {
    return VotingProgress(
      totalVotes: json['totalVotes'] ?? 0,
      approveVotes: json['approveVotes'] ?? 0,
      rejectVotes: json['rejectVotes'] ?? 0,
      approvalRate: (json['approvalRate'] ?? 0.0).toDouble(),
      quorumMet: json['quorumMet'] ?? false,
      timeRemaining: json['timeRemaining'],
      estimatedResolution: json['estimatedResolution'],
      voteBreakdown:
          (json['voteBreakdown'] as List?)
              ?.map((e) => VoteBreakdown.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalVotes': totalVotes,
      'approveVotes': approveVotes,
      'rejectVotes': rejectVotes,
      'approvalRate': approvalRate,
      'quorumMet': quorumMet,
      'timeRemaining': timeRemaining,
      'estimatedResolution': estimatedResolution,
      'voteBreakdown': voteBreakdown.map((e) => e.toJson()).toList(),
    };
  }
}

/// Vote breakdown by category or demographics
class VoteBreakdown {
  final String category;
  final int approveCount;
  final int rejectCount;
  final double percentage;

  const VoteBreakdown({
    required this.category,
    required this.approveCount,
    required this.rejectCount,
    required this.percentage,
  });

  factory VoteBreakdown.fromJson(Map<String, dynamic> json) {
    return VoteBreakdown(
      category: json['category'],
      approveCount: json['approveCount'] ?? 0,
      rejectCount: json['rejectCount'] ?? 0,
      percentage: (json['percentage'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'approveCount': approveCount,
      'rejectCount': rejectCount,
      'percentage': percentage,
    };
  }
}

/// User vote record
class UserVote {
  final String voteId;
  final String appealId;
  final String userId;
  final String vote; // 'approve' or 'reject'
  final String? comment;
  final DateTime timestamp;
  final bool isValidated;

  const UserVote({
    required this.voteId,
    required this.appealId,
    required this.userId,
    required this.vote,
    this.comment,
    required this.timestamp,
    required this.isValidated,
  });

  factory UserVote.fromJson(Map<String, dynamic> json) {
    return UserVote(
      voteId: json['voteId'],
      appealId: json['appealId'],
      userId: json['userId'],
      vote: json['vote'],
      comment: json['comment'],
      timestamp: DateTime.parse(json['timestamp']),
      isValidated: json['isValidated'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'voteId': voteId,
      'appealId': appealId,
      'userId': userId,
      'vote': vote,
      'comment': comment,
      'timestamp': timestamp.toIso8601String(),
      'isValidated': isValidated,
    };
  }
}

/// Appeal response wrapper
class AppealResponse {
  final List<Appeal> appeals;
  final AppealPagination pagination;
  final AppealFilters filters;
  final AppealSummary summary;

  const AppealResponse({
    required this.appeals,
    required this.pagination,
    required this.filters,
    required this.summary,
  });

  factory AppealResponse.fromJson(Map<String, dynamic> json) {
    return AppealResponse(
      appeals: (json['appeals'] as List)
          .map((e) => Appeal.fromJson(e))
          .toList(),
      pagination: AppealPagination.fromJson(json['pagination']),
      filters: AppealFilters.fromJson(json['filters'] ?? {}),
      summary: AppealSummary.fromJson(json['summary'] ?? {}),
    );
  }
}

/// Pagination info
class AppealPagination {
  final int total;
  final int page;
  final int pageSize;
  final bool hasMore;
  final int totalPages;

  const AppealPagination({
    required this.total,
    required this.page,
    required this.pageSize,
    required this.hasMore,
    required this.totalPages,
  });

  factory AppealPagination.fromJson(Map<String, dynamic> json) {
    return AppealPagination(
      total: json['total'] ?? 0,
      page: json['page'] ?? 1,
      pageSize: json['pageSize'] ?? 20,
      hasMore: json['hasMore'] ?? false,
      totalPages: json['totalPages'] ?? 1,
    );
  }
}

/// Filter options
class AppealFilters {
  final String? contentType;
  final String? urgency;
  final String? category;
  final String sortBy;
  final String sortOrder;

  const AppealFilters({
    this.contentType,
    this.urgency,
    this.category,
    this.sortBy = 'urgency',
    this.sortOrder = 'desc',
  });

  factory AppealFilters.fromJson(Map<String, dynamic> json) {
    return AppealFilters(
      contentType: json['contentType'],
      urgency: json['urgency'],
      category: json['category'],
      sortBy: json['sortBy'] ?? 'urgency',
      sortOrder: json['sortOrder'] ?? 'desc',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (contentType != null) 'contentType': contentType,
      if (urgency != null) 'urgency': urgency,
      if (category != null) 'category': category,
      'sortBy': sortBy,
      'sortOrder': sortOrder,
    };
  }
}

/// Summary statistics
class AppealSummary {
  final int totalActive;
  final int totalVotes;
  final int userVotes;
  final double averageResolutionTime;
  final Map<String, int> categoryBreakdown;

  const AppealSummary({
    required this.totalActive,
    required this.totalVotes,
    required this.userVotes,
    required this.averageResolutionTime,
    required this.categoryBreakdown,
  });

  factory AppealSummary.fromJson(Map<String, dynamic> json) {
    return AppealSummary(
      totalActive: json['totalActive'] ?? 0,
      totalVotes: json['totalVotes'] ?? 0,
      userVotes: json['userVotes'] ?? 0,
      averageResolutionTime: (json['averageResolutionTime'] ?? 0.0).toDouble(),
      categoryBreakdown: Map<String, int>.from(json['categoryBreakdown'] ?? {}),
    );
  }
}

/// Vote result wrapper
class VoteResult {
  final bool success;
  final String? message;
  final bool tallyTriggered;
  final VotingProgress? updatedProgress;

  const VoteResult({
    required this.success,
    this.message,
    required this.tallyTriggered,
    this.updatedProgress,
  });

  factory VoteResult.fromJson(Map<String, dynamic> json) {
    return VoteResult(
      success: json['success'] ?? false,
      message: json['message'],
      tallyTriggered: json['tallyTriggered'] ?? false,
      updatedProgress: json['updatedProgress'] != null
          ? VotingProgress.fromJson(json['updatedProgress'])
          : null,
    );
  }
}
