import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  BlockBlobClient,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { QueueServiceClient, QueueClient } from '@azure/storage-queue';
import { Readable } from 'node:stream';

import type { DsrQueueMessage } from './models';

const STORAGE_ACCOUNT = process.env.DSR_EXPORT_STORAGE_ACCOUNT;
const QUEUE_NAME = process.env.DSR_QUEUE_NAME ?? 'dsr-requests';
const CONTAINER_NAME = process.env.DSR_EXPORT_CONTAINER ?? 'dsr-exports';

if (!STORAGE_ACCOUNT) {
  throw new Error('DSR_EXPORT_STORAGE_ACCOUNT must be configured.');
}

// TypeScript knows STORAGE_ACCOUNT is defined after the check above
const validatedStorageAccount = STORAGE_ACCOUNT!;

const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
  `https://${validatedStorageAccount}.blob.core.windows.net`,
  credential,
);
const queueServiceClient = new QueueServiceClient(
  `https://${validatedStorageAccount}.queue.core.windows.net`,
  credential,
);

let containerClient: ContainerClient | null = null;
let queueClient: QueueClient | null = null;

function getExportContainer(): ContainerClient {
  if (!containerClient) {
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  }
  return containerClient;
}

function getQueue(): QueueClient {
  if (!queueClient) {
    queueClient = queueServiceClient.getQueueClient(QUEUE_NAME);
  }
  return queueClient;
}

export function getBlobClient(path: string): BlockBlobClient {
  return getExportContainer().getBlockBlobClient(path);
}

export async function uploadStreamToExport(blobPath: string, stream: Readable): Promise<number> {
  const blobClient = getBlobClient(blobPath);
  const bufferSize = Number(process.env.DSR_BLOB_UPLOAD_BUFFER_SIZE ?? '4194304'); // 4MiB
  const maxConcurrency = Number(process.env.DSR_BLOB_UPLOAD_CONCURRENCY ?? '5');
  await blobClient.uploadStream(stream, bufferSize, maxConcurrency);
  const properties = await blobClient.getProperties();
  return Number(properties.contentLength ?? 0);
}

export async function createUserDelegationUrl(
  blobPath: string,
  ttlHours: number,
): Promise<{ url: string; expiresAt: string }> {
  const blobClient = getBlobClient(blobPath);
  const now = new Date();
  const expiresOn = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  const key = await blobServiceClient.getUserDelegationKey(now, expiresOn);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: blobClient.containerName,
      blobName: blobClient.name,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: now,
      expiresOn,
    },
    key,
    validatedStorageAccount,
  ).toString();

  return {
    url: `${blobClient.url}?${sasToken}`,
    expiresAt: expiresOn.toISOString(),
  };
}

export async function enqueueDsrMessage(message: DsrQueueMessage): Promise<void> {
  const queue = getQueue();
  await queue.sendMessage(JSON.stringify(message));
}
