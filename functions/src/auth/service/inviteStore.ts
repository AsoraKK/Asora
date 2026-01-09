/**
 * Invite Store
 *
 * Manages invite codes for alpha access control.
 * Invites are stored in Cosmos DB with unique codes.
 *
 * Schema:
 *   id: string (same as inviteCode for simplicity)
 *   inviteCode: string (8-char alphanumeric, unique)
 *   email: string | null (optional - if set, only this email can use it)
 *   createdBy: string (admin userId who created it)
 *   createdAt: string (ISO timestamp)
 *   expiresAt: string (ISO timestamp)
 *   maxUses: number
 *   usageCount: number
 *   lastUsedAt: string | null
 *   usedAt: string | null (legacy single-use)
 *   usedByUserId: string | null (legacy single-use)
 *   revokedAt: string | null
 *   revokedBy: string | null
 *   label: string | null
 *   _partitionKey: string (same as inviteCode)
 */

import type { Container } from '@azure/cosmos';
import { getCosmosClient } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { isNotFoundError, getErrorMessage } from '@shared/errorUtils';
import * as crypto from 'crypto';

const logger = getAzureLogger('auth/inviteStore');

export interface InviteDocument {
  id: string;
  inviteCode: string;
  email: string | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usageCount: number;
  lastUsedAt: string | null;
  usedAt: string | null;
  usedByUserId: string | null;
  revokedAt: string | null;
  revokedBy?: string | null;
  label?: string | null;
  _partitionKey: string;
}

export interface CreateInviteOptions {
  email?: string;
  createdBy: string;
  expiresInDays?: number;
  maxUses?: number;
  label?: string;
}

export interface RedeemInviteOptions {
  inviteCode: string;
  userId: string;
  userEmail: string;
}

export type InviteValidationResult =
  | { valid: true; invite: InviteDocument }
  | { valid: false; reason: 'not_found' | 'expired' | 'already_used' | 'email_mismatch' | 'revoked' | 'exhausted' };

let cachedContainer: Container | null = null;

function getInvitesContainer(): Container {
  if (cachedContainer) {
    return cachedContainer;
  }

  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  const database = client.database(databaseName);

  cachedContainer = database.container('invites');
  return cachedContainer;
}

/**
 * Generate a unique 8-character alphanumeric invite code.
 * Format: XXXX-XXXX (e.g., "A3K9-B7M2")
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars: 0, O, 1, I
  const part1 = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `${part1}-${part2}`;
}

function resolveMaxUses(invite: InviteDocument): number {
  if (typeof invite.maxUses === 'number' && Number.isFinite(invite.maxUses)) {
    return Math.max(1, Math.floor(invite.maxUses));
  }
  return 1;
}

function resolveUsageCount(invite: InviteDocument): number {
  if (typeof invite.usageCount === 'number' && Number.isFinite(invite.usageCount)) {
    const normalized = Math.max(0, Math.floor(invite.usageCount));
    return Math.max(normalized, invite.usedAt ? 1 : 0);
  }
  return invite.usedAt ? 1 : 0;
}

function isInviteExhausted(invite: InviteDocument): boolean {
  const maxUses = resolveMaxUses(invite);
  const usageCount = resolveUsageCount(invite);
  return usageCount >= maxUses;
}

/**
 * Create a new invite code.
 */
export async function createInvite(options: CreateInviteOptions): Promise<InviteDocument> {
  const container = getInvitesContainer();

  const inviteCode = generateInviteCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (options.expiresInDays ?? 30) * 24 * 60 * 60 * 1000);
  const maxUses = Number.isFinite(options.maxUses) ? Math.max(1, Math.floor(options.maxUses as number)) : 1;

  const invite: InviteDocument = {
    id: inviteCode,
    inviteCode,
    email: options.email?.toLowerCase() || null,
    createdBy: options.createdBy,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    maxUses,
    usageCount: 0,
    lastUsedAt: null,
    usedAt: null,
    usedByUserId: null,
    revokedAt: null,
    revokedBy: null,
    label: options.label?.trim() || null,
    _partitionKey: inviteCode,
  };

  await container.items.create(invite);

  logger.info('Invite created', {
    inviteCode,
    email: options.email ?? 'any',
    createdBy: options.createdBy,
    expiresAt: expiresAt.toISOString(),
  });

  return invite;
}

/**
 * Get an invite by code.
 */
