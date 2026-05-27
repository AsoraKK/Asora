/**
 * GET /api/reputation/me/ledger
 *
 * Returns a paginated, user-visible reputation ledger for the authenticated user.
 * Internal fields (`internalReasonCode`, `rawDelta`) are stripped before responding.
 *
 * Query params:
 *   filter   = 'all' | 'positive' | 'neutral' | 'negative' | 'appeal' | 'expired'
 *   cursor   = opaque pagination cursor (Cosmos continuationToken, base64-encoded)
 *   limit    = 1–50 (default 20)
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getAzureLogger } from '@shared/utils/logger';
import { getLedgerEntries } from './ledgerService';
import type { LedgerFilter, LedgerPage, PublicLedgerEntry } from './types';

const logger = getAzureLogger('reputation/ledger');

const ALLOWED_FILTERS: LedgerFilter[] = ['all', 'positive', 'neutral', 'negative', 'appeal', 'expired'];

function stripInternalFields(entry: Parameters<typeof Object.assign>[0]): PublicLedgerEntry {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { internalReasonCode, rawDelta, ...pub } = entry as {
    internalReasonCode: string;
    rawDelta: number;
    [key: string]: unknown;
  };
  return pub as PublicLedgerEntry;
}

app.http('reputation_ledger_get', {
  methods: ['GET'],
  route: 'reputation/me/ledger',
  authLevel: 'anonymous',
  handler: httpHandler(async (ctx) => {
    const auth = await extractAuthContext(ctx);
    if (!auth.userId) {
      return ctx.unauthorized('Authentication required');
    }

    const urlParams = ctx.request.query;
    const rawFilter = urlParams.get('filter') ?? 'all';
    const filter: LedgerFilter = (ALLOWED_FILTERS as string[]).includes(rawFilter)
      ? (rawFilter as LedgerFilter)
      : 'all';

    const rawLimit = urlParams.get('limit');
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 50) : 20;

    const cursor = urlParams.get('cursor') ?? undefined;

    const page = await getLedgerEntries(auth.userId, { filter, cursor, limit });

    const publicPage: LedgerPage = {
      entries: page.entries.map(stripInternalFields),
      nextCursor: page.nextCursor,
    };

    logger.info('reputation.ledger.listed', {
      userId: auth.userId,
      filter,
      count: publicPage.entries.length,
    });

    return ctx.ok(publicPage);
  }),
});
