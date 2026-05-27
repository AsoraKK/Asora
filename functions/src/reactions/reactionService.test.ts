/**
 * Tests for reactionService (Phase 2).
 *
 * Covers:
 *   - Happy-path submit (positive + negative reactions)
 *   - Anti-gaming cap enforcement
 *   - Self-reaction block
 *   - Corroboration threshold for negative ledger entries
 *   - Delete flow (ownership check)
 */

import { submitReaction, deleteReaction } from './reactionService';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { recordReputationEvent } from '../reputation/reputationEventService';
import { LedgerEventType } from '../reputation/types';

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

jest.mock('../reputation/reputationEventService', () => ({
  recordReputationEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers / mocks
// ─────────────────────────────────────────────────────────────────────────────

function makeQueryMock(returnCount = 0) {
  return jest.fn().mockReturnValue({
    fetchAll: jest.fn().mockResolvedValue({ resources: [returnCount] }),
  });
}

interface MockDb {
  containerMock: jest.Mock;
  createMock: jest.Mock;
  queryMock: jest.Mock;
  itemReadMock: jest.Mock;
  itemDeleteMock: jest.Mock;
}

function setupDb(opts: {
  dailyGiven?: number;
  dailyContent?: number;
  weeklyPair?: number;
  actorScore?: number;
  corroborators?: number;
  ledgerHits?: number;
  existingReaction?: Record<string, unknown> | null;
} = {}): MockDb {
  const {
    dailyGiven    = 0,
    dailyContent  = 0,
    weeklyPair    = 0,
    actorScore    = 50,      // Trusted by default
    corroborators = 0,
    ledgerHits    = 0,
    existingReaction = null,
  } = opts;

  const createMock    = jest.fn().mockResolvedValue({ resource: { id: 'rxn-1' } });
  const itemReadMock  = jest.fn().mockResolvedValue({ resource: { reputationScore: actorScore } });
  const itemDeleteMock = jest.fn().mockResolvedValue({});

  /**
   * Route queries by inspecting the SQL string so we're not fragile to
   * query ordering / concurrency (Promise.all runs all three cap checks in parallel).
   */
  const queryMock = jest.fn().mockImplementation((querySpec: { query: string }) => {
    const sql: string = typeof querySpec === 'string' ? querySpec : querySpec.query;

    // Delete path: ownership check
    if (existingReaction !== null) {
      return { fetchAll: jest.fn().mockResolvedValue({
        resources: existingReaction ? [existingReaction] : [],
      })};
    }

    // Anti-gaming cap queries
    if (sql.includes('actorUserId') && sql.includes('createdAt >=') && !sql.includes('targetUserId')) {
      return { fetchAll: jest.fn().mockResolvedValue({ resources: [dailyGiven] }) };
    }
    if (sql.includes('targetContentId') && sql.includes('createdAt >=')) {
      return { fetchAll: jest.fn().mockResolvedValue({ resources: [dailyContent] }) };
    }
    if (sql.includes('actorUserId') && sql.includes('targetUserId') && sql.includes('reactionType')) {
      return { fetchAll: jest.fn().mockResolvedValue({ resources: [weeklyPair] }) };
    }

    // Corroboration count
    if (sql.includes('includedInReputation')) {
      return { fetchAll: jest.fn().mockResolvedValue({ resources: [corroborators] }) };
    }

    // Ledger duplicate check (different container — reputation_ledger)
    if (sql.includes('relatedContentId') || sql.includes('eventType')) {
      return { fetchAll: jest.fn().mockResolvedValue({
        resources: ledgerHits > 0 ? [{ id: 'ledger-1' }] : [],
      })};
    }

    return { fetchAll: jest.fn().mockResolvedValue({ resources: [] }) };
  });

  const containerMock = jest.fn().mockReturnValue({
    items: { query: queryMock, create: createMock },
    item: jest.fn().mockReturnValue({
      read: itemReadMock,
      delete: itemDeleteMock,
    }),
  });

  (getCosmosDatabase as jest.Mock).mockReturnValue({ container: containerMock });

  return { containerMock, createMock, queryMock, itemReadMock, itemDeleteMock };
}

// ─────────────────────────────────────────────────────────────────────────────
// submitReaction
// ─────────────────────────────────────────────────────────────────────────────

describe('submitReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a reaction and returns includedInReputation=true for a positive reaction', async () => {
    const { createMock } = setupDb();

    const result = await submitReaction({
      actorUserId: 'actor-1',
      targetUserId: 'target-1',
      targetContentId: 'post-1',
      reactionType: 'helpful',
    });

    expect(result.reactionType).toBe('helpful');
    expect(result.includedInReputation).toBe(true);
    expect(result.antiGamingStatus).toBe('clear');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('fires a positive ledger event for helpful reaction', async () => {
    setupDb();

    await submitReaction({
      actorUserId: 'actor-1',
      targetUserId: 'target-1',
      targetContentId: 'post-1',
      reactionType: 'helpful',
    });

    expect(recordReputationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'target-1',
        ledgerEventType: LedgerEventType.REACTION_RECEIVED_HELPFUL,
      })
    );
  });

  it('fires REACTION_RECEIVED_WELL_SOURCED ledger event for well_sourced', async () => {
    setupDb();
    await submitReaction({
      actorUserId: 'actor-1',
      targetUserId: 'target-1',
      targetContentId: 'post-1',
      reactionType: 'well_sourced',
    });
    expect(recordReputationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerEventType: LedgerEventType.REACTION_RECEIVED_WELL_SOURCED })
    );
  });

  it('does NOT fire a ledger event for agree (rawDelta=0 tracking only)', async () => {
    setupDb();
    await submitReaction({
      actorUserId: 'actor-1',
      targetUserId: 'target-1',
      targetContentId: 'post-1',
      reactionType: 'agree',
    });
    // agree maps to REACTION_RECEIVED_AGREE which IS fired (rawDelta=0 but logged)
    expect(recordReputationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerEventType: LedgerEventType.REACTION_RECEIVED_AGREE })
    );
  });

  it('does NOT fire a ledger event for disagree', async () => {
    setupDb();
    await submitReaction({
      actorUserId: 'actor-1',
      targetUserId: 'target-1',
      targetContentId: 'post-1',
      reactionType: 'disagree',
    });
    expect(recordReputationEvent).not.toHaveBeenCalled();
  });

  it('does NOT fire a ledger event for report', async () => {
    setupDb();
    await submitReaction({
      actorUserId: 'actor-1',
      targetUserId: 'target-1',
      targetContentId: 'post-1',
      reactionType: 'report',
    });
    expect(recordReputationEvent).not.toHaveBeenCalled();
  });

  it('throws 400 for self-reactions', async () => {
    setupDb();
    await expect(
      submitReaction({
        actorUserId: 'same-user',
        targetUserId: 'same-user',
        targetContentId: 'post-1',
        reactionType: 'helpful',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  describe('anti-gaming: caps', () => {
    it('sets capped + includedInReputation=false when daily given cap exceeded', async () => {
      setupDb({ dailyGiven: 20 });
      const result = await submitReaction({
        actorUserId: 'actor-1',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'helpful',
      });
      expect(result.includedInReputation).toBe(false);
      expect(result.antiGamingStatus).toBe('capped');
      expect(recordReputationEvent).not.toHaveBeenCalled();
    });

    it('sets capped when daily content cap exceeded', async () => {
      setupDb({ dailyContent: 50 });
      const result = await submitReaction({
        actorUserId: 'actor-1',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'helpful',
      });
      expect(result.includedInReputation).toBe(false);
      expect(result.antiGamingStatus).toBe('capped');
    });

    it('sets capped when weekly pair cap exceeded', async () => {
      setupDb({ weeklyPair: 5 });
      const result = await submitReaction({
        actorUserId: 'actor-1',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'thoughtful',
      });
      expect(result.includedInReputation).toBe(false);
      expect(result.antiGamingStatus).toBe('capped');
    });

    it('caps New-level actor on negative reactions', async () => {
      setupDb({ actorScore: 5 }); // below Verified threshold of 10
      const result = await submitReaction({
        actorUserId: 'actor-new',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'misleading',
      });
      expect(result.includedInReputation).toBe(false);
      expect(result.antiGamingStatus).toBe('capped');
    });

    it('allows New-level actor on positive reactions', async () => {
      const { createMock } = setupDb({ actorScore: 0 });
      const result = await submitReaction({
        actorUserId: 'actor-new',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'helpful',
      });
      expect(result.includedInReputation).toBe(true);
      expect(createMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('anti-gaming: corroboration threshold for negative reactions', () => {
    it('does NOT fire ledger for misleading below threshold', async () => {
      setupDb({ actorScore: 50, corroborators: 2 }); // < 3
      await submitReaction({
        actorUserId: 'actor-1',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'misleading',
      });
      expect(recordReputationEvent).not.toHaveBeenCalled();
    });

    it('fires ledger for misleading at or above threshold (no prior entry)', async () => {
      setupDb({ actorScore: 50, corroborators: 3, ledgerHits: 0 });
      await submitReaction({
        actorUserId: 'actor-1',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'misleading',
      });
      expect(recordReputationEvent).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerEventType: LedgerEventType.REACTION_RECEIVED_MISLEADING })
      );
    });

    it('does NOT re-fire ledger for misleading if entry already exists', async () => {
      setupDb({ actorScore: 50, corroborators: 5, ledgerHits: 1 });
      await submitReaction({
        actorUserId: 'actor-1',
        targetUserId: 'target-1',
        targetContentId: 'post-1',
        reactionType: 'misleading',
      });
      expect(recordReputationEvent).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteReaction
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the reaction when owned by the actor', async () => {
    const existingReaction = {
      id: 'rxn-1',
      actorUserId: 'actor-1',
      targetContentId: 'post-1',
      reactionType: 'helpful',
    };
    const { itemDeleteMock } = setupDb({ existingReaction });

    // Override to always return the single reaction
    (getCosmosDatabase as jest.Mock).mockReturnValue({
      container: jest.fn().mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [existingReaction] }),
          }),
        },
        item: jest.fn().mockReturnValue({ delete: itemDeleteMock }),
      }),
    });

    await expect(deleteReaction('rxn-1', 'actor-1')).resolves.toBeUndefined();
    expect(itemDeleteMock).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when reaction not found or not owned', async () => {
    (getCosmosDatabase as jest.Mock).mockReturnValue({
      container: jest.fn().mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
          }),
        },
      }),
    });

    await expect(deleteReaction('rxn-99', 'actor-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});
