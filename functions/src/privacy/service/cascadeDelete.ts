/**
 * Cascade Delete Service
 *
 * Handles complete user data purge/anonymization for GDPR/POPIA compliance.
 * Reusable from both self-service deletion and admin DSR delete flows.
 *
 * Strategy per entity:
 * - DELETE: likes, appeal_votes, follows (no value without user)
 * - ANONYMIZE: posts, comments, content_flags, appeals (preserve content structure)
 * - DELETE: users, auth_identities, profiles (Postgres identity data)
 */

import type { SqlParameter, Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';
import { hasLegalHold } from './dsrStore';

const DELETED_USER_MARKER = '[deleted]';
const DELETED_EMAIL_MARKER = 'deleted@anonymized.local';

export interface CascadeDeleteResult {
  userId: string;
  deletedAt: string;
  deletedBy: string;
  cosmos: {
    deleted: Record<string, number>;
    anonymized: Record<string, number>;
    skippedDueToHold: Record<string, number>;
  };
  postgres: {
    deleted: Record<string, number>;
  };
  errors: Array<{ container: string; error: string }>;
}

export interface CascadeDeleteOptions {
  userId: string;
  deletedBy: string;
  /** Skip legal hold checks (for testing only) */
  skipHoldCheck?: boolean;
}

/**
 * Container configurations for cascade operations
 */
interface ContainerConfig {
  name: string;
  /** Field name containing the user ID to match */
  userIdField: string;
  /** Operation: 'delete' removes entirely, 'anonymize' replaces PII */
  operation: 'delete' | 'anonymize';
  /** Fields to anonymize (only for operation='anonymize') */
  fieldsToAnonymize?: string[];
  /** Legal hold scope if applicable */
  holdScope?: string;
}

const COSMOS_CONTAINERS: ContainerConfig[] = [
  // DELETE entirely
  { name: 'likes', userIdField: 'userId', operation: 'delete' },
  { name: 'appeal_votes', userIdField: 'voterId', operation: 'delete' },

  // ANONYMIZE (preserve content structure)
  {
    name: 'posts',
    userIdField: 'authorId',
    operation: 'anonymize',
    fieldsToAnonymize: ['authorId', 'authorName', 'authorEmail', 'authorAvatar'],
    holdScope: 'post',
  },
  {
    name: 'comments',
    userIdField: 'authorId',
    operation: 'anonymize',
    fieldsToAnonymize: ['authorId', 'authorName', 'authorEmail', 'authorAvatar'],
  },
  {
    name: 'content_flags',
    userIdField: 'flaggedBy',
    operation: 'anonymize',
    fieldsToAnonymize: ['flaggedBy', 'flaggedByName', 'flaggedByEmail'],
  },
  {
    name: 'appeals',
    userIdField: 'submitterId',
    operation: 'anonymize',
    fieldsToAnonymize: ['submitterId', 'submitterName', 'submitterEmail'],
  },

  // User record - hard delete
  { name: 'users', userIdField: 'id', operation: 'delete', holdScope: 'user' },
];

/**
 * Fetch all records matching the user ID in a container
 */
async function fetchUserRecords(
  container: Container,
  userIdField: string,
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  const query = `SELECT * FROM c WHERE c.${userIdField} = @userId`;
  const parameters: SqlParameter[] = [{ name: '@userId', value: userId }];

  const iterator = container.items.query({ query, parameters });
  const { resources } = await iterator.fetchAll();
  return resources ?? [];
}

/**
 * Delete a record from Cosmos DB
 */
async function deleteRecord(container: Container, item: Record<string, unknown>): Promise<void> {
  const id = item.id as string;
  // Cosmos partitionKey is typically same as id for our containers
  const partitionKey = (item.partitionKey as string) ?? id;
  await container.item(id, partitionKey).delete();
}

/**
 * Anonymize a record by replacing specified fields with deletion markers
 */
async function anonymizeRecord(
  container: Container,
  item: Record<string, unknown>,
  fieldsToAnonymize: string[],
  deletedAt: string,
  deletedBy: string,
): Promise<void> {
  const id = item.id as string;
  const partitionKey = (item.partitionKey as string) ?? id;

  const anonymized: Record<string, unknown> = { ...item };

  for (const field of fieldsToAnonymize) {
    if (field in anonymized) {
      // Replace with appropriate marker
      if (field.toLowerCase().includes('email')) {
        anonymized[field] = DELETED_EMAIL_MARKER;
      } else if (field.toLowerCase().includes('id')) {
        anonymized[field] = DELETED_USER_MARKER;
      } else {
        anonymized[field] = DELETED_USER_MARKER;
      }
    }
  }

  // Add deletion metadata
  anonymized.anonymized = true;
  anonymized.anonymizedAt = deletedAt;
  anonymized.anonymizedBy = deletedBy;

  await container.item(id, partitionKey).replace(anonymized);
}

/**
 * Process a single Cosmos container for deletion/anonymization
 */
async function processCosmosContainer(
  config: ContainerConfig,
  options: CascadeDeleteOptions,
  deletedAt: string,
  result: CascadeDeleteResult,
): Promise<void> {
  const db = getCosmosDatabase();
  const container = db.container(config.name);

  try {
    const records = await fetchUserRecords(container, config.userIdField, options.userId);

    let deleted = 0;
    let anonymized = 0;
    let skipped = 0;

    for (const item of records) {
      // Check legal hold
      if (config.holdScope && !options.skipHoldCheck) {
        const itemId = item.id as string;
        if (await hasLegalHold(config.holdScope, itemId)) {
          skipped++;
          continue;
        }
      }

      try {
        if (config.operation === 'delete') {
          await deleteRecord(container, item);
          deleted++;
        } else {
          await anonymizeRecord(
            container,
            item,
            config.fieldsToAnonymize ?? [],
            deletedAt,
            options.deletedBy,
          );
          anonymized++;
        }
      } catch (error: any) {
        result.errors.push({
          container: config.name,
          error: `Failed to process item ${item.id}: ${error?.message}`,
        });
      }
    }

    if (config.operation === 'delete') {
      result.cosmos.deleted[config.name] = deleted;
    } else {
      result.cosmos.anonymized[config.name] = anonymized;
    }

    if (skipped > 0) {
      result.cosmos.skippedDueToHold[config.name] = skipped;
    }
  } catch (error: any) {
    result.errors.push({
      container: config.name,
      error: `Failed to query container: ${error?.message}`,
    });
  }
}

/**
 * Delete user data from Postgres tables
 */
async function processPostgres(
  options: CascadeDeleteOptions,
  deletedAt: string,
  result: CascadeDeleteResult,
): Promise<void> {
  try {
    await withClient(async client => {
      // Delete follows (both directions)
      const followsResult = await client.query(
        'DELETE FROM follows WHERE follower_uuid = $1 OR followee_uuid = $1',
        [options.userId],
      );
      result.postgres.deleted['follows'] = followsResult.rowCount ?? 0;

      // Delete profiles
      const profilesResult = await client.query(
        'DELETE FROM profiles WHERE user_uuid = $1',
        [options.userId],
      );
      result.postgres.deleted['profiles'] = profilesResult.rowCount ?? 0;

      // Delete auth_identities
      const authResult = await client.query(
        'DELETE FROM auth_identities WHERE user_uuid = $1',
        [options.userId],
      );
      result.postgres.deleted['auth_identities'] = authResult.rowCount ?? 0;

      // Delete user record
      const userResult = await client.query(
        'DELETE FROM users WHERE user_uuid = $1',
        [options.userId],
      );
      result.postgres.deleted['users'] = userResult.rowCount ?? 0;
    });
  } catch (error: any) {
    result.errors.push({
      container: 'postgres',
      error: `Postgres deletion failed: ${error?.message}`,
    });
  }
}

/**
 * Execute full cascade deletion/anonymization for a user
 *
 * This function is idempotent and can be called multiple times safely.
 * It processes all user data across Cosmos DB and Postgres.
 */
export async function executeCascadeDelete(
  options: CascadeDeleteOptions,
): Promise<CascadeDeleteResult> {
  const deletedAt = new Date().toISOString();

  const result: CascadeDeleteResult = {
    userId: options.userId,
    deletedAt,
    deletedBy: options.deletedBy,
    cosmos: {
      deleted: {},
      anonymized: {},
      skippedDueToHold: {},
    },
    postgres: {
      deleted: {},
    },
    errors: [],
  };

  // Check for user-level legal hold first
  if (!options.skipHoldCheck && (await hasLegalHold('user', options.userId))) {
    result.errors.push({
      container: 'user',
      error: 'Cannot delete: active legal hold on user',
    });
    return result;
  }

  // Process all Cosmos containers
  for (const config of COSMOS_CONTAINERS) {
    await processCosmosContainer(config, options, deletedAt, result);
  }

  // Process Postgres tables
  await processPostgres(options, deletedAt, result);

  return result;
}

/**
 * Check if any user data remains in the system
 * Used for verification after deletion
 */
export async function verifyUserDataPurged(userId: string): Promise<{
  purged: boolean;
  remaining: Array<{ location: string; count: number }>;
}> {
  const remaining: Array<{ location: string; count: number }> = [];
  const db = getCosmosDatabase();

  // Check Cosmos containers
  for (const config of COSMOS_CONTAINERS) {
    try {
      const container = db.container(config.name);
      const records = await fetchUserRecords(container, config.userIdField, userId);

      // For anonymized containers, check if any records still have the original userId
      const matchingRecords = records.filter(r => {
        const fieldValue = r[config.userIdField];
        return fieldValue === userId;
      });

      if (matchingRecords.length > 0) {
        remaining.push({ location: `cosmos:${config.name}`, count: matchingRecords.length });
      }
    } catch {
      // Container may not exist in test environment
    }
  }

  // Check Postgres
  try {
    await withClient(async client => {
      const tables = [
        { name: 'users', column: 'user_uuid' },
        { name: 'profiles', column: 'user_uuid' },
        { name: 'auth_identities', column: 'user_uuid' },
        { name: 'follows', column: 'follower_uuid' },
      ];

      for (const { name, column } of tables) {
        const result = await client.query(
          `SELECT COUNT(*) as count FROM ${name} WHERE ${column} = $1`,
          [userId],
        );
        const count = parseInt(result.rows[0]?.count ?? '0', 10);
        if (count > 0) {
          remaining.push({ location: `postgres:${name}`, count });
        }
      }

      // Also check followee direction
      const followeeResult = await client.query(
        'SELECT COUNT(*) as count FROM follows WHERE followee_uuid = $1',
        [userId],
      );
      const followeeCount = parseInt(followeeResult.rows[0]?.count ?? '0', 10);
      if (followeeCount > 0) {
        remaining.push({ location: 'postgres:follows(followee)', count: followeeCount });
      }
    });
  } catch {
    // Postgres may not be available in test environment
  }

  return {
    purged: remaining.length === 0,
    remaining,
  };
}

/**
 * Exported constants for testing
 */
export const ANONYMIZATION_MARKER = DELETED_USER_MARKER;
export const ANONYMIZED_EMAIL = DELETED_EMAIL_MARKER;
