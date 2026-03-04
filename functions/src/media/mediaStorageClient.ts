/**
 * Media Storage Client
 *
 * Azure Blob Storage client for user media uploads.
 * Generates write-only SAS URLs via User Delegation Key (Managed Identity).
 *
 * Blob path: {userId}/{YYYY-MM-DD}/{uuid}.{ext}
 * Container: user-media
 */

import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { getAzureLogger } from '@shared/utils/logger';

const logger = getAzureLogger('media/mediaStorageClient');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_STORAGE_ACCOUNT = process.env.MEDIA_STORAGE_ACCOUNT;
const MEDIA_CONTAINER = process.env.MEDIA_CONTAINER ?? 'user-media';
const UPLOAD_SAS_TTL_MINUTES = parseInt(process.env.MEDIA_UPLOAD_SAS_TTL_MINUTES ?? '15', 10);

/** Allowed image extensions */
export const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic',
]);

/** Allowed MIME types */
export const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
]);

/** Per-tier max file size in MB */
export const MAX_FILE_SIZE_MB: Record<string, number> = {
  free: 10,
  premium: 25,
  black: 25,
  admin: 50,
};

/** Per-tier max media per post */
export const MAX_MEDIA_PER_POST: Record<string, number> = {
  free: 1,
  premium: 4,
  black: 5,
  admin: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Client initialization (lazy)
// ─────────────────────────────────────────────────────────────────────────────

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

function getStorageAccount(): string {
  if (!MEDIA_STORAGE_ACCOUNT) {
    throw new Error('MEDIA_STORAGE_ACCOUNT environment variable is required for media uploads.');
  }
  return MEDIA_STORAGE_ACCOUNT;
}

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    const account = getStorageAccount();
    const credential = new DefaultAzureCredential();
    blobServiceClient = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      credential,
    );
  }
  return blobServiceClient;
}

function getMediaContainer(): ContainerClient {
  if (!containerClient) {
    containerClient = getBlobServiceClient().getContainerClient(MEDIA_CONTAINER);
  }
  return containerClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadUrlResult {
  /** SAS URL the client should PUT the file to */
  uploadUrl: string;
  /** Final public URL of the blob (no SAS token) */
  blobUrl: string;
  /** ISO timestamp when the SAS URL expires */
  expiresAt: string;
}

export interface MediaOwnershipValidationResult {
  valid: boolean;
  invalidUrls: string[];
  reason?: 'storage_not_configured' | 'invalid_url' | 'ownership_mismatch' | 'blob_missing' | 'blob_stale';
}

/**
 * Extract and validate file extension from a filename.
 */
export function extractExtension(fileName: string): string | null {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return null;
  const ext = fileName.slice(dotIndex + 1).toLowerCase().trim();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

/**
 * Build the blob path for a media upload.
 * Format: {userId}/{YYYY-MM-DD}/{uuid}.{ext}
 */
export function buildBlobPath(userId: string, fileId: string, ext: string): string {
  const date = new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10);
  return `${userId}/${date}/${fileId}.${ext}`;
}

/**
 * Generate a write-only SAS URL for uploading a media file.
 *
 * Uses User Delegation Key (Managed Identity) — no connection strings needed.
 */
export async function generateUploadSasUrl(
  userId: string,
  fileId: string,
  ext: string,
  contentType: string,
): Promise<UploadUrlResult> {
  const account = getStorageAccount();
  const client = getBlobServiceClient();
  const container = getMediaContainer();
  const blobPath = buildBlobPath(userId, fileId, ext);
  const blobClient = container.getBlockBlobClient(blobPath);

  const now = new Date();
  const expiresOn = new Date(now.getTime() + UPLOAD_SAS_TTL_MINUTES * 60 * 1000);

  // Get User Delegation Key (valid for the SAS TTL)
  const delegationKey = await client.getUserDelegationKey(now, expiresOn);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: MEDIA_CONTAINER,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('cw'), // create + write only
      startsOn: now,
      expiresOn,
      contentType,
    },
    delegationKey,
    account,
  ).toString();

  const uploadUrl = `${blobClient.url}?${sasToken}`;
  const blobUrl = blobClient.url; // Public URL without SAS

  logger.info('generateUploadSasUrl.success', {
    userId: userId.slice(0, 8),
    blobPath,
    expiresAt: expiresOn.toISOString(),
  });

  return {
    uploadUrl,
    blobUrl,
    expiresAt: expiresOn.toISOString(),
  };
}

