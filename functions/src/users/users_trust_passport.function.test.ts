import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../../tests/helpers/http';

jest.mock('@azure/functions', () => ({
  app: { http: jest.fn() },
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@auth/service/usersService', () => ({
  usersService: {
    getUserById: jest.fn(),
  },
}));

jest.mock('@users/service/trustPassportService', () => ({
  trustPassportService: {
    getUserTrustPassport: jest.fn(),
  },
}));

jest.mock('@users/service/profileService', () => {
  const actual = jest.requireActual('@users/service/profileService');
  return {
    ...actual,
    profileService: {
      getProfile: jest.fn(),
    },
  };
});

import { extractAuthContext } from '@shared/http/authContext';
import { usersService } from '@auth/service/usersService';
import { trustPassportService } from '@users/service/trustPassportService';
import { profileService } from '@users/service/profileService';
import { users_trust_passport_get } from './users_trust_passport.function';

const extractAuthContextMock = extractAuthContext as jest.Mock;
const getUserByIdMock = usersService.getUserById as jest.Mock;
const getUserTrustPassportMock =
  trustPassportService.getUserTrustPassport as jest.Mock;
const getProfileMock = profileService.getProfile as jest.Mock;

const contextStub = {
  invocationId: 'test-users-trust-passport',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

const basePassport = {
  userId: 'u1',
  transparencyStreakCategory: 'Consistent',
  appealsResolvedFairlyLabel: 'Appeals resolved fairly',
  jurorReliabilityTier: 'Silver',
  counts: {
    transparency: {
      totalPosts: 10,
      postsWithSignals: 8,
    },
    appeals: {
      resolved: 4,
      approved: 3,
      rejected: 1,
    },
    juror: {
      votesCast: 12,
      alignedVotes: 9,
    },
  },
};

describe('users_trust_passport_get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserByIdMock.mockResolvedValue({ id: 'u1' });
    getUserTrustPassportMock.mockResolvedValue(basePassport);
  });

  it('returns 403 for private passport when requester is not owner', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization'));
    getProfileMock.mockResolvedValue({
      id: 'u1',
      settings: { trustPassportVisibility: 'private' },
    });

    const response = await users_trust_passport_get(
      httpReqMock({ method: 'GET', params: { id: 'u1' } }),
      contextStub
    );

    expect(response.status).toBe(403);
  });

  it('redacts counts for public_minimal on non-owner requests', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization'));
    getProfileMock.mockResolvedValue({
      id: 'u1',
      settings: { trustPassportVisibility: 'public_minimal' },
    });

    const response = await users_trust_passport_get(
      httpReqMock({ method: 'GET', params: { id: 'u1' } }),
      contextStub
    );
    const body = response.jsonBody as any;

    expect(response.status).toBe(200);
    expect(body.visibility).toBe('public_minimal');
    expect(body.counts.transparency.totalPosts).toBe(0);
    expect(body.counts.juror.votesCast).toBe(0);
  });

  it('returns full counts for owner on private visibility', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1' });
    getProfileMock.mockResolvedValue({
      id: 'u1',
      settings: { trustPassportVisibility: 'private' },
    });

    const response = await users_trust_passport_get(
      httpReqMock({ method: 'GET', params: { id: 'u1' } }),
      contextStub
    );
    const body = response.jsonBody as any;

    expect(response.status).toBe(200);
    expect(body.visibility).toBe('private');
    expect(body.counts.transparency.totalPosts).toBe(10);
    expect(body.counts.juror.votesCast).toBe(12);
  });

  it('returns full counts for non-owner on public_expanded visibility', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'viewer-2' });
    getProfileMock.mockResolvedValue({
      id: 'u1',
      settings: { trustPassportVisibility: 'public_expanded' },
    });

    const response = await users_trust_passport_get(
      httpReqMock({ method: 'GET', params: { id: 'u1' } }),
      contextStub
    );
    const body = response.jsonBody as any;

    expect(response.status).toBe(200);
    expect(body.visibility).toBe('public_expanded');
    expect(body.counts.transparency.totalPosts).toBe(10);
    expect(body.counts.juror.votesCast).toBe(12);
  });
});
