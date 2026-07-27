import { query, transaction, type HyperdriveBinding } from '@lythaus/db';
import type { EnvBindings } from '@lythaus/cloudflare-env';
import { createPresignedGetUrl } from '@lythaus/media';
import { json, logEvent } from '@lythaus/observability';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

interface Env extends EnvBindings {
  DB_JOBS_FRESH: HyperdriveBinding;
  DB_PRIVACY_FRESH: HyperdriveBinding;
  MODERATION_QUEUE?: Queue;
  FEED_QUEUE?: Queue;
  NOTIFICATIONS_QUEUE?: Queue;
  MEDIA_QUEUE?: Queue;
  PRIVACY_QUEUE?: Queue;
  AUDIT_QUEUE?: Queue;
  MEDIA_QUARANTINE?: NonNullable<EnvBindings['MEDIA_QUARANTINE']>;
  MEDIA_APPROVED?: NonNullable<EnvBindings['MEDIA_APPROVED']>;
  IMAGES?: NonNullable<EnvBindings['IMAGES']>;
  PRIVATE_EXPORTS?: NonNullable<EnvBindings['PRIVATE_EXPORTS']>;
  ACCOUNT_DELETE?: WorkflowBinding<{ subjectId: string; requestId: string }>;
  ACCOUNT_EXPORT?: WorkflowBinding<{ subjectId: string; requestId: string }>;
  RETENTION_CLEANUP?: WorkflowBinding<{ runId: string }>;
}

interface Queue { send(body: unknown, options?: { contentType?: string }): Promise<void>; }
interface WorkflowBinding<T> { create(options: { id: string; params: T }): Promise<unknown>; }

interface QueueMessage {
  id: string;
  body: { eventId?: string; eventType?: string; [key: string]: unknown };
  ack(): void;
  retry(): void;
}

interface QueueBatch {
  queue: string;
  messages: QueueMessage[];
}

const MAX_IMAGE_PIXELS = 40_000_000;
const HIVE_DEFAULT_MODELS = ['general_text_classification', 'hate_speech_detection_text', 'violence_text_detection'];

interface HiveClass { class?: string; score?: number; }
interface HiveResult { highestScore: number; classes: HiveClass[]; action: 'allow' | 'block' | 'queue'; }

function hasMagicBytes(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return bytes.length >= 8 && bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  if (contentType === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (contentType === 'image/avif') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp' && ['avif', 'avis'].includes(new TextDecoder().decode(bytes.slice(8, 12)));
  return false;
}

async function moderateTextWithHive(text: string, userId: string, contentId: string, env: Env): Promise<HiveResult> {
  if (!env.HIVE_API_KEY) throw new Error('hive_not_configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(env.HIVE_API_URL ?? 'https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Token ${env.HIVE_API_KEY}`, 'x-content-id': contentId },
      body: JSON.stringify({ text_data: text, models: HIVE_DEFAULT_MODELS, user_id: userId }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`hive_http_${response.status}`);
    const payload = await response.json() as { code?: number; status?: Array<{ response?: { output?: Array<{ classes?: HiveClass[] }> } }> };
    if (payload.code !== 200 || !Array.isArray(payload.status)) throw new Error('hive_response_invalid');
    const classes = payload.status.flatMap((status) => status.response?.output?.flatMap((item) => item.classes ?? []) ?? []);
    const highestScore = classes.reduce((highest, item) => Math.max(highest, typeof item.score === 'number' ? item.score : 0), 0);
    return { highestScore, classes, action: highestScore >= 0.85 ? 'block' : highestScore >= 0.5 ? 'queue' : 'allow' };
  } finally {
    clearTimeout(timeout);
  }
}

async function moderateImageWithHive(imageUrl: string, userId: string, contentId: string, env: Env): Promise<HiveResult> {
  if (!env.HIVE_API_KEY) throw new Error('hive_not_configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(env.HIVE_API_URL ?? 'https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Token ${env.HIVE_API_KEY}`, 'x-content-id': contentId },
      body: JSON.stringify({ image_url: imageUrl, models: ['general_image_classification', 'nudity_image_detection', 'violence_image_detection'], user_id: userId }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`hive_http_${response.status}`);
    const payload = await response.json() as { code?: number; status?: Array<{ response?: { output?: Array<{ classes?: HiveClass[] }> } }> };
    if (payload.code !== 200 || !Array.isArray(payload.status)) throw new Error('hive_response_invalid');
    const classes = payload.status.flatMap((status) => status.response?.output?.flatMap((item) => item.classes ?? []) ?? []);
    const highestScore = classes.reduce((highest, item) => Math.max(highest, typeof item.score === 'number' ? item.score : 0), 0);
    return { highestScore, classes, action: highestScore >= 0.85 ? 'block' : highestScore >= 0.5 ? 'queue' : 'allow' };
  } finally {
    clearTimeout(timeout);
  }
}

