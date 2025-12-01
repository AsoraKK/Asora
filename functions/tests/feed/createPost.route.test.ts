import type { HttpRequest, InvocationContext } from '@azure/functions';

import { createPost as createPostRoute } from '@feed/routes/createPost';
import { httpReqMock } from '../helpers/http';
import { ModerationAction, ModerationCategory, HiveAPIError } from '@shared/clients/hive';

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    posts: {
      items: {
        create: jest.fn().mockResolvedValue({
          resource: {
            id: 'test-post-id',
            postId: 'test-post-id',
            text: 'hello world',
            mediaUrl: null,
            authorId: 'user-123',
            visibility: 'public',
            status: 'published',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stats: { likes: 0, comments: 0, replies: 0 },
          },
          requestCharge: 5.5,
        }),
      },
    },
  })),
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn(() => ({
      item: jest.fn(() => ({
        read: jest.fn().mockRejectedValue(Object.assign(new Error('Not found'), { code: 404 })),
        replace: jest.fn().mockResolvedValue({ resource: {} }),
      })),
      items: {
        create: jest.fn().mockResolvedValue({ resource: {} }),
      },
    })),
  })),
}));

jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

jest.mock('@shared/services/dailyPostLimitService', () => {
  const actual = jest.requireActual('@shared/services/dailyPostLimitService');
  return {
    DailyPostLimitExceededError: actual.DailyPostLimitExceededError,
    checkAndIncrementPostCount: jest.fn(),
    incrementDailyPostCount: actual.incrementDailyPostCount,
    enforceDailyPostLimit: actual.enforceDailyPostLimit,
    getCurrentPostCount: actual.getCurrentPostCount,
    getRemainingPostsToday: actual.getRemainingPostsToday,
  };
});

// Mock Hive client
const mockModerateTextContent = jest.fn();
jest.mock('@shared/clients/hive', () => {
  const actual = jest.requireActual('../../shared/hive-client');
  return {
    ...actual,
    createHiveClient: jest.fn(() => ({
      moderateTextContent: mockModerateTextContent,
    })),
  };
});

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const { getTargetDatabase } = require('@shared/clients/cosmos');
const { trackAppEvent } = require('@shared/appInsights');
const dailyPostLimitModule = require('@shared/services/dailyPostLimitService');
const mockCheckAndIncrementPostCount = jest.mocked(
  dailyPostLimitModule.checkAndIncrementPostCount
);
const { DailyPostLimitExceededError } = dailyPostLimitModule;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

// Store original HIVE_API_KEY
const originalHiveApiKey = process.env.HIVE_API_KEY;

function guestRequest(): HttpRequest {
  return httpReqMock({ method: 'POST' });
}

function userRequest(body?: unknown): HttpRequest {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body,
  });
}

