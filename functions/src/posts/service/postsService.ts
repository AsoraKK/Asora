import { v7 as uuidv7 } from 'uuid';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';
import type {
  CreatePostRequest,
  NewsSourceMetadata,
  Post,
  PostView,
  PublicUserProfile,
  UpdatePostRequest,
} from '@shared/types/openapi';
import type { ModerationMeta } from '@feed/types';
import { profileService } from '@users/service/profileService';
import { usersService } from '@auth/service/usersService';
import { TEST_DATA_EXPIRY, type TestModeContext } from '@shared/testMode/testModeContext';

interface PostDocument {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  contentType: 'text' | 'image' | 'video' | 'mixed';
  mediaUrls?: string[];
  topics?: string[];
  visibility: 'public' | 'followers' | 'private';
  isNews: boolean;
  source?: NewsSourceMetadata;
  clusterId?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  
  // ─────────────────────────────────────────────────────────────
  // Test Mode Fields - CRITICAL for data isolation
  // ─────────────────────────────────────────────────────────────
  /** Whether this is a test post (excluded from public feeds) */
  isTestPost?: boolean;
  /** Test session ID for grouping/cleanup */
  testSessionId?: string;
  /** Auto-expiry timestamp for test posts */
  testExpiresAt?: number;
  
  stats: {
    likes: number;
    comments: number;
    replies: number;
    bookmarks?: number;
    views?: number;
  };
  moderation: {
    status: string;
    checkedAt: number;
    confidence?: number;
    categories?: string[];
    reasons?: string[];
    error?: string;
  };
  aiLabel?: 'human' | 'generated';
  aiDetected?: boolean;
}

class PostsService {
  /**
   * Create a new post with moderation metadata
   * 
   * @param authorId - User ID of the post author
   * @param request - Post creation request
   * @param postId - Optional pre-generated post ID
   * @param moderationMeta - Moderation result metadata
   * @param testContext - Optional test mode context for data isolation
   */
  async createPost(
    authorId: string,
    request: CreatePostRequest,
    postId?: string,
    moderationMeta?: ModerationMeta,
    testContext?: TestModeContext,
    aiContext?: { aiLabel?: 'human' | 'generated'; aiDetected?: boolean }
  ): Promise<Post> {
    const now = Date.now();
    const id = postId || uuidv7();

    const postDocument: PostDocument = {
      id,
      postId: id,
      authorId,
      content: request.content,
      contentType: request.contentType,
      mediaUrls: request.mediaUrls,
      topics: request.topics,
      visibility: request.visibility || 'public',
      isNews: request.isNews || false,
      status: 'published',
      createdAt: now,
      updatedAt: now,
      
      // ─────────────────────────────────────────────────────────────
      // Test Mode Fields - Enforced server-side for data isolation
      // ─────────────────────────────────────────────────────────────
      ...(testContext?.isTestMode && {
        isTestPost: true,
        testSessionId: testContext.sessionId ?? undefined,
        testExpiresAt: TEST_DATA_EXPIRY.getExpiryTimestamp(now),
      }),
      
      stats: {
        likes: 0,
        comments: 0,
        replies: 0,
        bookmarks: 0,
        views: 0,
      },
      moderation: moderationMeta
        ? {
            status: moderationMeta.status,
            checkedAt: moderationMeta.checkedAt,
            confidence: moderationMeta.confidence,
            categories: moderationMeta.categories,
            reasons: moderationMeta.reasons,
            error: moderationMeta.error,
          }
        : {
            status: 'clean',
            checkedAt: now,
          },
      aiLabel: aiContext?.aiLabel ?? request.aiLabel ?? 'human',
      aiDetected: aiContext?.aiDetected ?? false,
    };

    const container = getTargetDatabase().posts;
    await container.items.create<PostDocument>(postDocument);

    return this.mapToPost(postDocument);
  }

