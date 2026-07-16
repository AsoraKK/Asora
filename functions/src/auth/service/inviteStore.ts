/**
 * Invite Store
 *
 * Manages invite codes for alpha access control.
 * New invites store only a peppered code hash. The plaintext code is returned
 * once at creation and is never written to Cosmos, logs, analytics, or audit.
 *
 * Schema:
 *   id: string (peppered invite-code hash)
 *   inviteId: string (opaque administrative identifier)
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
 *   _partitionKey: string (same as the code hash)
 */

import type { Container } from '@azure/cosmos';
import { getCosmosClient } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { isNotFoundError, getErrorMessage } from '@shared/errorUtils';
import * as crypto from 'crypto';
import { v7 as uuidv7 } from 'uuid';
import {
  assertAlphaFeature,
  reserveAlphaCohortMembership,
  releaseAlphaCohortMembership,
} from '@alpha/alphaConfig';
import { HttpError } from '@shared/utils/errors';
import { trackAppEvent } from '@shared/appInsights';

const logger = getAzureLogger('auth/inviteStore');

export interface InviteDocument {
  id: string;
  inviteId?: string;
  codeHash?: string;
  /** Legacy documents only. Never set on new invites. */
  inviteCode?: string;
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
  _etag?: string;
}

export type CreatedInvite = InviteDocument & {
  inviteId: string;
  codeHash: string;
  inviteCode: string;
};

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

function getInvitePepper(): string {
  const pepper = process.env.INVITE_CODE_PEPPER;
  if (pepper && pepper.length >= 32) {
    return pepper;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test-only-invite-pepper-32-bytes-minimum';
  }
  throw new Error('INVITE_CODE_PEPPER must be configured with at least 32 characters');
}

function hashInviteCode(inviteCode: string): string {
  return crypto
    .createHmac('sha256', getInvitePepper())
    .update(inviteCode.toUpperCase().trim())
    .digest('hex');
}

function inviteIdentifier(invite: InviteDocument): string {
  return invite.inviteId || invite.id;
}

async function countActiveInvites(): Promise<number> {
  const container = getInvitesContainer();
  const now = new Date().toISOString();
  const { resources } = await container.items
    .query<number>({
      query: `SELECT VALUE COUNT(1) FROM c
              WHERE (NOT IS_DEFINED(c.revokedAt) OR c.revokedAt = null)
                AND c.expiresAt > @now
                AND (NOT IS_DEFINED(c.usageCount) OR c.usageCount < c.maxUses)`,
      parameters: [{ name: '@now', value: now }],
    })
    .fetchAll();
  return typeof resources[0] === 'number' ? resources[0] : 0;
}

export async function assertInviteCreationCapacity(requested = 1): Promise<void> {
  const alpha = await assertAlphaFeature('registrations');
  const activeInvites = await countActiveInvites();
  if (activeInvites + requested > alpha.maxActiveInvites) {
    throw new HttpError(409, 'Maximum active Alpha invite count reached');
  }
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

export function isInviteActive(invite: InviteDocument): boolean {
  if (invite.revokedAt) {
    return false;
  }
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return false;
  }
  return !isInviteExhausted(invite);
}

/**
 * Create a new invite code.
 */
export async function createInvite(options: CreateInviteOptions): Promise<CreatedInvite> {
  await assertInviteCreationCapacity(1);
  const alpha = await assertAlphaFeature('registrations');
  const container = getInvitesContainer();

  const inviteCode = generateInviteCode();
  const codeHash = hashInviteCode(inviteCode);
  const inviteId = uuidv7();
  const now = new Date();
  const expiresInDays = Math.min(options.expiresInDays ?? alpha.inviteExpiryDays, alpha.inviteExpiryDays);
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const maxUses = Number.isFinite(options.maxUses) ? Math.max(1, Math.floor(options.maxUses as number)) : 1;

  const invite: InviteDocument = {
    id: codeHash,
    inviteId,
    codeHash,
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
    _partitionKey: codeHash,
  };

  await container.items.create(invite);

  logger.info('Invite created', {
    inviteId,
    emailRestricted: Boolean(options.email),
    createdBy: options.createdBy,
    expiresAt: expiresAt.toISOString(),
  });

  return { ...invite, inviteId, codeHash, inviteCode };
}

/**
 * Get an invite by code.
 */
