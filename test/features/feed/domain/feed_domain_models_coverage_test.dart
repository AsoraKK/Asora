import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/feed/domain/models.dart';

void main() {
  final now = DateTime(2025, 6, 1, 12, 0, 0);

  Post makePost({
    String id = 'p1',
    String authorId = 'a1',
    String authorUsername = 'alice',
    String text = 'Hello',
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? mediaUrls,
    PostModerationData? moderation,
    PostMetadata? metadata,
    NewsSource? source,
    bool isNews = false,
    String trustStatus = 'no_extra_signals',
    PostTrustTimeline timeline = const PostTrustTimeline(),
    bool hasAppeal = false,
    bool proofSignalsProvided = false,
    bool verifiedContextBadgeEligible = false,
    bool featuredEligible = false,
  }) {
    return Post(
      id: id,
      authorId: authorId,
      authorUsername: authorUsername,
      text: text,
      createdAt: createdAt ?? now,
      updatedAt: updatedAt,
      mediaUrls: mediaUrls,
      moderation: moderation,
      metadata: metadata,
      source: source,
      isNews: isNews,
      trustStatus: trustStatus,
      timeline: timeline,
      hasAppeal: hasAppeal,
      proofSignalsProvided: proofSignalsProvided,
      verifiedContextBadgeEligible: verifiedContextBadgeEligible,
      featuredEligible: featuredEligible,
    );
  }

  group('Post.toJson', () {
    test('serializes required fields', () {
      final post = makePost();
      final json = post.toJson();
      expect(json['id'], 'p1');
      expect(json['authorId'], 'a1');
      expect(json['authorUsername'], 'alice');
      expect(json['text'], 'Hello');
      expect(json['likeCount'], 0);
      expect(json['dislikeCount'], 0);
      expect(json['commentCount'], 0);
      expect(json['isNews'], false);
      expect(json['trustStatus'], 'no_extra_signals');
      expect(json.containsKey('updatedAt'), isFalse);
      expect(json.containsKey('mediaUrls'), isFalse);
      expect(json.containsKey('moderation'), isFalse);
      expect(json.containsKey('metadata'), isFalse);
      expect(json.containsKey('source'), isFalse);
    });

    test('includes optional fields when present', () {
      final mod = PostModerationData(
        confidence: 'high',
        score: 0.95,
        flags: ['safe'],
        analyzedAt: now,
        provider: 'hive_ai',
      );
      const meta = PostMetadata(
        location: 'NYC',
        tags: ['tech'],
        isPinned: true,
        isEdited: true,
        category: 'news',
      );
      final source = NewsSource(
        type: 'rss',
        name: 'TechCrunch',
        url: 'https://tc.com',
        publishedAt: now,
      );
      final post = makePost(
        updatedAt: now.add(const Duration(hours: 1)),
        mediaUrls: ['img.png'],
        moderation: mod,
        metadata: meta,
        source: source,
        isNews: true,
        hasAppeal: true,
        proofSignalsProvided: true,
        verifiedContextBadgeEligible: true,
        featuredEligible: true,
      );
      final json = post.toJson();
      expect(json.containsKey('updatedAt'), isTrue);
      expect(json['mediaUrls'], ['img.png']);
      expect(json['moderation'], isA<Map>());
      expect(json['metadata'], isA<Map>());
      expect(json['source'], isA<Map>());
      expect(json['isNews'], true);
      expect(json['hasAppeal'], true);
      expect(json['proofSignalsProvided'], true);
      expect(json['verifiedContextBadgeEligible'], true);
      expect(json['featuredEligible'], true);
    });
  });

  group('Post.fromJson', () {
    test('parses author from nested author object username', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'author': {'username': 'bob'},
        'text': 'hi',
        'createdAt': now.toIso8601String(),
      };
      final post = Post.fromJson(json);
      expect(post.authorUsername, 'bob');
    });

    test('parses author from nested author object displayName', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'author': {'displayName': 'Bob D'},
        'text': 'hi',
        'createdAt': now.toIso8601String(),
      };
      final post = Post.fromJson(json);
      expect(post.authorUsername, 'Bob D');
    });

    test('falls back to authorId when no username found', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
      };
      final post = Post.fromJson(json);
      expect(post.authorUsername, 'a1');
    });

    test('uses content field as fallback text', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'content': 'from content',
        'createdAt': now.toIso8601String(),
      };
      final post = Post.fromJson(json);
      expect(post.text, 'from content');
    });

    test('parses viewerHasLiked/viewerHasDisliked', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
        'viewerHasLiked': true,
        'viewerHasDisliked': true,
      };
      final post = Post.fromJson(json);
      expect(post.userLiked, isTrue);
      expect(post.userDisliked, isTrue);
    });

    test('parses timeline from non-typed Map', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
        'timeline': <dynamic, dynamic>{
          'created': 'done',
          'mediaChecked': 'passed',
        },
      };
      final post = Post.fromJson(json);
      expect(post.timeline.created, 'done');
      expect(post.timeline.mediaChecked, 'passed');
    });

    test('parses source from non-typed Map', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
        'source': <dynamic, dynamic>{'type': 'rss', 'name': 'BBC'},
      };
      final post = Post.fromJson(json);
      expect(post.source?.type, 'rss');
      expect(post.source?.name, 'BBC');
    });

    test('parses moderation from Map', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
        'moderation': <dynamic, dynamic>{
          'confidence': 'high',
          'score': 0.9,
          'flags': ['safe'],
          'analyzedAt': now.toIso8601String(),
          'provider': 'hive_ai',
        },
      };
      final post = Post.fromJson(json);
      expect(post.moderation?.confidence, 'high');
      expect(post.moderation?.score, 0.9);
    });

    test('extracts metadata from topics/location/category', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
        'topics': ['tech', 'ai'],
        'location': 'NYC',
        'category': 'news',
      };
      final post = Post.fromJson(json);
      expect(post.metadata?.tags, ['tech', 'ai']);
      expect(post.metadata?.location, 'NYC');
      expect(post.metadata?.category, 'news');
      expect(post.isNews, isTrue); // category == 'news'
    });

    test('isNews defaults to false with no category', () {
      final json = {
        'id': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'hi',
        'createdAt': now.toIso8601String(),
      };
      final post = Post.fromJson(json);
      expect(post.isNews, isFalse);
    });
  });

  group('PostTrustTimeline', () {
    test('toJson includes appeal when present', () {
      const tl = PostTrustTimeline(appeal: 'pending');
      final json = tl.toJson();
      expect(json['appeal'], 'pending');
    });

    test('toJson excludes appeal when null', () {
      const tl = PostTrustTimeline();
      final json = tl.toJson();
      expect(json.containsKey('appeal'), isFalse);
    });
  });

  group('NewsSource', () {
    test('fromJson parses all fields', () {
      final json = {
        'type': 'rss',
        'name': 'BBC',
        'url': 'https://bbc.com',
        'feedUrl': 'https://bbc.com/feed',
        'externalId': 'ext-1',
        'publishedAt': '2025-01-01T00:00:00.000',
        'ingestedAt': '2025-01-02T00:00:00.000',
        'ingestedBy': 'crawler',
        'ingestMethod': 'rss_pull',
      };
      final source = NewsSource.fromJson(json);
      expect(source.type, 'rss');
      expect(source.name, 'BBC');
      expect(source.url, 'https://bbc.com');
      expect(source.feedUrl, 'https://bbc.com/feed');
      expect(source.externalId, 'ext-1');
      expect(source.publishedAt, isA<DateTime>());
      expect(source.ingestedAt, isA<DateTime>());
      expect(source.ingestedBy, 'crawler');
      expect(source.ingestMethod, 'rss_pull');
    });

    test('fromJson uses defaults for missing fields', () {
      final source = NewsSource.fromJson({});
      expect(source.type, 'curated');
      expect(source.name, 'Unknown source');
    });

    test('fromJson handles invalid dates gracefully', () {
      final source = NewsSource.fromJson({
        'type': 'rss',
        'name': 'Test',
        'publishedAt': 'not-a-date',
        'ingestedAt': '',
      });
      expect(source.publishedAt, isNull);
      expect(source.ingestedAt, isNull);
    });

    test('fromJson handles non-string date values', () {
      final source = NewsSource.fromJson({
        'type': 'rss',
        'name': 'Test',
        'publishedAt': 123,
      });
      expect(source.publishedAt, isNull);
    });

    test('toJson includes all optional fields', () {
      final source = NewsSource(
        type: 'curated',
        name: 'CNN',
        url: 'https://cnn.com',
        feedUrl: 'https://cnn.com/feed',
        externalId: 'e2',
        publishedAt: DateTime(2025, 1, 1),
        ingestedAt: DateTime(2025, 1, 2),
        ingestedBy: 'bot',
        ingestMethod: 'api',
      );
      final json = source.toJson();
      expect(json['url'], 'https://cnn.com');
      expect(json['feedUrl'], 'https://cnn.com/feed');
      expect(json['externalId'], 'e2');
      expect(json.containsKey('publishedAt'), isTrue);
      expect(json.containsKey('ingestedAt'), isTrue);
      expect(json['ingestedBy'], 'bot');
      expect(json['ingestMethod'], 'api');
    });

    test('toJson excludes null optional fields', () {
      const source = NewsSource(type: 'rss', name: 'Test');
      final json = source.toJson();
      expect(json.containsKey('url'), isFalse);
      expect(json.containsKey('feedUrl'), isFalse);
      expect(json.containsKey('externalId'), isFalse);
      expect(json.containsKey('publishedAt'), isFalse);
      expect(json.containsKey('ingestedAt'), isFalse);
      expect(json.containsKey('ingestedBy'), isFalse);
      expect(json.containsKey('ingestMethod'), isFalse);
    });
  });

  group('PostModerationData', () {
    test('fromJson parses correctly', () {
      final json = {
        'confidence': 'high',
        'score': 0.95,
        'flags': ['safe', 'verified'],
        'analyzedAt': '2025-06-01T12:00:00.000',
        'provider': 'hive_ai',
      };
      final mod = PostModerationData.fromJson(json);
      expect(mod.confidence, 'high');
      expect(mod.score, 0.95);
      expect(mod.flags, ['safe', 'verified']);
      expect(mod.provider, 'hive_ai');
    });

    test('fromJson handles empty flags list', () {
      final json = {
        'confidence': 'low',
        'score': 0.1,
        'flags': null,
        'analyzedAt': '2025-01-01T00:00:00.000',
        'provider': 'openai',
      };
      final mod = PostModerationData.fromJson(json);
      expect(mod.flags, isEmpty);
    });

    test('toJson serializes correctly', () {
      final data = PostModerationData(
        confidence: 'medium',
        score: 0.5,
        flags: ['review'],
        analyzedAt: DateTime(2025, 6, 1),
        provider: 'azure',
      );
      final json = data.toJson();
      expect(json['confidence'], 'medium');
      expect(json['score'], 0.5);
      expect(json['flags'], ['review']);
      expect(json['provider'], 'azure');
      expect(json.containsKey('analyzedAt'), isTrue);
    });
  });

  group('PostMetadata', () {
    test('fromJson parses all fields', () {
      final json = {
        'location': 'SF',
        'tags': ['tech'],
        'isPinned': true,
        'isEdited': true,
        'category': 'news',
      };
      final meta = PostMetadata.fromJson(json);
      expect(meta.location, 'SF');
      expect(meta.tags, ['tech']);
      expect(meta.isPinned, isTrue);
      expect(meta.isEdited, isTrue);
      expect(meta.category, 'news');
    });

    test('toJson includes optional fields', () {
      const meta = PostMetadata(
        location: 'LA',
        tags: ['art'],
        isPinned: true,
        isEdited: false,
        category: 'culture',
      );
      final json = meta.toJson();
      expect(json['location'], 'LA');
      expect(json['tags'], ['art']);
      expect(json['isPinned'], true);
      expect(json['category'], 'culture');
    });

    test('toJson excludes null optional fields', () {
      const meta = PostMetadata();
      final json = meta.toJson();
      expect(json.containsKey('location'), isFalse);
      expect(json.containsKey('tags'), isFalse);
      expect(json.containsKey('category'), isFalse);
    });
  });

  group('Comment', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'c1',
        'postId': 'p1',
        'authorId': 'a1',
        'authorUsername': 'alice',
        'text': 'Great post!',
        'createdAt': '2025-06-01T12:00:00.000',
        'likeCount': 5,
        'dislikeCount': 1,
        'parentCommentId': 'c0',
      };
      final comment = Comment.fromJson(json);
      expect(comment.id, 'c1');
      expect(comment.postId, 'p1');
      expect(comment.authorId, 'a1');
      expect(comment.authorUsername, 'alice');
      expect(comment.text, 'Great post!');
      expect(comment.likeCount, 5);
      expect(comment.dislikeCount, 1);
      expect(comment.parentCommentId, 'c0');
    });

    test('fromJson uses defaults for missing optional fields', () {
      final json = {
        'id': 'c2',
        'postId': 'p1',
        'authorId': 'a1',
        'authorUsername': 'bob',
        'text': 'Nice',
        'createdAt': '2025-06-01T12:00:00.000',
      };
      final comment = Comment.fromJson(json);
      expect(comment.likeCount, 0);
      expect(comment.dislikeCount, 0);
      expect(comment.parentCommentId, isNull);
    });

    test('toJson serializes all fields', () {
      final comment = Comment(
        id: 'c1',
        postId: 'p1',
        authorId: 'a1',
        authorUsername: 'alice',
        text: 'Reply',
        createdAt: DateTime(2025, 6, 1),
        likeCount: 3,
        parentCommentId: 'c0',
      );
      final json = comment.toJson();
      expect(json['id'], 'c1');
      expect(json['parentCommentId'], 'c0');
      expect(json['likeCount'], 3);
    });

    test('toJson excludes null parentCommentId', () {
      final comment = Comment(
        id: 'c2',
        postId: 'p1',
        authorId: 'a1',
        authorUsername: 'bob',
        text: 'Top level',
        createdAt: DateTime(2025, 6, 1),
      );
      final json = comment.toJson();
      expect(json.containsKey('parentCommentId'), isFalse);
    });
  });

  group('HumanConfidence', () {
    test('label returns correct strings', () {
      expect(HumanConfidence.high.label, 'High');
      expect(HumanConfidence.medium.label, 'Medium');
      expect(HumanConfidence.low.label, 'Low');
      expect(HumanConfidence.aiGen.label, 'AI Gen');
    });

    test('fromString parses known values', () {
      expect(HumanConfidence.fromString('high'), HumanConfidence.high);
      expect(HumanConfidence.fromString('medium'), HumanConfidence.medium);
      expect(HumanConfidence.fromString('low'), HumanConfidence.low);
      expect(HumanConfidence.fromString('ai_generated'), HumanConfidence.aiGen);
      expect(HumanConfidence.fromString('ai_gen'), HumanConfidence.aiGen);
    });

    test('fromString defaults to medium for unknown', () {
      expect(HumanConfidence.fromString('xyz'), HumanConfidence.medium);
    });

    test('displayLabel returns full display strings', () {
      expect(HumanConfidence.high.displayLabel, 'High');
      expect(HumanConfidence.medium.displayLabel, 'Medium');
      expect(HumanConfidence.low.displayLabel, 'Low');
      expect(HumanConfidence.aiGen.displayLabel, 'AI Generated');
    });
  });
}