export async function getInvite(inviteCode: string): Promise<InviteDocument | null> {
  const container = getInvitesContainer();
  const normalizedCode = inviteCode.toUpperCase().trim();

  try {
    const { resource } = await container.item(normalizedCode, normalizedCode).read<InviteDocument>();
    return resource ?? null;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Validate an invite code for a specific user.
 */
export async function validateInvite(
  inviteCode: string,
  userEmail: string
): Promise<InviteValidationResult> {
  const invite = await getInvite(inviteCode);

  if (!invite) {
    logger.warn('Invite validation failed: not found', { inviteCode });
    return { valid: false, reason: 'not_found' };
  }

  if (invite.revokedAt) {
    logger.warn('Invite validation failed: revoked', { inviteCode, revokedAt: invite.revokedAt });
    return { valid: false, reason: 'revoked' };
  }

  if (new Date(invite.expiresAt) < new Date()) {
    logger.warn('Invite validation failed: expired', { inviteCode, expiresAt: invite.expiresAt });
    return { valid: false, reason: 'expired' };
  }

  if (isInviteExhausted(invite)) {
    const maxUses = resolveMaxUses(invite);
    const reason = maxUses === 1 ? 'already_used' : 'exhausted';
    logger.warn('Invite validation failed: exhausted', { inviteCode, usageCount: invite.usageCount, maxUses });
    return { valid: false, reason };
  }

  // Check email restriction if set
  if (invite.email && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    logger.warn('Invite validation failed: email mismatch', {
      inviteCode,
      expectedEmail: invite.email,
      providedEmail: userEmail,
    });
    return { valid: false, reason: 'email_mismatch' };
  }

  return { valid: true, invite };
}

/**
 * Redeem an invite code for a user.
 * Marks the invite as used and returns success/failure.
 */
export async function redeemInvite(
  options: RedeemInviteOptions
): Promise<{ success: true; invite: InviteDocument } | { success: false; reason: string }> {
  const validation = await validateInvite(options.inviteCode, options.userEmail);

  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  const container = getInvitesContainer();
  const normalizedCode = options.inviteCode.toUpperCase().trim();

  try {
    const nowIso = new Date().toISOString();
    const maxUses = resolveMaxUses(validation.invite);
    const usageCount = resolveUsageCount(validation.invite);
    const nextUsageCount = usageCount + 1;

    const patchOps: import('@azure/cosmos').PatchOperation[] = [
      { op: 'set' as const, path: '/usageCount', value: nextUsageCount },
      { op: 'set' as const, path: '/lastUsedAt', value: nowIso },
      { op: 'set' as const, path: '/usedByUserId', value: options.userId },
    ];

    if (nextUsageCount >= maxUses) {
      patchOps.push({ op: 'set' as const, path: '/usedAt', value: nowIso });
    }

    const { resource: updated } = await container.item(normalizedCode, normalizedCode).patch<InviteDocument>(patchOps);

    logger.info('Invite redeemed', {
      inviteCode: normalizedCode,
      userId: options.userId,
      userEmail: options.userEmail,
    });

    return { success: true, invite: updated! };
  } catch (error) {
    logger.error('Failed to redeem invite', { inviteCode: normalizedCode, error });
    return { success: false, reason: 'internal_error' };
  }
}

/**
 * List invites with optional filters.
 */
export async function listInvites(options?: {
  createdBy?: string;
  unused?: boolean;
  limit?: number;
}): Promise<InviteDocument[]> {
  const container = getInvitesContainer();

  let query = 'SELECT * FROM c WHERE 1=1';
  const parameters: { name: string; value: any }[] = [];

  if (options?.createdBy) {
    query += ' AND c.createdBy = @createdBy';
    parameters.push({ name: '@createdBy', value: options.createdBy });
  }

  if (options?.unused) {
    query += ' AND (NOT IS_DEFINED(c.usageCount) OR c.usageCount = 0) AND (NOT IS_DEFINED(c.usedAt) OR c.usedAt = null)';
  }

  query += ' ORDER BY c.createdAt DESC';

  const limit = Math.min(options?.limit ?? 100, 1000);

  const { resources } = await container.items
    .query<InviteDocument>({ query, parameters }, { maxItemCount: limit })
    .fetchAll();

  return resources;
}

export async function listInvitesPage(options?: {
  createdBy?: string;
  unused?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<{ items: InviteDocument[]; continuationToken: string | null }> {
  const container = getInvitesContainer();

  let query = 'SELECT * FROM c WHERE 1=1';
  const parameters: { name: string; value: any }[] = [];

  if (options?.createdBy) {
    query += ' AND c.createdBy = @createdBy';
    parameters.push({ name: '@createdBy', value: options.createdBy });
  }

  if (options?.unused) {
    query += ' AND (NOT IS_DEFINED(c.usageCount) OR c.usageCount = 0) AND (NOT IS_DEFINED(c.usedAt) OR c.usedAt = null)';
  }

  query += ' ORDER BY c.createdAt DESC';

  const limit = Math.min(options?.limit ?? 100, 1000);

  const response = await container.items.query<InviteDocument>(
    { query, parameters },
    { maxItemCount: limit, continuationToken: options?.cursor }
  ).fetchNext();

  return {
    items: response.resources,
    continuationToken: response.continuationToken ?? null,
  };
}

export async function revokeInvite(inviteCode: string, revokedBy: string): Promise<boolean> {
  const container = getInvitesContainer();
  const normalizedCode = inviteCode.toUpperCase().trim();

  try {
    await container.item(normalizedCode, normalizedCode).patch([
      { op: 'set', path: '/revokedAt', value: new Date().toISOString() },
      { op: 'set', path: '/revokedBy', value: revokedBy },
    ]);
    logger.info('Invite revoked', { inviteCode: normalizedCode, revokedBy });
    return true;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Delete an invite (admin only, for cleanup).
 */
export async function deleteInvite(inviteCode: string): Promise<boolean> {
  const container = getInvitesContainer();
  const normalizedCode = inviteCode.toUpperCase().trim();

  try {
    await container.item(normalizedCode, normalizedCode).delete();
    logger.info('Invite deleted', { inviteCode: normalizedCode });
    return true;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Cleanup expired invites (for periodic maintenance).
 */
export async function cleanupExpiredInvites(): Promise<number> {
  const container = getInvitesContainer();
  const now = new Date().toISOString();

  const { resources: expired } = await container.items
    .query<InviteDocument>({
      query: 'SELECT c.id, c._partitionKey FROM c WHERE c.expiresAt < @now AND c.usedAt = null',
      parameters: [{ name: '@now', value: now }],
    })
    .fetchAll();

  let deleted = 0;
  for (const invite of expired) {
    try {
      await container.item(invite.id, invite._partitionKey).delete();
      deleted++;
    } catch {
      // Ignore deletion errors
    }
  }

  if (deleted > 0) {
    logger.info('Expired invites cleaned up', { count: deleted });
  }

  return deleted;
}

// For testing
export function resetInviteContainerCache(): void {
  cachedContainer = null;
}
