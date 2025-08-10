class Post {
  final String id;
  final String authorId;
  final String text;
  final DateTime createdAt;
  final int likeCount;
  final int dislikeCount;
  const Post({
    required this.id,
    required this.authorId,
    required this.text,
    required this.createdAt,
    this.likeCount = 0,
    this.dislikeCount = 0,
  });
}

class Comment {
  final String id;
  final String postId;
  final String authorId;
  final String text;
  final DateTime createdAt;
  const Comment({
    required this.id,
    required this.postId,
    required this.authorId,
    required this.text,
    required this.createdAt,
  });
}
