import { recordReputationEvent, REPUTATION_EVENTS } from './reputationEventService';
import { LedgerEventType, ReputationLevel } from './types';
import { adjustReputation } from '@shared/services/reputationService';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { appendLedgerEntry } from './ledgerService';

jest.mock('@shared/services/reputationService', () => ({
  adjustReputation: jest.fn().mockResolvedValue({ newScore: 10, previousScore: 9 }),
  REPUTATION_ADJUSTMENTS: { CONTENT_REMOVED_OTHER: -3 },
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

jest.mock('./ledgerService', () => ({
  appendLedgerEntry: jest.fn().mockResolvedValue({ id: 'ledger-entry-1' }),
}));

const mockUserRead = jest.fn();
const mockUserReplace = jest.fn();

function setupUserContainerMock() {
  (getCosmosDatabase as jest.Mock).mockReturnValue({
    container: jest.fn().mockReturnValue({
      item: jest.fn().mockReturnValue({
        read: mockUserRead,
        replace: mockUserReplace,
      }),
    }),
  });
}

describe('reputationEventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUserContainerMock();
    mockUserRead.mockResolvedValue({
      resource: {
        id: 'user-1',
        reputationScore: 10,
        pillarScores: {},
      },
    });
    mockUserReplace.mockResolvedValue({});
  });

  // ── REPUTATION_EVENTS config ──────────────────────────────────────────
  describe('REPUTATION_EVENTS config', () => {
    it('has an entry for every LedgerEventType', () => {
      const definedTypes = Object.values(LedgerEventType);
      for (const eventType of definedTypes) {
        expect(REPUTATION_EVENTS[eventType]).toBeDefined();
      }
    });

    it('HUMAN_TEXT_250_PLUS has positive rawDelta', () => {
      expect(REPUTATION_EVENTS[LedgerEventType.HUMAN_TEXT_250_PLUS].rawDelta).toBeGreaterThan(0);
    });

    it('UNDISCLOSED_AI_TEXT has negative rawDelta', () => {
      expect(REPUTATION_EVENTS[LedgerEventType.UNDISCLOSED_AI_TEXT].rawDelta).toBeLessThan(0);
    });

    it('APPEAL_RESTORED has rawDelta=0 and eventCategory=neutral', () => {
      const cfg = REPUTATION_EVENTS[LedgerEventType.APPEAL_RESTORED];
      expect(cfg.rawDelta).toBe(0);
      expect(cfg.eventCategory).toBe('neutral');
    });

    it('UNDISCLOSED_AI_TEXT is appealable', () => {
      expect(REPUTATION_EVENTS[LedgerEventType.UNDISCLOSED_AI_TEXT].appealable).toBe(true);
    });
  });

  // ── recordReputationEvent ─────────────────────────────────────────────
  describe('recordReputationEvent', () => {
    it('calls adjustReputation for events with non-zero delta', async () => {
      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.HUMAN_TEXT_250_PLUS,
        sourceId: 'post-1',
        sourceType: 'post',
      });

      expect(adjustReputation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          delta: REPUTATION_EVENTS[LedgerEventType.HUMAN_TEXT_250_PLUS].rawDelta,
        })
      );
    });

    it('does NOT call adjustReputation for neutral zero-delta events', async () => {
      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.APPEAL_RESTORED,
      });

      expect(adjustReputation).not.toHaveBeenCalled();
    });

    it('increments pillarScores on user document', async () => {
      mockUserRead.mockResolvedValue({
        resource: {
          id: 'user-1',
          pillarScores: { human_contribution: 5 },
        },
      });

      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.HUMAN_TEXT_250_PLUS,
        sourceId: 'post-1',
      });

      expect(mockUserReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pillarScores: expect.objectContaining({
            human_contribution: 6, // 5 + 1
          }),
        })
      );
    });

    it('appends ledger entry for non-neutral events', async () => {
      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.UNDISCLOSED_AI_TEXT,
        sourceId: 'post-1',
        sourceType: 'post',
      });

      expect(appendLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: LedgerEventType.UNDISCLOSED_AI_TEXT,
          eventCategory: 'negative',
          appealable: true,
        })
      );
    });

    it('appends ledger for neutral non-appealable zero-delta events', async () => {
      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.APPEAL_RESTORED,
      });

      expect(appendLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: LedgerEventType.APPEAL_RESTORED,
          eventCategory: 'neutral',
          impactBand: 'neutral',
        })
      );
    });

    it('appends ledger for disclosed AI-assisted content without score adjustment', async () => {
      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.AI_ASSISTED_DISCLOSURE,
        sourceId: 'post-1',
        sourceType: 'post',
      });

      expect(adjustReputation).not.toHaveBeenCalled();
      expect(appendLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: LedgerEventType.AI_ASSISTED_DISCLOSURE,
          eventCategory: 'neutral',
          rawDelta: 0,
          relatedContentId: 'post-1',
        })
      );
    });

    it('continues if adjustReputation throws', async () => {
      (adjustReputation as jest.Mock).mockRejectedValueOnce(new Error('cosmos error'));

      await expect(
        recordReputationEvent({
          userId: 'user-1',
          ledgerEventType: LedgerEventType.HUMAN_TEXT_250_PLUS,
          sourceId: 'post-1',
        })
      ).resolves.not.toThrow();

      // Ledger entry should still be attempted
      expect(appendLedgerEntry).toHaveBeenCalled();
    });

    it('applies overrides over defaults', async () => {
      await recordReputationEvent({
        userId: 'user-1',
        ledgerEventType: LedgerEventType.MODERATION_VIOLATION,
        sourceId: 'content-1',
        overrides: { rawDelta: -20, impactBand: 'severe_negative' },
      });

      expect(adjustReputation).toHaveBeenCalledWith(
        expect.objectContaining({ delta: -20 })
      );
    });
  });
});
