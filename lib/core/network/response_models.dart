/// ASORA API RESPONSE MODELS
///
/// 🎯 Purpose: Response models for Azure Functions API integration
/// 🏗️ Architecture: Domain layer models for API responses
/// 🔐 Data: Post creation, feed pagination, user profile responses
/// 📱 Platform: Flutter with JSON serialization
library;

/// Response model for post creation API calls
class PostCreateResponse {
  final bool success;
  final String? postId;
  final String? message;
  final Map<String, dynamic>? moderationResult;
  final DateTime? createdAt;

  const PostCreateResponse({
    required this.success,
    this.postId,
    this.message,
    this.moderationResult,
    this.createdAt,
  });

  factory PostCreateResponse.fromJson(Map<String, dynamic> json) {
    return PostCreateResponse(
      success: json['success'] ?? false,
      postId: json['postId'],
      message: json['message'],
      moderationResult: json['moderationResult'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      if (postId != null) 'postId': postId,
      if (message != null) 'message': message,
      if (moderationResult != null) 'moderationResult': moderationResult,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
    };
  }
}

/// Response model for feed API calls with pagination
class FeedResponse {
  final bool success;
  final List<Map<String, dynamic>> feed;
  final String? nextCursor;
  final String? message;
  final FeedMetadata? metadata;

  const FeedResponse({
    required this.success,
    required this.feed,
    this.nextCursor,
    this.message,
    this.metadata,
  });

  factory FeedResponse.fromJson(Map<String, dynamic> json) {
    return FeedResponse(
      success: json['success'] ?? false,
      feed: List<Map<String, dynamic>>.from(json['feed'] ?? []),
      nextCursor: json['nextCursor'],
      message: json['message'],
      metadata: json['metadata'] != null
          ? FeedMetadata.fromJson(json['metadata'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'feed': feed,
      if (nextCursor != null) 'nextCursor': nextCursor,
      if (message != null) 'message': message,
      if (metadata != null) 'metadata': metadata!.toJson(),
    };
  }
}

/// Metadata included with feed responses
class FeedMetadata {
  final int totalCount;
  final bool hasMore;
  final String? algorithm;
  final bool? cached;
  final DateTime? cacheExpiry;

  const FeedMetadata({
    required this.totalCount,
    required this.hasMore,
    this.algorithm,
    this.cached,
    this.cacheExpiry,
  });

  factory FeedMetadata.fromJson(Map<String, dynamic> json) {
    return FeedMetadata(
      totalCount: json['totalCount'] ?? 0,
      hasMore: json['hasMore'] ?? false,
      algorithm: json['algorithm'],
      cached: json['cached'],
      cacheExpiry: json['cacheExpiry'] != null
          ? DateTime.parse(json['cacheExpiry'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalCount': totalCount,
      'hasMore': hasMore,
      if (algorithm != null) 'algorithm': algorithm,
      if (cached != null) 'cached': cached,
      if (cacheExpiry != null) 'cacheExpiry': cacheExpiry!.toIso8601String(),
    };
  }
}
