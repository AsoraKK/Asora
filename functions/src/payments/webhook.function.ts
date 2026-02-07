/**
 * Payment Webhook Endpoint
 *
 * POST /api/payments/webhook
 *
 * Architecture placeholder — receives webhook events from the payment provider,
 * validates the signature, normalises events, and updates the user's subscription
 * document in Cosmos DB (which in turn drives tier/entitlement changes).
 *
 * ⚠️  NO PROVIDER IS WIRED YET. This endpoint will return 501 until a
 *     PaymentProviderAdapter is registered.
 *
 * Integration checklist when wiring a provider:
 * 1. Implement PaymentProviderAdapter (see types.ts)
 * 2. Set PAYMENT_PROVIDER env var and provider-specific secrets
 * 3. Register the adapter in getActiveAdapter() below
 * 4. Create the Cosmos `subscriptions` container (partition key: /userId)
 * 5. Wire tier changes to JWT claims refresh
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { getAzureLogger } from '@shared/utils/logger';

import type {
  PaymentProviderAdapter,
  PaymentEvent,
} from './types';

const log = getAzureLogger('payments');

// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry (populate when provider is chosen)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the active payment provider adapter, or null if not configured.
 *
 * When wiring a provider, import its adapter and return it here:
 * ```
 * import { RevenueCatAdapter } from './adapters/revenuecat';
 * if (process.env.PAYMENT_PROVIDER === 'revenuecat') {
 *   return new RevenueCatAdapter();
 * }
 * ```
 */
function getActiveAdapter(): PaymentProviderAdapter | null {
  // No provider wired yet
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a normalised payment event — upserts the subscription document
 * in Cosmos and triggers downstream tier changes.
 *
 * Idempotency: uses eventId to skip already-processed events.
 */
async function processEvent(_event: PaymentEvent): Promise<void> {
  // TODO: implement when Cosmos subscriptions container is created
  //
  // Pseudocode:
  // 1. Check idempotency store for event.eventId
  // 2. Upsert SubscriptionDocument:
  //    - tier = event.newTier
  //    - status = deriveStatus(event.type)
  //    - currentPeriodEnd = event.currentPeriodEnd
  //    - provider = event.provider
  //    - providerSubscriptionId = event.providerSubscriptionId
  //    - productId = event.productId
  //    - updatedAt = new Date().toISOString()
  // 3. Update user tier in PostgreSQL users table
  // 4. Optionally invalidate JWT cache / force token refresh
  // 5. Record idempotency marker
  //
  log.info(`[payments] Would process event: ${_event.type} for user ${_event.userId}`);
}
// ─────────────────────────────────────────────────────────────────────────────
// HTTP Handler
// ─────────────────────────────────────────────────────────────────────────────

app.http('payments_webhook', {
  methods: ['POST'],
  route: 'payments/webhook',
  authLevel: 'anonymous', // Webhook — auth is via signature verification
  handler: httpHandler(async (ctx) => {
    const adapter = getActiveAdapter();

    if (!adapter) {
      log.warn('[payments] Webhook received but no payment provider is configured.');
      return ctx.notImplemented('payments_webhook');
    }

    // Read raw body for signature verification
    const rawBody = await ctx.request.text();

    // Verify webhook signature
    const headers: Record<string, string> = {};
    ctx.request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const isValid = await adapter.verifySignature(headers, rawBody);
    if (!isValid) {
      log.warn('[payments] Webhook signature verification failed.');
      return ctx.unauthorized('Invalid webhook signature', 'invalid_signature');
    }

    // Parse into normalised events
    let events: PaymentEvent[];
    try {
      events = await adapter.parseEvents(rawBody);
    } catch (err) {
      log.error(`[payments] Failed to parse webhook payload: ${err instanceof Error ? err.message : String(err)}`);
      return ctx.badRequest('Failed to parse webhook payload');
    }

    // Process each event
    let processed = 0;
    for (const event of events) {
      try {
        await processEvent(event);
        processed++;
      } catch (err) {
        log.error(`[payments] Failed to process event ${event.eventId}: ${err instanceof Error ? err.message : String(err)}`);
        // Continue processing remaining events
      }
    }

    log.info(`[payments] Processed ${processed}/${events.length} webhook events.`);

    return ctx.ok({ ok: true, processed, total: events.length });
  }),
});
