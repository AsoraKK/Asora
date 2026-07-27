import { query, transaction, type HyperdriveBinding } from '@lythaus/db';
import type { EnvBindings } from '@lythaus/cloudflare-env';
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
}

interface Queue { send(body: unknown, options?: { contentType?: string }): Promise<void>; }

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

function hasMagicBytes(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return bytes.length >= 8 && bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  if (contentType === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (contentType === 'image/avif') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp' && ['avif', 'avis'].includes(new TextDecoder().decode(bytes.slice(8, 12)));
  return false;
}

async function processMediaUpload(message: QueueMessage, env: Env): Promise<void> {
  const sessionId = typeof message.body.uploadSessionId === 'string' ? message.body.uploadSessionId : undefined;
  const objectKey = typeof message.body.objectKey === 'string' ? message.body.objectKey : undefined;
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

  const source = await env.MEDIA_QUARANTINE.get(objectKey);
  if (!source) throw new Error('quarantine_object_missing');
  const bytes = new Uint8Array(await new Response(source.body).arrayBuffer());
  if (bytes.byteLength !== Number(row.expected_bytes) || !hasMagicBytes(bytes, row.content_type)) {
    await query(env.DB_JOBS_FRESH, `UPDATE media.upload_sessions SET status = 'rejected' WHERE id = $1 AND status = 'queued'`, [sessionId]);
    await env.MEDIA_QUARANTINE.delete(objectKey);
    return;
  }

  const sourceInfo = await env.IMAGES.info(new Response(bytes).body!);
  if (!sourceInfo.width || !sourceInfo.height || sourceInfo.width * sourceInfo.height > MAX_IMAGE_PIXELS) {
    await query(env.DB_JOBS_FRESH, `UPDATE media.upload_sessions SET status = 'rejected' WHERE id = $1 AND status = 'queued'`, [sessionId]);
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

  await transaction(env.DB_JOBS_FRESH, async (client) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO media.objects (owner_id, object_key, content_type, byte_size, sha256, state)
       VALUES ($1, $2, 'image/webp', $3, $4, 'approved') ON CONFLICT (object_key) DO NOTHING RETURNING id`,
      [row.user_id, approvedKey, approvedBytes.byteLength, sha256]
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
        `INSERT INTO media.storage_ledger (user_id, bytes_uploaded, bytes_approved, object_count)
         VALUES ($1, $2, $2, 1)
         ON CONFLICT (user_id) DO UPDATE SET bytes_uploaded = media.storage_ledger.bytes_uploaded + EXCLUDED.bytes_uploaded,
           bytes_approved = media.storage_ledger.bytes_approved + EXCLUDED.bytes_approved,
           object_count = media.storage_ledger.object_count + 1,
           last_reconciled_at = now()`,
        [row.user_id, approvedBytes.byteLength]
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
  if (eventType === 'media.upload.finalised') await processMediaUpload(message, env);
  if (eventType === 'privacy.request.created') {
    const payload = (message.body.payload ?? {}) as { requestId?: string; requestType?: string };
    const subjectId = message.body.actorId;
    if (!payload.requestId || !subjectId || !['export', 'delete', 'rectify'].includes(payload.requestType ?? '')) throw new Error('privacy_event_invalid');
    await query(env.DB_PRIVACY_FRESH,
      `INSERT INTO privacy.requests (id, subject_id, request_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`, [payload.requestId, subjectId, payload.requestType]);
    await query(env.DB_PRIVACY_FRESH,
      `INSERT INTO privacy.request_events (id, request_id, event_type, metadata)
       VALUES ($1, $2, 'received', $3::jsonb)
       ON CONFLICT (id) DO NOTHING`, [eventId, payload.requestId, JSON.stringify({ eventId })]);
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
  },
};

export class AccountDeleteWorkflow extends WorkflowEntrypoint<Env, { subjectId: string }> {
  async run(event: WorkflowEvent<{ subjectId: string }>, step: WorkflowStep): Promise<{ subjectId: string; state: string }> {
    await step.do('record-deletion-start', async () => {
      await query(this.env.DB_PRIVACY_FRESH, `INSERT INTO privacy.request_events (request_id, event_type, metadata) SELECT id, 'workflow_started', $1::jsonb FROM privacy.requests WHERE subject_id = $2 AND request_type = 'delete' AND state <> 'completed' ORDER BY created_at DESC LIMIT 1`, [JSON.stringify({ subjectId: event.payload.subjectId }), event.payload.subjectId]);
      return true;
    });
    return { subjectId: event.payload.subjectId, state: 'started' };
  }
}
