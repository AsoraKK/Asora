import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { Pool } from 'pg';
import { requireUser, isHttpError } from '../shared/auth-utils';
import { withAccessGuard } from '../shared/access-guard';
import { createErrorResponse, createSuccessResponse, handleCorsAndMethod } from '../shared/http-utils';
import { moderateProfileText } from '../shared/moderation-text';
import { getAzureLogger } from '../shared/azure-logger';
import { emitOutboxEvent } from '../shared/outbox-consumer';

const logger = getAzureLogger('users/profile');

// Dependency injection for Cosmos client
export type CosmosFactory = () => CosmosClient;
export const getCosmos: CosmosFactory = () =>
  new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');

interface ProfilePayload {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string | null;
}

export async function upsertProfile(
  req: HttpRequest,
  context: InvocationContext,
  cf: CosmosFactory = getCosmos
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method, ['POST', 'PUT', 'OPTIONS']);
  if (cors.shouldReturn) return cors.response!;

  try {
    const user = await requireUser(context, req);
    const body = await req.json() as ProfilePayload;

    const text = [body.displayName, body.bio].filter(Boolean).join(' \n ');
    const decision = await moderateProfileText(text, user.sub);

    const cosmosClient = cf();
    const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
    const users = database.container('users');
    const audit = database.container('profile_audit');

    // Build update
    const moderation = {
      provider: decision.provider,
      decision: decision.decision,
      score: decision.score,
      at: new Date().toISOString()
    };

    // Write audit log
    await audit.items.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: user.sub,
      action: 'profile_upsert',
      contentPreview: text.slice(0, 256),
      moderation,
      createdAt: new Date().toISOString()
    });

    if (decision.decision === 'reject') {
      return createErrorResponse(400, 'Profile content rejected by moderation', 'moderation_rejected', {
        'X-Moderation-Decision': 'reject'
      });
    }

    // If POSTGRES_ENABLED, write canonical profile to Postgres and emit outbox event
    const usePostgres = String(process.env.POSTGRES_ENABLED || '').toLowerCase() === 'true';
    if (usePostgres) {
      const pgConn = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
      if (!pgConn) {
        return createErrorResponse(500, 'Postgres connection string not configured');
      }

      const pool = new Pool({ connectionString: pgConn });
      const client = await pool.connect();
      try {
        // Upsert into profiles table (profiles.user_uuid = user.sub)
        await client.query(
          `INSERT INTO profiles (user_uuid, display_name, bio, avatar_url, extras, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (user_uuid) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             bio = EXCLUDED.bio,
             avatar_url = EXCLUDED.avatar_url,
             extras = COALESCE(profiles.extras, '{}'::jsonb) || EXCLUDED.extras,
             updated_at = NOW()`,
          [
            user.sub,
            body.displayName ?? null,
            body.bio ?? null,
            body.avatarUrl ?? null,
            JSON.stringify({ location: body.location ?? null, website: body.website ?? null })
          ]
        );

        // Insert an audit row in Postgres audit_log as canonical evidence
        await client.query(
          `INSERT INTO audit_log (actor_uuid, action, target_type, target_id, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [user.sub, 'profile_upsert', 'profile', user.sub, JSON.stringify({ moderation })]
        );

        // Emit outbox event so Cosmos projections (publicProfiles) update
        try {
          await emitOutboxEvent('profile.updated', user.sub, {
            user_uuid: user.sub,
            display_name: body.displayName ?? null,
            bio: body.bio ?? null,
            avatar_url: body.avatarUrl ?? null,
            tier: (user as any).tier || 'free'
          }, 'profiles', user.sub);
        } catch (emitErr) {
          // Log but do not fail the request
          logger.error('Failed to emit outbox event', { error: String(emitErr) });
        }

        return createSuccessResponse({ userId: user.sub, status: decision.decision === 'review' ? 'under_review' : 'approved', moderation }, { 'X-Moderation-Decision': decision.decision });
      } finally {
        client.release();
        await pool.end();
      }
    }

    // Fallback: legacy Cosmos patch logic
    // Load current user
    const { resource: doc } = await users.item(user.sub, user.sub).read();
    const profile = {
      ...(doc?.profile || {}),
      displayName: body.displayName ?? doc?.profile?.displayName,
      bio: body.bio ?? doc?.profile?.bio,
      location: body.location ?? doc?.profile?.location,
      website: body.website ?? doc?.profile?.website,
    };

    // Patch user with profile and moderation state
    await users.item(user.sub, user.sub).patch([
      { op: doc?.profile ? 'replace' : 'add', path: '/profile', value: profile },
      { op: 'add', path: '/profileModeration', value: moderation },
      { op: 'add', path: '/profileStatus', value: decision.decision === 'review' ? 'under_review' : 'approved' }
    ]);

    const res = {
      userId: user.sub,
      status: decision.decision === 'review' ? 'under_review' : 'approved',
      moderation
    };
    return createSuccessResponse(res, { 'X-Moderation-Decision': decision.decision });

  } catch (err) {
    if (isHttpError(err)) {
      return createErrorResponse(err.status, err.message);
    }
    logger.error('Profile upsert failed', { error: String(err) });
    return createErrorResponse(500, 'Failed to update profile');
  }
}

if (process.env.NODE_ENV !== 'test') {
  app.http('users-profile-upsert', {
    methods: ['POST', 'PUT', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users/profile',
    handler: withAccessGuard(upsertProfile, { role: undefined })
  });
}

export default upsertProfile;
