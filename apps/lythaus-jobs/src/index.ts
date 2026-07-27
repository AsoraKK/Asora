import { query, type HyperdriveBinding } from '@lythaus/db';
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

async function processMessage(message: QueueMessage, env: Env): Promise<void> {
  const eventId = message.body.eventId ?? message.id;
  const seen = await query(env.DB_JOBS_FRESH,
    `SELECT 1 FROM system.consumer_inbox WHERE consumer_name = 'lythaus-jobs' AND event_id = $1`, [eventId]);
  if (seen.rowCount !== 0) {
    message.ack();
    return;
  }
  const eventType = message.body.eventType ?? 'unknown';
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