/**
 * Check if MEDIA_STORAGE_ACCOUNT is configured.
 * Useful for graceful degradation if media uploads aren't enabled.
 */
export function isMediaStorageConfigured(): boolean {
  return !!MEDIA_STORAGE_ACCOUNT;
}

function parseBlobPath(url: URL): { container: string; blobName: string; ownerId: string } | null {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 4) {
    return null;
  }

  const container = parts[0] ?? '';
  const ownerId = parts[1] ?? '';
  const blobName = parts.slice(1).join('/');
  if (!container || !ownerId || !blobName) {
    return null;
  }

  return { container, blobName, ownerId };
}

function accountHost(): string | null {
  if (!MEDIA_STORAGE_ACCOUNT) {
    return null;
  }
  return `${MEDIA_STORAGE_ACCOUNT}.blob.core.windows.net`;
}

export function isOwnedMediaBlobUrl(userId: string, mediaUrl: string): boolean {
  const storageHost = accountHost();
  if (!storageHost) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.host.toLowerCase() !== storageHost.toLowerCase()) {
    return false;
  }

  const path = parseBlobPath(parsed);
  if (!path) {
    return false;
  }

  if (path.container !== MEDIA_CONTAINER) {
    return false;
  }

  return path.ownerId === userId;
}

async function blobExistsAndFresh(mediaUrl: string): Promise<{ ok: boolean; stale?: boolean }> {
  let parsed: URL;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    return { ok: false };
  }

  const parsedPath = parseBlobPath(parsed);
  if (!parsedPath) {
    return { ok: false };
  }

  if (parsedPath.container !== MEDIA_CONTAINER) {
    return { ok: false };
  }

  const container = getMediaContainer();
  const blobClient = container.getBlobClient(parsedPath.blobName);
  const exists = await blobClient.exists();
  if (!exists) {
    return { ok: false };
  }

  const maxAgeHours = Number.parseInt(process.env.MEDIA_POST_ATTACH_MAX_AGE_HOURS ?? '24', 10);
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    return { ok: true };
  }

  const props = await blobClient.getProperties();
  const lastModified = props.lastModified?.getTime();
  if (!lastModified) {
    return { ok: true };
  }

  const ageMs = Date.now() - lastModified;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  if (ageMs > maxAgeMs) {
    return { ok: false, stale: true };
  }

  return { ok: true };
}

/**
 * Validate that all media URLs belong to the authenticated user and, when enabled,
 * point to existing recent blobs uploaded to the configured storage account.
 */
export async function validateOwnedMediaUrls(
  userId: string,
  mediaUrls: string[] | undefined
): Promise<MediaOwnershipValidationResult> {
  if (!mediaUrls || mediaUrls.length === 0) {
    return { valid: true, invalidUrls: [] };
  }

  if (!isMediaStorageConfigured()) {
    return {
      valid: false,
      invalidUrls: [...mediaUrls],
      reason: 'storage_not_configured',
    };
  }

  const invalidOwnership = mediaUrls.filter((url) => !isOwnedMediaBlobUrl(userId, url));
  if (invalidOwnership.length > 0) {
    return {
      valid: false,
      invalidUrls: invalidOwnership,
      reason: 'ownership_mismatch',
    };
  }

  const requireBlobExists = process.env.MEDIA_VERIFY_BLOB_ON_POST === 'true';
  if (!requireBlobExists) {
    return { valid: true, invalidUrls: [] };
  }

  const missing: string[] = [];
  let staleFound = false;
  for (const url of mediaUrls) {
    const result = await blobExistsAndFresh(url);
    if (!result.ok) {
      missing.push(url);
      staleFound = staleFound || Boolean(result.stale);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      invalidUrls: missing,
      reason: staleFound ? 'blob_stale' : 'blob_missing',
    };
  }

  return { valid: true, invalidUrls: [] };
}
