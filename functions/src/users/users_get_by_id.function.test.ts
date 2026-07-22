import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../../tests/helpers/http';

jest.mock('@azure/functions', () => ({
  app: { http: jest.fn() },
}));

jest.mock('@auth/service/usersService', () => ({
  usersService: {
    getUserById: jest.fn(),
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

import { usersService } from '@auth/service/usersService';
import { profileService } from '@users/service/profileService';
import { users_get_by_id } from './users_get_by_id.function';

const getUserByIdMock = usersService.getUserById as jest.Mock;
const getProfileMock = profileService.getProfile as jest.Mock;

const contextStub = {
  invocationId: 'test-users-get-by-id',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

describe('users_get_by_id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserByIdMock.mockResolvedValue({
      id: 'u1',
      tier: 'free',
      reputation_score: 0,
    });
  });

  it('returns a safe default public profile before one is customized', async () => {
    getProfileMock.mockResolvedValue(null);

    const response = await users_get_by_id(
      httpReqMock({ method: 'GET', params: { id: 'u1' } }),
      contextStub
    );
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: 'u1',
      displayName: 'Lythaus member',
      tier: 'free',
      reputation: 0,
      badges: [],
      trustPassportVisibility: 'public_minimal',
    });
    expect(body).not.toHaveProperty('primary_email');
  });

  it('returns editable profile fields when they exist', async () => {
    getProfileMock.mockResolvedValue({
      id: 'u1',
      displayName: 'Lythaus Tester',
      username: 'tester',
      bio: 'A test profile',
      avatarUrl: 'https://cdn.example.test/avatar.png',
      settings: { trustPassportVisibility: 'private' },
    });

    const response = await users_get_by_id(
      httpReqMock({ method: 'GET', params: { id: 'u1' } }),
      contextStub
    );
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: 'u1',
      displayName: 'Lythaus Tester',
      username: 'tester',
      bio: 'A test profile',
      avatarUrl: 'https://cdn.example.test/avatar.png',
      trustPassportVisibility: 'private',
    });
  });
});
