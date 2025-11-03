import type { Container, PatchOperation, Resource } from '@azure/cosmos';
import { getCosmosClient } from '@shared/clients/cosmos';

import {
  applyTokenBucket,
  evaluateSlidingWindow,
  SlidingWindowBucket,
  SlidingWindowConfig,
  SlidingWindowEvaluation,
  TokenBucketConfig,
  TokenBucketEvaluation,
  TokenBucketState,
} from './algorithms';

const RATE_LIMIT_CONTAINER_NAME = process.env.RATE_LIMIT_CONTAINER ?? 'rate_limits';
const MAX_PATCH_RETRIES = 4;
const DEFAULT_BUCKET_SIZE_SECONDS = 1;
const AUTH_FAILURE_WINDOW_SECONDS = 30 * 60; // 30 minutes

type SlidingWindowDocument = Resource & {
  id: string;
  key: string;
  type: 'sliding';
  bucketStartSeconds: number;
  bucketSizeSeconds: number;
  windowSeconds: number;
  count: number;
  ttl: number;
  createdAt: string;
  updatedAt: string;
};

type TokenBucketDocument = Resource & {
  id: string;
  key: string;
  type: 'token';
  capacity: number;
  refillRatePerSecond: number;
  tokens: number;
  updatedAt: string;
  ttl: number;
};

type AuthFailureDocument = Resource & {
  id: string;
  key: string;
  type: 'auth_failure';
  count: number;
  lastFailureAt: string;
  ttl: number;
};

let cachedContainer: Container | null = null;

function getContainer(): Container {
  if (cachedContainer) {
    return cachedContainer;
  }

  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  cachedContainer = client.database(databaseName).container(RATE_LIMIT_CONTAINER_NAME);
  return cachedContainer;
}

function toBucketStartSeconds(nowMs: number, bucketSizeSeconds: number): number {
  const bucketSizeMs = bucketSizeSeconds * 1000;
  return Math.floor(nowMs / bucketSizeMs) * bucketSizeSeconds;
}

