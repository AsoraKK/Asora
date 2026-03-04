import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import stableStringify from 'fast-json-stable-stringify';

import { uploadStreamToExport } from './storage';
import type { ExportMediaLink, ScoreCard } from './models';

const ENV_SLUG =
  process.env.DSR_EXPORT_ENVIRONMENT ??
  process.env.AZURE_FUNCTIONS_ENVIRONMENT ??
  process.env.NODE_ENV ??
  'dev';

function buildBlobPath(id: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${ENV_SLUG}/${year}/${month}/${id}.zip`;
}

function toJsonLines(items: Array<Record<string, unknown>>): string {
  if (!items.length) {
    return '';
  }
  return items.map(item => stableStringify(item)).join('\n') + '\n';
}

export interface PackageExportPayload {
  requestId: string;
  identity: Record<string, unknown>;
  posts: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  likes: Array<Record<string, unknown>>;
  moderation: Array<Record<string, unknown>>;
  scoreCards: ScoreCard[];
  mediaLinks: ExportMediaLink[];
  // New fields for D1: interactions & moderation data
  flags?: Array<Record<string, unknown>>;
  appeals?: Array<Record<string, unknown>>;
  appealVotes?: Array<Record<string, unknown>>;
  moderationDecisions?: Array<Record<string, unknown>>;
}

export async function packageExportZip(payload: PackageExportPayload): Promise<{
  blobPath: string;
  exportBytes: number;
}> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  const blobPath = buildBlobPath(payload.requestId);
  const uploadPromise = uploadStreamToExport(blobPath, stream);

  archive.pipe(stream);

  // Core data
  archive.append(JSON.stringify(payload.identity ?? {}, null, 2), { name: 'identity.json' });
  archive.append(toJsonLines(payload.posts), { name: 'posts.jsonl' });
  archive.append(toJsonLines(payload.comments), { name: 'comments.jsonl' });
  archive.append(toJsonLines(payload.likes), { name: 'likes.jsonl' });
  archive.append(toJsonLines(payload.moderation), { name: 'moderation.jsonl' });
  archive.append(toJsonLines(payload.scoreCards as unknown as Record<string, unknown>[]), { name: 'ai_scorecard.jsonl' });
  archive.append(toJsonLines(payload.mediaLinks as unknown as Record<string, unknown>[]), { name: 'media_links.jsonl' });

  // Interactions & moderation data (D1 additions)
  if (payload.flags?.length) {
    archive.append(toJsonLines(payload.flags), { name: 'flags.jsonl' });
  }
  if (payload.appeals?.length) {
    archive.append(toJsonLines(payload.appeals), { name: 'appeals.jsonl' });
  }
  if (payload.appealVotes?.length) {
    archive.append(toJsonLines(payload.appealVotes), { name: 'appeal_votes.jsonl' });
  }
  if (payload.moderationDecisions?.length) {
    archive.append(toJsonLines(payload.moderationDecisions), { name: 'moderation_decisions.jsonl' });
  }

  await archive.finalize();
  const exportBytes = await uploadPromise;

  return {
    blobPath,
    exportBytes,
  };
}