async function processPostModeration(message: QueueMessage, env: Env): Promise<void> {
  const payload = (message.body.payload ?? message.body) as { postId?: unknown };
  const postId = typeof payload.postId === 'string' ? payload.postId : undefined;
  if (!postId) throw new Error('content_event_invalid');
  const postResult = await query<{ id: string; author_id: string; body: string; declared_creation_mode: 'human' | 'ai_assisted' | 'ai_generated'; moderation_state: string }>(
    env.DB_JOBS_FRESH,
    `SELECT id, author_id, body, declared_creation_mode, moderation_state FROM content.posts WHERE id = $1`, [postId]
  );
  const post = postResult.rows[0];
  if (!post || post.moderation_state !== 'under_review') return;
  const prior = await query(env.DB_JOBS_FRESH,
    `SELECT 1 FROM moderation.detector_runs WHERE content_type = 'post' AND content_id = $1 AND provider = 'hive' LIMIT 1`, [postId]);
  if (prior.rowCount !== 0) return;
  const result = await moderateTextWithHive(post.body, post.author_id, postId, env);
  const modelVersion = env.HIVE_MODEL_VERSION ?? HIVE_DEFAULT_MODELS.join('+');
  const detectedContentClass = result.classes[0]?.class ?? null;
  const declarationConflict = post.declared_creation_mode === 'human'
    && result.classes.some((item) => typeof item.class === 'string' && /(^|[_:-])(ai|generated|synthetic)([_:-]|$)/i.test(item.class));
  const effectiveAction = declarationConflict && result.action === 'allow' ? 'queue' : result.action;
  const publicLabel = effectiveAction === 'allow'
    ? ({ human: 'Human-authored', ai_assisted: 'AI-assisted', ai_generated: 'AI-generated' } as const)[post.declared_creation_mode]
    : 'Under review';
  const signal = JSON.stringify({ highestScore: result.highestScore, classes: result.classes, action: result.action });
  await transaction(env.DB_JOBS_FRESH, async (client) => {
    const existing = await client.query(`SELECT 1 FROM moderation.detector_runs WHERE content_type = 'post' AND content_id = $1 AND provider = 'hive' LIMIT 1`, [postId]);
    if (existing.rowCount !== 0) return;
    await client.query(
      `INSERT INTO moderation.detector_runs (content_type, content_id, provider, model_version, signal) VALUES ('post', $1, 'hive', $2, $3::jsonb)`,
      [postId, modelVersion, signal]
    );
    await client.query(
      `INSERT INTO content.content_declarations (post_id, declared_creation_mode, public_label, detector_provider, detector_model_version, detector_signal, declaration_conflict, review_required)
       VALUES ($1, $2, $3, 'hive', $4, $5::jsonb, $6, $7)
       ON CONFLICT (post_id) DO UPDATE SET public_label = EXCLUDED.public_label, detector_provider = EXCLUDED.detector_provider,
         detector_model_version = EXCLUDED.detector_model_version, detector_signal = EXCLUDED.detector_signal,
         declaration_conflict = EXCLUDED.declaration_conflict, review_required = EXCLUDED.review_required, updated_at = now()`,
      [postId, post.declared_creation_mode, publicLabel, modelVersion, signal, declarationConflict, effectiveAction !== 'allow']
    );
    const caseResult = await client.query<{ id: string }>(
      `INSERT INTO moderation.cases (content_type, content_id, state, policy_version) VALUES ('post', $1, $2, 'hive-v1') RETURNING id`,
      [postId, result.action === 'allow' ? 'resolved' : 'open']
    );
    await client.query(
      `INSERT INTO moderation.decisions (case_id, outcome, public_label, policy_version) VALUES ($1, $2, $3, 'hive-v1')`,
      [caseResult.rows[0].id, result.action, publicLabel]
    );
    await client.query(
      `INSERT INTO trust.provenance_events (content_id, author_id, declared_creation_mode, detected_content_class, detector_provider, detector_model_version, policy_version, final_decision)
       VALUES ($1, $2, $3, $4, 'hive', $5, 'hive-v1', $6)`,
      [postId, post.author_id, post.declared_creation_mode, detectedContentClass, modelVersion, effectiveAction]
    );
    if (effectiveAction === 'allow') {
      await client.query(`UPDATE content.posts SET moderation_state = 'allowed', published_at = COALESCE(published_at, now()), updated_at = now() WHERE id = $1`, [postId]);
      await client.query(`INSERT INTO feed.author_outbox (post_id, author_id, published_at) VALUES ($1, $2, COALESCE((SELECT published_at FROM content.posts WHERE id = $1), now())) ON CONFLICT (post_id) DO NOTHING`, [postId, post.author_id]);
      await client.query(
        `INSERT INTO feed.user_inbox (user_id, post_id, source, explanation_basis)
         SELECT follower_id, $1, 'follow', jsonb_build_object('source', 'follow', 'authorId', $2)
           FROM social.follows
          WHERE followed_id = $2
            AND (SELECT count(*) FROM social.follows WHERE followed_id = $2) <= 10000
         ON CONFLICT (user_id, post_id) DO NOTHING`,
        [postId, post.author_id]
      );
      if (post.declared_creation_mode !== 'ai_generated') {
        await client.query(
          `INSERT INTO trust.human_contribution_events (subject_user_id, content_id, human_authorship_eligibility, policy_version, points_delta)
           VALUES ($1, $2, true, 'hive-v1', 0)`, [post.author_id, postId]
        );
      }
    } else if (effectiveAction === 'block') {
      await client.query(`UPDATE content.posts SET moderation_state = 'blocked', updated_at = now() WHERE id = $1`, [postId]);
    }
  });
}

