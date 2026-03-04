import type { InvocationContext } from '@azure/functions';
import type { SqlParameter } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';
import { createAuditEntry, DsrRequest, ScoreCard, ExportMediaLink } from '../common/models';
import { emitSpan } from '../common/telemetry';
import { packageExportZip } from '../common/zip';
import { createUserDelegationUrl } from '../common/storage';
import { patchDsrRequest, getDsrRequest } from '../service/dsrStore';
import { redactRecord } from '../common/redaction';
import { getErrorMessage } from '@shared/errorUtils';

const DSR_TTL_HOURS = Number(process.env.DSR_EXPORT_SIGNED_URL_TTL_HOURS ?? '12');
const MAX_RECORDS_PER_CATEGORY = 10000; // Safety limit to prevent unbounded queries

function makeQuery(filters: string, params: SqlParameter[], limit?: number) {
  const topClause = limit ? `TOP ${limit}` : '';
  return {
    query: `SELECT ${topClause} * FROM c WHERE ${filters} ORDER BY c.createdAt DESC`,
    parameters: params,
  };
}

/**
 * Fetch records from a container with a safety limit
 * Uses TOP clause to limit results at the query level
 */
async function fetchContainerRecords(
  containerName: string,
  filters: string,
  params: SqlParameter[],
  maxRecords: number = MAX_RECORDS_PER_CATEGORY
) {
  const db = getCosmosDatabase();
  const container = db.container(containerName);
  
  const querySpec = makeQuery(filters, params, maxRecords);
  const iterator = container.items.query(querySpec);
  const { resources } = await iterator.fetchAll();

  return resources ?? [];
}

async function fetchPosts(userId: string) {
  return fetchContainerRecords('posts', 'c.authorId = @userId', [{ name: '@userId', value: userId }]);
}

async function fetchComments(userId: string) {
  return fetchContainerRecords('comments', 'c.authorId = @userId', [{ name: '@userId', value: userId }]);
}

async function fetchLikes(userId: string) {
  return fetchContainerRecords('likes', 'c.userId = @userId', [{ name: '@userId', value: userId }]);
}

async function fetchModeration(userId: string) {
  return fetchContainerRecords('moderation_decisions', 'c.actorId = @userId OR c.userId = @userId', [
    { name: '@userId', value: userId },
  ]);
}

/**
 * Fetch flags submitted by the user
 */
async function fetchFlags(userId: string) {
  return fetchContainerRecords('content_flags', 'c.flaggedBy = @userId', [
    { name: '@userId', value: userId },
  ]);
}

/**
 * Fetch appeals submitted by the user
 */
async function fetchAppeals(userId: string) {
  return fetchContainerRecords('appeals', 'c.submitterId = @userId', [
    { name: '@userId', value: userId },
  ]);
}

/**
 * Fetch votes on appeals cast by the user
 */
async function fetchAppealVotes(userId: string) {
  return fetchContainerRecords('appeal_votes', 'c.voterId = @userId', [
    { name: '@userId', value: userId },
  ]);
}

/**
 * Fetch moderation decisions affecting user's content
 * This includes decisions on posts/comments authored by the user
 */
async function fetchModerationDecisionsOnUserContent(userId: string) {
  return fetchContainerRecords('moderation_decisions', 'c.contentOwnerId = @userId', [
    { name: '@userId', value: userId },
  ]);
}

async function fetchIdentity(userId: string) {
  return withClient(async client => {
    const { rows } = await client.query(
      `
        SELECT
          u.*,
          p.display_name,
          p.avatar_url,
          p.extras AS profileExtras
        FROM users u
        LEFT JOIN profiles p ON p.user_uuid = u.user_uuid
        WHERE u.user_uuid = $1
      `,
      [userId],
    );

    if (!rows.length) {
      throw new Error(`Postgres identity ${userId} not found`);
    }

    const identity = rows[0];
    const { rows: providers } = await client.query(
      'SELECT provider, subject, created_at FROM auth_identities WHERE user_uuid = $1',
      [userId],
    );

    return {
      identity,
      providers,
    };
  });
}

function buildScoreCards(records: Array<Record<string, unknown>>): ScoreCard[] {
  return records
    .map(record => {
      const contentId =
        (record.contentId ?? record.content_id ?? record.id ?? record.itemId ?? record.item_id ?? '') as string;
      const createdAt = (record.createdAt ?? record.created_at ?? new Date().toISOString()) as string;
      const modelName = (record.modelName ?? (record.model && typeof record.model === 'object' && 'name' in record.model ? record.model.name : undefined) ?? 'automated-moderation') as string;
      const riskScore = Number(record.riskScore ?? record.score ?? 0);
      const labelSet = Array.isArray(record.labels)
        ? record.labels.map(label => String(label))
        : Array.isArray(record.labelSet)
        ? record.labelSet.map(label => String(label))
        : [];

      const rawDecision = (record.decision ?? record.action ?? 'allow') as string;
      const decision = ['allow', 'flag', 'block'].includes(rawDecision) ? rawDecision : 'allow';

      return {
        content_id: contentId,
        created_at: createdAt,
        model_name: modelName,
        risk_score: Math.min(Math.max(riskScore, 0), 1),
        label_set: labelSet,
        decision: decision as ScoreCard['decision'],
      };
    })
    .filter(card => Boolean(card.content_id));
}

