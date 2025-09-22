// PostgreSQL Outbox Consumer
// Target architecture: Postgres canonical → Cosmos projections

import { Pool } from 'pg';
import { createCosmosClient, getTargetDatabase } from './cosmos-client';

interface OutboxEvent {
  id: bigint;
  topic: string;
  key: string;
  payload: any;
  created_at: Date;
}

interface ProfileUpdatedEvent {
  user_uuid: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  tier: string;
}

/**
 * Process PostgreSQL outbox events and update Cosmos projections
 */
export class OutboxConsumer {
  private pg: Pool;
  private cosmos: ReturnType<typeof getTargetDatabase>;
  private isRunning = false;

  constructor() {
    this.pg = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.cosmos = getTargetDatabase(createCosmosClient());
  }

  async start(): Promise<void> {
    console.log('Starting outbox consumer...');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.processOutboxEvents();
        await this.sleep(5000); // Poll every 5 seconds
      } catch (error) {
        console.error('Outbox consumer error:', error);
        await this.sleep(10000); // Back off on error
      }
    }
  }

  private async processOutboxEvents(): Promise<void> {
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');

      // Use FOR UPDATE SKIP LOCKED for concurrent worker safety
      const result = await client.query(`
        SELECT id, topic, key, payload, created_at, retry_count, max_retries
        FROM outbox
        WHERE processed_at IS NULL 
          AND next_retry_at <= NOW()
          AND retry_count < COALESCE(max_retries, 3)
        ORDER BY created_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      `);

      const events = result.rows as (OutboxEvent & { 
        retry_count: number; 
        max_retries: number; 
      })[];

      if (events.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      console.log(`Processing ${events.length} outbox events`);

      // Process events and track success/failure
      const processedIds: bigint[] = [];
      const failedEvents: { id: bigint; error: string }[] = [];

      for (const event of events) {
        try {
          await this.processEvent(event);
          processedIds.push(event.id);
        } catch (error) {
          failedEvents.push({ 
            id: event.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Mark successful events as processed
      if (processedIds.length > 0) {
        await client.query(`
          UPDATE outbox 
          SET processed_at = NOW() 
          WHERE id = ANY($1)
        `, [processedIds]);
      }

      // Update retry count and exponential backoff for failed events
      if (failedEvents.length > 0) {
        const failedIds = failedEvents.map(f => f.id);
        await client.query(`
          UPDATE outbox 
          SET retry_count = retry_count + 1,
              next_retry_at = NOW() + INTERVAL '60 seconds' * POW(2, retry_count)
          WHERE id = ANY($1)
        `, [failedIds]);

        console.warn(`Failed to process ${failedEvents.length} events:`, failedEvents);
      }

      await client.query('COMMIT');
      console.log(`✅ Processed ${processedIds.length} events, ${failedEvents.length} failed`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    switch (event.topic) {
      case 'profile.updated':
        await this.handleProfileUpdated(event.payload as ProfileUpdatedEvent);
        break;
      
      case 'user.tier_changed':
        await this.handleTierChanged(event.payload);
        break;
        
      case 'post.admin_mirror':
        await this.handlePostAdminMirror(event.payload);
        break;
        
      default:
        console.warn(`Unknown outbox topic: ${event.topic}`);
    }
  }

  /**
   * Update publicProfiles projection when profile changes
   */
  private async handleProfileUpdated(payload: ProfileUpdatedEvent): Promise<void> {
    const profileProjection = {
      id: payload.user_uuid,
      userId: payload.user_uuid, // Partition key
      displayName: payload.display_name,
      bio: payload.bio,
      avatarUrl: payload.avatar_url,
      badges: [payload.tier], // Convert tier to badge array
      updatedAt: new Date().toISOString()
    };

    await this.cosmos.publicProfiles.items.upsert(profileProjection);
  }

  /**
   * Handle tier changes (update publicProfiles badges)
   */
  private async handleTierChanged(payload: any): Promise<void> {
    try {
      const { user_uuid, new_tier } = payload;
      
      // Read current profile projection
      const response = await this.cosmos.publicProfiles.item(user_uuid, user_uuid).read();
      
      if (response.resource) {
        const updated = {
          ...response.resource,
          badges: [new_tier], // Update badge
          updatedAt: new Date().toISOString()
        };
        
        await this.cosmos.publicProfiles.items.upsert(updated);
      }
    } catch (error) {
      console.error('Error handling tier change:', error);
    }
  }

  /**
   * Update posts admin mirror in PostgreSQL (from Cosmos posts_v2)
   */
  private async handlePostAdminMirror(payload: any): Promise<void> {
    const client = await this.pg.connect();
    
    try {
      const { post_uuid, author_uuid, text, tags, status, created_at } = payload;
      
      await client.query(`
        INSERT INTO posts_admin_mirror 
        (post_uuid, author_uuid, text, tags, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (post_uuid) 
        DO UPDATE SET
          text = EXCLUDED.text,
          tags = EXCLUDED.tags,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [post_uuid, author_uuid, text, tags, status, created_at]);
      
    } finally {
      client.release();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    await this.pg.end();
  }
}

/**
 * Helper function to emit events to PostgreSQL outbox with duplicate prevention
 */
export async function emitOutboxEvent(
  topic: string,
  key: string,
  payload: any,
  aggregateType?: string,
  aggregateId?: string
): Promise<void> {
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pg.connect();
  
  try {
    await client.query(`
      INSERT INTO outbox (
        topic, key, payload, aggregate_type, aggregate_id,
        retry_count, max_retries, next_retry_at
      )
      VALUES ($1, $2, $3, $4, $5, 0, 3, NOW())
      ON CONFLICT (aggregate_type, aggregate_id, topic, created_at) 
      DO NOTHING
    `, [
      topic, 
      key, 
      JSON.stringify(payload),
      aggregateType || 'unknown',
      aggregateId || key
    ]);
  } catch (error) {
    // If we hit the unique constraint, that's expected for duplicates
    if (error instanceof Error && error.message.includes('unique_outbox_event')) {
      console.log(`Duplicate outbox event ignored: ${topic}:${key}`);
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pg.end();
  }
}

/**
 * Start the outbox consumer
 */
export async function startOutboxConsumer(): Promise<void> {
  const consumer = new OutboxConsumer();
  await consumer.start();
}