describe('createPost route', () => {
  beforeEach(() => {
    contextStub.log = jest.fn();
    jest.clearAllMocks();
    // Enable moderation by default
    process.env.HIVE_API_KEY = 'test-api-key';
    // Default to ALLOW
    mockModerateTextContent.mockResolvedValue({
      action: ModerationAction.ALLOW,
      confidence: 0.95,
      categories: [],
      reasons: [],
    });
    verifyMock.mockImplementation(async header => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      return { sub: 'user-123', raw: {} } as any;
    });
    mockCheckAndIncrementPostCount.mockResolvedValue({
      success: true,
      newCount: 1,
      limit: 100,
      remaining: 99,
    });
  });

  afterEach(() => {
    // Restore original HIVE_API_KEY
    if (originalHiveApiKey !== undefined) {
      process.env.HIVE_API_KEY = originalHiveApiKey;
    } else {
      delete process.env.HIVE_API_KEY;
    }
  });

  it('returns 401 for guest principal', async () => {
    const response = await createPostRoute(guestRequest(), contextStub);
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
  });

  it('returns 201 with post data for authenticated user', async () => {
    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(response.status).toBe(201);
    const body = JSON.parse(response.body as string);
    expect(body.status).toBe('success');
    expect(body.post).toBeDefined();
    expect(body.post.text).toBe('hello world');
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.success', expect.any(Object));
  });

  it('returns 400 when JSON body is invalid', async () => {
    const request = userRequest();
    Object.assign(request, {
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    });

    const response = await createPostRoute(request, contextStub);
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.invalid_json');
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Invalid JSON payload' }));
  });

  it('returns 400 when text is empty', async () => {
    const response = await createPostRoute(userRequest({ text: '' }), contextStub);
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Post text is required' }));
  });

  it('returns 400 when text is whitespace only', async () => {
    const response = await createPostRoute(userRequest({ text: '   ' }), contextStub);
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Post text is required' }));
  });

  it('returns 400 when text exceeds max length', async () => {
    const longText = 'a'.repeat(5001);
    const response = await createPostRoute(userRequest({ text: longText }), contextStub);
    expect(response.status).toBe(400);
    expect(response.body).toContain('exceeds maximum length');
  });

  it('returns 400 for invalid media URL', async () => {
    const response = await createPostRoute(
      userRequest({ text: 'hello', mediaUrl: 'http://malicious.com/evil.jpg' }),
      contextStub
    );
    expect(response.status).toBe(400);
    expect(response.body).toBe(JSON.stringify({ error: 'Invalid media URL format' }));
  });

  it('accepts valid Azure Blob Storage media URL', async () => {
    const response = await createPostRoute(
      userRequest({ text: 'hello', mediaUrl: 'https://asora.blob.core.windows.net/media/image.jpg' }),
      contextStub
    );
    expect(response.status).toBe(201);
  });

  it('handles Cosmos create error gracefully', async () => {
    getTargetDatabase.mockReturnValueOnce({
      posts: {
        items: {
          create: jest.fn().mockRejectedValue(new Error('Cosmos connection failed')),
        },
      },
    });

    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(response.status).toBe(500);
    expect(contextStub.log).toHaveBeenCalledWith('posts.create.error', expect.any(Object));
  });

  it('returns 429 when the daily post limit is exceeded', async () => {
    const limitPayload = {
      allowed: false,
      currentCount: 5,
      limit: 5,
      remaining: 0,
      tier: 'free',
      resetDate: '2025-01-01T00:00:00.000Z',
    };
    mockCheckAndIncrementPostCount.mockRejectedValue(new DailyPostLimitExceededError(limitPayload));

    const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
    expect(response.status).toBe(429);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Retry-After': '86400',
    });
    expect(getTargetDatabase).not.toHaveBeenCalled();
    expect(trackAppEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: 'post_limit_exceeded',
      properties: expect.objectContaining({
        authorId: 'user-123',
      }),
    }));

    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      code: 'DAILY_POST_LIMIT_EXCEEDED',
      tier: limitPayload.tier,
      limit: limitPayload.limit,
      resetAt: limitPayload.resetDate,
      message: 'Daily post limit reached. Try again tomorrow.',
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Content Moderation Tests
  // ─────────────────────────────────────────────────────────────

  describe('content moderation', () => {
    it('creates post when moderation returns ALLOW', async () => {
      mockModerateTextContent.mockResolvedValue({
        action: ModerationAction.ALLOW,
        confidence: 0.98,
        categories: [],
        reasons: [],
      });

      const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
      expect(response.status).toBe(201);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.post.moderation.status).toBe('clean');
      expect(body.post.moderation.confidence).toBe(0.98);
    });

    it('creates post with warned status when moderation returns WARN', async () => {
      mockModerateTextContent.mockResolvedValue({
        action: ModerationAction.WARN,
        confidence: 0.65,
        categories: [ModerationCategory.HARASSMENT],
        reasons: ['Potentially harassing language'],
      });

      const response = await createPostRoute(userRequest({ text: 'borderline content' }), contextStub);
      expect(response.status).toBe(201);
      const body = JSON.parse(response.body as string);
      expect(body.status).toBe('success');
      expect(body.post.moderation.status).toBe('warned');
      expect(body.post.moderation.confidence).toBe(0.65);
      expect(body.post.moderation.categories).toContain(ModerationCategory.HARASSMENT);
      expect(body.post.moderation.reasons).toContain('Potentially harassing language');
    });

    it('returns 422 when moderation returns BLOCK', async () => {
      mockModerateTextContent.mockResolvedValue({
        action: ModerationAction.BLOCK,
        confidence: 0.92,
        categories: [ModerationCategory.HATE_SPEECH, ModerationCategory.VIOLENCE],
        reasons: ['Hate speech detected', 'Violent content'],
      });

      const response = await createPostRoute(userRequest({ text: 'violating content' }), contextStub);
      expect(response.status).toBe(422);
      const body = JSON.parse(response.body as string);
      expect(body.error).toContain('community guidelines');
      expect(body.code).toBe('content_blocked');
      expect(body.categories).toContain(ModerationCategory.HATE_SPEECH);

      // Verify post was NOT created
      const createMock = getTargetDatabase().posts.items.create;
      expect(createMock).not.toHaveBeenCalled();
    });

    it('logs blocked content event', async () => {
      mockModerateTextContent.mockResolvedValue({
        action: ModerationAction.BLOCK,
        confidence: 0.9,
        categories: [ModerationCategory.HATE_SPEECH],
        reasons: [],
      });

      await createPostRoute(userRequest({ text: 'blocked content' }), contextStub);

      expect(contextStub.log).toHaveBeenCalledWith('posts.create.blocked', expect.objectContaining({
        authorId: 'user-123',
        categories: expect.any(Array),
        confidence: 0.9,
      }));

      expect(trackAppEvent).toHaveBeenCalledWith(expect.objectContaining({
        name: 'post_blocked',
      }));
    });

    it('routes to pending_review when moderation times out', async () => {
      mockModerateTextContent.mockRejectedValue(
        new HiveAPIError('Request timed out', 'TIMEOUT', undefined, true)
      );

      const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
      expect(response.status).toBe(201);
      const body = JSON.parse(response.body as string);
      expect(body.post.moderation.status).toBe('pending_review');
      expect(body.post.moderation.error).toContain('timed out');
    });

    it('routes to pending_review when moderation has network error', async () => {
      mockModerateTextContent.mockRejectedValue(
        new HiveAPIError('Network error', 'NETWORK_ERROR', undefined, true)
      );

      const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
      expect(response.status).toBe(201);
      const body = JSON.parse(response.body as string);
      expect(body.post.moderation.status).toBe('pending_review');
      expect(body.post.moderation.error).toBeDefined();
    });

    it('logs moderation error event', async () => {
      mockModerateTextContent.mockRejectedValue(
        new HiveAPIError('API error', 'API_ERROR', 500, true)
      );

      await createPostRoute(userRequest({ text: 'hello' }), contextStub);

      expect(contextStub.log).toHaveBeenCalledWith('posts.create.moderation_error', expect.objectContaining({
        errorCode: 'API_ERROR',
      }));

      expect(trackAppEvent).toHaveBeenCalledWith(expect.objectContaining({
        name: 'moderation_error',
      }));
    });

    it('skips moderation when HIVE_API_KEY is not set', async () => {
      delete process.env.HIVE_API_KEY;

      const response = await createPostRoute(userRequest({ text: 'hello world' }), contextStub);
      expect(response.status).toBe(201);
      const body = JSON.parse(response.body as string);
      expect(body.post.moderation.status).toBe('clean');

      expect(contextStub.log).toHaveBeenCalledWith('posts.create.moderation_skipped', expect.objectContaining({
        reason: 'no_api_key',
      }));

      // Hive client should not have been called
      expect(mockModerateTextContent).not.toHaveBeenCalled();
    });

    it('calls moderateTextContent with correct parameters', async () => {
      mockModerateTextContent.mockResolvedValue({
        action: ModerationAction.ALLOW,
        confidence: 0.99,
        categories: [],
        reasons: [],
      });

      await createPostRoute(userRequest({ text: 'test content' }), contextStub);

      expect(mockModerateTextContent).toHaveBeenCalledWith(expect.objectContaining({
        text: 'test content',
        userId: 'user-123',
        contentId: expect.any(String),
      }));
    });

    it('includes moderation status in success log', async () => {
      mockModerateTextContent.mockResolvedValue({
        action: ModerationAction.WARN,
        confidence: 0.7,
        categories: [],
        reasons: [],
      });

      await createPostRoute(userRequest({ text: 'test' }), contextStub);

      expect(contextStub.log).toHaveBeenCalledWith('posts.create.success', expect.objectContaining({
        moderationStatus: 'warned',
      }));
    });
  });
});
