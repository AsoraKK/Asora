import type { HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { authRequired, parseAuth } from '@shared/middleware/auth';

function requestWithAuth(header?: string): HttpRequest {
  const headers = new Map<string, string>();
  if (header) {
    headers.set('authorization', header);
  }
  return {
    headers,
  } as unknown as HttpRequest;
}

describe('auth middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('treats missing authorization as guest', () => {
    const principal = parseAuth(requestWithAuth());
    expect(principal).toEqual({ kind: 'guest' });
  });

  it('treats invalid token as guest', () => {
    const principal = parseAuth(requestWithAuth('Bearer not-a-token'));
    expect(principal).toEqual({ kind: 'guest' });
  });

  it('returns user principal for valid token', () => {
    const token = jwt.sign({ sub: 'user-123', roles: ['moderator'] }, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
    });
    const principal = parseAuth(requestWithAuth(`Bearer ${token}`));
    expect(principal.kind).toBe('user');
    if (principal.kind === 'user') {
      expect(principal.id).toBe('user-123');
      expect(principal.claims).toMatchObject({ roles: ['moderator'] });
    }
  });

  it('authRequired throws when guest', () => {
    expect(() => authRequired({ kind: 'guest' })).toThrowError('Unauthorized');
  });
});
