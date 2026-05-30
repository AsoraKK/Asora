/**
 * POST /api/moderation/ledger/{entryId}/appeal
 *
 * Marks an appealable reputation ledger entry as under appeal for the
 * authenticated owner. Full moderation case review continues through the
 * existing moderation appeal workflow.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { updateAppealStatus } from './ledgerService';
import type { LedgerEntry } from './types';

export const moderation_ledger_appeal_post = httpHandler(async (ctx) => {
  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Authentication required');
  }

  const entryId = ctx.params.entryId;
  if (!entryId) {
    return ctx.badRequest('Ledger entry id is required', 'INVALID_LEDGER_ENTRY');
  }

  const db = getCosmosDatabase();
  const { resource: entry } = await db
    .container('reputation_ledger')
    .item(entryId, auth.userId)
    .read<LedgerEntry>();

  if (!entry) {
    return ctx.notFound('Ledger entry not found', 'LEDGER_ENTRY_NOT_FOUND');
  }

  if (!entry.appealable) {
    return ctx.badRequest('This ledger entry cannot be appealed', 'LEDGER_ENTRY_NOT_APPEALABLE');
  }

  if (entry.status !== 'active') {
    return ctx.badRequest('Only active ledger entries can be appealed', 'LEDGER_ENTRY_NOT_ACTIVE');
  }

  if (entry.appealStatus === 'pending') {
    return ctx.ok({ entryId, appealStatus: 'pending' });
  }

  if (entry.appealStatus === 'accepted' || entry.appealStatus === 'rejected') {
    return ctx.badRequest('This ledger entry appeal has already been decided', 'LEDGER_APPEAL_DECIDED');
  }

  await updateAppealStatus(auth.userId, entryId, 'pending');
  return ctx.accepted();
});

app.http('moderation_ledger_appeal_post', {
  methods: ['POST'],
  route: 'moderation/ledger/{entryId}/appeal',
  authLevel: 'anonymous',
  handler: moderation_ledger_appeal_post,
});
