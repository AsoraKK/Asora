import { httpReqMock } from '../../../tests/helpers/http';

jest.mock('@auth/service/jwtService', () => ({
  jwtService: {
    verifyToken: jest.fn(),
  },
}));

import { jwtService } from '@auth/service/jwtService';
import { extractAuthContext } from './authContext';

const verifyTokenMock = jest.mocked(jwtService.verifyToken);

describe('extractAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without authorization headers', async () => {
    const ctx = {
      request: httpReqMock({ method: 'POST' }),
    } as any;

    await expect(extractAuthContext(ctx)).rejects.toThrow('Missing Authorization header');
  });

  it('maps the canonical principal into handler auth context', async () => {
    verifyTokenMock.mockResolvedValue({
      sub: 'user-123',
      roles: ['moderator'],
      tier: 'premium',
      role: 'moderator',
      email: 'alex@example.com',
      iss: 'asora-auth',
      reputation: 12,
      raw: {
        name: 'Alex Doe',
        roles: ['moderator'],
      },
    } as any);

    const ctx = {
      request: httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
      }),
    } as any;

    const auth = await extractAuthContext(ctx);

    expect(auth).toMatchObject({
      userId: 'user-123',
      roles: ['moderator'],
      tier: 'premium',
    });
    expect(auth.token).toMatchObject({
      sub: 'user-123',
      role: 'moderator',
      roles: ['moderator'],
      tier: 'premium',
      email: 'alex@example.com',
    });
  });
});
