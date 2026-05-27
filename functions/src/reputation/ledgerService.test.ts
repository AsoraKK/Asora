import { appendLedgerEntry, getLedgerEntries, decayEntry, reverseEntry, updateAppealStatus } from './ledgerService';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { LedgerEventType } from './types';

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

jest.mock('uuid', () => ({
  v7: () => 'test-uuid-v7',
}));

const mockCreate = jest.fn();
const mockRead = jest.fn();
const mockReplace = jest.fn();
const mockQuery = jest.fn();

function makeContainerMock() {
  return {
    container: jest.fn().mockReturnValue({
      items: {
        create: mockCreate,
        query: mockQuery,
      },
      item: jest.fn().mockReturnValue({
        read: mockRead,
        replace: mockReplace,
      }),
    }),
  };
}

describe('ledgerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCosmosDatabase as jest.Mock).mockReturnValue(makeContainerMock());
  });

  // ── appendLedgerEntry ─────────────────────────────────────────────────
  describe('appendLedgerEntry', () => {
    it('creates a ledger entry with generated id and timestamp', async () => {
      mockCreate.mockResolvedValue({ resource: { id: 'test-uuid-v7' } });

      const result = await appendLedgerEntry({
        userId: 'user-1',
        eventType: LedgerEventType.HUMAN_TEXT_250_PLUS,
        eventCategory: 'positive',
        pillar: 'human_contribution',
        publicLabel: '+ Reputation: Substantive human-authored contribution.',
        internalReasonCode: 'human_text_250_plus',
        rawDelta: 1,
        impactBand: 'small_positive',
        visibility: 'user',
        appealable: false,
        status: 'active',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-v7',
          userId: 'user-1',
          eventType: LedgerEventType.HUMAN_TEXT_250_PLUS,
          status: 'active',
        })
      );
      expect(result.id).toBe('test-uuid-v7');
    });
  });

  // ── getLedgerEntries ──────────────────────────────────────────────────
  describe('getLedgerEntries', () => {
    it('returns entries and continuationToken from Cosmos query', async () => {
      const fakeEntries = [
        { id: 'entry-1', userId: 'user-1', eventCategory: 'positive' },
      ];
      mockQuery.mockReturnValue({
        fetchNext: jest.fn().mockResolvedValue({
          resources: fakeEntries,
          continuationToken: 'next-cursor',
        }),
      });

      const result = await getLedgerEntries('user-1', { filter: 'positive', limit: 10 });

      expect(result.entries).toEqual(fakeEntries);
      expect(result.nextCursor).toBe('next-cursor');
    });

    it('returns empty entries on not-found error', async () => {
      const notFoundError = { code: 404 };
      mockQuery.mockReturnValue({
        fetchNext: jest.fn().mockRejectedValue(notFoundError),
      });

      const result = await getLedgerEntries('user-1');
      expect(result.entries).toEqual([]);
    });
  });

  // ── decayEntry ────────────────────────────────────────────────────────
  describe('decayEntry', () => {
    it('sets status to expired', async () => {
      mockRead.mockResolvedValue({
        resource: { id: 'entry-1', userId: 'user-1', status: 'active' },
      });
      mockReplace.mockResolvedValue({});

      await decayEntry('user-1', 'entry-1');

      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired' })
      );
    });
  });

  // ── reverseEntry ──────────────────────────────────────────────────────
  describe('reverseEntry', () => {
    it('sets status to reversed and appealStatus to accepted', async () => {
      mockRead.mockResolvedValue({
        resource: {
          id: 'entry-1',
          userId: 'user-1',
          status: 'active',
          internalReasonCode: 'moderation_violation',
        },
      });
      mockReplace.mockResolvedValue({});

      await reverseEntry('user-1', 'entry-1', 'appeal approved by moderator');

      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'reversed',
          appealStatus: 'accepted',
        })
      );
    });
  });

  // ── updateAppealStatus ────────────────────────────────────────────────
  describe('updateAppealStatus', () => {
    it('updates the appealStatus field', async () => {
      mockRead.mockResolvedValue({
        resource: { id: 'entry-1', userId: 'user-1', appealStatus: 'pending' },
      });
      mockReplace.mockResolvedValue({});

      await updateAppealStatus('user-1', 'entry-1', 'rejected');

      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ appealStatus: 'rejected' })
      );
    });
  });
});
