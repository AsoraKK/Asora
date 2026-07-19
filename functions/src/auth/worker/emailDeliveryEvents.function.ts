import { app, type EventGridEvent, type InvocationContext } from '@azure/functions';

import { getPool } from '@shared/clients/postgres';
import { deliveryRecipientReference } from '../service/emailToken';

type DeliveryEventData = {
  messageId?: unknown;
  recipient?: unknown;
  deliveryStatus?: unknown;
  status?: unknown;
};

const terminalStates = new Set([
  'delivered',
  'bounced',
  'suppressed',
  'quarantined',
  'filtered_spam',
  'failed',
]);

function terminalState(value: unknown): string {
  const normalized = typeof value === 'string'
    ? value.trim().replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase()
    : '';
  return terminalStates.has(normalized) ? normalized : 'unknown';
}

export async function handleEmailDeliveryEvent(event: EventGridEvent, context: InvocationContext): Promise<void> {
  if (event.eventType === 'Microsoft.EventGrid.SubscriptionValidationEvent') return;
  if (event.eventType !== 'Microsoft.Communication.EmailDeliveryReportReceived') return;

  const expectedSource = process.env.ACS_EMAIL_EVENT_SOURCE?.trim();
  if (expectedSource && event.topic !== expectedSource) {
    context.warn('[auth-email-delivery] rejected unexpected event source');
    return;
  }

  const data = (event.data || {}) as DeliveryEventData;
  const messageId = typeof data.messageId === 'string' ? data.messageId : null;
  if (!event.id || !messageId) {
    context.warn('[auth-email-delivery] rejected malformed delivery event');
    return;
  }

  const recipientRef = typeof data.recipient === 'string'
    ? deliveryRecipientReference(data.recipient.trim().normalize('NFKC').toLowerCase())
    : null;
  const state = terminalState(data.deliveryStatus ?? data.status);
  const occurredAt = new Date(event.eventTime);
  if (Number.isNaN(occurredAt.getTime())) {
    context.warn('[auth-email-delivery] rejected invalid delivery event time');
    return;
  }

  const inserted = await getPool().query(
    `INSERT INTO email_auth_delivery_events
       (event_id, provider_message_id, recipient_ref, state, occurred_at, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.id, messageId, recipientRef, state, occurredAt]
  );
  if (inserted.rowCount !== 1) return;

  // Preserve unknown future provider states for audit, but never treat them as
  // terminal delivery outcomes until the mapping is reviewed.
  if (state === 'unknown') return;

  await getPool().query(
    `UPDATE email_auth_deliveries
     SET terminal_state = $2, terminal_at = $3, updated_at = NOW()
     WHERE provider_message_id = $1
       AND (terminal_at IS NULL OR terminal_at <= $3)`,
    [messageId, state, occurredAt]
  );
}

app.eventGrid('auth_email_delivery_events', {
  handler: handleEmailDeliveryEvent,
});
