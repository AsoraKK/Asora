import { transaction, query, type HyperdriveBinding } from '@lythaus/db';
import type { EnvBindings } from '@lythaus/cloudflare-env';
import type { CreatePostInput } from '@lythaus/contracts';
import { createPresignedPutUrl, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, type AllowedImageType } from '@lythaus/media';
import { correlationId, json, logEvent } from '@lythaus/observability';
import { uuidv7, verifyAccessToken, type Principal } from '@lythaus/security';

interface Env extends EnvBindings {
  DB_APP_FRESH: HyperdriveBinding;
  MEDIA_QUARANTINE: NonNullable<EnvBindings['MEDIA_QUARANTINE']>;
  MODERATION_QUEUE: NonNullable<EnvBindings['MODERATION_QUEUE']>;
  R2_ACCOUNT_ID: string;
}

function corsOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get('origin');
  return origin && (env.CORS_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).includes(origin)
    ? origin
    : undefined;
}

function response(request: Request, env: Env, body: unknown, init: ResponseInit = {}): Response {
  const result = json(body, init);
  const origin = corsOrigin(request, env);
  if (origin) {
    result.headers.set('access-control-allow-origin', origin);
    result.headers.set('access-control-allow-credentials', 'true');
  }
  result.headers.set('x-correlation-id', correlationId(request));
  result.headers.set('vary', 'Origin, Authorization');
  return result;
}

function privateResponse(request: Request, env: Env, body: unknown, init: ResponseInit = {}): Response {
  const result = response(request, env, body, init);
  result.headers.set('cache-control', 'private, no-store');
  return result;
}

async function principal(request: Request, env: Env): Promise<Principal> {
  const value = request.headers.get('authorization');
  const token = value?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !env.JWT_PUBLIC_JWKS) throw new Error('authentication_required');
  return verifyAccessToken(token, env.JWT_PUBLIC_JWKS);
}

async function readJson<T>(request: Request, maxBytes: number): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new Error('request_too_large');
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new Error('request_too_large');
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function createPost(request: Request, env: Env, user: Principal): Promise<Response> {
  const input = await readJson<CreatePostInput>(request, 64 * 1024);
  if (!input.body?.trim() || !['human', 'ai_assisted', 'ai_generated'].includes(input.declaredCreationMode)) {
    throw new Error('invalid_post');
  }
  if (!['global', 'country', 'province', 'municipality', 'community', 'none'].includes(input.geoScope)) {
    throw new Error('invalid_geo_scope');
  }
  const postId = uuidv7();
  const eventId = uuidv7();
  await transaction(env.DB_APP_FRESH, async (client) => {
    await client.query(
      `INSERT INTO content.posts (id, author_id, body, declared_creation_mode, geo_scope, place_id, moderation_state)
       VALUES ($1, $2, $3, $4, $5, $6, 'under_review')`,
      [postId, user.userId, input.body.trim(), input.declaredCreationMode, input.geoScope, input.placeId ?? null]
    );
    await client.query(
      `INSERT INTO system.outbox_events (id, event_type, aggregate_type, aggregate_id, actor_id, payload)
       VALUES ($1, 'content.post.created', 'post', $2, $3, $4::jsonb)`,
      [eventId, postId, user.userId, JSON.stringify({ postId, declaredCreationMode: input.declaredCreationMode })]
    );
  });
  return privateResponse(request, env, { postId, eventId }, { status: 201 });
}

