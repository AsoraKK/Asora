/**
 * Media Upload URL Endpoint
 *
 * POST /api/media/upload-url
 *
 * Generates a presigned SAS URL for uploading media to Azure Blob Storage.
 * Requires authentication. Validates file type, size, and tier limits.
 *
 * Request body: { fileName: string, contentType: string, fileSizeBytes?: number }
 * Response: { uploadUrl, blobUrl, expiresAt }
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import {
  generateUploadSasUrl,
  extractExtension,
  isMediaStorageConfigured,
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_SIZE_MB,
} from '@media/mediaStorageClient';
import { normalizeTier } from '@shared/services/tierLimits';

interface UploadUrlRequest {
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
}

interface UploadUrlResponse {
  uploadUrl: string;
  blobUrl: string;
  expiresAt: string;
}

export const media_upload_url = httpHandler<UploadUrlRequest, UploadUrlResponse>(async (ctx) => {
  ctx.context.log(`[media_upload_url] Generating upload URL [${ctx.correlationId}]`);

  // Check if media storage is configured
  if (!isMediaStorageConfigured()) {
    return ctx.internalError(new Error('Media uploads are not configured on this server.'));
  }

  try {
    // Require authentication
    const auth = await extractAuthContext(ctx);

    // Validate request body
    if (!ctx.body) {
      return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
    }

    const { fileName, contentType, fileSizeBytes } = ctx.body;

    if (!fileName || typeof fileName !== 'string') {
      return ctx.badRequest('fileName is required', 'INVALID_FILE_NAME');
    }

    if (!contentType || typeof contentType !== 'string') {
      return ctx.badRequest('contentType is required', 'INVALID_CONTENT_TYPE');
    }

    // Validate file extension
    const ext = extractExtension(fileName);
    if (!ext) {
      return ctx.badRequest(
        'File type not allowed. Supported: jpg, jpeg, png, gif, webp, heic',
        'UNSUPPORTED_FILE_TYPE',
      );
    }

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
      return ctx.badRequest(
        `Content type "${contentType}" is not allowed. Use image/jpeg, image/png, image/gif, image/webp, or image/heic.`,
        'UNSUPPORTED_CONTENT_TYPE',
      );
    }

    // Check file size against tier limits
    const tier = normalizeTier(auth.tier);
    const maxSizeMB = MAX_FILE_SIZE_MB[tier] ?? MAX_FILE_SIZE_MB.free ?? 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (fileSizeBytes && fileSizeBytes > maxSizeBytes) {
      return ctx.badRequest(
        `File size ${Math.round(fileSizeBytes / 1024 / 1024)}MB exceeds the ${maxSizeMB}MB limit for ${tier} tier.`,
        'FILE_TOO_LARGE',
        { maxSizeMB, tier },
      );
    }

    // Generate a unique file ID
    const fileId = crypto.randomUUID();

    // Generate SAS upload URL
    const result = await generateUploadSasUrl(
      auth.userId,
      fileId,
      ext,
      contentType.toLowerCase(),
    );

    ctx.context.log('[media_upload_url] Upload URL generated', {
      userId: auth.userId.slice(0, 8),
      tier,
      ext,
      blobUrl: result.blobUrl,
    });

    return ctx.ok(result);
  } catch (error) {
    ctx.context.error(`[media_upload_url] Error: ${error}`, {
      correlationId: ctx.correlationId,
    });

    if (error instanceof Error) {
      if (
        error.message.includes('JWT verification failed') ||
        error.message.includes('Missing Authorization')
      ) {
        return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
      }

      if (error.message.includes('MEDIA_STORAGE_ACCOUNT')) {
        return ctx.internalError(new Error('Media uploads are not available.'));
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('media_upload_url', {
  methods: ['POST'],
  authLevel: 'anonymous', // Auth verified in handler via JWT
  route: 'media/upload-url',
  handler: withRateLimit(media_upload_url, () => getPolicyForFunction('media-upload-url')),
});