async function processMediaUpload(message: QueueMessage, env: Env): Promise<void> {
  const payload = (message.body.payload ?? message.body) as { uploadSessionId?: unknown; objectKey?: unknown };
  const sessionId = typeof payload.uploadSessionId === 'string' ? payload.uploadSessionId : undefined;
  const objectKey = typeof payload.objectKey === 'string' ? payload.objectKey : undefined;
  if (!sessionId || !objectKey || !env.MEDIA_QUARANTINE || !env.MEDIA_APPROVED || !env.IMAGES) throw new Error('media_processing_not_configured');

  const session = await query<{ user_id: string; content_type: string; expected_bytes: number; status: string }>(
    env.DB_JOBS_FRESH,
    `SELECT user_id, content_type, expected_bytes, status FROM media.upload_sessions WHERE id = $1 AND object_key = $2`,
    [sessionId, objectKey]
  );
  const row = session.rows[0];
  if (!row) throw new Error('upload_session_not_found');
  if (row.status === 'approved') return;
  if (row.status !== 'queued') throw new Error('upload_session_not_queued');

  const settleRejected = async (): Promise<void> => {
    await transaction(env.DB_JOBS_FRESH, async (client) => {
      const updated = await client.query(`UPDATE media.upload_sessions SET status = 'rejected' WHERE id = $1 AND status = 'queued'`, [sessionId]);
      if (updated.rowCount !== 0) await client.query(
        `UPDATE media.storage_ledger SET bytes_reserved = greatest(bytes_reserved - $1, 0), bytes_rejected = bytes_rejected + $1, last_reconciled_at = now() WHERE user_id = $2`,
        [row.expected_bytes, row.user_id]);
    });
  };

  const source = await env.MEDIA_QUARANTINE.get(objectKey);
  if (!source) throw new Error('quarantine_object_missing');
  const bytes = new Uint8Array(await new Response(source.body).arrayBuffer());
  if (bytes.byteLength !== Number(row.expected_bytes) || !hasMagicBytes(bytes, row.content_type)) {
    await settleRejected();
    await env.MEDIA_QUARANTINE.delete(objectKey);
    return;
  }

  const sourceInfo = await env.IMAGES.info(new Response(bytes).body!);
  if (!sourceInfo.width || !sourceInfo.height || sourceInfo.width * sourceInfo.height > MAX_IMAGE_PIXELS) {
    await settleRejected();
    await env.MEDIA_QUARANTINE.delete(objectKey);
    return;
  }

  const transformed = await (await env.IMAGES.input(new Response(bytes).body!).output({ format: 'image/webp', quality: 85 })).image();
  const approvedBytes = new Uint8Array(await new Response(transformed).arrayBuffer());
  if (approvedBytes.byteLength === 0 || approvedBytes.byteLength > 10 * 1024 * 1024) throw new Error('media_transform_invalid');
  const digest = await crypto.subtle.digest('SHA-256', approvedBytes);
  const sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  const approvedKey = `approved/${row.user_id}/${sessionId}.webp`;
  await env.MEDIA_APPROVED.put(approvedKey, approvedBytes, { httpMetadata: { contentType: 'image/webp' } });
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    await env.MEDIA_APPROVED.delete(approvedKey);
    throw new Error('media_signing_not_configured');
  }
  let moderation: HiveResult;
  try {
    const signed = await createPresignedGetUrl({
      accountId: env.R2_ACCOUNT_ID,
      bucket: 'lythaus-media-approved',
      key: approvedKey,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      expiresInSeconds: 300,
    });
    moderation = await moderateImageWithHive(signed.url, row.user_id, sessionId, env);
  } catch (error) {
    await env.MEDIA_APPROVED.delete(approvedKey);
    throw error;
  }
  if (moderation.action === 'block') {
    await env.MEDIA_APPROVED.delete(approvedKey);
    await transaction(env.DB_JOBS_FRESH, async (client) => {
      const updated = await client.query(`UPDATE media.upload_sessions SET status = 'rejected' WHERE id = $1 AND status = 'queued'`, [sessionId]);
      if (updated.rowCount !== 0) await client.query(`UPDATE media.storage_ledger SET bytes_reserved = greatest(bytes_reserved - $1, 0), bytes_rejected = bytes_rejected + $1, last_reconciled_at = now() WHERE user_id = $2`, [row.expected_bytes, row.user_id]);
    });
    return;
  }
  const moderationState = moderation.action === 'allow' ? 'approved' : 'review';
  const moderationSignal = JSON.stringify({ highestScore: moderation.highestScore, classes: moderation.classes, action: moderation.action });

  await transaction(env.DB_JOBS_FRESH, async (client) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO media.objects (owner_id, object_key, content_type, byte_size, sha256, state)
       VALUES ($1, $2, 'image/webp', $3, $4, $5) ON CONFLICT (object_key) DO NOTHING RETURNING id`,
      [row.user_id, approvedKey, approvedBytes.byteLength, sha256, moderationState]
    );
    if (inserted.rowCount !== 0) {
      const objectId = inserted.rows[0].id;
      await client.query(`INSERT INTO media.ownership (object_id, owner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [objectId, row.user_id]);
      await client.query(
        `INSERT INTO media.variants (object_id, object_key, content_type, byte_size, width, height)
         VALUES ($1, $2, 'image/webp', $3, $4, $5) ON CONFLICT (object_key) DO NOTHING`,
        [objectId, approvedKey, approvedBytes.byteLength, sourceInfo.width, sourceInfo.height]
      );
      await client.query(
        `INSERT INTO media.moderation_results (object_id, provider, model_version, signal) VALUES ($1, 'hive', $2, $3::jsonb)`,
        [objectId, env.HIVE_MODEL_VERSION ?? 'image_classification_v1', moderationSignal]
      );
      await client.query(
        `INSERT INTO media.storage_ledger (user_id, bytes_uploaded, bytes_approved, object_count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (user_id) DO UPDATE SET bytes_uploaded = media.storage_ledger.bytes_uploaded + EXCLUDED.bytes_uploaded,
           bytes_reserved = greatest(media.storage_ledger.bytes_reserved - $4, 0),
           bytes_approved = media.storage_ledger.bytes_approved + EXCLUDED.bytes_approved,
           object_count = media.storage_ledger.object_count + 1,
           last_reconciled_at = now()`,
        [row.user_id, approvedBytes.byteLength, approvedBytes.byteLength, row.expected_bytes]
      );
    }
    await client.query(`UPDATE media.upload_sessions SET status = 'approved' WHERE id = $1 AND status = 'queued'`, [sessionId]);
  });
  await env.MEDIA_QUARANTINE.delete(objectKey);
}

