import type { InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';
import { createAuditEntry, DsrRequest, ScoreCard, ExportMediaLink } from '../common/models';
import { emitSpan } from '../common/telemetry';
import { packageExportZip } from '../common/zip';
import { createUserDelegationUrl } from '../common/storage';
import { patchDsrRequest, getDsrRequest } from '../service/dsrStore';
import { redactRecord } from '../common/redaction';

const DSR_TTL_HOURS = Number(process.env.DSR_EXPORT_SIGNED_URL_TTL_HOURS ?? '12');

function makeQuery(filters: string, params: Record<string, unknown>[]) {
  return {
    query: `SELECT * FROM c WHERE ${filters}`,
    parameters: params,
  };
}

async function fetchContainerRecords(containerName: string, filters: string, params: Record<string, unknown>[]) {
  const db = getCosmosDatabase();
  const container = db.container(containerName);
  const iterator = container.items.query(makeQuery(filters, params));
  const { resources } = await iterator.fetchAll();
  return resources;
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
      const modelName = (record.modelName ?? record.model?.name ?? 'automated-moderation') as string;
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

    const [posts, comments, likes, moderationRecords] = await Promise.all([
      fetchPosts(request.userId),
      fetchComments(request.userId),
      fetchLikes(request.userId),
      fetchModeration(request.userId),
    ]);

    const sanitizedIdentity = redactRecord(identityData.identity);
    const sanitizedProviders = identityData.providers.map(provider => redactRecord(provider));
    const sanitizedPosts = posts.map(post => redactRecord(post));
    const sanitizedComments = comments.map(comment => redactRecord(comment));
    const sanitizedLikes = likes.map(like => redactRecord(like));
    const sanitizedModeration = moderationRecords.map(entry => redactRecord(entry));

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
  } catch (error: any) {
    const failureReason = error?.message ?? 'export failed';
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