  /**
   * Update an existing post.
   */
  async updatePost(
    postId: string,
    updates: UpdatePostRequest,
    moderationMeta?: ModerationMeta,
    aiContext?: { aiLabel?: 'human' | 'generated'; aiDetected?: boolean }
  ): Promise<Post | null> {
    const existing = await this.getPostById(postId);
    if (!existing) {
      return null;
    }

    const now = Date.now();
    const updated: PostDocument = {
      ...existing,
      content: updates.content ?? existing.content,
      contentType: updates.contentType ?? existing.contentType,
      mediaUrls: updates.mediaUrls ?? existing.mediaUrls,
      topics: updates.topics ?? existing.topics,
      visibility: updates.visibility ?? existing.visibility,
      isNews: updates.isNews ?? existing.isNews,
      updatedAt: now,
      moderation: moderationMeta
        ? {
            status: moderationMeta.status,
            checkedAt: moderationMeta.checkedAt,
            confidence: moderationMeta.confidence,
            categories: moderationMeta.categories,
            reasons: moderationMeta.reasons,
            error: moderationMeta.error,
          }
        : existing.moderation,
      aiLabel: aiContext?.aiLabel ?? updates.aiLabel ?? existing.aiLabel ?? 'human',
      aiDetected: aiContext?.aiDetected ?? existing.aiDetected ?? false,
    };

    const container = getTargetDatabase().posts;
    await container.item(postId, postId).replace(updated);
    return this.mapToPost(updated);
  }

  /**
   * Get post by ID
   */
  async getPostById(postId: string): Promise<PostDocument | null> {
    try {
      const container = getTargetDatabase().posts;
      const { resource } = await container.item(postId, postId).read<PostDocument>();
      return resource || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete post (soft delete)
   */
  async deletePost(postId: string): Promise<boolean> {
    const post = await this.getPostById(postId);
    if (!post) {
      return false;
    }

    const container = getTargetDatabase().posts;
    const updatedPost = {
      ...post,
      status: 'deleted',
      updatedAt: Date.now(),
    };

    await container.item(postId, postId).replace(updatedPost);
    return true;
  }

  /**
   * List posts by user with pagination
   */
  async listPostsByUser(
    userId: string,
    cursor?: string,
    limit: number = 25
  ): Promise<{ posts: PostDocument[]; nextCursor?: string }> {
    const container = getTargetDatabase().posts;
    
    // Parse cursor
    let cursorTs = Number.MAX_SAFE_INTEGER;
    let cursorId = 'ffffffff-ffff-7fff-bfff-ffffffffffff';
    
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
        const parsed = JSON.parse(decoded);
        cursorTs = parsed.ts || cursorTs;
        cursorId = parsed.id || cursorId;
      } catch {
        // Invalid cursor, use defaults
      }
    }

    const query = `
      SELECT * FROM c 
      WHERE c.authorId = @authorId 
        AND c.status = 'published'
        AND (c.createdAt < @cursorTs OR (c.createdAt = @cursorTs AND c.id < @cursorId))
      ORDER BY c.createdAt DESC, c.id DESC
      OFFSET 0 LIMIT @limit
    `;

    const { resources } = await container.items
      .query<PostDocument>({
        query,
        parameters: [
          { name: '@authorId', value: userId },
          { name: '@cursorTs', value: cursorTs },
          { name: '@cursorId', value: cursorId },
          { name: '@limit', value: limit + 1 }, // Fetch one extra to check if there's more
        ],
      }, { partitionKey: userId })
      .fetchAll();

    const hasMore = resources.length > limit;
    const posts = hasMore ? resources.slice(0, limit) : resources;

    let nextCursor: string | undefined;
    if (hasMore && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      if (lastPost) {
        nextCursor = Buffer.from(JSON.stringify({
          ts: lastPost.createdAt,
          id: lastPost.id,
        })).toString('base64url');
      }
    }

    return { posts, nextCursor };
  }