async function processMessage(message: QueueMessage, env: Env): Promise<void> {
  const eventId = message.body.eventId ?? message.id;
  const seen = await query(env.DB_JOBS_FRESH,
    `SELECT 1 FROM system.consumer_inbox WHERE consumer_name = 'lythaus-jobs' AND event_id = $1`, [eventId]);
  if (seen.rowCount !== 0) {
    message.ack();
    return;
  }
  const eventType = message.body.eventType ?? 'unknown';
  if (eventType === 'content.post.created') await processPostModeration(message, env);
  if (eventType === 'media.upload.finalised') await processMediaUpload(message, env);
  if (eventType === 'privacy.request.created') {
    const payload = (message.body.payload ?? {}) as { requestId?: string; requestType?: string };
    const subjectId = typeof message.body.actorId === 'string' ? message.body.actorId : undefined;
    if (!payload.requestId || !subjectId || !['export', 'delete', 'rectify'].includes(payload.requestType ?? '')) throw new Error('privacy_event_invalid');
    await query(env.DB_PRIVACY_FRESH,
      `INSERT INTO privacy.requests (id, subject_id, request_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`, [payload.requestId, subjectId, payload.requestType]);
    await query(env.DB_PRIVACY_FRESH,
      `INSERT INTO privacy.request_events (id, request_id, event_type, metadata)
       VALUES ($1, $2, 'received', $3::jsonb)
       ON CONFLICT (id) DO NOTHING`, [eventId, payload.requestId, JSON.stringify({ eventId })]);
    if (payload.requestType === 'delete' && env.ACCOUNT_DELETE) {
      await env.ACCOUNT_DELETE.create({ id: `privacy-delete-${payload.requestId}`, params: { subjectId, requestId: payload.requestId } });
    }
    if (payload.requestType === 'export' && env.ACCOUNT_EXPORT) {
      await env.ACCOUNT_EXPORT.create({ id: `privacy-export-${payload.requestId}`, params: { subjectId, requestId: payload.requestId } });
    }
  }
  await query(env.DB_JOBS_FRESH,
    `INSERT INTO system.consumer_inbox (consumer_name, event_id, event_type, payload)
     VALUES ('lythaus-jobs', $1, $2, $3::jsonb)
     ON CONFLICT (consumer_name, event_id) DO NOTHING`,
    [eventId, eventType, JSON.stringify(message.body)]
  );
  logEvent({ service: 'lythaus-jobs', eventId, eventType });
  message.ack();
}

