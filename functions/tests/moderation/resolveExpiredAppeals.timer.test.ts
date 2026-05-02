import type { InvocationContext, Timer } from '@azure/functions';

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

jest.mock('../../src/moderation/service/voteService', () => ({
  resolveAppealFromVotes: jest.fn(),
}));

const { getCosmosDatabase } = require('@shared/clients/cosmos');
const { resolveAppealFromVotes } = require('../../src/moderation/service/voteService');
const { resolveExpiredAppeals } = require('../../src/moderation/timers/resolveExpiredAppeals.function');

const timerStub = {} as Timer;
const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

function makeContainer(pages: unknown[][]) {
  let pageIndex = 0;
  return {
    items: {
      query: jest.fn().mockReturnValue({
        fetchNext: jest.fn().mockImplementation(async () => {
          const page = pages[pageIndex] ?? [];
          pageIndex += 1;
          return {
            resources: page,
            continuationToken: pageIndex < pages.length ? `token-${pageIndex}` : undefined,
          };
        }),
      }),
    },
    item: jest.fn().mockReturnValue({ replace: jest.fn().mockResolvedValue({}) }),
  };
}

describe('resolveExpiredAppeals timer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when there are no expired appeals', async () => {
    const container = makeContainer([[]]);
    getCosmosDatabase.mockReturnValue({ container: jest.fn().mockReturnValue(container) });

    await resolveExpiredAppeals(timerStub, contextStub);

    expect(resolveAppealFromVotes).not.toHaveBeenCalled();
    expect(contextStub.log).not.toHaveBeenCalledWith(
      'moderation.appeals.resolve_expired_complete',
      expect.anything()
    );
  });

  it('resolves each expired appeal and replaces the document', async () => {
    const appealA = { id: 'a1', contentId: 'c1', status: 'pending' };
    const appealB = { id: 'a2', contentId: 'c2', status: 'pending' };
    const container = makeContainer([[appealA, appealB]]);
    const itemMock = { replace: jest.fn().mockResolvedValue({}) };
    container.item = jest.fn().mockReturnValue(itemMock);
    getCosmosDatabase.mockReturnValue({ container: jest.fn().mockReturnValue(container) });
    resolveAppealFromVotes.mockResolvedValue(undefined);

    await resolveExpiredAppeals(timerStub, contextStub);

    expect(resolveAppealFromVotes).toHaveBeenCalledTimes(2);
    expect(itemMock.replace).toHaveBeenCalledTimes(2);
    expect(contextStub.log).toHaveBeenCalledWith(
      'moderation.appeals.resolve_expired_complete',
      { processed: 2 }
    );
  });

  it('handles pagination across multiple pages', async () => {
    const page1 = [{ id: 'x1', contentId: 'cx1', status: 'pending' }];
    const page2 = [{ id: 'x2', contentId: 'cx2', status: 'pending' }];
    const container = makeContainer([page1, page2]);
    const itemMock = { replace: jest.fn().mockResolvedValue({}) };
    container.item = jest.fn().mockReturnValue(itemMock);
    getCosmosDatabase.mockReturnValue({ container: jest.fn().mockReturnValue(container) });
    resolveAppealFromVotes.mockResolvedValue(undefined);

    await resolveExpiredAppeals(timerStub, contextStub);

    expect(resolveAppealFromVotes).toHaveBeenCalledTimes(2);
  });

  it('rethrows errors from Cosmos query and logs them', async () => {
    getCosmosDatabase.mockReturnValue({
      container: jest.fn().mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchNext: jest.fn().mockRejectedValue(new Error('cosmos timeout')),
          }),
        },
        item: jest.fn(),
      }),
    });

    await expect(resolveExpiredAppeals(timerStub, contextStub)).rejects.toThrow('cosmos timeout');
    expect(contextStub.error).toHaveBeenCalledWith(
      'moderation.appeals.resolve_expired_failed',
      expect.any(Error)
    );
  });
});
