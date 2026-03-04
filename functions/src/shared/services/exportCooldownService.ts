import type { Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { isNotFoundError } from '@shared/errorUtils';
import { normalizeTier } from './tierLimits';

const COUNTERS_CONTAINER = 'counters';
const EXPORT_COUNTER_TYPE = 'export';
const EXPORT_TTL_SECONDS = 365 * 24 * 60 * 60;

interface ExportCooldownDocument {
  id: string;
  userId: string;
  counterType: typeof EXPORT_COUNTER_TYPE;
  updatedAt: number;
  lastExportAt: number;
  ttl: number;
}

function getCountersContainer(): Container {
  return getCosmosDatabase().container(COUNTERS_CONTAINER);
}

function buildExportId(userId: string): string {
  return `${userId}:export`;
}

export class ExportCooldownActiveError extends Error {
  readonly statusCode = 429;
  readonly payloadCode = 'EXPORT_COOLDOWN_ACTIVE';
  readonly tier: string;
  readonly nextAvailableAt: Date;
  readonly retryAfterSeconds: number;

  constructor(nextAvailableAt: Date, tier: string) {
    super(`Export cooldown active until ${nextAvailableAt.toISOString()}`);
    this.name = 'ExportCooldownActiveError';
    this.tier = tier;
    this.nextAvailableAt = nextAvailableAt;
    this.retryAfterSeconds = Math.max(
      0,
      Math.ceil((nextAvailableAt.getTime() - Date.now()) / 1000)
    );
  }

  toResponse() {
    return {
      code: this.payloadCode,
      tier: this.tier,
      nextAvailableAt: this.nextAvailableAt.toISOString(),
      retryAfterSeconds: this.retryAfterSeconds,
      message: this.message,
    };
  }
}

export async function getLastExportTimestamp(userId: string): Promise<number | null> {
  const container = getCountersContainer();
  const id = buildExportId(userId);

  try {
    const { resource } = await container.item(id, userId).read<ExportCooldownDocument>();
    return resource?.lastExportAt ?? null;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function recordExportTimestamp(userId: string): Promise<void> {
  const container = getCountersContainer();
  const id = buildExportId(userId);
  const now = Date.now();

  const document: ExportCooldownDocument = {
    id,
    userId,
    counterType: EXPORT_COUNTER_TYPE,
    lastExportAt: now,
    updatedAt: now,
    ttl: EXPORT_TTL_SECONDS,
  };

  await container.items.upsert(document, { disableAutomaticIdGeneration: true });
}

export async function enforceExportCooldown(
  userId: string,
  tier: string | undefined | null,
  cooldownDays: number
): Promise<void> {
  if (cooldownDays <= 0) {
    return;
  }

  const normalizedTier = normalizeTier(tier);
  const lastExportAt = await getLastExportTimestamp(userId);
  if (!lastExportAt) {
    return;
  }

  const nextAvailableMs = lastExportAt + cooldownDays * 24 * 60 * 60 * 1000;
  const nextAvailableAt = new Date(nextAvailableMs);

  if (Date.now() < nextAvailableMs) {
    throw new ExportCooldownActiveError(nextAvailableAt, normalizedTier);
  }
}

export const __testing = {
  buildExportId,
};