function queueForEvent(eventType: string, env: Env): Queue | undefined {
  if (eventType.startsWith('content.') || eventType.startsWith('moderation.')) return env.MODERATION_QUEUE;
  if (eventType.startsWith('feed.')) return env.FEED_QUEUE;
  if (eventType.startsWith('notification.')) return env.NOTIFICATIONS_QUEUE;
  if (eventType.startsWith('media.')) return env.MEDIA_QUEUE;
  if (eventType.startsWith('privacy.')) return env.PRIVACY_QUEUE;
  return env.AUDIT_QUEUE;
}

async function relayOutbox(env: Env): Promise<void> {
  const pending = await query<{ id: string; event_type: string; payload: unknown; actor_id: string | null; correlation_id: string | null }>(
    env.DB_JOBS_FRESH,
    `SELECT id, event_type, payload, actor_id, correlation_id
       FROM system.outbox_events
      WHERE dispatched_at IS NULL
      ORDER BY created_at
      LIMIT 50`
  );
  for (const event of pending.rows) {
    const queue = queueForEvent(event.event_type, env);
    if (!queue) continue;
    await queue.send({
      eventId: event.id,
      eventType: event.event_type,
      actorId: event.actor_id,
      correlationId: event.correlation_id,
      payload: event.payload,
    });
    await query(env.DB_JOBS_FRESH,
      `UPDATE system.outbox_events SET dispatched_at = now(), attempted_at = now(), attempt_count = attempt_count + 1 WHERE id = $1 AND dispatched_at IS NULL`,
      [event.id]
    );
  }
}

export default {
  async fetch(): Promise<Response> {
    return json({ status: 'ok', service: 'lythaus-jobs' });
  },

  async queue(batch: QueueBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processMessage(message, env);
      } catch (error) {
        logEvent({ service: 'lythaus-jobs', queue: batch.queue, messageId: message.id, error: error instanceof Error ? error.message : 'job_failed' });
        message.retry();
      }
    }
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await relayOutbox(env);
    if (env.RETENTION_CLEANUP) {
      const runId = new Date().toISOString().slice(0, 10);
      await env.RETENTION_CLEANUP.create({ id: `retention-${runId}`, params: { runId } });
    }
  },
};