async function createUploadSession(request: Request, env: Env, user: Principal): Promise<Response> {
  const input = await readJson<{ contentType?: string; size?: number }>(request, 16 * 1024);
  if (!input.contentType || !ALLOWED_IMAGE_TYPES.includes(input.contentType as AllowedImageType)) {
    throw new Error('unsupported_media_type');
  }
  if (!input.size || input.size < 1 || input.size > MAX_IMAGE_BYTES) throw new Error('media_size_exceeded');
  const checksumSha256 = typeof (input as { checksumSha256?: unknown }).checksumSha256 === 'string'
    ? (input as { checksumSha256: string }).checksumSha256.toLowerCase()
    : '';
  if (!/^[0-9a-f]{64}$/.test(checksumSha256)) throw new Error('checksum_required');
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) throw new Error('media_signing_not_configured');
  const uploadSessionId = uuidv7();
  const objectKey = `quarantine/${user.userId}/${uploadSessionId}`;
  const signed = await createPresignedPutUrl({
    accountId: env.R2_ACCOUNT_ID,
    bucket: 'lythaus-media-quarantine',
    key: objectKey,
    contentType: input.contentType as AllowedImageType,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  });
  await query(env.DB_APP_FRESH,
    `INSERT INTO media.upload_sessions (id, user_id, object_key, content_type, expected_bytes, checksum_sha256, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [uploadSessionId, user.userId, objectKey, input.contentType, input.size, checksumSha256, signed.expiresAt]
  );
  return privateResponse(request, env, {
    uploadSessionId,
    objectKey,
    putUrl: signed.url,
    expiresAt: signed.expiresAt,
    contentType: input.contentType,
    maxBytes: MAX_IMAGE_BYTES,
    checksumSha256,
  }, { status: 201 });
}

async function finaliseUpload(request: Request, env: Env, user: Principal, sessionId: string): Promise<Response> {
  const result = await query<{ object_key: string; expected_bytes: number; checksum_sha256: string; status: string }>(env.DB_APP_FRESH,
    `SELECT object_key, expected_bytes, checksum_sha256, status FROM media.upload_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, user.userId]
  );
  const session = result.rows[0];
  if (!session || session.status !== 'pending') throw new Error('upload_session_invalid');
  const object = await env.MEDIA_QUARANTINE.head(session.object_key);
  if (!object || object.size !== Number(session.expected_bytes)) throw new Error('upload_object_invalid');
  const source = await env.MEDIA_QUARANTINE.get(session.object_key);
  if (!source) throw new Error('upload_object_invalid');
  const digest = await crypto.subtle.digest('SHA-256', await new Response(source.body).arrayBuffer());
  const checksum = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  if (checksum !== session.checksum_sha256) throw new Error('upload_checksum_invalid');
  const eventId = uuidv7();
  await transaction(env.DB_APP_FRESH, async (client) => {
    const updated = await client.query(
      `UPDATE media.upload_sessions SET status = 'queued', observed_bytes = $1, finalised_at = now()
        WHERE id = $2 AND user_id = $3 AND status = 'pending'`,
      [object.size, sessionId, user.userId]
    );
    if (updated.rowCount === 0) throw new Error('upload_session_invalid');
    await client.query(
      `INSERT INTO system.outbox_events (id, event_type, aggregate_type, aggregate_id, actor_id, payload)
       VALUES ($1, 'media.upload.finalised', 'upload_session', $2, $3, $4::jsonb)`,
      [eventId, sessionId, user.userId, JSON.stringify({ uploadSessionId: sessionId, objectKey: session.object_key })]
    );
  });
  return privateResponse(request, env, { uploadSessionId: sessionId, status: 'queued', eventId });
}

async function getUserProfile(request: Request, env: Env, userId: string, privateView = false): Promise<Response> {
  const result = await query(env.DB_APP_FRESH,
    `SELECT u.id, u.display_name, u.created_at, u.status, h.handle, p.bio, p.avatar_object_id
       FROM identity.users u
       LEFT JOIN identity.handles h ON h.user_id = u.id
       LEFT JOIN social.profiles p ON p.user_id = u.id
      WHERE u.id = $1 AND u.status = 'active'`, [userId]);
  if (!result.rows[0]) throw new Error('profile_not_found');
  const output = privateView ? privateResponse(request, env, { profile: result.rows[0] }) : response(request, env, { profile: result.rows[0] });
  if (!privateView) output.headers.set('cache-control', 'public, max-age=30, s-maxage=30');
  return output;
}

async function updateProfile(request: Request, env: Env, user: Principal): Promise<Response> {
  const input = await readJson<{ displayName?: string; bio?: string }>(request, 16 * 1024);
  const displayName = input.displayName?.trim();
  const bio = input.bio?.trim();
  if (displayName !== undefined && (displayName.length < 1 || displayName.length > 160)) throw new Error('invalid_display_name');
  if (bio !== undefined && bio.length > 2000) throw new Error('invalid_bio');
  await transaction(env.DB_APP_FRESH, async (client) => {
    if (displayName !== undefined) await client.query('UPDATE identity.users SET display_name = $1, updated_at = now() WHERE id = $2', [displayName, user.userId]);
    if (bio !== undefined) await client.query(`INSERT INTO social.profiles (user_id, bio) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio, updated_at = now()`, [user.userId, bio]);
  });
  return getUserProfile(request, env, user.userId, true);
}

