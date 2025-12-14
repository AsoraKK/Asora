import { v7 as uuidv7 } from 'uuid';
import { getTargetDatabase } from '@shared/clients/cosmos';
import type { CreatePostRequest, Post, PostView, PublicUserProfile } from '@shared/types/openapi';
import type { ModerationMeta } from '@feed/types';
import { profileService } from '@users/service/profileService';
import { usersService } from '@auth/service/usersService';

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
  clusterId?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  stats: {
    likes: number;
    comments: number;
    replies: number;
  };
  moderation: {
    status: string;
    checkedAt: number;
    confidence?: number;
    categories?: string[];
    reasons?: string[];
    error?: string;
  };
}

class PostsService {
  /**
   * Create a new post with moderation metadata
   */
  async createPost(
    authorId: string,
    request: CreatePostRequest,
    postId?: string,
    moderationMeta?: ModerationMeta
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
      stats: {
        likes: 0,
        comments: 0,
        replies: 0,
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
    };

    const container = getTargetDatabase().posts;
    await container.items.create<PostDocument>(postDocument);

    return this.mapToPost(postDocument);
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
      displayName: cosmosProfile?.displayName || pgUser?.display_name || 'Unknown',
      bio: cosmosProfile?.bio,
      avatarUrl: cosmosProfile?.avatarUrl || pgUser?.avatar_url,
      tier: pgUser?.tier || 'free',
      reputation: 0, // TODO: Fetch from reputation service
      badges: [],
    };

    // Determine author role based on tier/roles
    let authorRole: 'journalist' | 'contributor' | 'user' = 'user';
    if (pgUser?.roles?.includes('journalist')) {
      authorRole = 'journalist';
    } else if (pgUser?.roles?.includes('contributor')) {
      authorRole = 'contributor';
    }

    // Check if viewer has liked the post
    let viewerHasLiked = false;
    if (viewerId) {
      try {
        const db = getTargetDatabase();
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

    return {
      id: post.postId,
      authorId: post.authorId,
      content: post.content,
      contentType: post.contentType,
      mediaUrls: post.mediaUrls,
      topics: post.topics,
      visibility: post.visibility,
      isNews: post.isNews,
      clusterId: post.clusterId,
      createdAt: new Date(post.createdAt).toISOString(),
      updatedAt: new Date(post.updatedAt).toISOString(),
      author,
      authorRole,
      likeCount: post.stats?.likes || 0,
      commentCount: post.stats?.comments || 0,
      viewerHasLiked,
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
      clusterId: doc.clusterId,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }
}

export const postsService = new PostsService();