export class AccountDeleteWorkflow extends WorkflowEntrypoint<Env, { subjectId: string; requestId: string }> {
  async run(event: WorkflowEvent<{ subjectId: string; requestId: string }>, step: WorkflowStep): Promise<{ subjectId: string; state: string }> {
    const subjectId = event.payload.subjectId;
    const requestedId = event.payload.requestId;
    const requestId = await step.do('resolve-request', async () => {
      const result = await query<{ id: string }>(this.env.DB_PRIVACY_FRESH,
        `SELECT id FROM privacy.requests WHERE id = $1 AND subject_id = $2 AND request_type = 'delete'`, [requestedId, subjectId]);
      if (!result.rows[0]) throw new Error('privacy_delete_request_not_found');
      await query(this.env.DB_PRIVACY_FRESH,
        `INSERT INTO privacy.request_events (request_id, event_type, metadata)
         SELECT $1, 'workflow_started', $2::jsonb
          WHERE NOT EXISTS (SELECT 1 FROM privacy.request_events WHERE request_id = $1 AND event_type = 'workflow_started')`,
        [result.rows[0].id, JSON.stringify({ subjectId })]);
      return result.rows[0].id;
    });

    await step.do('lock-account-and-revoke-sessions', async () => {
      await transaction(this.env.DB_PRIVACY_FRESH, async (client) => {
        await client.query(`UPDATE identity.users SET status = 'locked', updated_at = now() WHERE id = $1 AND status IN ('active', 'locked')`, [subjectId]);
        await client.query(`UPDATE identity.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [subjectId]);
        await client.query(`UPDATE identity.refresh_token_families SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [subjectId]);
      });
      return true;
    });

    const hold = await step.do('evaluate-legal-holds', async () => {
      const result = await query<{ id: string }>(this.env.DB_PRIVACY_FRESH, `SELECT id FROM privacy.legal_holds WHERE subject_id = $1 AND active`, [subjectId]);
      if (result.rows[0]) {
        await query(this.env.DB_PRIVACY_FRESH,
          `UPDATE privacy.requests SET state = 'blocked' WHERE id = $1 AND state <> 'completed'`, [requestId]);
        await query(this.env.DB_PRIVACY_FRESH,
          `INSERT INTO privacy.request_events (request_id, event_type, metadata)
           SELECT $1, 'blocked_legal_hold', $2::jsonb
            WHERE NOT EXISTS (SELECT 1 FROM privacy.request_events WHERE request_id = $1 AND event_type = 'blocked_legal_hold')`,
          [requestId, JSON.stringify({ legalHoldId: result.rows[0].id })]);
        return true;
      }
      return false;
    });
    if (hold) return { subjectId, state: 'blocked' };

    await step.do('redact-authoritative-content', async () => {
      await transaction(this.env.DB_JOBS_FRESH, async (client) => {
        await client.query(`UPDATE content.comments SET body = '[deleted]', moderation_state = 'blocked' WHERE author_id = $1`, [subjectId]);
        await client.query(`UPDATE content.posts SET body = '[deleted]', visibility = 'private', moderation_state = 'blocked', published_at = NULL, updated_at = now() WHERE author_id = $1`, [subjectId]);
        await client.query(`DELETE FROM social.follows WHERE follower_id = $1 OR followed_id = $1`, [subjectId]);
        await client.query(`DELETE FROM social.reactions WHERE user_id = $1`, [subjectId]);
        await client.query(`DELETE FROM social.bookmarks WHERE user_id = $1`, [subjectId]);
      });
      await transaction(this.env.DB_PRIVACY_FRESH, async (client) => {
        await client.query(`DELETE FROM identity.provider_links WHERE user_id = $1`, [subjectId]);
        await client.query(`DELETE FROM identity.email_credentials WHERE user_id = $1`, [subjectId]);
        await client.query(`DELETE FROM identity.handles WHERE user_id = $1`, [subjectId]);
        await client.query(`DELETE FROM social.profile_private_fields WHERE user_id = $1`, [subjectId]);
        await client.query(`UPDATE identity.users SET status = 'deleted', display_name = '[deleted]', deleted_at = COALESCE(deleted_at, now()), updated_at = now() WHERE id = $1`, [subjectId]);
      });
      return true;
    });

    await step.do('purge-media-and-mark-locator', async () => {
      if (!this.env.MEDIA_APPROVED || !this.env.MEDIA_QUARANTINE) throw new Error('media_purge_not_configured');
      const objects = await query<{ object_key: string }>(this.env.DB_JOBS_FRESH, `SELECT object_key FROM media.objects WHERE owner_id = $1 AND deleted_at IS NULL`, [subjectId]);
      for (const object of objects.rows) await this.env.MEDIA_APPROVED.delete(object.object_key);
      const uploads = await query<{ object_key: string }>(this.env.DB_JOBS_FRESH, `SELECT object_key FROM media.upload_sessions WHERE user_id = $1 AND status IN ('pending', 'queued')`, [subjectId]);
      for (const upload of uploads.rows) await this.env.MEDIA_QUARANTINE.delete(upload.object_key);
      await transaction(this.env.DB_JOBS_FRESH, async (client) => {
        await client.query(`UPDATE media.objects SET state = 'deleted', deleted_at = COALESCE(deleted_at, now()) WHERE owner_id = $1`, [subjectId]);
        await client.query(`UPDATE media.upload_sessions SET status = 'expired' WHERE user_id = $1 AND status IN ('pending', 'queued')`, [subjectId]);
      });
      await query(this.env.DB_PRIVACY_FRESH,
        `UPDATE privacy.subject_data_locations SET deletion_state = 'deleted', last_verified_at = now() WHERE subject_id = $1`, [subjectId]);
      return objects.rows.length + uploads.rows.length;
    });

    await step.do('complete-request-and-tombstone', async () => {
      const evidence = new TextEncoder().encode(`${subjectId}:${requestId}:${new Date().toISOString()}`);
      const digest = await crypto.subtle.digest('SHA-256', evidence);
      const evidenceHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
      await transaction(this.env.DB_PRIVACY_FRESH, async (client) => {
        await client.query(`INSERT INTO privacy.deletion_tombstones (subject_id, evidence_hash) VALUES ($1, $2) ON CONFLICT (subject_id) DO UPDATE SET completed_at = now(), evidence_hash = EXCLUDED.evidence_hash`, [subjectId, evidenceHash]);
        await client.query(`UPDATE privacy.requests SET state = 'completed', completed_at = now() WHERE id = $1`, [requestId]);
        await client.query(`INSERT INTO privacy.request_events (request_id, event_type, metadata)
          SELECT $1, 'completed', $2::jsonb
           WHERE NOT EXISTS (SELECT 1 FROM privacy.request_events WHERE request_id = $1 AND event_type = 'completed')`, [requestId, JSON.stringify({ evidenceHash })]);
      });
      return evidenceHash;
    });
    return { subjectId, state: 'completed' };
  }
}

