// Change Feed Processor for posts_v2 → userFeed fan-out
// Target architecture: Single-write Cosmos with change propagation

import { CosmosClient } from '@azure/cosmos';
import { createCosmosClient, getTargetDatabase } from './cosmos-client';

interface PostDocument {
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
  visibility: 'public' | 'followers' | 'private';
  status: 'published' | 'under_review' | 'rejected';
  counts: {
    likes: number;
    replies: number;
    reposts: number;
  };
}

interface UserFeedItem {
  id: string;
  recipientId: string; // Partition key
  postId: string;
  authorId: string;
  type: 'post' | 'repost' | 'reply';
  createdAt: string;
  relevanceScore: number;
}

/**
 * Process changes from posts_v2 and fan out to userFeed
 */
export class PostChangeFeedProcessor {
  private cosmosClient: CosmosClient;
  private containers: ReturnType<typeof getTargetDatabase>;

  constructor() {
    this.cosmosClient = createCosmosClient();
    this.containers = getTargetDatabase(this.cosmosClient);
  }

  async start(): Promise<void> {
    console.log('Starting posts_v2 change feed processor...');

    const iterator = this.containers.postsV2.items.readChangeFeed({
      maxItemCount: 100,
    });

    while (iterator.hasMoreResults) {
      const response = await iterator.fetchNext();
      if (response.result && response.result.length > 0) {
        await this.processChanges(response.result);
      }
    }
  }

  private async processChanges(changes: any[]): Promise<void> {
    for (const change of changes) {
      try {
        const post = change as PostDocument;

        // Only process published posts
        if (post.status !== 'published') {
          continue;
        }

        await Promise.all([
          this.fanOutToFollowers(post),
          this.updateCounters(post),
          this.enqueueModeration(post),
          this.updateAdminMirror(post),
        ]);

        console.log(`Processed change for post ${post.postId}`);
      } catch (error) {
        console.error('Error processing change:', error);
      }
    }
  }

  /**
   * Fan out post to followers' userFeed (single-partition writes)
   */
  private async fanOutToFollowers(post: PostDocument): Promise<void> {
    // TODO: Query PostgreSQL for author's followers
    // For now, create feed item for author's own feed with idempotent ID

    // Use deterministic ID for idempotency: ${recipientId}:${postId}
    const deterministicId = `${post.authorId}:${post.postId}`;

    const feedItem: UserFeedItem = {
      id: deterministicId,
      recipientId: post.authorId, // Partition key
      postId: post.postId,
      authorId: post.authorId,
      type: 'post',
      createdAt: post.createdAt,
      relevanceScore: 1.0,
    };

    // Use upsert for idempotency - handles duplicate processing
    await this.containers.userFeed.items.upsert(feedItem);
  }

  /**
   * Update reaction counters with idempotent operations
   */
  private async updateCounters(post: PostDocument): Promise<void> {
    // Use deterministic ID for idempotency: ${postId}:likes
    const counterDoc = {
      id: `${post.postId}:likes`,
      subjectId: post.postId, // Partition key
      type: 'post_likes',
      count: post.counts.likes,
      lastUpdated: new Date().toISOString(),
    };

    // Upsert ensures idempotency for counter updates
    await this.containers.counters.items.upsert(counterDoc);

    // Additional counters with deterministic IDs
    const repliesCounter = {
      id: `${post.postId}:replies`,
      subjectId: post.postId,
      type: 'post_replies',
      count: post.counts.replies,
      lastUpdated: new Date().toISOString(),
    };

    const repostsCounter = {
      id: `${post.postId}:reposts`,
      subjectId: post.postId,
      type: 'post_reposts',
      count: post.counts.reposts,
      lastUpdated: new Date().toISOString(),
    };

    await Promise.all([
      this.containers.counters.items.upsert(repliesCounter),
      this.containers.counters.items.upsert(repostsCounter),
    ]);
  }

  /**
   * Enqueue for additional moderation if needed
   */
  private async enqueueModeration(post: PostDocument): Promise<void> {
    // Placeholder: Queue high-risk posts for human review
    if (post.text.length > 5000) {
      console.log(`Queuing post ${post.postId} for extended moderation`);
    }
  }

  /**
   * Update PostgreSQL admin mirror via outbox
   */
  private async updateAdminMirror(post: PostDocument): Promise<void> {
    // In a real implementation, this would write to PostgreSQL outbox
    // which gets consumed by a separate worker
    console.log(`Should update admin mirror for post ${post.postId}`);
  }
}

/**
 * Start the change feed processor
 */
export async function startChangeFeedProcessor(): Promise<void> {
  const processor = new PostChangeFeedProcessor();
  await processor.start();
}