async function incrementSlidingWindowBucket(
  key: string,
  windowSeconds: number,
  amount: number,
  nowMs: number,
  bucketSizeSeconds: number
): Promise<SlidingWindowDocument> {
  const container = getContainer();
  const bucketStartSeconds = toBucketStartSeconds(nowMs, bucketSizeSeconds);
  const id = `sliding:${bucketStartSeconds}`;
  const timestamp = new Date(nowMs).toISOString();
  const ttl = Math.max(Math.ceil(windowSeconds * 2), bucketSizeSeconds * 4);
  const patchOperations: PatchOperation[] = [
    { op: 'incr', path: '/count', value: amount },
    { op: 'set', path: '/updatedAt', value: timestamp },
    { op: 'set', path: '/ttl', value: ttl },
  ];

  let attempt = 0;
  while (attempt < MAX_PATCH_RETRIES) {
    attempt++;
    try {
      const { resource } = await container.item(id, key).patch<SlidingWindowDocument>(patchOperations, {
        filterPredicate: "FROM c WHERE c.type = 'sliding'",
      });
      if (!resource) {
        throw new Error('Failed to update sliding window bucket');
      }
      return resource;
    } catch (error: any) {
      const statusCode = error?.code || error?.statusCode;
      if (statusCode === 404) {
        const document: SlidingWindowDocument = {
          id,
          key,
          type: 'sliding',
          bucketStartSeconds,
          bucketSizeSeconds,
          windowSeconds,
          count: amount,
          ttl,
          createdAt: timestamp,
          updatedAt: timestamp,
        } as SlidingWindowDocument;

        try {
          const { resource } = await container.items.create<SlidingWindowDocument>(document, {
            disableAutomaticIdGeneration: true,
          });
          if (!resource) {
            throw new Error('Failed to create sliding window bucket');
          }
          return resource;
        } catch (createError: any) {
          const createStatus = createError?.code || createError?.statusCode;
          if (createStatus === 409) {
            continue;
          }
          throw createError;
        }
      }

      if (statusCode === 412 || statusCode === 409) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed to increment sliding window bucket for key ${key}`);
}

async function fetchSlidingWindowBuckets(
  key: string,
  windowSeconds: number,
  nowMs: number
): Promise<SlidingWindowBucket[]> {
  const container = getContainer();
  const cutoffSeconds = Math.max(Math.floor((nowMs - windowSeconds * 1000) / 1000), 0);

  const querySpec = {
    query:
      "SELECT c.bucketStartSeconds, c.bucketSizeSeconds, c.count FROM c WHERE c.key = @key AND c.type = 'sliding' AND c.bucketStartSeconds >= @cutoff",
    parameters: [
      { name: '@key', value: key },
      { name: '@cutoff', value: cutoffSeconds },
    ],
  };

  const { resources } = await container.items
    .query<{ bucketStartSeconds: number; bucketSizeSeconds: number; count: number }>(querySpec, {
      partitionKey: key,
    })
    .fetchAll();

  return resources.map((resource) => ({
    bucketStartMs: resource.bucketStartSeconds * 1000,
    bucketSizeSeconds: resource.bucketSizeSeconds,
    count: resource.count,
  }));
}

export interface SlidingWindowLimitOptions extends SlidingWindowConfig {
  key: string;
  amount?: number;
  nowMs?: number;
  bucketSizeSeconds?: number;
}

export interface SlidingWindowLimitResult extends SlidingWindowEvaluation {
  buckets: SlidingWindowBucket[];
}

export async function applySlidingWindowLimit(options: SlidingWindowLimitOptions): Promise<SlidingWindowLimitResult> {
  const {
    key,
    windowSeconds,
    limit,
    amount = 1,
    nowMs = Date.now(),
    bucketSizeSeconds = DEFAULT_BUCKET_SIZE_SECONDS,
  } = options;

  await incrementSlidingWindowBucket(key, windowSeconds, amount, nowMs, bucketSizeSeconds);
  const buckets = await fetchSlidingWindowBuckets(key, windowSeconds, nowMs);
  const evaluation = evaluateSlidingWindow(buckets, { limit, windowSeconds }, nowMs);

  return {
    ...evaluation,
    buckets,
  };
}

function buildTokenBucketId(key: string): string {
  return `token:${key}`;
}

function calculateTokenBucketTtl(config: TokenBucketConfig): number {
  if (config.refillRatePerSecond <= 0) {
    return 24 * 60 * 60; // 24 hours fallback
  }
  const secondsToFill = config.capacity / config.refillRatePerSecond;
  return Math.max(Math.ceil(secondsToFill * 2), 10 * 60);
}

async function readTokenBucketDocument(
  id: string,
  key: string
): Promise<TokenBucketDocument | null> {
  const container = getContainer();
  try {
    const response = await container.item(id, key).read<TokenBucketDocument>();
    return response.resource ?? null;
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode;
    if (statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function writeTokenBucketDocument(document: TokenBucketDocument): Promise<void> {
  const container = getContainer();

  if (!document._etag) {
    await container.items.upsert<TokenBucketDocument>(document, { disableAutomaticIdGeneration: true });
    return;
  }

  await container.item(document.id, document.key).replace(document, {
    accessCondition: {
      type: 'IfMatch',
      condition: document._etag,
    },
  });
}

export interface TokenBucketLimitOptions extends TokenBucketConfig {
  key: string;
  cost?: number;
  nowMs?: number;
}

export async function applyTokenBucketLimit(
  options: TokenBucketLimitOptions
): Promise<TokenBucketEvaluation> {
  const { key, capacity, refillRatePerSecond, cost = 1, nowMs = Date.now() } = options;
  const id = buildTokenBucketId(key);

  let document = await readTokenBucketDocument(id, key);

  if (!document) {
    const initialState: TokenBucketState = {
      tokens: capacity,
      updatedAt: new Date(nowMs).toISOString(),
    };

    const ttl = calculateTokenBucketTtl({ capacity, refillRatePerSecond });
    document = {
      id,
      key,
      type: 'token',
      capacity,
      refillRatePerSecond,
      tokens: initialState.tokens,
      updatedAt: initialState.updatedAt,
      ttl,
    } as TokenBucketDocument;
  }

  const evaluation = applyTokenBucket(
    { tokens: document.tokens, updatedAt: document.updatedAt },
    { capacity, refillRatePerSecond },
    cost,
    nowMs
  );

  const ttl = calculateTokenBucketTtl({ capacity, refillRatePerSecond });
  const updatedDocument: TokenBucketDocument = {
    ...document,
    capacity,
    refillRatePerSecond,
    tokens: evaluation.state.tokens,
    updatedAt: evaluation.state.updatedAt,
    ttl,
  };

  await writeTokenBucketDocument(updatedDocument);

  return evaluation;
}

export interface AuthFailureIncrementResult {
  count: number;
  lockoutSeconds: number;
  lastFailureAt: string;
}

function calculateAuthLockout(count: number): number {
  const lockout = Math.pow(2, count);
  return Math.min(lockout, 900);
}

export interface AuthFailureState {
  count: number;
  lastFailureAt: string | null;
  lockoutSeconds: number;
  remainingLockoutSeconds: number;
  lockedUntilMs: number | null;
}

export async function incrementAuthFailure(key: string, nowMs: number = Date.now()): Promise<AuthFailureIncrementResult> {
  const container = getContainer();
  const id = key;
  const timestamp = new Date(nowMs).toISOString();
  const ttl = AUTH_FAILURE_WINDOW_SECONDS * 2;

  let document = null;
  try {
    const response = await container.item(id, key).read<AuthFailureDocument>();
    document = response.resource ?? null;
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode;
    if (statusCode !== 404) {
      throw error;
    }
  }

  const cutoffMs = nowMs - AUTH_FAILURE_WINDOW_SECONDS * 1000;
  const isWithinWindow = document?.lastFailureAt
    ? Date.parse(document.lastFailureAt) >= cutoffMs
    : false;
  const nextCount = isWithinWindow && document ? document.count + 1 : 1;
  const nextDocument: AuthFailureDocument = {
    id,
    key,
    type: 'auth_failure',
    count: nextCount,
    lastFailureAt: timestamp,
    ttl,
    _etag: document?._etag,
  } as AuthFailureDocument;

  if (!document?._etag) {
    await container.items.upsert(nextDocument, { disableAutomaticIdGeneration: true });
  } else {
    await container.item(id, key).replace(nextDocument, {
      accessCondition: {
        type: 'IfMatch',
        condition: document._etag,
      },
    });
  }

  return {
    count: nextCount,
    lockoutSeconds: calculateAuthLockout(nextCount),
    lastFailureAt: timestamp,
  };
}

export async function resetAuthFailures(key: string): Promise<void> {
  const container = getContainer();
  const id = key;

  try {
    await container.item(id, key).delete();
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode;
    if (statusCode !== 404) {
      throw error;
    }
  }
}

export async function getAuthFailureState(
  key: string,
  nowMs: number = Date.now()
): Promise<AuthFailureState> {
  const container = getContainer();
  const id = key;

  try {
    const response = await container.item(id, key).read<AuthFailureDocument>();
    const document = response.resource;
    if (!document) {
      return {
        count: 0,
        lastFailureAt: null,
        lockoutSeconds: 0,
        remainingLockoutSeconds: 0,
        lockedUntilMs: null,
      };
    }

    const lastFailureMs = Date.parse(document.lastFailureAt);
    const withinWindow = lastFailureMs >= nowMs - AUTH_FAILURE_WINDOW_SECONDS * 1000;
    const count = withinWindow ? document.count : 0;
    const lockoutSeconds = count > 0 ? calculateAuthLockout(count) : 0;
    const lockedUntilMs = count > 0 ? lastFailureMs + lockoutSeconds * 1000 : null;
    const remainingLockoutSeconds = lockedUntilMs && lockedUntilMs > nowMs ? Math.ceil((lockedUntilMs - nowMs) / 1000) : 0;

    return {
      count,
      lastFailureAt: count > 0 ? document.lastFailureAt : null,
      lockoutSeconds,
      remainingLockoutSeconds,
      lockedUntilMs,
    };
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode;
    if (statusCode === 404) {
      return {
        count: 0,
        lastFailureAt: null,
        lockoutSeconds: 0,
        remainingLockoutSeconds: 0,
        lockedUntilMs: null,
      };
    }
    throw error;
  }
}

export const __testing = {
  calculateAuthLockout,
};
