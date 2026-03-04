import type { Container } from '@azure/cosmos';
import { getTargetDatabase } from '@shared/clients/cosmos';

export type AdminContentType = 'post' | 'comment' | 'user';

export interface ContentLookupResult {
  container: Container;
  document: Record<string, unknown>;
  partitionKey: string;
}

export interface DecisionSummary {
  decidedAt?: string;
  configVersionUsed?: number;
  reasonCodes?: string[];
}

// Binary content states: PUBLISHED or BLOCKED only
const BLOCKED_STATES = new Set(['blocked', 'deleted']);

export function mapContentState(status: string | undefined): 'PUBLISHED' | 'BLOCKED' {
  if (!status) {
    return 'PUBLISHED';
  }
  return BLOCKED_STATES.has(status) ? 'BLOCKED' : 'PUBLISHED';
}

export function sanitizePreview(value: string | undefined | null, maxLength = 240): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

export async function fetchContentById(
  contentType: AdminContentType,
  contentId: string
): Promise<ContentLookupResult | null> {
  const db = getTargetDatabase();

  if (contentType === 'post') {
    const container = db.posts;
    const { resource } = await container.item(contentId, contentId).read();
    if (!resource) {
      return null;
    }
    return { container, document: resource as Record<string, unknown>, partitionKey: contentId };
  }

  if (contentType === 'comment') {
    const container = db.posts;
    const { resources } = await container.items
      .query(
        {
          query: 'SELECT TOP 1 * FROM c WHERE c.id = @id AND c.type = "comment"',
          parameters: [{ name: '@id', value: contentId }],
        },
        { maxItemCount: 1 }
      )
      .fetchAll();
    const doc = resources[0] as Record<string, unknown> | undefined;
    if (!doc) {
      return null;
    }
    const partitionKey = String(doc._partitionKey ?? doc.postId ?? contentId);
    return { container, document: doc, partitionKey };
  }

  const container = db.users;
  const { resource } = await container.item(contentId, contentId).read();
  if (!resource) {
    return null;
  }
  return { container, document: resource as Record<string, unknown>, partitionKey: contentId };
}

export function extractPreview(
  contentType: AdminContentType,
  document: Record<string, unknown>
): string | null {
  if (contentType === 'post') {
    const text = (document.content as string | undefined) ?? (document.text as string | undefined);
    return sanitizePreview(text);
  }

  if (contentType === 'comment') {
    return sanitizePreview(document.text as string | undefined);
  }

  const name = (document.displayName as string | undefined) ?? (document.username as string | undefined);
  return sanitizePreview(name, 80);
}

export async function resolveFlagsForContent(
  contentId: string,
  actorId: string
): Promise<number> {
  const db = getTargetDatabase();
  const flags = db.flags;
  const now = new Date().toISOString();

  const { resources } = await flags.items
    .query(
      {
        query: 'SELECT c.id FROM c WHERE c.contentId = @contentId AND c.status = "active"',
        parameters: [{ name: '@contentId', value: contentId }],
      },
      { maxItemCount: 200, partitionKey: contentId }
    )
    .fetchAll();

  let updated = 0;
  for (const flag of resources) {
    await flags.item(flag.id, contentId).patch([
      { op: 'set', path: '/status', value: 'resolved' },
      { op: 'set', path: '/resolvedAt', value: now },
      { op: 'set', path: '/resolvedBy', value: actorId },
    ]);
    updated += 1;
  }

  return updated;
}

export async function getLatestDecisionSummary(contentId: string): Promise<DecisionSummary | null> {
  const db = getTargetDatabase();
  const { resources } = await db.moderationDecisions.items
    .query(
      {
        query: `
          SELECT TOP 1 c.createdAt, c.thresholdsUsed, c.reasonCodes
          FROM c
          WHERE c.itemId = @contentId
          ORDER BY c.createdAt DESC
        `,
        parameters: [{ name: '@contentId', value: contentId }],
      },
      { maxItemCount: 1 }
    )
    .fetchAll();

  const record = resources[0] as Record<string, unknown> | undefined;
  if (!record) {
    return null;
  }

  const thresholds = (record.thresholdsUsed as Record<string, unknown> | undefined) ?? {};
  return {
    decidedAt: record.createdAt as string | undefined,
    configVersionUsed: typeof thresholds.configVersion === 'number' ? thresholds.configVersion : undefined,
    reasonCodes: Array.isArray(record.reasonCodes) ? (record.reasonCodes as string[]) : undefined,
  };
}
