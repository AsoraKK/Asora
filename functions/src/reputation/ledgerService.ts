/**
 * Reputation Ledger Service
 *
 * Manages the `reputation_ledger` Cosmos container — the user-visible record
 * of all reputation events. This is separate from `reputation_audit`, which is
 * an internal idempotency + admin audit log.
 *
 * Container: reputation_ledger
 *   Partition key: /userId
 *   Composite indexes (see database/cosmos/indexes/reputation_ledger.index.json):
 *     - userId ASC + createdAt DESC          (default list)
 *     - userId ASC + eventCategory ASC + createdAt DESC  (filtered list)
 */

import { v7 as uuidv7 } from 'uuid';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { isNotFoundError, getErrorMessage } from '@shared/errorUtils';
import type {
  LedgerEntry,
  LedgerFilter,
  LedgerPage,
  AppealStatus,
} from './types';

const logger = getAzureLogger('reputation/ledgerService');

const CONTAINER_NAME = 'reputation_ledger';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function getLedgerContainer() {
  return getCosmosDatabase().container(CONTAINER_NAME);
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a new entry to the reputation ledger.
 * `id` and `createdAt` are set server-side.
 */
export async function appendLedgerEntry(
  entry: Omit<LedgerEntry, 'id' | 'createdAt'>
): Promise<LedgerEntry> {
  const container = getLedgerContainer();
  const now = new Date().toISOString();

  const doc: LedgerEntry = {
    ...entry,
    id: uuidv7(),
    createdAt: now,
  };

  const { resource } = await container.items.create<LedgerEntry>(doc);
  if (!resource) {
    throw new Error('Ledger entry creation returned no resource');
  }

  logger.info('reputation.ledger.appended', {
    userId: resource.userId,
    eventType: resource.eventType,
    impactBand: resource.impactBand,
  });

  return resource;
}

/**
 * Set a ledger entry's status to 'expired' (decay).
 */
export async function decayEntry(userId: string, entryId: string): Promise<void> {
  const container = getLedgerContainer();

  const { resource } = await container.item(entryId, userId).read<LedgerEntry>();
  if (!resource) {
    throw new Error(`Ledger entry ${entryId} not found for user ${userId}`);
  }

  await container.item(entryId, userId).replace<LedgerEntry>({
    ...resource,
    status: 'expired',
  });

  logger.info('reputation.ledger.decayed', { userId, entryId });
}

/**
 * Reverse a ledger entry (e.g. successful appeal).
 * Sets status='reversed' and appealStatus='accepted'.
 */
export async function reverseEntry(
  userId: string,
  entryId: string,
  reason: string
): Promise<void> {
  const container = getLedgerContainer();

  const { resource } = await container.item(entryId, userId).read<LedgerEntry>();
  if (!resource) {
    throw new Error(`Ledger entry ${entryId} not found for user ${userId}`);
  }

  await container.item(entryId, userId).replace<LedgerEntry>({
    ...resource,
    status: 'reversed',
    appealStatus: 'accepted' as AppealStatus,
    internalReasonCode: `${resource.internalReasonCode}::reversed::${reason}`,
  });

  logger.info('reputation.ledger.reversed', { userId, entryId, reason });
}

/**
 * Update the appeal status on a ledger entry.
 */
export async function updateAppealStatus(
  userId: string,
  entryId: string,
  appealStatus: AppealStatus
): Promise<void> {
  const container = getLedgerContainer();

  const { resource } = await container.item(entryId, userId).read<LedgerEntry>();
  if (!resource) {
    throw new Error(`Ledger entry ${entryId} not found for user ${userId}`);
  }

  await container.item(entryId, userId).replace<LedgerEntry>({
    ...resource,
    appealStatus,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

interface GetLedgerOptions {
  filter?: LedgerFilter;
  cursor?: string;
  limit?: number;
}

function buildLedgerQuery(userId: string, filter: LedgerFilter): {
  query: string;
  parameters: { name: string; value: string | number | boolean }[];
} {
  const parameters: { name: string; value: string | number | boolean }[] = [
    { name: '@userId', value: userId },
  ];

  let whereClause = 'WHERE c.userId = @userId';

  switch (filter) {
    case 'positive':
      whereClause += " AND c.eventCategory = 'positive'";
      break;
    case 'neutral':
      whereClause += " AND c.eventCategory = 'neutral'";
      break;
    case 'negative':
      whereClause += " AND c.eventCategory = 'negative'";
      break;
    case 'appeal':
      whereClause += ' AND c.appealable = true';
      break;
    case 'expired':
      whereClause += " AND c.status = 'expired'";
      break;
    case 'all':
    default:
      break;
  }

  return {
    query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC`,
    parameters,
  };
}

/**
 * Retrieve paginated ledger entries for a user.
 * Returns a stripped (public-safe) response; internal fields are included
 * on the raw `LedgerEntry` — callers should strip before sending to clients.
 */
export async function getLedgerEntries(
  userId: string,
  opts: GetLedgerOptions = {}
): Promise<LedgerPage> {
  const container = getLedgerContainer();
  const limit = Math.min(opts.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const filter: LedgerFilter = opts.filter ?? 'all';

  const { query, parameters } = buildLedgerQuery(userId, filter);

  try {
    const querySpec = { query, parameters };
    const iterator = container.items.query<LedgerEntry>(querySpec, {
      maxItemCount: limit,
      continuationToken: opts.cursor,
    });

    const response = await iterator.fetchNext();

    const entries = response.resources ?? [];
    const nextCursor = response.continuationToken ?? undefined;

    return { entries, nextCursor };
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return { entries: [] };
    }
    logger.error('reputation.ledger.read_failed', {
      userId,
      filter,
      error: getErrorMessage(error),
    });
    throw error;
  }
}