export async function getInvite(inviteCode: string): Promise<InviteDocument | null> {
  const container = getInvitesContainer();
  const normalizedCode = inviteCode.toUpperCase().trim();
  const codeHash = hashInviteCode(normalizedCode);

  try {
    const { resource } = await container.item(codeHash, codeHash).read<InviteDocument>();
    return resource ?? null;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      try {
        // Temporary compatibility path for pre-hash Alpha invite documents.
        const { resource } = await container
          .item(normalizedCode, normalizedCode)
          .read<InviteDocument>();
        return resource ?? null;
      } catch (legacyError: unknown) {
        if (isNotFoundError(legacyError)) {
          return null;
        }
        throw legacyError;
      }
    }
    throw error;
  }
}

/**
 * Administrative lookup by opaque invite ID. Plaintext invite codes must never
 * be placed in an admin URL, access log, analytic event, or audit subject.
 */
export async function getInviteById(inviteId: string): Promise<InviteDocument | null> {
  const container = getInvitesContainer();
  const normalizedId = inviteId.trim();
  if (!normalizedId) return null;

  const { resources } = await container.items
    .query<InviteDocument>({
      query: 'SELECT * FROM c WHERE c.inviteId = @inviteId',
      parameters: [{ name: '@inviteId', value: normalizedId }],
    }, { maxItemCount: 1 })
    .fetchAll();
  return resources[0] ?? null;
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
    logger.warn('Invite validation failed: not found');
    return { valid: false, reason: 'not_found' };
  }

  if (invite.revokedAt) {
    logger.warn('Invite validation failed: revoked', {
      inviteId: inviteIdentifier(invite),
      revokedAt: invite.revokedAt,
    });
    return { valid: false, reason: 'revoked' };
  }

  if (new Date(invite.expiresAt) < new Date()) {
    logger.warn('Invite validation failed: expired', {
      inviteId: inviteIdentifier(invite),
      expiresAt: invite.expiresAt,
    });
    return { valid: false, reason: 'expired' };
  }

  if (isInviteExhausted(invite)) {
    const maxUses = resolveMaxUses(invite);
    const reason = maxUses === 1 ? 'already_used' : 'exhausted';
    logger.warn('Invite validation failed: exhausted', {
      inviteId: inviteIdentifier(invite),
      usageCount: invite.usageCount,
      maxUses,
    });
    return { valid: false, reason };
  }

  // Check email restriction if set
  if (invite.email && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    logger.warn('Invite validation failed: email mismatch', {
      inviteId: inviteIdentifier(invite),
      emailRestricted: true,
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
  const inviteId = inviteIdentifier(validation.invite);
  const reservation = await reserveAlphaCohortMembership(options.userId, inviteId);

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

    const { resource: updated } = await container
      .item(validation.invite.id, validation.invite._partitionKey)
      .patch<InviteDocument>(patchOps);

    logger.info('Invite redeemed', {
      inviteId,
      userId: options.userId,
    });

    trackAppEvent({
      name: 'alpha_invite_redeemed',
      properties: {
        cohortCount: reservation.count,
        cohortCap: reservation.cap,
        insertedMembership: reservation.inserted,
        maxUses,
        exhausted: nextUsageCount >= maxUses,
      },
    });

    return { success: true, invite: updated! };
  } catch (error) {
    if (reservation.inserted) {
      await releaseAlphaCohortMembership(options.userId).catch(() => undefined);
    }
    logger.error('Failed to redeem invite', { inviteId, error: getErrorMessage(error) });
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
  const invite = await getInvite(inviteCode);
  if (!invite) {
    return false;
  }

  try {
    await container.item(invite.id, invite._partitionKey).patch([
      { op: 'set', path: '/revokedAt', value: new Date().toISOString() },
      { op: 'set', path: '/revokedBy', value: revokedBy },
    ]);
    logger.info('Invite revoked', { inviteId: inviteIdentifier(invite), revokedBy });
    return true;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

export async function revokeInviteById(inviteId: string, revokedBy: string): Promise<boolean> {
  const container = getInvitesContainer();
  const invite = await getInviteById(inviteId);
  if (!invite) return false;

  try {
    await container.item(invite.id, invite._partitionKey).patch([
      { op: 'set', path: '/revokedAt', value: new Date().toISOString() },
      { op: 'set', path: '/revokedBy', value: revokedBy },
    ]);
    logger.info('Invite revoked', { inviteId: inviteIdentifier(invite), revokedBy });
    return true;
  } catch (error: unknown) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

/**
 * Delete an invite (admin only, for cleanup).
 */
export async function deleteInvite(inviteCode: string): Promise<boolean> {
  const container = getInvitesContainer();
  const invite = await getInvite(inviteCode);
  if (!invite) {
    return false;
  }

  try {
    await container.item(invite.id, invite._partitionKey).delete();
    logger.info('Invite deleted', { inviteId: inviteIdentifier(invite) });
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
