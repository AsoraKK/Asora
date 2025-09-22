// Reaction Change Feed Processor for reactions → counters updates
// Target architecture: Idempotent counter updates with deterministic IDs

import { CosmosClient } from '@azure/cosmos';
import { createCosmosClient, getTargetDatabase } from './cosmos-client';

interface ReactionDocument {
  id: string;
  postId: string; // Partition key
  userId: string;
  type: 'like' | 'dislike' | 'heart' | 'laugh';
  createdAt: string;
  deletedAt?: string;
}

interface CounterDocument {
  id: string;
  subjectId: string; // Partition key
  type: string;
  count: number;
  lastUpdated: string;
}

/**
 * Process changes from reactions and update counters atomically
 */
export class ReactionChangeFeedProcessor {
  private cosmosClient: CosmosClient;
  private containers: ReturnType<typeof getTargetDatabase>;

  constructor() {
    this.cosmosClient = createCosmosClient();
    this.containers = getTargetDatabase(this.cosmosClient);
  }

  async start(): Promise<void> {
    console.log('Starting reactions change feed processor...');

    const iterator = this.containers.reactions.items.readChangeFeed({
      maxItemCount: 100
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
        const reaction = change as ReactionDocument;
        await this.updateReactionCounters(reaction);
        console.log(`Processed reaction change: ${reaction.id}`);
      } catch (error) {
        console.error('Error processing reaction change:', error);
      }
    }
  }

  /**
   * Update reaction counters with idempotent operations
   */
  private async updateReactionCounters(reaction: ReactionDocument): Promise<void> {
    // Get current count for this post+reaction type
    const postReactions = await this.getPostReactionCount(reaction.postId, reaction.type);
    
    // Use deterministic ID for idempotency: ${postId}:${reactionType}
    const counterDoc: CounterDocument = {
      id: `${reaction.postId}:${reaction.type}`,
      subjectId: reaction.postId, // Partition key
      type: `post_${reaction.type}`,
      count: postReactions,
      lastUpdated: new Date().toISOString()
    };

    // Upsert ensures idempotency for counter updates
    await this.containers.counters.items.upsert(counterDoc);

    // Also update total reaction count for the post
    const totalReactions = await this.getTotalPostReactionCount(reaction.postId);
    const totalCounterDoc: CounterDocument = {
      id: `${reaction.postId}:total_reactions`,
      subjectId: reaction.postId,
      type: 'post_total_reactions',
      count: totalReactions,
      lastUpdated: new Date().toISOString()
    };

    await this.containers.counters.items.upsert(totalCounterDoc);
  }

  /**
   * Count reactions of specific type for a post
   */
  private async getPostReactionCount(postId: string, reactionType: string): Promise<number> {
    const query = {
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.postId = @postId AND c.type = @type AND NOT IS_DEFINED(c.deletedAt)',
      parameters: [
        { name: '@postId', value: postId },
        { name: '@type', value: reactionType }
      ]
    };

    const { resources } = await this.containers.reactions.items.query(query, {
      partitionKey: postId
    }).fetchAll();

    return resources[0] || 0;
  }

  /**
   * Count total reactions for a post (all types)
   */
  private async getTotalPostReactionCount(postId: string): Promise<number> {
    const query = {
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.postId = @postId AND NOT IS_DEFINED(c.deletedAt)',
      parameters: [
        { name: '@postId', value: postId }
      ]
    };

    const { resources } = await this.containers.reactions.items.query(query, {
      partitionKey: postId
    }).fetchAll();

    return resources[0] || 0;
  }
}

/**
 * Start the reaction change feed processor
 */
export async function startReactionChangeFeedProcessor(): Promise<void> {
  const processor = new ReactionChangeFeedProcessor();
  await processor.start();
}