import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { requireUser, isHttpError } from '../shared/auth-utils';
import { withAccessGuard } from '../shared/access-guard';
import { createErrorResponse, createSuccessResponse, handleCorsAndMethod } from '../shared/http-utils';
import { moderateProfileText } from '../shared/moderation-text';
import { getAzureLogger } from '../shared/azure-logger';

const logger = getAzureLogger('users/profile');

interface ProfilePayload {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
}

export async function upsertProfile(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method, ['POST', 'PUT', 'OPTIONS']);
  if (cors.shouldReturn) return cors.response!;

  try {
    const user = requireUser(context, req);
    const body = await req.json() as ProfilePayload;

    const text = [body.displayName, body.bio].filter(Boolean).join(' \n ');
    const decision = await moderateProfileText(text, user.sub);

    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
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