function extractMediaPaths(records: Array<Record<string, unknown>>): string[] {
  const mediaKeys = ['media', 'blobPath', 'imageUrls', 'asset', 'attachment'];
  const paths = new Set<string>();

  for (const record of records) {
    for (const key of mediaKeys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        paths.add(value.trim());
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim()) {
            paths.add(item.trim());
          } else if (typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).blobPath === 'string') {
            paths.add(((item as Record<string, unknown>).blobPath as string).trim());
          }
        }
      } else if (typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>).blobPath === 'string') {
        paths.add(((value as Record<string, unknown>).blobPath as string).trim());
      }
    }
  }

  return Array.from(paths);
}

async function buildMediaLinks(paths: string[]): Promise<ExportMediaLink[]> {
  const limited = paths.slice(0, 250);
  return Promise.all(
    limited.map(async blobPath => {
      const { url, expiresAt } = await createUserDelegationUrl(blobPath, DSR_TTL_HOURS);
      return {
        blobPath,
        sasUrl: url,
        expiresAt,
      };
    }),
  );
}

export async function runExportJob(request: DsrRequest, context: InvocationContext): Promise<void> {
  const requestId = request.id;
  const startTime = new Date().toISOString();

  await patchDsrRequest(
    requestId,
    {
      status: 'running',
      startedAt: startTime,
      attempt: request.attempt + 1,
    },
    createAuditEntry({ by: 'system', event: 'export.started' }),
  );

  let identityData;
  try {
    emitSpan(context, 'export.fetch', { userId: request.userId });
    identityData = await fetchIdentity(request.userId);

    // Fetch all user data in parallel for performance
    const [
      posts,
      comments,
      likes,
      moderationRecords,
      flags,
      appeals,
      appealVotes,
      moderationDecisionsOnContent,
    ] = await Promise.all([
      fetchPosts(request.userId),
      fetchComments(request.userId),
      fetchLikes(request.userId),
      fetchModeration(request.userId),
      fetchFlags(request.userId),
      fetchAppeals(request.userId),
      fetchAppealVotes(request.userId),
      fetchModerationDecisionsOnUserContent(request.userId),
    ]);

    // Sanitize all data (remove sensitive internal fields)
    const sanitizedIdentity = redactRecord(identityData.identity);
    const sanitizedProviders = identityData.providers.map(provider => redactRecord(provider));
    const sanitizedPosts = posts.map(post => redactRecord(post));
    const sanitizedComments = comments.map(comment => redactRecord(comment));
    const sanitizedLikes = likes.map(like => redactRecord(like));
    const sanitizedModeration = moderationRecords.map(entry => redactRecord(entry));
    const sanitizedFlags = flags.map(flag => redactRecord(flag));
    const sanitizedAppeals = appeals.map(appeal => redactRecord(appeal));
    const sanitizedAppealVotes = appealVotes.map(vote => redactRecord(vote));
    const sanitizedModerationDecisions = moderationDecisionsOnContent.map(d => redactRecord(d));

    const scoreCards = buildScoreCards(sanitizedModeration);
    const mediaLinks = await buildMediaLinks(extractMediaPaths(sanitizedPosts));

    emitSpan(context, 'export.package', { requestId });
    const packageResult = await packageExportZip({
      requestId,
      identity: {
        profile: sanitizedIdentity,
        providers: sanitizedProviders,
      },
      posts: sanitizedPosts,
      comments: sanitizedComments,
      likes: sanitizedLikes,
      moderation: sanitizedModeration,
      scoreCards,
      mediaLinks,
      // D1: Include interactions & moderation data
      flags: sanitizedFlags,
      appeals: sanitizedAppeals,
      appealVotes: sanitizedAppealVotes,
      moderationDecisions: sanitizedModerationDecisions,
    });

    await patchDsrRequest(
      requestId,
      {
        status: 'awaiting_review',
        exportBlobPath: packageResult.blobPath,
        exportBytes: packageResult.exportBytes,
        completedAt: new Date().toISOString(),
        failureReason: undefined,
      },
      createAuditEntry({ by: 'system', event: 'export.uploaded' }),
    );
    emitSpan(context, 'export.upload', { blobPath: packageResult.blobPath, bytes: packageResult.exportBytes });
  } catch (error: unknown) {
    const failureReason = getErrorMessage(error);
    await patchDsrRequest(
      requestId,
      {
        status: 'failed',
        failureReason,
        completedAt: new Date().toISOString(),
      },
      createAuditEntry({ by: 'system', event: 'export.failed', meta: { reason: failureReason } }),
    );
    emitSpan(context, 'export.error', { reason: failureReason });
    throw error;
  }
}
