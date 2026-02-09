import { createHmac } from 'crypto';
import { v7 as uuidv7 } from 'uuid';
import stableStringify from 'fast-json-stable-stringify';
import { getTargetDatabase } from '@shared/clients/cosmos';

export type ReceiptEventType =
  | 'RECEIPT_CREATED'
  | 'MEDIA_CHECKED'
  | 'MODERATION_DECIDED'
  | 'APPEAL_OPENED'
  | 'VOTE_CAST'
  | 'APPEAL_RESOLVED'
  | 'OVERRIDE_APPLIED';

export type ReceiptActionKey = 'APPEAL' | 'LEARN_MORE';

export interface ReceiptPolicyLink {
  title: string;
  url: string;
}

export interface ReceiptAction {
  key: ReceiptActionKey;
  label: string;
  enabled: boolean;
}

export interface ReceiptProofSignals {
  captureHashProvided?: boolean;
  editHashProvided?: boolean;
  sourceAttestationProvided?: boolean;
}

export interface ReceiptEventMetadata {
  appealId?: string;
  moderationAction?: 'none' | 'limited' | 'blocked' | 'removed';
  proofSignals?: ReceiptProofSignals;
  vote?: { choice: 'for' | 'against' };
}

export interface ReceiptEvent {
  id: string;
  postId: string;
  actorType: 'system' | 'user' | 'moderator';
  actorId?: string;
  type: ReceiptEventType;
  createdAt: string;
  summary: string;
  reason: string;
  policyLinks: ReceiptPolicyLink[];
  actions: ReceiptAction[];
  metadata?: ReceiptEventMetadata;
}

interface ReceiptEventDocument extends ReceiptEvent {
  _partitionKey: string;
}

export interface ReceiptProofSignalsInput {
  captureMetadataHash?: string;
  editHistoryHash?: string;
  sourceAttestationUrl?: string;
}

export interface ComputedProofSignals {
  captureMetadataHash?: string;
  editHistoryHash?: string;
  sourceAttestationUrl?: string;
  captureHashProvided: boolean;
  editHashProvided: boolean;
  sourceAttestationProvided: boolean;
  proofSignalsProvided: boolean;
  verifiedContextBadgeEligible: boolean;
  featuredEligible: boolean;
}

export type TrustStatus =
  | 'verified_signals_attached'
  | 'no_extra_signals'
  | 'under_appeal'
  | 'actioned';

export interface PostTrustTimeline {
  created: 'complete';
  mediaChecked: 'complete' | 'none';
  moderation: 'complete' | 'warn' | 'actioned' | 'none';
  appeal?: 'open' | 'resolved';
}

export interface PostTrustSummary {
  trustStatus: TrustStatus;
  timeline: PostTrustTimeline;
  hasAppeal: boolean;
  proofSignalsProvided: boolean;
  verifiedContextBadgeEligible: boolean;
  featuredEligible: boolean;
}

export interface SignedReceiptPayload {
  postId: string;
  events: ReceiptEvent[];
  issuedAt: string;
  keyId: string;
  signature: string;
}

const DEFAULT_POLICY_LINKS: ReceiptPolicyLink[] = [
  { title: 'Moderation policy', url: 'https://lythaus.app/policies/moderation' },
];

const LEARN_MORE_ACTION: ReceiptAction = {
  key: 'LEARN_MORE',
  label: 'Learn more',
  enabled: true,
};

function safeTrim(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeActions(actions: ReceiptAction[] | undefined): ReceiptAction[] {
  if (!actions || actions.length === 0) {
    return [LEARN_MORE_ACTION];
  }

  const normalized = actions.map((action) => ({
    key: action.key,
    label: safeTrim(action.label, action.key === 'APPEAL' ? 'Appeal' : 'Learn more'),
    enabled: Boolean(action.enabled),
  }));

  if (!normalized.some((action) => action.key === 'LEARN_MORE')) {
    normalized.push(LEARN_MORE_ACTION);
  }

  return normalized;
}

function sanitizePolicyLinks(links: ReceiptPolicyLink[] | undefined): ReceiptPolicyLink[] {
  if (!links || links.length === 0) {
    return DEFAULT_POLICY_LINKS;
  }

  return links
    .map((link) => ({
      title: safeTrim(link.title, 'Policy'),
      url: safeTrim(link.url, 'https://lythaus.app/policies/moderation'),
    }))
    .filter((link) => /^https?:\/\//i.test(link.url));
}

export async function appendReceiptEvent(
  input: Omit<ReceiptEvent, 'id' | 'createdAt'>
): Promise<ReceiptEvent> {
  const nowIso = new Date().toISOString();
  const event: ReceiptEventDocument = {
    id: uuidv7(),
    postId: input.postId,
    actorType: input.actorType,
    actorId: input.actorId,
    type: input.type,
    createdAt: nowIso,
    summary: safeTrim(input.summary, 'Event recorded'),
    reason: safeTrim(input.reason, 'This action was recorded for transparency.'),
    policyLinks: sanitizePolicyLinks(input.policyLinks),
    actions: sanitizeActions(input.actions),
    metadata: input.metadata,
    _partitionKey: input.postId,
  };

  await getTargetDatabase().receiptEvents.items.create(event);
  const { _partitionKey: _ignored, ...publicEvent } = event;
  return publicEvent;
}

export async function getReceiptEventsForPost(postId: string): Promise<ReceiptEvent[]> {
  const response = await getTargetDatabase().receiptEvents.items
    .query<ReceiptEventDocument>(
      {
        query: 'SELECT * FROM c WHERE c.postId = @postId ORDER BY c.createdAt ASC',
        parameters: [{ name: '@postId', value: postId }],
      },
      {
        partitionKey: postId,
      }
    )
    .fetchAll();

  return response.resources
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return a.id.localeCompare(b.id);
      }
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map(({ _partitionKey: _ignored, ...event }) => sanitizeReceiptEvent(event));
}

function sanitizeReceiptEvent(event: ReceiptEvent): ReceiptEvent {
  if (event.actorType !== 'moderator') {
    return event;
  }

  const { actorId: _ignored, ...safeEvent } = event;
  return safeEvent;
}

function getReceiptSigningSecret(): string {
  return (
    process.env.RECEIPT_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'dev-only-receipt-signing-secret'
  );
}

function getReceiptKeyId(): string {
  return process.env.RECEIPT_SIGNING_KEY_ID || 'receipt-v1';
}

function signPayload(payload: Omit<SignedReceiptPayload, 'signature'>): string {
  const canonical = stableStringify(payload);
  return createHmac('sha256', getReceiptSigningSecret()).update(canonical).digest('base64');
}

export function buildSignedReceiptPayload(
  postId: string,
  events: ReceiptEvent[],
  issuedAt = new Date().toISOString()
): SignedReceiptPayload {
  const keyId = getReceiptKeyId();
  const sortedEvents = [...events].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.id.localeCompare(b.id);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
  const payload: Omit<SignedReceiptPayload, 'signature'> = {
    postId,
    events: sortedEvents.map(sanitizeReceiptEvent),
    issuedAt,
    keyId,
  };

  return {
    ...payload,
    signature: signPayload(payload),
  };
}

function normalizeHash(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length < 8) {
    return undefined;
  }
  return trimmed;
}

function normalizeAttestationUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function computeProofSignalState(
  input: ReceiptProofSignalsInput | undefined
): ComputedProofSignals {
  const captureMetadataHash = normalizeHash(input?.captureMetadataHash);
  const editHistoryHash = normalizeHash(input?.editHistoryHash);
  const sourceAttestationUrl = normalizeAttestationUrl(input?.sourceAttestationUrl);

  const captureHashProvided = Boolean(captureMetadataHash);
  const editHashProvided = Boolean(editHistoryHash);
  const sourceAttestationProvided = Boolean(sourceAttestationUrl);
  const signalCount = Number(captureHashProvided) + Number(editHashProvided) + Number(sourceAttestationProvided);
  const proofSignalsProvided = signalCount > 0;
  const verifiedContextBadgeEligible = proofSignalsProvided;
  const featuredEligible = signalCount >= 2 || sourceAttestationProvided;

  return {
    captureMetadataHash,
    editHistoryHash,
    sourceAttestationUrl,
    captureHashProvided,
    editHashProvided,
    sourceAttestationProvided,
    proofSignalsProvided,
    verifiedContextBadgeEligible,
    featuredEligible,
  };
}

export function deriveTrustSummary(
  events: ReceiptEvent[],
  fallback: {
    hasMedia: boolean;
    isActioned: boolean;
    appealStatus?: string | null;
    proofSignalsProvided: boolean;
    verifiedContextBadgeEligible: boolean;
    featuredEligible: boolean;
  }
): PostTrustSummary {
  const latestModeration = [...events]
    .reverse()
    .find((event) => event.type === 'MODERATION_DECIDED' || event.type === 'OVERRIDE_APPLIED');
  const latestAppeal = [...events]
    .reverse()
    .find((event) => event.type === 'APPEAL_OPENED' || event.type === 'APPEAL_RESOLVED');
  const hasAppealEvent = events.some((event) =>
    event.type === 'APPEAL_OPENED' || event.type === 'APPEAL_RESOLVED'
  );
  const hasMediaChecked = events.some((event) => event.type === 'MEDIA_CHECKED');

  const moderationAction =
    latestModeration?.metadata?.moderationAction ||
    (fallback.isActioned ? 'blocked' : 'none');

  const moderationTimeline: PostTrustTimeline['moderation'] =
    moderationAction === 'blocked' || moderationAction === 'removed'
      ? 'actioned'
      : moderationAction === 'limited'
        ? 'warn'
        : latestModeration
          ? 'complete'
          : 'none';

  const appealStatusRaw = (fallback.appealStatus || '').toLowerCase();
  const appealOpen =
    appealStatusRaw === 'pending' ||
    latestAppeal?.type === 'APPEAL_OPENED';
  const appealResolved =
    appealStatusRaw === 'approved' ||
    appealStatusRaw === 'rejected' ||
    appealStatusRaw === 'overridden' ||
    latestAppeal?.type === 'APPEAL_RESOLVED';

  const hasAppeal = hasAppealEvent || appealOpen || appealResolved;
  const proofSignalsProvided =
    fallback.proofSignalsProvided ||
    events.some((event) =>
      Boolean(
        event.metadata?.proofSignals?.captureHashProvided ||
          event.metadata?.proofSignals?.editHashProvided ||
          event.metadata?.proofSignals?.sourceAttestationProvided
      )
    );

  const verifiedContextBadgeEligible =
    fallback.verifiedContextBadgeEligible || proofSignalsProvided;

  const trustStatus: TrustStatus = appealOpen
    ? 'under_appeal'
    : moderationAction === 'blocked' || moderationAction === 'removed' || fallback.isActioned
      ? 'actioned'
      : proofSignalsProvided
        ? 'verified_signals_attached'
        : 'no_extra_signals';

  return {
    trustStatus,
    timeline: {
      created: 'complete',
      mediaChecked: fallback.hasMedia ? (hasMediaChecked ? 'complete' : 'none') : 'none',
      moderation: moderationTimeline,
      appeal: hasAppeal ? (appealOpen ? 'open' : 'resolved') : undefined,
    },
    hasAppeal,
    proofSignalsProvided,
    verifiedContextBadgeEligible,
    featuredEligible: fallback.featuredEligible,
  };
}

