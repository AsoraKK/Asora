import type { HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { authRequired, guestOnly, optionalAuth, parseAuth } from '@shared/middleware/auth';

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

  it('treats tokens without subject as guest', () => {
    const token = jwt.sign({}, process.env.JWT_SECRET!, { algorithm: 'HS256' });
    const principal = parseAuth(requestWithAuth(`Bearer ${token}`));
    expect(principal).toEqual({ kind: 'guest' });
  });

  it('optionalAuth returns the same principal', () => {
    const principal = { kind: 'user' as const, id: 'abc' };
    expect(optionalAuth(principal)).toBe(principal);
  });

  it('guestOnly throws when user principal provided', () => {
    expect(() => guestOnly({ kind: 'user', id: 'abc' })).toThrowError('Forbidden');
    expect(() => guestOnly({ kind: 'guest' })).not.toThrow();
  });

  it('handles RS256 tokens with public key', () => {
    const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/Ks3L
h5PmMjqBLeZUFSNa4fWGbFOGxImPp9ZpKDPWkFjh/0E8l7jqDW7x0hN0FTh8QOQV
4ZxuuGqS9K5vPkjODuOZnZpJz9cCBBqQPOaVQjOtLCYJBFWtQrUqRXGvQqO/vJ3s
rMrKHmZKVZoF1bO5Z5gJ5vOSz8nJQv5Fa7qNbZ9mU0LhOGR7z5K4OpNwP2Pf3Q0r
kP7zLOv8EqIE9LnB8rQhNpX6qxvpGZMQqJ4P8OE7F0vLNQz8OqJHZUm9wB5X0GZN
QUFQ8FpOAqHG9vDQkqQ8Lv5R0nQ0zR5K4OpNwP2Pf3Q0rkP7zLOv8EqIE9LnB8rQ
hNpX6qxvpGZMQqJ4P8OE7F0vLNQz8OqJHZUm9wB5X0GZNQUFQ==
-----END PUBLIC KEY-----`;
    const originalKey = process.env.JWT_PUBLIC_KEY;
    process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n');

    // Should fall back to guest for invalid RS256 token
    const principal = parseAuth(requestWithAuth('Bearer invalid.rs256.token'));
    expect(principal).toEqual({ kind: 'guest' });

    process.env.JWT_PUBLIC_KEY = originalKey;
  });
});
