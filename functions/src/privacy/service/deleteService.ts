/**
 * ASORA USER ACCOUNT DELETION ENDPOINT
 *
 * Purpose: GDPR Article 17 (Right to be Forgotten) compliance - Delete user data
 * Security: JWT auth + confirmation header + idempotent operations
 * Features: Complete data scrubbing, content anonymization, audit logging
 * Architecture: Multi-container cleanup with rollback safety
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Database } from '@azure/cosmos';
import { json } from '@shared/utils/http';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import {
  createRateLimiter,
  endpointKeyGenerator,
  userKeyGenerator,
  defaultKeyGenerator,
} from '@shared/utils/rateLimiter';
import { getErrorMessage, isNotFoundError, getErrorStatusCode } from '@shared/errorUtils';
import { executeCascadeDelete } from './cascadeDelete';
import { revokeAllUserTokens } from '@auth/service/refreshTokenStore';

// Rate limiter for deletion requests (safety measure - 1 per hour)
const deleteRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1,
  // Be resilient to test mocks that don't export endpointKeyGenerator
  keyGenerator: ((): ((req: HttpRequest) => string) => {
    if (typeof endpointKeyGenerator === 'function') {
      return endpointKeyGenerator('privacy_delete');
    }
    return (req: HttpRequest) => {
      const userKey =
        typeof userKeyGenerator === 'function' ? userKeyGenerator(req) : defaultKeyGenerator(req);
      return `privacy_delete:${userKey}`;
    };
  })(),
});

interface HttpError {
  status: number;
  message: string;
  body?: unknown;
}

const isHttpError = (error: unknown): error is HttpError =>
  typeof (error as { status?: unknown })?.status === 'number';

interface DeleteUserParams {
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
}

export async function deleteUserHandler({
  request,
  context,
  userId,
}: DeleteUserParams): Promise<HttpResponseInit> {
  let database: Database | null = null;
  const deletionId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  context.log(`Account deletion request received - Deletion ID: ${deletionId}`);

  try {
    if (!userId) {
      return json(401, { error: 'Unauthorized' });
    }

    // 2. Confirmation header check (safety mechanism)
    const confirmHeader = request.headers.get('X-Confirm-Delete');
    if (confirmHeader !== 'true') {
      context.log(`Deletion attempted without confirmation header for user: ${userId}`);
      return json(400, {
        code: 'confirmation_required',
        message: 'Account deletion requires X-Confirm-Delete header set to "true"',
      });
    }

    // 3. Rate limiting check (additional safety)
    const rateLimitResult = await deleteRateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      context.log(`Deletion rate limited for user: ${userId}`);
      return json(429, {
        code: 'rate_limit_exceeded',
        message: 'Account deletion is limited to prevent abuse. Please try again later.',
        resetTime: rateLimitResult.resetTime,
      });
    }

    // 4. Initialize Cosmos DB and check idempotency
    const activeDatabase = getCosmosDatabase();
    database = activeDatabase;

    const usersContainer = activeDatabase.container('users');

    // 5. Check if user exists first (idempotent check)
    try {
      const { resource: existingUser } = await usersContainer.item(userId, userId).read();
      if (!existingUser) {
        return json(200, {
          message: 'Account deletion completed (user already deleted)',
          userId,
          deletionId,
          deletedAt: new Date().toISOString(),
          alreadyDeleted: true,
        });
      }
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return json(200, {
          message: 'Account deletion completed (user already deleted)',
          userId,
          deletionId,
          deletedAt: new Date().toISOString(),
          alreadyDeleted: true,
        });
      }
      // Non-fatal – proceed with deletion even if we cannot confirm existence
      context.log('privacy.delete.idempotency_check_failed', { deletionId });
    }

    // 6. Cascade delete: Cosmos containers + Postgres (auth_identities, profiles, follows, users)
    const cascadeResult = await executeCascadeDelete({
      userId,
      deletedBy: 'user_request',
    });

    // 7. Revoke all active refresh tokens / sessions
    let revokedTokenCount = 0;
    try {
      revokedTokenCount = await revokeAllUserTokens(userId);
    } catch (tokenErr) {
      // Non-fatal – log for follow-up but do not fail the deletion
      context.log('privacy.delete.token_revocation_failed', { deletionId });
      cascadeResult.errors.push({
        container: 'refresh_tokens',
        error: `Token revocation failed: ${getErrorMessage(tokenErr)}`,
      });
    }

    // 8. Log comprehensive deletion audit (no PII – userId only, no email/JWT)
    context.log('privacy.delete.completed', {
      deletionId,
      cosmosDeleted: Object.values(cascadeResult.cosmos.deleted).reduce((a, b) => a + b, 0),
      cosmosAnonymized: Object.values(cascadeResult.cosmos.anonymized).reduce((a, b) => a + b, 0),
      postgresDeleted: Object.values(cascadeResult.postgres.deleted).reduce((a, b) => a + b, 0),
      revokedTokens: revokedTokenCount,
      errorCount: cascadeResult.errors.length,
      partialFailure: cascadeResult.errors.length > 0,
    });

    try {
      const privacyAudit = activeDatabase.container('privacy_audit');
      await privacyAudit.items.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'delete',
        result: cascadeResult.errors.length > 0 ? 'partial' : 'success',
        operator: 'self',
        deletionId,
        timestamp: new Date().toISOString(),
        cosmos: cascadeResult.cosmos,
        postgres: cascadeResult.postgres,
        revokedTokens: revokedTokenCount,
        errors: cascadeResult.errors,
      });
    } catch (auditErr) {
      // Non-fatal: log audit write failures for later investigation
      try {
        context.log('privacy.delete.audit_write_failed', { deletionId });
      } catch {
        // best-effort logging; swallow to avoid masking deletion success
      }
    }
    return json(200, {
      code: 'account_deleted',
      message: 'Account deletion completed successfully',
      userId,
      deletedAt: new Date().toISOString(),
      deletionId,
      partialFailure: cascadeResult.errors.length > 0,
    });
  } catch (error) {
    // Handle structured HTTP errors (like 401 from auth)
    if (isHttpError(error)) {
      return json(error.status, error.body);
    }

    // Handle unexpected errors
    context.log('privacy.delete.critical_error', { deletionId });
    try {
      const auditDatabase = database ?? getCosmosDatabase();
      const audit = auditDatabase.container('privacy_audit');
      await audit.items.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'delete',
        result: 'failure',
        operator: 'self',
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      try {
        context.log('privacy.delete.failure_audit_write_failed', { deletionId });
      } catch {
        // best-effort logging only
      }
    }
    return json(500, {
      code: 'server_error',
      message: 'Internal server error during deletion',
      deletionId,
      note: 'Your account deletion request has been logged. Please contact support if the issue persists.',
    });
  }
}
