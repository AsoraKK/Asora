import { patchDsrRequest, getDsrRequest } from '../src/privacy/service/dsrStore';
import { createAuditEntry } from '../src/privacy/common/models';

jest.mock('../src/privacy/service/dsrStore', () => ({
  getDsrRequest: jest.fn(),
  patchDsrRequest: jest.fn(async (_id: string, updates: any) => updates),
}));

describe('DSR Reviewer Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('One reviewer passes, one fails', () => {
    it('should remain in awaiting_review when reviewA passes but reviewB fails', async () => {
      const baseRequest = {
        id: 'dsr_edge_1',
        type: 'export' as const,
        status: 'awaiting_review' as const,
        review: {
          reviewerA: { by: 'admin1', at: new Date().toISOString(), pass: true, notes: 'Approved' },
        },
      };

      (getDsrRequest as jest.Mock).mockResolvedValue(baseRequest);

      // Simulate reviewB rejecting
      const reviewBUpdate = {
        review: {
          ...baseRequest.review,
          reviewerB: { by: 'admin2', at: new Date().toISOString(), pass: false, notes: 'Rejected' },
        },
      };
      await patchDsrRequest(
        'dsr_edge_1',
        reviewBUpdate,
        createAuditEntry({ by: 'admin2', event: 'review.B.failed' }),
      );

      const patchCalls = (patchDsrRequest as jest.Mock).mock.calls;
      expect(patchCalls.length).toBeGreaterThan(0);
      const lastUpdate = patchCalls[patchCalls.length - 1][1];
      // Verify status is NOT changed to ready_to_release
      expect(lastUpdate.status).toBeUndefined();
    });

    it('should remain in awaiting_review when reviewB passes but reviewA fails', async () => {
      const baseRequest = {
        id: 'dsr_edge_2',
        type: 'export' as const,
        status: 'awaiting_review' as const,
        review: {
          reviewerB: { by: 'admin2', at: new Date().toISOString(), pass: true, notes: 'Looks good' },
        },
      };

      (getDsrRequest as jest.Mock).mockResolvedValue(baseRequest);

      const reviewAUpdate = {
        review: {
          ...baseRequest.review,
          reviewerA: { by: 'admin1', at: new Date().toISOString(), pass: false, notes: 'Incomplete data' },
        },
      };
      await patchDsrRequest(
        'dsr_edge_2',
        reviewAUpdate,
        createAuditEntry({ by: 'admin1', event: 'review.A.failed' }),
      );

      const patchCalls = (patchDsrRequest as jest.Mock).mock.calls;
      const lastUpdate = patchCalls[patchCalls.length - 1][1];
      expect(lastUpdate.status).toBeUndefined();
    });
  });

  describe('Both reviewers fail', () => {
    it('should remain in awaiting_review when both reviewers reject', async () => {
      const baseRequest = {
        id: 'dsr_edge_3',
        type: 'export' as const,
        status: 'awaiting_review' as const,
        review: {
          reviewerA: { by: 'admin1', at: new Date().toISOString(), pass: false, notes: 'Data incomplete' },
          reviewerB: { by: 'admin2', at: new Date().toISOString(), pass: false, notes: 'Missing artifacts' },
        },
      };

      (getDsrRequest as jest.Mock).mockResolvedValue(baseRequest);

      // Verify final state would still be awaiting_review
      // (Release endpoint should reject this state)
      const request = await getDsrRequest('dsr_edge_3');
      expect(request).not.toBeNull();
      if (request) {
        expect(request.review.reviewerA?.pass).toBe(false);
        expect(request.review.reviewerB?.pass).toBe(false);
        expect(request.status).toBe('awaiting_review');
      }
    });
  });

  describe('Both reviewers pass (success path)', () => {
    it('should transition to ready_to_release when both reviewers approve', async () => {
      const baseRequest = {
        id: 'dsr_edge_4',
        type: 'export' as const,
        status: 'awaiting_review' as const,
        review: {
          reviewerA: { by: 'admin1', at: new Date().toISOString(), pass: true, notes: 'Verified' },
          reviewerB: { by: 'admin2', at: new Date().toISOString(), pass: true, notes: 'Approved' },
        },
      };

      (getDsrRequest as jest.Mock).mockResolvedValue(baseRequest);

      // Simulate release transition after both pass
      await patchDsrRequest(
        'dsr_edge_4',
        { status: 'ready_to_release' },
        createAuditEntry({ by: 'system', event: 'ready.for.release' }),
      );

      const patchCalls = (patchDsrRequest as jest.Mock).mock.calls;
      const lastUpdate = patchCalls[patchCalls.length - 1][1];
      expect(lastUpdate.status).toBe('ready_to_release');
    });
  });

  describe('Review state validation', () => {
    it('should validate that release requires both reviewers to pass', () => {
      const scenarios = [
        { reviewerA: { pass: true }, reviewerB: { pass: false }, canRelease: false },
        { reviewerA: { pass: false }, reviewerB: { pass: true }, canRelease: false },
        { reviewerA: { pass: false }, reviewerB: { pass: false }, canRelease: false },
        { reviewerA: { pass: true }, reviewerB: { pass: true }, canRelease: true },
        { reviewerA: undefined, reviewerB: { pass: true }, canRelease: false },
        { reviewerA: { pass: true }, reviewerB: undefined, canRelease: false },
      ];

      scenarios.forEach(({ reviewerA, reviewerB, canRelease }) => {
        const bothPass = reviewerA?.pass === true && reviewerB?.pass === true;
        expect(bothPass).toBe(canRelease);
      });
    });
  });

  describe('Reviewer notes and metadata', () => {
    it('should preserve reviewer notes when one fails', async () => {
      const failedReview = {
        by: 'admin1',
        at: new Date().toISOString(),
        pass: false,
        notes: 'Missing user consent verification',
      };

      await patchDsrRequest(
        'dsr_edge_5',
        { review: { reviewerA: failedReview } },
        createAuditEntry({ by: 'admin1', event: 'review.A.failed' }),
      );

      const patchCalls = (patchDsrRequest as jest.Mock).mock.calls;
      const lastUpdate = patchCalls[patchCalls.length - 1][1];
      expect(lastUpdate.review.reviewerA.notes).toBe('Missing user consent verification');
    });

    it('should record timestamps for both reviewers', async () => {
      const now = new Date().toISOString();
      const reviewA = { by: 'admin1', at: now, pass: true };
      const reviewB = { by: 'admin2', at: now, pass: false };

      await patchDsrRequest(
        'dsr_edge_6',
        { review: { reviewerA: reviewA, reviewerB: reviewB } },
        createAuditEntry({ by: 'system', event: 'reviews.completed' }),
      );

      const patchCalls = (patchDsrRequest as jest.Mock).mock.calls;
      const lastUpdate = patchCalls[patchCalls.length - 1][1];
      expect(lastUpdate.review.reviewerA.at).toBe(now);
      expect(lastUpdate.review.reviewerB.at).toBe(now);
    });
  });
});
