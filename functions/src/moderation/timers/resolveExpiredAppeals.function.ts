import { app, InvocationContext, Timer } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { resolveAppealFromVotes } from '../service/voteService';

const BATCH_SIZE = 50;

export async function resolveExpiredAppeals(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  const database = getCosmosDatabase();
  const appealsContainer = database.container('appeals');
  const nowIso = new Date().toISOString();

  let continuationToken: string | undefined;
  let processed = 0;

  try {
    do {
      const response = await appealsContainer.items
        .query(
          {
            query: 'SELECT * FROM c WHERE c.status = "pending" AND c.expiresAt <= @now',
            parameters: [{ name: '@now', value: nowIso }],
          },
          { maxItemCount: BATCH_SIZE, continuationToken }
        )
        .fetchNext();

      continuationToken = response.continuationToken;

      for (const appeal of response.resources) {
        processed += 1;
        const appealId = String(appeal.id);
        const appealPartitionKey = String(appeal.contentId ?? appeal.id);

        await resolveAppealFromVotes({
          database,
          appealDoc: appeal,
          context,
          resolvedBy: 'community_vote',
          resolvedAt: nowIso,
        });

        await appealsContainer.item(appealId, appealPartitionKey).replace(appeal);
      }
    } while (continuationToken);
  } catch (error) {
    context.error('moderation.appeals.resolve_expired_failed', error);
    throw error;
  }

  if (processed > 0) {
    context.log('moderation.appeals.resolve_expired_complete', { processed });
  }
}

app.timer('resolveExpiredAppeals', {
  schedule: '0 */1 * * * *',
  handler: resolveExpiredAppeals,
});
