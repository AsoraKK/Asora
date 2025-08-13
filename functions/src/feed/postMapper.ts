import { PostForRanking } from '../shared/ranking';

export function mapPostForRanking(post: any): PostForRanking {
  return {
    id: post.id,
    authorId: post.authorId,
    createdAt: new Date(post.createdAt).toISOString(),
    engagementScore:
      (post.likesCount || 0) +
      (post.commentsCount || 0) * 2 +
      (post.sharesCount || 0) * 3,
    authorReputation: post.author?.reputationScore || 50
  };
}
