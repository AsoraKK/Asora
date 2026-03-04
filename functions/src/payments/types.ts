/**
 * Payment / Subscription Types
 *
 * Architecture-only definitions for future IAP/payment integration.
 * These types define the domain model — no payment provider is wired yet.
 *
 * When a provider is chosen (RevenueCat, Apple StoreKit 2, Google Billing Library),
 * implement the `PaymentProviderAdapter` interface and register the webhook handler.
 */

import type { UserTier } from '@shared/services/tierLimits';

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Document (Cosmos DB: subscriptions container)
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'expired'
  | 'trialing';

export type PaymentProvider = 'apple' | 'google' | 'stripe' | 'manual';

/**
 * Stored in Cosmos `subscriptions` container. Partition key = userId.
 */
export interface SubscriptionDocument {
  /** Cosmos document ID — same as `userId` for 1:1 mapping */
  id: string;
  /** User's platform ID (from JWT `sub` claim) */
  userId: string;
  /** Current tier — drives entitlements everywhere */
  tier: UserTier;
  /** Lifecycle status */
  status: SubscriptionStatus;
  /** Which provider manages this subscription */
  provider: PaymentProvider | null;
  /** Provider's own subscription/transaction ID */
  providerSubscriptionId: string | null;
  /** Provider's product/plan identifier */
  productId: string | null;
  /** End of current billing period (ISO 8601) */
  currentPeriodEnd: string | null;
  /** Will the subscription cancel at period end? */
  cancelAtPeriodEnd: boolean;
  /** ISO 8601 — when this record was created */
  createdAt: string;
  /** ISO 8601 — last update */
  updatedAt: string;
  /** Cosmos TTL (seconds) — set for expired records cleanup */
  ttl?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Events (provider-agnostic envelope)
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentEventType =
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'subscription_billing_issue'
  | 'subscription_reactivated'
  | 'trial_started'
  | 'trial_ended'
  | 'refund';

/**
 * Normalised webhook event — each provider adapter transforms raw
 * payloads into this shape before the core handler processes it.
 */
export interface PaymentEvent {
  /** Unique event ID (for idempotency) */
  eventId: string;
  /** Classified event type */
  type: PaymentEventType;
  /** User ID the event applies to */
  userId: string;
  /** Which provider sent this */
  provider: PaymentProvider;
  /** Provider's subscription/transaction ID */
  providerSubscriptionId: string;
  /** Product/plan that was purchased */
  productId: string;
  /** New tier implied by this event */
  newTier: UserTier;
  /** End of the new billing period (ISO 8601, nullable for cancellations) */
  currentPeriodEnd: string | null;
  /** ISO 8601 — when the provider recorded this event */
  occurredAt: string;
  /** Raw provider payload for audit/debugging */
  rawPayload: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Each payment provider (Apple, Google, RevenueCat, Stripe) implements
 * this interface. Only one adapter is active per deployment.
 */
export interface PaymentProviderAdapter {
  /** Unique provider key */
  readonly provider: PaymentProvider;

  /**
   * Verify the webhook signature / authenticity.
   * Returns true if valid, false otherwise.
   */
  verifySignature(headers: Record<string, string>, body: string): Promise<boolean>;

  /**
   * Parse the raw webhook body into normalised PaymentEvent(s).
   * A single webhook may contain multiple events (e.g. RevenueCat batch).
   */
  parseEvents(body: string): Promise<PaymentEvent[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier ↔ Product Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps provider product IDs to internal tiers.
 * Populate when a provider is chosen.
 *
 * Example:
 * ```
 * const PRODUCT_TIER_MAP: ProductTierMapping = {
 *   'com.asora.premium.monthly': 'premium',
 *   'com.asora.premium.annual': 'premium',
 *   'com.asora.black.monthly': 'black',
 *   'com.asora.black.annual': 'black',
 * };
 * ```
 */
export type ProductTierMapping = Record<string, UserTier>;

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Status Response (API surface)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape returned by GET /api/subscription/status
 */
export interface SubscriptionStatusResponse {
  userId: string;
  tier: UserTier;
  status: SubscriptionStatus;
  provider: PaymentProvider | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: {
    dailyPosts: number;
    maxMediaSizeMB: number;
    maxMediaPerPost: number;
  };
}