export class AccountExportWorkflow extends WorkflowEntrypoint<Env, { subjectId: string; requestId: string }> {
  async run(event: WorkflowEvent<{ subjectId: string; requestId: string }>, step: WorkflowStep): Promise<{ subjectId: string; state: string }> {
    const subjectId = event.payload.subjectId;
    const requestedId = event.payload.requestId;
    const exportsBucket = this.env.PRIVATE_EXPORTS;
    if (!exportsBucket) throw new Error('private_exports_not_configured');
    const requestId = await step.do('resolve-export-request', async () => {
      const result = await query<{ id: string }>(this.env.DB_PRIVACY_FRESH,
        `SELECT id FROM privacy.requests WHERE id = $1 AND subject_id = $2 AND request_type = 'export'`, [requestedId, subjectId]);
      if (!result.rows[0]) throw new Error('privacy_export_request_not_found');
      await query(this.env.DB_PRIVACY_FRESH,
        `INSERT INTO privacy.request_events (request_id, event_type, metadata)
         SELECT $1, 'workflow_started', $2::jsonb
          WHERE NOT EXISTS (SELECT 1 FROM privacy.request_events WHERE request_id = $1 AND event_type = 'workflow_started')`,
        [result.rows[0].id, JSON.stringify({ subjectId })]);
      return result.rows[0].id;
    });

    const passport = await step.do('build-data-passport', async () => {
      const [identity, locations] = await Promise.all([
        query(this.env.DB_PRIVACY_FRESH, `SELECT id, display_name, status, created_at, deleted_at FROM identity.users WHERE id = $1`, [subjectId]),
        query(this.env.DB_PRIVACY_FRESH, `SELECT store_type, resource_reference, entity_type, entity_id, authoritative_or_derived, retention_class, legal_hold_state, deletion_state, last_verified_at FROM privacy.subject_data_locations WHERE subject_id = $1`, [subjectId]),
      ]);
      const [posts, comments, follows, media, provenance, contributions, reputation] = await Promise.all([
        query(this.env.DB_JOBS_FRESH, `SELECT id, body, declared_creation_mode, visibility, moderation_state, geo_scope, place_id, published_at, created_at FROM content.posts WHERE author_id = $1 ORDER BY created_at`, [subjectId]),
        query(this.env.DB_JOBS_FRESH, `SELECT id, post_id, parent_id, body, moderation_state, created_at FROM content.comments WHERE author_id = $1 ORDER BY created_at`, [subjectId]),
        query(this.env.DB_JOBS_FRESH, `SELECT follower_id, followed_id, created_at FROM social.follows WHERE follower_id = $1 OR followed_id = $1 ORDER BY created_at`, [subjectId]),
        query(this.env.DB_JOBS_FRESH, `SELECT id, object_key, content_type, byte_size, sha256, state, created_at, deleted_at FROM media.objects WHERE owner_id = $1 ORDER BY created_at`, [subjectId]),
        query(this.env.DB_JOBS_FRESH, `SELECT content_id, declared_creation_mode, detected_content_class, detector_provider, detector_model_version, policy_version, appeal_state, final_decision, created_at FROM trust.provenance_events WHERE author_id = $1 ORDER BY created_at`, [subjectId]),
        query(this.env.DB_JOBS_FRESH, `SELECT content_id, human_authorship_eligibility, quality_signal, source_signal, behaviour_signal, policy_version, points_delta, reversal_reference, created_at FROM trust.human_contribution_events WHERE subject_user_id = $1 ORDER BY created_at`, [subjectId]),
        query(this.env.DB_JOBS_FRESH, `SELECT content_id, event_type, policy_version, points_delta, reversal_reference, created_at FROM trust.reputation_events WHERE subject_user_id = $1 ORDER BY created_at`, [subjectId]),
      ]);
      return {
        schemaVersion: 'lythaus-data-passport-v1',
        generatedAt: new Date().toISOString(),
        profile: identity.rows[0] ?? null,
        posts: posts.rows,
        comments: comments.rows,
        follows: follows.rows,
        media: media.rows,
        provenance: provenance.rows,
        humanContribution: contributions.rows,
        reputation: reputation.rows,
        subjectDataLocations: locations.rows,
      };
    });

    await step.do('store-export-and-complete-request', async () => {
      const body = JSON.stringify(passport);
      const bytes = new TextEncoder().encode(body);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const packageHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
      const objectKey = `exports/${subjectId}/${requestId}.json`;
      await exportsBucket.put(objectKey, bytes, { httpMetadata: { contentType: 'application/json' } });
      await transaction(this.env.DB_PRIVACY_FRESH, async (client) => {
        await client.query(`INSERT INTO privacy.export_manifests (request_id, object_key, package_hash, expires_at) VALUES ($1, $2, $3, now() + interval '7 days') ON CONFLICT DO NOTHING`, [requestId, objectKey, packageHash]);
        await client.query(`UPDATE privacy.requests SET state = 'completed', completed_at = now() WHERE id = $1`, [requestId]);
        await client.query(`INSERT INTO privacy.request_events (request_id, event_type, metadata)
          SELECT $1, 'completed', $2::jsonb
           WHERE NOT EXISTS (SELECT 1 FROM privacy.request_events WHERE request_id = $1 AND event_type = 'completed')`, [requestId, JSON.stringify({ objectKey, packageHash })]);
      });
      return packageHash;
    });
    return { subjectId, state: 'completed' };
  }
}

