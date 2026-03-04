import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { InvocationContext } from '@azure/functions';
import { moderateProfileUpdates } from './profileModerationService';
import { createHiveClient, ModerationAction } from '@shared/clients/hive';

jest.mock('@shared/clients/hive', () => {
  const actual = jest.requireActual('@shared/clients/hive');
  return {
    ...actual,
    createHiveClient: jest.fn(),
  };
});

const createHiveClientMock = createHiveClient as jest.MockedFunction<typeof createHiveClient>;

function contextStub(): InvocationContext {
  return {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as InvocationContext;
}

describe('profileModerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.HIVE_API_KEY;
  });

  it('skips moderation when no profile text is provided', async () => {
    const decision = await moderateProfileUpdates('user-1', {}, contextStub());
    expect(decision.allowed).toBe(true);
    expect(decision.blockedFields).toEqual([]);
    expect(createHiveClientMock).not.toHaveBeenCalled();
  });

  it('skips moderation when HIVE_API_KEY is not configured', async () => {
    const decision = await moderateProfileUpdates(
      'user-1',
      { displayName: 'Lyth User', bio: 'Hello world' },
      contextStub()
    );
    expect(decision.allowed).toBe(true);
    expect(createHiveClientMock).not.toHaveBeenCalled();
  });

  it('blocks profile updates when Hive blocks any field', async () => {
    process.env.HIVE_API_KEY = 'test-key';
    createHiveClientMock.mockReturnValue({
      moderateTextContent: jest
        .fn()
        .mockResolvedValueOnce({
          action: ModerationAction.ALLOW,
          confidence: 0.02,
          categories: [],
          reasons: [],
        })
        .mockResolvedValueOnce({
          action: ModerationAction.BLOCK,
          confidence: 0.99,
          categories: ['harassment'],
          reasons: ['blocked'],
        }),
    } as any);

    const decision = await moderateProfileUpdates(
      'user-1',
      { displayName: 'Normal Name', bio: 'Bad bio text' },
      contextStub()
    );

    expect(decision.allowed).toBe(false);
    expect(decision.blockedFields).toEqual(['bio']);
    expect(decision.categories).toContain('harassment');
  });

  it('fails open when moderation provider errors', async () => {
    process.env.HIVE_API_KEY = 'test-key';
    createHiveClientMock.mockReturnValue({
      moderateTextContent: jest.fn().mockRejectedValue(new Error('provider timeout')),
    } as any);

    const ctx = contextStub();
    const decision = await moderateProfileUpdates(
      'user-1',
      { username: 'test_user' },
      ctx
    );

    expect(decision.allowed).toBe(true);
    expect(decision.blockedFields).toEqual([]);
    expect(decision.warnings.length).toBe(1);
    expect(ctx.warn).toHaveBeenCalled();
  });
});
