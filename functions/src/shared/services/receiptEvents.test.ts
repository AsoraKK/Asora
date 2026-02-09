import {
  appendReceiptEvent,
  buildSignedReceiptPayload,
  deriveTrustSummary,
  type ReceiptEvent,
} from './receiptEvents';
import { getTargetDatabase } from '@shared/clients/cosmos';

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

describe('receiptEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RECEIPT_SIGNING_SECRET = 'unit-test-secret';
    process.env.RECEIPT_SIGNING_KEY_ID = 'unit-test-key';
  });

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

  it('creates deterministic signatures for the same payload content', () => {
    const events: ReceiptEvent[] = [
      {
        id: '018f7f67-89ab-7cde-b123-1234567890ab',
        postId: 'post-1',
        actorType: 'system',
        type: 'RECEIPT_CREATED',
        createdAt: '2026-01-01T00:00:00.000Z',
        summary: 'Post created',
        reason: 'Recorded',
        policyLinks: [{ title: 'Policy', url: 'https://lythaus.app/policies/moderation' }],
        actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
      },
      {
        id: '018f7f67-89ab-7cde-b123-1234567890ac',
        postId: 'post-1',
        actorType: 'system',
        type: 'MODERATION_DECIDED',
        createdAt: '2026-01-01T00:00:05.000Z',
        summary: 'Moderation completed',
        reason: 'No action',
        policyLinks: [{ title: 'Policy', url: 'https://lythaus.app/policies/moderation' }],
        actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
        metadata: { moderationAction: 'none' },
      },
    ];

    const payloadA = buildSignedReceiptPayload('post-1', [...events], '2026-01-01T01:00:00.000Z');
    const payloadB = buildSignedReceiptPayload('post-1', [...events].reverse(), '2026-01-01T01:00:00.000Z');

    expect(payloadA.signature).toBe(payloadB.signature);
    expect(payloadA.keyId).toBe('unit-test-key');
  });

  it('derives under_appeal trust status when appeal is open', () => {
    const summary = deriveTrustSummary(
      [
        {
          id: '1',
          postId: 'post-1',
          actorType: 'user',
          type: 'APPEAL_OPENED',
          createdAt: '2026-01-01T00:00:00.000Z',
          summary: 'Appeal opened',
          reason: 'Review requested',
          policyLinks: [{ title: 'Appeals', url: 'https://lythaus.app/policies/appeals' }],
          actions: [{ key: 'LEARN_MORE', label: 'Learn more', enabled: true }],
        },
      ],
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
});

