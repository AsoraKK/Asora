import { usersService } from '../../src/auth/service/usersService';
import { withClient } from '@shared/clients/postgres';

jest.mock('@shared/clients/postgres', () => ({
  withClient: jest.fn(),
}));

const mockedWithClient = withClient as jest.MockedFunction<typeof withClient>;

type UserRow = {
  id: string;
  primary_email: string;
  roles: string[];
  tier: string;
  reputation_score: number;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  provider: string;
  provider_sub: string;
  user_id: string;
  created_at: string;
};

const queryCalls: Array<{ sql: string; params: any[] }> = [];
const usersById = new Map<string, UserRow>();
const usersByEmail = new Map<string, UserRow>();
const linksByKey = new Map<string, LinkRow>();

const mockClient = {
  query: jest.fn(async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });

    if (sql.includes('FROM provider_links')) {
      const [provider, providerSub] = params as [string, string];
      const link = linksByKey.get(`${provider}:${providerSub}`) || null;
      return { rows: link ? [link] : [] };
    }

    if (sql.includes('FROM users WHERE id = $1')) {
      const [userId] = params as [string];
      const user = usersById.get(userId) || null;
      return { rows: user ? [user] : [] };
    }

    if (sql.includes('FROM users WHERE primary_email = $1')) {
      const [email] = params as [string];
      const user = usersByEmail.get(email) || null;
      return { rows: user ? [user] : [] };
    }

    if (sql.includes('INSERT INTO users')) {
      const [userId, email, roles, tier, reputationScore, createdAt, updatedAt] = params as [
        string,
        string,
        string[],
        string,
        number,
        string,
        string,
      ];
      const user = {
        id: userId,
        primary_email: email,
        roles,
        tier,
        reputation_score: reputationScore,
        created_at: createdAt,
        updated_at: updatedAt,
      };
      usersById.set(userId, user);
      usersByEmail.set(email, user);
      return { rows: [user] };
    }

    if (sql.includes('INSERT INTO provider_links')) {
      const [provider, providerSub, userId, createdAt] = params as [
        string,
        string,
        string,
        string,
      ];
      const link = {
        provider,
        provider_sub: providerSub,
        user_id: userId,
        created_at: createdAt,
      };
      linksByKey.set(`${provider}:${providerSub}`, link);
      return { rows: [link] };
    }

    return { rows: [] };
  }),
};

mockedWithClient.mockImplementation(async (fn: any) => fn(mockClient as any));

function makeUser(id: string, email: string): UserRow {
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString();
  return {
    id,
    primary_email: email,
    roles: ['user'],
    tier: 'free',
    reputation_score: 0,
    created_at: now,
    updated_at: now,
  };
}

describe('usersService provider linking', () => {
  beforeEach(() => {
    queryCalls.length = 0;
    usersById.clear();
    usersByEmail.clear();
    linksByKey.clear();
    mockClient.query.mockClear();
    mockedWithClient.mockClear();
  });

  it('returns an existing linked user without creating duplicate provider links', async () => {
    usersById.set('user-1', makeUser('user-1', 'linked@example.com'));
    linksByKey.set('google:sub-1', {
      provider: 'google',
      provider_sub: 'sub-1',
      user_id: 'user-1',
      created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    });

    const [user, isNewUser] = await usersService.getOrCreateUserByProvider(
      'Google',
      'sub-1',
      'linked@example.com'
    );

    expect(isNewUser).toBe(false);
    expect(user.id).toBe('user-1');
    expect(user).not.toHaveProperty('provider_sub');
    expect(queryCalls.filter((call) => call.sql.includes('INSERT INTO provider_links'))).toHaveLength(0);
    expect(queryCalls.filter((call) => call.sql.includes('INSERT INTO users'))).toHaveLength(0);
  });

  it('creates a provider link for an existing user on first sign-in', async () => {
    usersByEmail.set('existing@example.com', makeUser('user-2', 'existing@example.com'));

    const [user, isNewUser] = await usersService.getOrCreateUserByProvider(
      'apple',
      'sub-2',
      'existing@example.com'
    );

    expect(isNewUser).toBe(false);
    expect(user.id).toBe('user-2');
    expect(user.primary_email).toBe('existing@example.com');
    expect(queryCalls.filter((call) => call.sql.includes('INSERT INTO provider_links'))).toHaveLength(1);
    expect(queryCalls.filter((call) => call.sql.includes('INSERT INTO users'))).toHaveLength(0);
    expect(linksByKey.has('apple:sub-2')).toBe(true);
  });

  it('creates a new user and provider link when no account exists', async () => {
    const [user, isNewUser] = await usersService.getOrCreateUserByProvider(
      'world',
      'sub-3',
      'new@example.com'
    );

    expect(isNewUser).toBe(true);
    expect(user.primary_email).toBe('new@example.com');
    expect(queryCalls.filter((call) => call.sql.includes('INSERT INTO users'))).toHaveLength(1);
    expect(queryCalls.filter((call) => call.sql.includes('INSERT INTO provider_links'))).toHaveLength(1);
  });

  it('rejects invalid provider identifiers before touching the database', async () => {
    await expect(
      usersService.getOrCreateUserByProvider('bad provider!!', 'sub-4', 'new@example.com')
    ).rejects.toThrow('Invalid provider');

    expect(mockClient.query).not.toHaveBeenCalled();
  });
});