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
 *   usedAt: string | null (ISO timestamp when redeemed)
 *   usedByUserId: string | null (userId who redeemed)
 *   _partitionKey: string (same as inviteCode)
 */

import type { Container } from '@azure/cosmos';
import { getCosmosClient } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import * as crypto from 'crypto';

const logger = getAzureLogger('auth/inviteStore');

export interface InviteDocument {
  id: string;
  inviteCode: string;
  email: string | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByUserId: string | null;
  _partitionKey: string;
}

export interface CreateInviteOptions {
  email?: string;
  createdBy: string;
  expiresInDays?: number;
}

export interface RedeemInviteOptions {
  inviteCode: string;
  userId: string;
  userEmail: string;
}

export type InviteValidationResult =
  | { valid: true; invite: InviteDocument }
  | { valid: false; reason: 'not_found' | 'expired' | 'already_used' | 'email_mismatch' };

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

/**
 * Create a new invite code.
 */
export async function createInvite(options: CreateInviteOptions): Promise<InviteDocument> {
  const container = getInvitesContainer();

  const inviteCode = generateInviteCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (options.expiresInDays ?? 30) * 24 * 60 * 60 * 1000);

  const invite: InviteDocument = {
    id: inviteCode,
    inviteCode,
    email: options.email?.toLowerCase() || null,
    createdBy: options.createdBy,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    usedByUserId: null,
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
  } catch (error: any) {
    if (error.code === 404) {
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

  if (invite.usedAt) {
    logger.warn('Invite validation failed: already used', { inviteCode, usedByUserId: invite.usedByUserId });
    return { valid: false, reason: 'already_used' };
  }

  if (new Date(invite.expiresAt) < new Date()) {
    logger.warn('Invite validation failed: expired', { inviteCode, expiresAt: invite.expiresAt });
    return { valid: false, reason: 'expired' };
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
    // Mark invite as used
    const { resource: updated } = await container.item(normalizedCode, normalizedCode).patch<InviteDocument>([
      { op: 'add', path: '/usedAt', value: new Date().toISOString() },
      { op: 'add', path: '/usedByUserId', value: options.userId },
    ]);

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
    query += ' AND c.usedAt = null';
  }

  query += ' ORDER BY c.createdAt DESC';

  const limit = Math.min(options?.limit ?? 100, 1000);

  const { resources } = await container.items
    .query<InviteDocument>({ query, parameters }, { maxItemCount: limit })
    .fetchAll();

  return resources;
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
  } catch (error: any) {
    if (error.code === 404) {
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