export class RetentionCleanupWorkflow extends WorkflowEntrypoint<Env, { runId: string }> {
  async run(event: WorkflowEvent<{ runId: string }>, step: WorkflowStep): Promise<{ runId: string; redactedPosts: number; deletedMedia: number }> {
    const candidates = await step.do('find-retention-candidates', async () => {
      const result = await query<{ user_id: string; content_type: string; retention_period: string }>(this.env.DB_PRIVACY_FRESH,
        `SELECT user_id, content_type, retention_period::text FROM privacy.retention_rules ORDER BY created_at LIMIT 100`);
      return result.rows;
    });
    let redactedPosts = 0;
    let deletedMedia = 0;
    for (const [index, candidate] of candidates.entries()) {
      const result = await step.do(`apply-retention-${index}`, async () => {
        const hold = await query(this.env.DB_PRIVACY_FRESH, `SELECT 1 FROM privacy.legal_holds WHERE subject_id = $1 AND active LIMIT 1`, [candidate.user_id]);
        if (hold.rowCount !== 0) return { posts: 0, media: 0 };
        if (candidate.content_type === 'post' || candidate.content_type === 'posts') {
          const updated = await query<{ id: string }>(this.env.DB_JOBS_FRESH,
            `UPDATE content.posts SET body = '[retention policy]', visibility = 'private', moderation_state = 'blocked', published_at = NULL, updated_at = now()
              WHERE author_id = $1 AND created_at < now() - $2::interval AND body <> '[retention policy]' RETURNING id`,
            [candidate.user_id, candidate.retention_period]);
          if (updated.rowCount !== 0) await query(this.env.DB_JOBS_FRESH,
            `INSERT INTO system.audit_events (action, target_type, reason_code, correlation_id, metadata) VALUES ('retention.posts_redacted', 'user', 'RETENTION_POLICY', $1, $2::jsonb)`,
            [event.payload.runId, JSON.stringify({ subjectId: candidate.user_id, count: updated.rowCount })]);
          return { posts: updated.rowCount ?? 0, media: 0 };
        }
        if (candidate.content_type === 'media') {
          const objects = await query<{ id: string; object_key: string; byte_size: number }>(this.env.DB_JOBS_FRESH,
            `SELECT id, object_key, byte_size FROM media.objects WHERE owner_id = $1 AND created_at < now() - $2::interval AND deleted_at IS NULL`,
            [candidate.user_id, candidate.retention_period]);
          if (!this.env.MEDIA_APPROVED) throw new Error('media_purge_not_configured');
          for (const object of objects.rows) await this.env.MEDIA_APPROVED.delete(object.object_key);
          for (const object of objects.rows) {
            await query(this.env.DB_JOBS_FRESH, `UPDATE media.objects SET state = 'deleted', deleted_at = COALESCE(deleted_at, now()) WHERE id = $1 AND deleted_at IS NULL`, [object.id]);
            await query(this.env.DB_JOBS_FRESH, `UPDATE media.storage_ledger SET bytes_approved = greatest(bytes_approved - $1, 0), object_count = greatest(object_count - 1, 0), last_reconciled_at = now() WHERE user_id = $2`, [object.byte_size, candidate.user_id]);
          }
          if (objects.rowCount !== 0) await query(this.env.DB_JOBS_FRESH,
            `INSERT INTO system.audit_events (action, target_type, reason_code, correlation_id, metadata) VALUES ('retention.media_deleted', 'user', 'RETENTION_POLICY', $1, $2::jsonb)`,
            [event.payload.runId, JSON.stringify({ subjectId: candidate.user_id, count: objects.rowCount })]);
          return { posts: 0, media: objects.rowCount ?? 0 };
        }
        return { posts: 0, media: 0 };
      });
      redactedPosts += result.posts;
      deletedMedia += result.media;
    }
    return { runId: event.payload.runId, redactedPosts, deletedMedia };
  }
}