  /**
   * Enrich post with author details to create PostView
   */
  async enrichPost(post: PostDocument, viewerId?: string): Promise<PostView> {
    // Fetch author details
    const pgUser = await usersService.getUserById(post.authorId);
    const cosmosProfile = await profileService.getProfile(post.authorId);

    const author: PublicUserProfile = {
      id: post.authorId,
      displayName: cosmosProfile?.displayName || 'Unknown',
      bio: cosmosProfile?.bio,
      avatarUrl: cosmosProfile?.avatarUrl,
      tier: pgUser?.tier || 'free',
      reputation: pgUser?.reputation_score || 0,
      badges: [],
    };

    // Determine author role based on tier/roles
    let authorRole: 'journalist' | 'contributor' | 'user' = 'user';
    if (pgUser?.roles?.includes('journalist')) {
      authorRole = 'journalist';
    } else if (pgUser?.roles?.includes('contributor')) {
      authorRole = 'contributor';
    }

    const db = getTargetDatabase();

    // Check if viewer has liked the post
    let viewerHasLiked = false;
    if (viewerId) {
      try {
        const likesContainer = db.reactions;
        const likeId = `${post.postId}:${viewerId}`;

        const { resource: likeDoc } = await likesContainer.item(likeId, post.postId).read();
        viewerHasLiked = !!likeDoc;
      } catch (error: unknown) {
        const err = error as any;
        // Ignore 404 (not found) errors
        if (err?.code !== 404 && err?.statusCode !== 404) {
          throw error;
        }
      }
    }

    // Check if viewer bookmarked the post
    let viewerHasBookmarked = false;
    if (viewerId) {
      try {
        const bookmarkId = `${post.postId}:${viewerId}:bookmark`;
        const { resource: bookmarkDoc } = await db.reactions.item(bookmarkId, post.postId).read();
        viewerHasBookmarked = !!bookmarkDoc;
      } catch (error: unknown) {
        const err = error as any;
        if (err?.code !== 404 && err?.statusCode !== 404) {
          throw error;
        }
      }
    }

    // Fetch recent comments (latest 3)
    const recentComments: Array<{ commentId: string; authorId: string; text: string; createdAt: string }> = [];
    try {
      const { resources: comments } = await db.posts.items
        .query(
          {
            query:
              'SELECT TOP 3 c.commentId, c.authorId, c.text, c.createdAt FROM c WHERE c.postId = @postId AND c.type = "comment" ORDER BY c.createdAt DESC',
            parameters: [{ name: '@postId', value: post.postId }],
          },
          { maxItemCount: 3 }
        )
        .fetchAll();

      for (const c of comments ?? []) {
        if (!c?.commentId || !c?.authorId || !c?.text || !c?.createdAt) {
          continue;
        }
        recentComments.push({
          commentId: c.commentId,
          authorId: c.authorId,
          text: c.text,
          createdAt: new Date(c.createdAt).toISOString(),
        });
      }
    } catch (error) {
      // Non-blocking; continue without recent comments
    }

    // Social graph enrichment (is viewer following author + follower count)
    let viewerFollowsAuthor = false;
    let authorFollowerCount = undefined as number | undefined;
    try {
      if (viewerId && viewerId !== post.authorId) {
        const followResult = await withClient(async (client) => {
          const result = await client.query({
            text: 'SELECT 1 FROM follows WHERE follower_uuid = $1 AND followee_uuid = $2 LIMIT 1',
            values: [viewerId, post.authorId],
          });
          return (result.rowCount ?? 0) > 0;
        });
        viewerFollowsAuthor = followResult;
      }

      const countResult = await withClient(async (client) => {
        const result = await client.query({
          text: 'SELECT COUNT(*) as count FROM follows WHERE followee_uuid = $1',
          values: [post.authorId],
        });
        return parseInt(result.rows?.[0]?.count ?? '0', 10);
      });
      authorFollowerCount = countResult;
    } catch (error) {
      // Non-blocking enrichment
    }

    return {
      id: post.postId,
      authorId: post.authorId,
      content: post.content,
      contentType: post.contentType,
      mediaUrls: post.mediaUrls,
      topics: post.topics,
      visibility: post.visibility,
      isNews: post.isNews,
      source: post.source,
      clusterId: post.clusterId,
      createdAt: new Date(post.createdAt).toISOString(),
      updatedAt: new Date(post.updatedAt).toISOString(),
      author,
      authorRole,
      likeCount: post.stats?.likes || 0,
      commentCount: post.stats?.comments || 0,
      bookmarkCount: post.stats?.bookmarks || 0,
      viewCount: post.stats?.views || 0,
      viewerHasLiked,
      viewerHasBookmarked,
      viewerFollowsAuthor,
      authorFollowerCount,
      recentComments,
      badges: [],
    };
  }

  /**
   * Map PostDocument to Post
   */
  private mapToPost(doc: PostDocument): Post {
    return {
      id: doc.postId,
      authorId: doc.authorId,
      content: doc.content,
      contentType: doc.contentType,
      mediaUrls: doc.mediaUrls,
      topics: doc.topics,
      visibility: doc.visibility,
      isNews: doc.isNews,
      source: doc.source,
      clusterId: doc.clusterId,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }
}

export const postsService = new PostsService();
