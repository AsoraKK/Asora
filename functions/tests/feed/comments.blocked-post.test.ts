/**
 * Comments cannot be posted on soft-deleted or moderation-blocked posts.
 *
 * The createComment handler checks post.status === 'blocked' || 'deleted'
 * and returns 404. The existing comments.route.test.ts only tests the null
 * (post does not exist at all) path — these tests cover the status-based
 * rejection paths.
 */

import type { InvocationContext } from '@azure/functions';

import { createComment } from '@feed/routes/comments';
import { httpReqMock } from '../helpers/http';

// ── Auth mock ────────────────────────────────────────────────────────────────
jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

// ── Cosmos mock ──────────────────────────────────────────────────────────────
const mockPostRead = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    posts: {
      item: jest.fn(() => ({ read: mockPostRead })),
      items: {
        create: jest.fn(),
        query: jest.fn(() => ({ fetchAll: jest.fn().mockResolvedValue({ resources: [], requestCharge: 1 }) })),
      },
    },
  })),
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn(() => ({
      item: jest.fn(() => ({
        read: jest.fn().mockResolvedValue({ resource: { id: 'user-123', isActive: true } }),
      })),
    })),
  })),
}));

jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function authedPost(postId: string): ReturnType<typeof httpReqMock> {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
    params: { postId },
    body: { text: 'This is my comment' },
  });
}

describe('createComment — blocked/deleted post rejection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contextStub.log = jest.fn();

    const { AuthError } = jest.requireActual('@auth/verifyJwt');
    verifyMock.mockImplementation(async (header: string | undefined) => {
      if (!header) throw new AuthError('invalid_request', 'Authorization header missing');
      return { sub: 'user-123', tier: 'free', raw: {} } as any;
    });
  });

  it('returns 404 when the parent post has status "deleted"', async () => {
    mockPostRead.mockResolvedValue({
      resource: { id: 'post-x', postId: 'post-x', status: 'deleted' },
      requestCharge: 1,
    });

    const response = await createComment(authedPost('post-x'), contextStub);

    expect(response.status).toBe(404);
  });

  it('returns 404 when the parent post has status "blocked"', async () => {
    mockPostRead.mockResolvedValue({
      resource: { id: 'post-y', postId: 'post-y', status: 'blocked' },
      requestCharge: 1,
    });

    const response = await createComment(authedPost('post-y'), contextStub);

    expect(response.status).toBe(404);
  });

  // Note: The happy-path (201 on clean post) is fully covered by comments.route.test.ts.
  // These tests are specifically for the status-based rejection paths.
});
