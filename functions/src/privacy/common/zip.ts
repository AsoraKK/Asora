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

  archive.append(JSON.stringify(payload.identity ?? {}, null, 2), { name: 'identity.json' });
  archive.append(toJsonLines(payload.posts), { name: 'posts.jsonl' });
  archive.append(toJsonLines(payload.comments), { name: 'comments.jsonl' });
  archive.append(toJsonLines(payload.likes), { name: 'likes.jsonl' });
  archive.append(toJsonLines(payload.moderation), { name: 'moderation.jsonl' });
  archive.append(toJsonLines(payload.scoreCards), { name: 'ai_scorecard.jsonl' });
  archive.append(toJsonLines(payload.mediaLinks), { name: 'media_links.jsonl' });

  await archive.finalize();
  const exportBytes = await uploadPromise;

  return {
    blobPath,
    exportBytes,
  };
}
