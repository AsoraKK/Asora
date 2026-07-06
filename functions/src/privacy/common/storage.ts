import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { QueueServiceClient, QueueClient } from '@azure/storage-queue';
import { Readable } from 'node:stream';

import type { DsrQueueMessage } from './models';

const STORAGE_CONNECTION_STRING = process.env.DSR_EXPORT_STORAGE_CONNECTION_STRING;
const STORAGE_ACCOUNT = process.env.DSR_EXPORT_STORAGE_ACCOUNT;
const QUEUE_NAME = process.env.DSR_QUEUE_NAME ?? 'dsr-requests';
const QUEUE_CONNECTION_SETTING = process.env.DSR_QUEUE_CONNECTION ?? 'DsrQueueStorage';
const CONTAINER_NAME = process.env.DSR_EXPORT_CONTAINER ?? 'dsr-exports';

function parseConnectionStringValue(name: string): string | undefined {
  if (!STORAGE_CONNECTION_STRING) {
    return undefined;
  }

  const prefix = `${name}=`;
  for (const segment of STORAGE_CONNECTION_STRING.split(';')) {
    if (segment.startsWith(prefix)) {
      return segment.slice(prefix.length);
    }
  }

  return undefined;
}

const accountFromConnectionString = parseConnectionStringValue('AccountName');
const accountKeyFromConnectionString = parseConnectionStringValue('AccountKey');
const resolvedStorageAccount = STORAGE_ACCOUNT ?? accountFromConnectionString;

if (!resolvedStorageAccount) {
  throw new Error(
    'DSR_EXPORT_STORAGE_ACCOUNT or DSR_EXPORT_STORAGE_CONNECTION_STRING must be configured.',
  );
}

const validatedStorageAccount: string = resolvedStorageAccount;

const sharedKeyCredential =
  accountKeyFromConnectionString
    ? new StorageSharedKeyCredential(validatedStorageAccount, accountKeyFromConnectionString)
    : null;

const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
  `https://${validatedStorageAccount}.blob.core.windows.net`,
  credential,
);

function resolveQueueServiceUri(): string {
  const queueServiceUriSetting = process.env[`${QUEUE_CONNECTION_SETTING}__queueServiceUri`]?.trim();
  if (queueServiceUriSetting) {
    return queueServiceUriSetting.replace(/\/+$/, '');
  }
  return `https://${validatedStorageAccount}.queue.core.windows.net`;
}

const queueServiceUri = resolveQueueServiceUri();
const queueServiceClient = new QueueServiceClient(queueServiceUri, credential);

let containerClient: ContainerClient | null = null;
let queueClient: QueueClient | null = null;
let poisonQueueClient: QueueClient | null = null;

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

function getPoisonQueue(): QueueClient {
  if (!poisonQueueClient) {
    poisonQueueClient = queueServiceClient.getQueueClient(`${QUEUE_NAME}-poison`);
  }
  return poisonQueueClient;
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

  const sasOptions = {
    containerName: blobClient.containerName,
    blobName: blobClient.name,
    permissions: BlobSASPermissions.parse('r'),
    startsOn: now,
    expiresOn,
  };

  const sasToken = sharedKeyCredential
    ? generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString()
    : generateBlobSASQueryParameters(
        sasOptions,
        await blobServiceClient.getUserDelegationKey(now, expiresOn),
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

export async function getDsrQueueMonitorSnapshot(): Promise<{
  queueName: string;
  queueConnectionSetting: string;
  queueServiceAccount?: string;
  exportStorageAccount: string;
  approximateMessageCount: number | null;
  poisonQueueName: string;
  poisonApproximateMessageCount: number | null;
  poisonQueueExists: boolean;
}> {
  const [queuePropertiesResult, poisonPropertiesResult] = await Promise.allSettled([
    getQueue().getProperties(),
    getPoisonQueue().getProperties(),
  ]);

  const diagnostics = getDsrQueueDiagnostics();
  const poisonQueueName = `${QUEUE_NAME}-poison`;
  const poisonQueueExists = poisonPropertiesResult.status === 'fulfilled';

  return {
    ...diagnostics,
    approximateMessageCount:
      queuePropertiesResult.status === 'fulfilled'
        ? queuePropertiesResult.value.approximateMessagesCount ?? null
        : null,
    poisonQueueName,
    poisonApproximateMessageCount:
      poisonPropertiesResult.status === 'fulfilled'
        ? poisonPropertiesResult.value.approximateMessagesCount ?? null
        : null,
    poisonQueueExists,
  };
}

export function getDsrQueueDiagnostics(): {
  queueName: string;
  queueConnectionSetting: string;
  queueServiceAccount?: string;
  exportStorageAccount: string;
} {
  let queueServiceAccount: string | undefined;
  try {
    queueServiceAccount = new URL(queueServiceUri).hostname.split('.')[0];
  } catch {
    queueServiceAccount = undefined;
  }

  return {
    queueName: QUEUE_NAME,
    queueConnectionSetting: QUEUE_CONNECTION_SETTING,
    queueServiceAccount,
    exportStorageAccount: validatedStorageAccount,
  };
}
