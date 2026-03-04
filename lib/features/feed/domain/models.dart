// ignore_for_file: public_member_api_docs

library feed_models;

/// ASORA FEED DOMAIN MODELS
///
/// 🎯 Purpose: Core domain models for social media feed features
/// 🏗️ Architecture: Domain layer - defines business entities
/// 🔐 Dependency Rule: No dependencies on external layers
/// 📱 Platform: Dart domain models

class Post {
  final String id;
  final String authorId;
  final String authorUsername;
  final String text;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final int likeCount;
  final int dislikeCount;
  final int commentCount;
  final List<String>? mediaUrls;
  final PostModerationData? moderation;
  final PostMetadata? metadata;
  final NewsSource? source;
  final bool isNews;
  final bool userLiked;
  final bool userDisliked;
  final String trustStatus;
  final PostTrustTimeline timeline;
  final bool hasAppeal;
  final bool proofSignalsProvided;
  final bool verifiedContextBadgeEligible;
  final bool featuredEligible;

  const Post({
    required this.id,
    required this.authorId,
    required this.authorUsername,
    required this.text,
    required this.createdAt,
    this.updatedAt,
    this.likeCount = 0,
    this.dislikeCount = 0,
    this.commentCount = 0,
    this.mediaUrls,
    this.moderation,
    this.metadata,
    this.source,
    this.isNews = false,
    this.userLiked = false,
    this.userDisliked = false,
    this.trustStatus = 'no_extra_signals',
    this.timeline = const PostTrustTimeline(),
    this.hasAppeal = false,
    this.proofSignalsProvided = false,
    this.verifiedContextBadgeEligible = false,
    this.featuredEligible = false,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    final author = json['author'] as Map<String, dynamic>?;
    final textValue = _extractText(json);
    final metadata = _extractMetadata(json);
    final media = json['mediaUrls'];
    final moderation = json['moderation'];
    final sourceJson = json['source'];
    final username =
        json['authorUsername'] as String? ??
        author?['username'] as String? ??
        author?['displayName'] as String? ??
        json['authorId'] as String;

    String normalizeTrustStatus(Object? value) {
      const allowed = {
        'verified_signals_attached',
        'no_extra_signals',
        'under_appeal',
        'actioned',
      };
      if (value is String && allowed.contains(value)) {
        return value;
      }
      return 'no_extra_signals';
    }

    return Post(
      id: json['id'] as String,
      authorId: json['authorId'] as String,
      authorUsername: username,
      text: textValue,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
      likeCount: json['likeCount'] as int? ?? 0,
      dislikeCount: json['dislikeCount'] as int? ?? 0,
      commentCount: json['commentCount'] as int? ?? 0,
      mediaUrls: media is List ? media.whereType<String>().toList() : null,
      moderation: moderation is Map
          ? PostModerationData.fromJson(Map<String, dynamic>.from(moderation))
          : null,
      metadata: metadata,
      source: sourceJson is Map<String, dynamic>
          ? NewsSource.fromJson(sourceJson)
          : sourceJson is Map
          ? NewsSource.fromJson(Map<String, dynamic>.from(sourceJson))
          : null,
      isNews: json['isNews'] as bool? ?? metadata?.category == 'news',
      userLiked:
          json['userLiked'] as bool? ??
          json['viewerHasLiked'] as bool? ??
          false,
      userDisliked:
          json['userDisliked'] as bool? ??
          json['viewerHasDisliked'] as bool? ??
          false,
      trustStatus: normalizeTrustStatus(json['trustStatus']),
      timeline: PostTrustTimeline.fromJson(
        json['timeline'] is Map<String, dynamic>
            ? json['timeline'] as Map<String, dynamic>
            : json['timeline'] is Map
            ? Map<String, dynamic>.from(json['timeline'] as Map)
            : null,
      ),
      hasAppeal: json['hasAppeal'] as bool? ?? false,
      proofSignalsProvided: json['proofSignalsProvided'] as bool? ?? false,
      verifiedContextBadgeEligible:
          json['verifiedContextBadgeEligible'] as bool? ?? false,
      featuredEligible: json['featuredEligible'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'authorId': authorId,
      'authorUsername': authorUsername,
      'text': text,
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      'likeCount': likeCount,
      'dislikeCount': dislikeCount,
      'commentCount': commentCount,
      if (mediaUrls != null) 'mediaUrls': mediaUrls,
      if (moderation != null) 'moderation': moderation!.toJson(),
      if (metadata != null) 'metadata': metadata!.toJson(),
      if (source != null) 'source': source!.toJson(),
      'isNews': isNews,
      'userLiked': userLiked,
      'userDisliked': userDisliked,
      'trustStatus': trustStatus,
      'timeline': timeline.toJson(),
      'hasAppeal': hasAppeal,
      'proofSignalsProvided': proofSignalsProvided,
      'verifiedContextBadgeEligible': verifiedContextBadgeEligible,
      'featuredEligible': featuredEligible,
    };
  }

  static String _extractText(Map<String, dynamic> json) {
    return (json['text'] ?? json['content'] ?? '') as String;
  }

  static PostMetadata? _extractMetadata(Map<String, dynamic> json) {
    final metadataJson = json['metadata'] as Map<String, dynamic>?;
    if (metadataJson != null) {
      return PostMetadata.fromJson(metadataJson);
    }
    final topics = json['topics'];
    final tags = topics is List ? List<String>.from(topics) : null;
    final location = json['location'] as String?;
    final category = json['category'] as String?;
    if (location != null ||
        (tags != null && tags.isNotEmpty) ||
        category != null) {
      return PostMetadata(location: location, tags: tags, category: category);
    }
    return null;
  }
}

class PostTrustTimeline {
  final String created;
  final String mediaChecked;
  final String moderation;
  final String? appeal;

  const PostTrustTimeline({
    this.created = 'complete',
    this.mediaChecked = 'none',
    this.moderation = 'none',
    this.appeal,
  });

  factory PostTrustTimeline.fromJson(Map<String, dynamic>? json) {
    String normalizeCreated(Object? _) => 'complete';

    String normalizeMediaChecked(Object? value) {
      if (value == 'complete' || value == 'none') {
        return value as String;
      }
      return 'none';
    }

    String normalizeModeration(Object? value) {
      if (value == 'complete' ||
          value == 'warn' ||
          value == 'actioned' ||
          value == 'none') {
        return value as String;
      }
      return 'none';
    }

    String? normalizeAppeal(Object? value) {
      if (value == 'open' || value == 'resolved') {
        return value as String;
      }
      return null;
    }

    if (json == null) {
      return const PostTrustTimeline();
    }

    return PostTrustTimeline(
      created: normalizeCreated(json['created']),
      mediaChecked: normalizeMediaChecked(json['mediaChecked']),
      moderation: normalizeModeration(json['moderation']),
      appeal: normalizeAppeal(json['appeal']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'created': created,
      'mediaChecked': mediaChecked,
      'moderation': moderation,
      if (appeal != null) 'appeal': appeal,
    };
  }
}

class NewsSource {
  final String type;
  final String name;
  final String? url;
  final String? feedUrl;
  final String? externalId;
  final DateTime? publishedAt;
  final DateTime? ingestedAt;
  final String? ingestedBy;
  final String? ingestMethod;

  const NewsSource({
    required this.type,
    required this.name,
    this.url,
    this.feedUrl,
    this.externalId,
    this.publishedAt,
    this.ingestedAt,
    this.ingestedBy,
    this.ingestMethod,
  });

  factory NewsSource.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? value) {
      if (value is! String || value.isEmpty) {
        return null;
      }
      try {
        return DateTime.parse(value);
      } catch (_) {
        return null;
      }
    }

    return NewsSource(
      type: json['type'] as String? ?? 'curated',
      name: json['name'] as String? ?? 'Unknown source',
      url: json['url'] as String?,
      feedUrl: json['feedUrl'] as String?,
      externalId: json['externalId'] as String?,
      publishedAt: parseDate(json['publishedAt']),
      ingestedAt: parseDate(json['ingestedAt']),
      ingestedBy: json['ingestedBy'] as String?,
      ingestMethod: json['ingestMethod'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'name': name,
      if (url != null) 'url': url,
      if (feedUrl != null) 'feedUrl': feedUrl,
      if (externalId != null) 'externalId': externalId,
      if (publishedAt != null) 'publishedAt': publishedAt!.toIso8601String(),
      if (ingestedAt != null) 'ingestedAt': ingestedAt!.toIso8601String(),
      if (ingestedBy != null) 'ingestedBy': ingestedBy,
      if (ingestMethod != null) 'ingestMethod': ingestMethod,
    };
  }
}

/// AI moderation data attached to posts
class PostModerationData {
  final String confidence; // 'high', 'medium', 'low', 'ai_generated'
  final double score; // 0.0 - 1.0 confidence score
  final List<String> flags; // Content flags from AI analysis
  final DateTime analyzedAt;
  final String provider; // 'hive_ai', 'openai_moderation', etc.

  const PostModerationData({
    required this.confidence,
    required this.score,
    required this.flags,
    required this.analyzedAt,
    required this.provider,
  });

  factory PostModerationData.fromJson(Map<String, dynamic> json) {
    final flags = json['flags'];
    return PostModerationData(
      confidence: json['confidence'] as String,
      score: (json['score'] as num).toDouble(),
      flags: flags is List ? List<String>.from(flags) : const <String>[],
      analyzedAt: DateTime.parse(json['analyzedAt'] as String),
      provider: json['provider'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'confidence': confidence,
      'score': score,
      'flags': flags,
      'analyzedAt': analyzedAt.toIso8601String(),
      'provider': provider,
    };
  }
}

/// Additional metadata for posts
class PostMetadata {
  final String? location;
  final List<String>? tags;
  final bool isPinned;
  final bool isEdited;
  final String? category;

  const PostMetadata({
    this.location,
    this.tags,
    this.isPinned = false,
    this.isEdited = false,
    this.category,
  });

  factory PostMetadata.fromJson(Map<String, dynamic> json) {
    final tags = json['tags'];
    return PostMetadata(
      location: json['location'] as String?,
      tags: tags is List ? List<String>.from(tags) : null,
      isPinned: json['isPinned'] as bool? ?? false,
      isEdited: json['isEdited'] as bool? ?? false,
      category: json['category'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (location != null) 'location': location,
      if (tags != null) 'tags': tags,
      'isPinned': isPinned,
      'isEdited': isEdited,
      if (category != null) 'category': category,
    };
  }
}

class Comment {
  final String id;
  final String postId;
  final String authorId;
  final String authorUsername;
  final String text;
  final DateTime createdAt;
  final int likeCount;
  final int dislikeCount;
  final String? parentCommentId; // For threaded replies

  const Comment({
    required this.id,
    required this.postId,
    required this.authorId,
    required this.authorUsername,
    required this.text,
    required this.createdAt,
    this.likeCount = 0,
    this.dislikeCount = 0,
    this.parentCommentId,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'] as String,
      postId: json['postId'] as String,
      authorId: json['authorId'] as String,
      authorUsername: json['authorUsername'] as String,
      text: json['text'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      likeCount: json['likeCount'] as int? ?? 0,
      dislikeCount: json['dislikeCount'] as int? ?? 0,
      parentCommentId: json['parentCommentId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'postId': postId,
      'authorId': authorId,
      'authorUsername': authorUsername,
      'text': text,
      'createdAt': createdAt.toIso8601String(),
      'likeCount': likeCount,
      'dislikeCount': dislikeCount,
      if (parentCommentId != null) 'parentCommentId': parentCommentId,
    };
  }
}

/// Feed response with pagination support
class FeedResponse {
  final List<Post> posts;
  final int totalCount;
  final bool hasMore;
  final String? nextCursor;
  final int page;
  final int pageSize;

  const FeedResponse({
    required this.posts,
    required this.totalCount,
    required this.hasMore,
    this.nextCursor,
    required this.page,
    required this.pageSize,
  });

  factory FeedResponse.fromCursor({
    required List<Post> posts,
    String? nextCursor,
    int limit = 20,
  }) {
    return FeedResponse(
      posts: posts,
      totalCount: posts.length,
      hasMore: nextCursor != null,
      nextCursor: nextCursor,
      page: 1,
      pageSize: limit,
    );
  }

  factory FeedResponse.fromJson(Map<String, dynamic> json) {
    final posts = json['posts'];
    return FeedResponse(
      posts: posts is List
          ? posts
                .whereType<Map<String, dynamic>>()
                .map((post) => Post.fromJson(Map<String, dynamic>.from(post)))
                .toList()
          : const <Post>[],
      totalCount: json['totalCount'] as int? ?? 0,
      hasMore: json['hasMore'] as bool? ?? false,
      nextCursor: json['nextCursor'] as String?,
      page: json['page'] as int? ?? 1,
      pageSize: json['pageSize'] as int? ?? 20,
    );
  }
}

/// Feed parameters for API requests
class FeedParams {
  final int page;
  final int pageSize;
  final String? cursor;
  final FeedType type;
  final String? location;
  final List<String>? tags;
  final String? category;

  const FeedParams({
    this.page = 1,
    this.pageSize = 20,
    this.cursor,
    this.type = FeedType.trending,
    this.location,
    this.tags,
    this.category,
  });

  Map<String, dynamic> toJson() {
    return {
      'page': page,
      'pageSize': pageSize,
      if (cursor != null) 'cursor': cursor,
      'type': type.name,
      if (location != null) 'location': location,
      if (tags != null) 'tags': tags,
      if (category != null) 'category': category,
    };
  }
}

/// Types of feeds available
enum FeedType { trending, newest, local, following, newCreators }

/// Human confidence levels for AI moderation display
enum HumanConfidence {
  high,
  medium,
  low,
  aiGen;

  String get label => switch (this) {
    HumanConfidence.high => 'High',
    HumanConfidence.medium => 'Medium',
    HumanConfidence.low => 'Low',
    HumanConfidence.aiGen => 'AI Gen',
  };

  /// Convert from moderation confidence string
  static HumanConfidence fromString(String confidence) {
    return switch (confidence.toLowerCase()) {
      'high' => HumanConfidence.high,
      'medium' => HumanConfidence.medium,
      'low' => HumanConfidence.low,
      'ai_generated' || 'ai_gen' => HumanConfidence.aiGen,
      _ => HumanConfidence.medium, // Default fallback
    };
  }
}

extension HumanConfidenceExtension on HumanConfidence {
  String get displayLabel => switch (this) {
    HumanConfidence.high => 'High',
    HumanConfidence.medium => 'Medium',
    HumanConfidence.low => 'Low',
    HumanConfidence.aiGen => 'AI Generated',
  };
}
