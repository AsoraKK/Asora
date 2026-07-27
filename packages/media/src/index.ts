import { AwsClient } from 'aws4fetch';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function createPresignedPutUrl(input: {
  accountId: string;
  bucket: string;
  key: string;
  contentType: AllowedImageType;
  accessKeyId: string;
  secretAccessKey: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; expiresAt: string }> {
  const expiresInSeconds = input.expiresInSeconds ?? 600;
  const endpoint = new URL(`https://${input.accountId}.r2.cloudflarestorage.com/${input.bucket}/${input.key}`);
  endpoint.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
  const client = new AwsClient({
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const request = new Request(endpoint, {
    method: 'PUT',
    headers: { 'content-type': input.contentType },
  });
  const signed = await client.sign(request, { aws: { signQuery: true } });
  return {
    url: signed.url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}
