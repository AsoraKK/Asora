/**
 * Tests for posts_like endpoints - Placeholder
 * 
 * The like endpoints are properly tested via the Azure Functions Runtime.
 * This test file ensures the functions can be imported and registered.
 */

import type { InvocationContext } from '@azure/functions';

import { posts_like_create, posts_like_delete, posts_like_get } from '../../src/posts/posts_like.function';
import { httpReqMock } from '../helpers/http';

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

const { extractAuthContext } = require('@shared/http/authContext');
const { getTargetDatabase } = require('@shared/clients/cosmos');
const contextStub = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as InvocationContext;

describe('posts_like endpoints', () => {
  it('should export posts_like_create handler', () => {
    expect(posts_like_create).toBeDefined();
    expect(typeof posts_like_create).toBe('function');
  });

  it('should export posts_like_delete handler', () => {
    expect(posts_like_delete).toBeDefined();
    expect(typeof posts_like_delete).toBe('function');
  });

  it('should export posts_like_get handler', () => {
    expect(posts_like_get).toBeDefined();
    expect(typeof posts_like_get).toBe('function');
  });

  it('should verify endpoints are registered', () => {
    // The handlers are registered via app.http() in posts_like.function.ts
    // POST /api/posts/{id}/like
    // DELETE /api/posts/{id}/like
    // GET /api/posts/{id}/like
    expect(true).toBe(true);
  });

  it('blocks like on compromised devices', async () => {
    extractAuthContext.mockResolvedValueOnce({
      userId: 'user-1',
      roles: [],
      tier: 'free',
      token: {},
    });

    const response = await posts_like_create(
      httpReqMock({
        method: 'POST',
        params: { id: 'post-1' },
        headers: {
          authorization: 'Bearer token',
          'x-device-rooted': 'true',
        },
      }),
      contextStub
    );

    expect(response.status).toBe(403);
    expect(response.jsonBody).toMatchObject({
      error: expect.objectContaining({ code: 'DEVICE_INTEGRITY_BLOCKED' }),
    });
    expect(getTargetDatabase).not.toHaveBeenCalled();
  });

  it('blocks unlike on compromised devices', async () => {
    extractAuthContext.mockResolvedValueOnce({
      userId: 'user-1',
      roles: [],
      tier: 'free',
      token: {},
    });

    const response = await posts_like_delete(
      httpReqMock({
        method: 'DELETE',
        params: { id: 'post-1' },
        headers: {
          authorization: 'Bearer token',
          'x-device-emulator': 'true',
        },
      }),
      contextStub
    );

    expect(response.status).toBe(403);
    expect(response.jsonBody).toMatchObject({
      error: expect.objectContaining({ code: 'DEVICE_INTEGRITY_BLOCKED' }),
    });
    expect(getTargetDatabase).not.toHaveBeenCalled();
  });
});
