/**
 * ASORA SHARED TYPES
 * 
 * Common type definitions used across all modules
 */

import type { CosmosClient } from '@azure/cosmos';
import type { RedisClientType } from 'redis';

export type { Principal } from './middleware/auth';

/**
 * Result type for service layer operations
 * Services should return Result<T> instead of HttpResponseInit
 */
export type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: string; code?: number };

/**
 * Dependencies injected into service functions
 */
export interface ContextDeps {
  cosmos: CosmosClient;
  redis?: RedisClientType;
  now: () => Date;
}

/**
 * Helper to create success result
 */
export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

/**
 * Helper to create error result
 */
export function failure(error: string, code?: number): Result<never> {
  return { ok: false, error, code };
}
