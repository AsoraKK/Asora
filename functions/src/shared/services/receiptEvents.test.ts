import {
  appendReceiptEvent,
  buildSignedReceiptPayload,
  computeProofSignalState,
  deriveTrustSummary,
  getReceiptEventsForPost,
  type ReceiptEvent,
} from './receiptEvents';
import { getTargetDatabase } from '@shared/clients/cosmos';

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

function makeEvent(overrides: Partial<ReceiptEvent> = {}): ReceiptEvent {
  return {
    id: '018f7f67-89ab-7cde-b123-1234567890ab',
    postId: 'post-1',
    actorType: 'system',
    type: 'RECEIPT_CREATED',
    createdAt: '2026-01-01T00:00:00.000Z',
    summary: 'Post created',
    reason: 'Recorded',
    policyLinks: [{ title: 'Policy', url: 'https://lythaus.app/policies/moderation' }],
    actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
    ...overrides,
  };
}

describe('receiptEvents', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.RECEIPT_SIGNING_SECRET = 'unit-test-secret';
    process.env.RECEIPT_SIGNING_KEY_ID = 'unit-test-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── appendReceiptEvent ──────────────────────────────────────────────
  it('appends receipt events using create only (append-only)', async () => {
    const create = jest.fn().mockResolvedValue({});
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: {
        items: { create },
      },
    });

    const event = await appendReceiptEvent({
      postId: 'post-123',
      actorType: 'user',
      actorId: 'user-1',
      type: 'RECEIPT_CREATED',
      summary: 'Post created',
      reason: 'Recorded for transparency.',
      policyLinks: [{ title: 'Policy', url: 'https://lythaus.app/policies/moderation' }],
      actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(event.id).toBeTruthy();
    expect(event.postId).toBe('post-123');
    expect(event.type).toBe('RECEIPT_CREATED');
  });

  it('sanitizes empty summary/reason to defaults', async () => {
    const create = jest.fn().mockResolvedValue({});
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: { items: { create } },
    });

    const event = await appendReceiptEvent({
      postId: 'p1',
      actorType: 'system',
      type: 'RECEIPT_CREATED',
      summary: '',
      reason: '   ',
      policyLinks: [],
      actions: [],
    });

    expect(event.summary).toBe('Event recorded');
    expect(event.reason).toBe('This action was recorded for transparency.');
  });

  it('adds default LEARN_MORE action and default policy links when empty', async () => {
    const create = jest.fn().mockResolvedValue({});
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: { items: { create } },
    });

    const event = await appendReceiptEvent({
      postId: 'p1',
      actorType: 'system',
      type: 'RECEIPT_CREATED',
      summary: 'Created',
      reason: 'Transparency.',
      policyLinks: [],
      actions: [{ key: 'APPEAL', label: '', enabled: true }],
    });

    expect(event.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'LEARN_MORE' }),
        expect.objectContaining({ key: 'APPEAL', label: 'Appeal' }),
      ])
    );
    expect(event.policyLinks.length).toBeGreaterThan(0);
    expect(event.policyLinks[0].url).toContain('https://');
  });

  it('filters out invalid policy link URLs', async () => {
    const create = jest.fn().mockResolvedValue({});
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: { items: { create } },
    });

    const event = await appendReceiptEvent({
      postId: 'p1',
      actorType: 'system',
      type: 'RECEIPT_CREATED',
      summary: 'Created',
      reason: 'Transparency.',
      policyLinks: [
        { title: 'Valid', url: 'https://example.com' },
        { title: 'Invalid', url: 'not-a-url' },
      ],
      actions: [],
    });

    expect(event.policyLinks).toEqual([{ title: 'Valid', url: 'https://example.com' }]);
  });

  // ── getReceiptEventsForPost ─────────────────────────────────────────
  it('queries and sorts events by createdAt', async () => {
    const resources = [
      { ...makeEvent({ id: 'b', createdAt: '2026-01-01T00:01:00Z' }), _partitionKey: 'post-1' },
      { ...makeEvent({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }), _partitionKey: 'post-1' },
    ];
    const fetchAll = jest.fn().mockResolvedValue({ resources });
    const query = jest.fn().mockReturnValue({ fetchAll });
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: { items: { query } },
    });

    const events = await getReceiptEventsForPost('post-1');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('WHERE c.postId = @postId'),
      }),
      expect.objectContaining({ partitionKey: 'post-1' })
    );
    expect(events[0].id).toBe('a');
    expect(events[1].id).toBe('b');
    // _partitionKey should be stripped
    expect((events[0] as Record<string, unknown>)._partitionKey).toBeUndefined();
  });

  it('strips actorId from moderator events when returning', async () => {
    const resources = [
      {
        ...makeEvent({ actorType: 'moderator', actorId: 'mod-secret-123', type: 'MODERATION_DECIDED' }),
        _partitionKey: 'post-1',
      },
    ];
    const fetchAll = jest.fn().mockResolvedValue({ resources });
    const query = jest.fn().mockReturnValue({ fetchAll });
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: { items: { query } },
    });

    const events = await getReceiptEventsForPost('post-1');

    expect(events[0].actorId).toBeUndefined();
    expect(events[0].actorType).toBe('moderator');
  });

  it('sorts events with same createdAt by id', async () => {
    const resources = [
      { ...makeEvent({ id: 'z', createdAt: '2026-01-01T00:00:00Z' }), _partitionKey: 'post-1' },
      { ...makeEvent({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }), _partitionKey: 'post-1' },
    ];
    const fetchAll = jest.fn().mockResolvedValue({ resources });
    const query = jest.fn().mockReturnValue({ fetchAll });
    (getTargetDatabase as jest.Mock).mockReturnValue({
      receiptEvents: { items: { query } },
    });

    const events = await getReceiptEventsForPost('post-1');

    expect(events[0].id).toBe('a');
    expect(events[1].id).toBe('z');
  });

  // ── buildSignedReceiptPayload ───────────────────────────────────────
  it('creates deterministic signatures for the same payload content', () => {
    const events: ReceiptEvent[] = [
      makeEvent({ id: '018f7f67-89ab-7cde-b123-1234567890ab' }),
      makeEvent({
        id: '018f7f67-89ab-7cde-b123-1234567890ac',
        type: 'MODERATION_DECIDED',
        createdAt: '2026-01-01T00:00:05.000Z',
        summary: 'Moderation completed',
        reason: 'No action',
        metadata: { moderationAction: 'none' },
      }),
    ];

    const payloadA = buildSignedReceiptPayload('post-1', [...events], '2026-01-01T01:00:00.000Z');
    const payloadB = buildSignedReceiptPayload('post-1', [...events].reverse(), '2026-01-01T01:00:00.000Z');

    expect(payloadA.signature).toBe(payloadB.signature);
    expect(payloadA.keyId).toBe('unit-test-key');
  });

  it('uses JWT_SECRET as fallback when RECEIPT_SIGNING_SECRET is unset', () => {
    delete process.env.RECEIPT_SIGNING_SECRET;
    process.env.JWT_SECRET = 'jwt-fallback';
    delete process.env.RECEIPT_SIGNING_KEY_ID;

    const payload = buildSignedReceiptPayload('post-1', [makeEvent()], '2026-01-01T00:00:00Z');

    expect(payload.signature).toBeTruthy();
    expect(payload.keyId).toBe('receipt-v1');
  });

  it('uses dev-only default when no signing secret is configured', () => {
    delete process.env.RECEIPT_SIGNING_SECRET;
    delete process.env.JWT_SECRET;

    const payload = buildSignedReceiptPayload('post-1', [makeEvent()], '2026-01-01T00:00:00Z');

    expect(payload.signature).toBeTruthy();
  });

  it('strips moderator actorId from signed payload events', () => {
    const events = [makeEvent({ actorType: 'moderator', actorId: 'mod-secret' })];

    const payload = buildSignedReceiptPayload('post-1', events, '2026-01-01T00:00:00Z');

    expect(payload.events[0].actorId).toBeUndefined();
  });

  // ── computeProofSignalState ─────────────────────────────────────────
  it('returns all-false when input is undefined', () => {
    const result = computeProofSignalState(undefined);

    expect(result.captureHashProvided).toBe(false);
    expect(result.editHashProvided).toBe(false);
    expect(result.sourceAttestationProvided).toBe(false);
    expect(result.proofSignalsProvided).toBe(false);
    expect(result.verifiedContextBadgeEligible).toBe(false);
    expect(result.featuredEligible).toBe(false);
  });

  it('detects capture metadata hash as a valid proof signal', () => {
    const result = computeProofSignalState({
      captureMetadataHash: 'sha256-abc12345',
    });

    expect(result.captureHashProvided).toBe(true);
    expect(result.proofSignalsProvided).toBe(true);
    expect(result.verifiedContextBadgeEligible).toBe(true);
    expect(result.featuredEligible).toBe(false); // need 2 signals or attestation
  });

  it('rejects hash values shorter than 8 chars', () => {
    const result = computeProofSignalState({
      captureMetadataHash: 'short',
      editHistoryHash: '1234567',
    });

    expect(result.captureHashProvided).toBe(false);
    expect(result.editHashProvided).toBe(false);
    expect(result.captureMetadataHash).toBeUndefined();
  });

  it('rejects non-string hash values', () => {
    const result = computeProofSignalState({
      captureMetadataHash: 12345678 as unknown as string,
    });

    expect(result.captureHashProvided).toBe(false);
  });

  it('validates attestation URLs (requires http/https)', () => {
    const validResult = computeProofSignalState({
      sourceAttestationUrl: 'https://c2pa.org/manifest/abc123',
    });
    expect(validResult.sourceAttestationProvided).toBe(true);
    expect(validResult.featuredEligible).toBe(true);

    const invalidResult = computeProofSignalState({
      sourceAttestationUrl: 'ftp://invalid.com/file',
    });
    expect(invalidResult.sourceAttestationProvided).toBe(false);
  });

  it('rejects non-URL attestation strings', () => {
    const result = computeProofSignalState({
      sourceAttestationUrl: 'not-a-url-at-all',
    });
    expect(result.sourceAttestationProvided).toBe(false);
  });

  it('rejects non-string attestation values', () => {
    const result = computeProofSignalState({
      sourceAttestationUrl: 42 as unknown as string,
    });
    expect(result.sourceAttestationProvided).toBe(false);
  });

  it('rejects empty/whitespace-only attestation URL', () => {
    const result = computeProofSignalState({
      sourceAttestationUrl: '   ',
    });
    expect(result.sourceAttestationProvided).toBe(false);
  });

  it('marks featuredEligible when 2+ signals are provided', () => {
    const result = computeProofSignalState({
      captureMetadataHash: 'sha256-abcdefgh',
      editHistoryHash: 'sha256-12345678',
    });

    expect(result.featuredEligible).toBe(true);
    expect(result.proofSignalsProvided).toBe(true);
  });

  // ── deriveTrustSummary ──────────────────────────────────────────────
  it('derives under_appeal trust status when appeal is open', () => {
    const summary = deriveTrustSummary(
      [makeEvent({ type: 'APPEAL_OPENED' })],
      {
        hasMedia: false,
        isActioned: false,
        appealStatus: 'pending',
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.trustStatus).toBe('under_appeal');
    expect(summary.timeline.appeal).toBe('open');
  });

  it('derives actioned status for blocked content', () => {
    const summary = deriveTrustSummary(
      [makeEvent({ type: 'MODERATION_DECIDED', metadata: { moderationAction: 'blocked' } })],
      {
        hasMedia: false,
        isActioned: false,
        appealStatus: null,
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.trustStatus).toBe('actioned');
    expect(summary.timeline.moderation).toBe('actioned');
  });

  it('derives actioned status for removed content', () => {
    const summary = deriveTrustSummary(
      [makeEvent({ type: 'MODERATION_DECIDED', metadata: { moderationAction: 'removed' } })],
      {
        hasMedia: false,
        isActioned: false,
        appealStatus: null,
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.trustStatus).toBe('actioned');
    expect(summary.timeline.moderation).toBe('actioned');
  });

  it('derives warn moderation timeline for limited content', () => {
    const summary = deriveTrustSummary(
      [makeEvent({ type: 'MODERATION_DECIDED', metadata: { moderationAction: 'limited' } })],
      {
        hasMedia: false,
        isActioned: false,
        appealStatus: null,
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.timeline.moderation).toBe('warn');
    expect(summary.trustStatus).toBe('actioned');
  });

  it('derives verified_signals_attached when proof signals provided', () => {
    const summary = deriveTrustSummary(
      [makeEvent({
        metadata: {
          proofSignals: {
            captureHashProvided: true,
            editHashProvided: false,
            sourceAttestationProvided: false,
          },
        },
      })],
      {
        hasMedia: true,
        isActioned: false,
        appealStatus: null,
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.trustStatus).toBe('verified_signals_attached');
    expect(summary.proofSignalsProvided).toBe(true);
    expect(summary.verifiedContextBadgeEligible).toBe(true);
  });

  it('derives no_extra_signals for clean post without signals', () => {
    const summary = deriveTrustSummary([], {
      hasMedia: false,
      isActioned: false,
      appealStatus: null,
      proofSignalsProvided: false,
      verifiedContextBadgeEligible: false,
      featuredEligible: false,
    });

    expect(summary.trustStatus).toBe('no_extra_signals');
    expect(summary.timeline.moderation).toBe('none');
    expect(summary.timeline.mediaChecked).toBe('none');
  });

  it('derives mediaChecked complete when MEDIA_CHECKED event exists and hasMedia', () => {
    const summary = deriveTrustSummary(
      [makeEvent({ type: 'MEDIA_CHECKED' })],
      {
        hasMedia: true,
        isActioned: false,
        appealStatus: null,
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.timeline.mediaChecked).toBe('complete');
  });

  it('uses fallback isActioned when no moderation events exist', () => {
    const summary = deriveTrustSummary([], {
      hasMedia: false,
      isActioned: true,
      appealStatus: null,
      proofSignalsProvided: false,
      verifiedContextBadgeEligible: false,
      featuredEligible: false,
    });

    expect(summary.trustStatus).toBe('actioned');
  });

  it('derives resolved appeal from appealStatus fallback', () => {
    const summary = deriveTrustSummary([], {
      hasMedia: false,
      isActioned: false,
      appealStatus: 'approved',
      proofSignalsProvided: false,
      verifiedContextBadgeEligible: false,
      featuredEligible: false,
    });

    expect(summary.hasAppeal).toBe(true);
    expect(summary.timeline.appeal).toBe('resolved');
  });

  it('derives resolved appeal from APPEAL_RESOLVED event', () => {
    const summary = deriveTrustSummary(
      [makeEvent({ type: 'APPEAL_RESOLVED' })],
      {
        hasMedia: false,
        isActioned: false,
        appealStatus: 'rejected',
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.hasAppeal).toBe(true);
    expect(summary.timeline.appeal).toBe('resolved');
  });

  it('picks up proofSignalsProvided from fallback', () => {
    const summary = deriveTrustSummary([], {
      hasMedia: false,
      isActioned: false,
      appealStatus: null,
      proofSignalsProvided: true,
      verifiedContextBadgeEligible: true,
      featuredEligible: true,
    });

    expect(summary.proofSignalsProvided).toBe(true);
    expect(summary.verifiedContextBadgeEligible).toBe(true);
    expect(summary.featuredEligible).toBe(true);
    expect(summary.trustStatus).toBe('verified_signals_attached');
  });

  it('overrides fallback with OVERRIDE_APPLIED event', () => {
    const summary = deriveTrustSummary(
      [
        makeEvent({ type: 'MODERATION_DECIDED', metadata: { moderationAction: 'blocked' }, createdAt: '2026-01-01T00:00:00Z' }),
        makeEvent({ type: 'OVERRIDE_APPLIED', metadata: { moderationAction: 'none' }, createdAt: '2026-01-01T00:01:00Z' }),
      ],
      {
        hasMedia: false,
        isActioned: false,
        appealStatus: null,
        proofSignalsProvided: false,
        verifiedContextBadgeEligible: false,
        featuredEligible: false,
      }
    );

    expect(summary.timeline.moderation).toBe('complete');
  });

  it('derives appeal status "overridden" as resolved', () => {
    const summary = deriveTrustSummary([], {
      hasMedia: false,
      isActioned: false,
      appealStatus: 'overridden',
      proofSignalsProvided: false,
      verifiedContextBadgeEligible: false,
      featuredEligible: false,
    });

    expect(summary.hasAppeal).toBe(true);
    expect(summary.timeline.appeal).toBe('resolved');
  });
});