async function createFollow(request: Request, env: Env, user: Principal): Promise<Response> {
  const input = await readJson<{ userId?: string }>(request, 8 * 1024);
  if (!input.userId || input.userId === user.userId) throw new Error('invalid_follow');
  await query(env.DB_APP_FRESH, `INSERT INTO social.follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [user.userId, input.userId]);
  return privateResponse(request, env, { following: input.userId }, { status: 201 });
}

async function createComment(request: Request, env: Env, user: Principal, postId: string): Promise<Response> {
  const input = await readJson<{ body?: string; parentId?: string }>(request, 32 * 1024);
  const body = input.body?.trim();
  if (!body) throw new Error('invalid_comment');
  const commentId = uuidv7();
  await transaction(env.DB_APP_FRESH, async (client) => {
    await client.query(`INSERT INTO content.comments (id, post_id, author_id, parent_id, body) VALUES ($1, $2, $3, $4, $5)`, [commentId, postId, user.userId, input.parentId ?? null, body]);
    await client.query(`INSERT INTO system.outbox_events (id, event_type, aggregate_type, aggregate_id, actor_id, payload) VALUES ($1, 'content.comment.created', 'comment', $2, $3, $4::jsonb)`, [uuidv7(), commentId, user.userId, JSON.stringify({ postId, commentId })]);
  });
  return privateResponse(request, env, { commentId }, { status: 201 });
}

async function createReaction(request: Request, env: Env, user: Principal, postId: string): Promise<Response> {
  const input = await readJson<{ reactionType?: string }>(request, 8 * 1024);
  if (!input.reactionType || !/^[a-z0-9:_-]{1,32}$/i.test(input.reactionType)) throw new Error('invalid_reaction');
  await query(env.DB_APP_FRESH, `INSERT INTO social.reactions (user_id, post_id, reaction_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [user.userId, postId, input.reactionType]);
  return privateResponse(request, env, { postId, reactionType: input.reactionType }, { status: 201 });
}

async function createFlag(request: Request, env: Env, user: Principal): Promise<Response> {
  const input = await readJson<{ contentType?: string; contentId?: string; reasonCode?: string }>(request, 16 * 1024);
  if (!input.contentType || !input.contentId || !input.reasonCode) throw new Error('invalid_flag');
  const flagId = uuidv7();
  await query(env.DB_APP_FRESH, `INSERT INTO moderation.content_flags (id, reporter_id, content_type, content_id, reason_code) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, [flagId, user.userId, input.contentType, input.contentId, input.reasonCode]);
  return privateResponse(request, env, { flagId }, { status: 201 });
}

async function createPrivacyRequest(request: Request, env: Env, user: Principal): Promise<Response> {
  const input = await readJson<{ requestType?: 'export' | 'delete' | 'rectify' }>(request, 8 * 1024);
  if (!input.requestType || !['export', 'delete', 'rectify'].includes(input.requestType)) throw new Error('invalid_privacy_request');
  const requestId = uuidv7();
  await transaction(env.DB_APP_FRESH, async (client) => {
    await client.query(`INSERT INTO system.outbox_events (id, event_type, aggregate_type, aggregate_id, actor_id, payload) VALUES ($1, 'privacy.request.created', 'privacy_request', $2, $3, $4::jsonb)`, [uuidv7(), requestId, user.userId, JSON.stringify({ requestType: input.requestType })]);
  });
  return privateResponse(request, env, { requestId, state: 'received' }, { status: 202 });
}

async function getStorage(request: Request, env: Env, user: Principal): Promise<Response> {
  const result = await query(env.DB_APP_FRESH, `SELECT bytes_reserved, bytes_uploaded, bytes_approved, bytes_rejected, bytes_exports, object_count, last_reconciled_at FROM media.storage_ledger WHERE user_id = $1`, [user.userId]);
  return privateResponse(request, env, { storage: result.rows[0] ?? { bytes_reserved: 0, bytes_uploaded: 0, bytes_approved: 0, bytes_rejected: 0, bytes_exports: 0, object_count: 0 } });
}

async function getPost(request: Request, env: Env, postId: string): Promise<Response> {
  const result = await query(env.DB_APP_FRESH, `SELECT id, author_id, body, declared_creation_mode, visibility, moderation_state, geo_scope, place_id, published_at, created_at FROM content.posts WHERE id = $1 AND visibility = 'public' AND moderation_state = 'allowed'`, [postId]);
  if (!result.rows[0]) throw new Error('post_not_found');
  const output = response(request, env, { post: result.rows[0] });
  output.headers.set('cache-control', 'public, max-age=15, s-maxage=15');
  return output;
}

async function getComments(request: Request, env: Env, postId: string): Promise<Response> {
  const result = await query(env.DB_APP_FRESH, `SELECT id, author_id, parent_id, body, moderation_state, created_at FROM content.comments WHERE post_id = $1 ORDER BY created_at ASC LIMIT 200`, [postId]);
  const output = response(request, env, { items: result.rows });
  output.headers.set('cache-control', 'public, max-age=10, s-maxage=10');
  return output;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = correlationId(request);
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return response(request, env, null, { status: 204, headers: { 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'Authorization, Content-Type, X-Correlation-ID' } });
      if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/health')) return response(request, env, { status: 'ok', service: 'lythaus-public-api', environment: env.ENVIRONMENT ?? 'unknown' });
      if (request.method === 'GET' && (url.pathname === '/ready' || url.pathname === '/api/ready')) {
        await query(env.DB_APP_FRESH, 'SELECT 1 AS ready');
        return response(request, env, { status: 'ready', service: 'lythaus-public-api' });
      }
      if (request.method === 'GET' && url.pathname === '/.well-known/jwks.json') return new Response(env.JWT_PUBLIC_JWKS ?? '{"keys":[]}', { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } });
      if (request.method === 'GET' && url.pathname === '/api/feed/discover') {
        const result = await query(env.DB_APP_FRESH, `SELECT id, author_id, body, published_at FROM content.posts WHERE visibility = 'public' AND moderation_state = 'allowed' ORDER BY published_at DESC LIMIT 50`);
        const resultResponse = response(request, env, { items: result.rows });
        resultResponse.headers.set('cache-control', 'public, s-maxage=30, stale-while-revalidate=60');
        return resultResponse;
      }
      const post = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
      if (request.method === 'GET' && post) return getPost(request, env, post[1]);
      const comments = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
      if (request.method === 'GET' && comments) return getComments(request, env, comments[1]);
      if (request.method === 'GET' && url.pathname === '/api/users/me') return getUserProfile(request, env, (await principal(request, env)).userId, true);
      if (request.method === 'PUT' && url.pathname === '/api/users/me') return updateProfile(request, env, await principal(request, env));
      const publicProfile = url.pathname.match(/^\/api\/users\/([^/]+)$/);
      if (request.method === 'GET' && publicProfile) return getUserProfile(request, env, publicProfile[1]);
      if (request.method === 'POST' && (url.pathname === '/api/follows' || url.pathname === '/api/users/follow')) return createFollow(request, env, await principal(request, env));
      const comment = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
      if (request.method === 'POST' && comment) return createComment(request, env, await principal(request, env), comment[1]);
      const reaction = url.pathname.match(/^\/api\/posts\/([^/]+)\/reactions$/);
      if (request.method === 'POST' && reaction) return createReaction(request, env, await principal(request, env), reaction[1]);
      if (request.method === 'POST' && (url.pathname === '/api/flags' || url.pathname === '/api/content/flags')) return createFlag(request, env, await principal(request, env));
      if (request.method === 'POST' && (url.pathname === '/api/privacy/requests' || url.pathname === '/api/privacy/request')) return createPrivacyRequest(request, env, await principal(request, env));
      if (request.method === 'GET' && (url.pathname === '/api/storage' || url.pathname === '/api/storage/usage')) return getStorage(request, env, await principal(request, env));
      if (request.method === 'GET' && url.pathname === '/api/auth/userinfo') return getUserProfile(request, env, (await principal(request, env)).userId, true);
      if (url.pathname === '/api/auth/google' || url.pathname === '/api/auth/email' || url.pathname === '/api/authEmail' || url.pathname === '/api/auth/refresh' || url.pathname === '/api/auth/logout') {
        return response(request, env, { error: 'provider_unavailable', provider: url.pathname.includes('google') ? 'google' : 'email', correlationId: id }, { status: 503 });
      }
      if (request.method === 'POST' && url.pathname === '/api/posts') return createPost(request, env, await principal(request, env));
      if (request.method === 'POST' && url.pathname === '/api/media/uploads') return createUploadSession(request, env, await principal(request, env));
      const finalise = url.pathname.match(/^\/api\/media\/uploads\/([^/]+)\/finalise$/);
      if (request.method === 'POST' && finalise) return finaliseUpload(request, env, await principal(request, env), finalise[1]);
      if (url.pathname === '/api/auth/apple' || url.pathname === '/api/auth/world-id' || url.pathname === '/api/auth/world') {
        return response(request, env, { error: 'provider_unavailable', provider: url.pathname.includes('apple') ? 'apple' : 'world_id', correlationId: id }, { status: 404 });
      }
      if (url.pathname.startsWith('/api/video') || url.pathname.startsWith('/api/payments') || url.pathname.startsWith('/api/federation')) {
        return response(request, env, { error: 'feature_disabled', correlationId: id }, { status: 404 });
      }
      return response(request, env, { error: 'not_found', correlationId: id }, { status: 404 });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'request_failed';
      const status = code === 'authentication_required' ? 401 : code === 'not_found' ? 404 : code.endsWith('_unavailable') || code.endsWith('_not_configured') ? 503 : 400;
      logEvent({ service: 'lythaus-public-api', correlationId: id, errorCode: code, route: new URL(request.url).pathname });
      return response(request, env, { error: code, correlationId: id }, { status });
    }
  },
};
