import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { withClient } from '@shared/clients/postgres';

interface FollowStatus {
  following: boolean;
  followerCount: number;
}

function badTarget(userId: string, targetId: string): boolean {
  return !targetId || userId === targetId;
}

async function getFollowerCount(targetId: string): Promise<number> {
  const count = await withClient(async (client) => {
    const result = await client.query({
      text: 'SELECT COUNT(*) as count FROM follows WHERE followee_uuid = $1',
      values: [targetId],
    });
    return parseInt(result.rows?.[0]?.count ?? '0', 10);
  });
  return count;
}

export const follow_create = httpHandler<void, FollowStatus>(async (ctx) => {
  const targetId = ctx.params.id;
  const auth = await extractAuthContext(ctx);

  if (badTarget(auth.userId, targetId)) {
    return ctx.badRequest('Invalid follow target', 'INVALID_TARGET');
  }

  await withClient(async (client) => {
    await client.query({
      text: 'INSERT INTO follows (follower_uuid, followee_uuid, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      values: [auth.userId, targetId],
    });
  });

  const followerCount = await getFollowerCount(targetId);
  return ctx.ok({ following: true, followerCount });
});

export const follow_delete = httpHandler<void, FollowStatus>(async (ctx) => {
  const targetId = ctx.params.id;
  const auth = await extractAuthContext(ctx);

  if (badTarget(auth.userId, targetId)) {
    return ctx.badRequest('Invalid follow target', 'INVALID_TARGET');
  }

  await withClient(async (client) => {
    await client.query({
      text: 'DELETE FROM follows WHERE follower_uuid = $1 AND followee_uuid = $2',
      values: [auth.userId, targetId],
    });
  });

  const followerCount = await getFollowerCount(targetId);
  return ctx.ok({ following: false, followerCount });
});

export const follow_get = httpHandler<void, FollowStatus>(async (ctx) => {
  const targetId = ctx.params.id;
  const auth = await extractAuthContext(ctx);

  if (!targetId) {
    return ctx.badRequest('Invalid follow target', 'INVALID_TARGET');
  }

  const following = await withClient(async (client) => {
    const result = await client.query({
      text: 'SELECT 1 FROM follows WHERE follower_uuid = $1 AND followee_uuid = $2 LIMIT 1',
      values: [auth.userId, targetId],
    });
    return (result.rowCount ?? 0) > 0;
  });

  const followerCount = await getFollowerCount(targetId);
  return ctx.ok({ following, followerCount });
});

app.http('follow_create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users/{id}/follow',
  handler: follow_create,
});

app.http('follow_delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'users/{id}/follow',
  handler: follow_delete,
});

app.http('follow_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}/follow',
  handler: follow_get,
});