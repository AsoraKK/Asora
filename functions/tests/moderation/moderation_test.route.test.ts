import type { InvocationContext } from '@azure/functions';

import { httpReqMock } from '../helpers/http';
import { moderation_test } from '../../src/moderation/routes/moderation_test.function';
import { extractAuthContext } from '../../src/shared/http/authContext';
import { createHiveClient } from '../../src/shared/clients/hive';

jest.mock('../../src/shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('../../src/shared/clients/hive', () => ({
  createHiveClient: jest.fn(),
}));

const mockedAuth = jest.mocked(extractAuthContext);
const mockedCreateHiveClient = jest.mocked(createHiveClient);

const makeContext = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'test-correlation-id',
    functionName: 'moderation_test',
    triggerMetadata: {},
    retryContext: {},
    extraInputs: {},
    extraOutputs: {},
    options: {},
  }) as unknown as InvocationContext;

const adminAuth = {
  userId: 'admin-user-1',
  roles: ['admin'],
  tier: 'premium',
  token: {},
};

const moderatorAuth = {
  userId: 'mod-user-1',
  roles: ['moderator'],
  tier: 'free',
  token: {},
};

const regularUserAuth = {
  userId: 'regular-user-1',
  roles: ['user'],
  tier: 'free',
  token: {},
};

// Helper to parse response body (Azure Functions uses jsonBody for JSON responses)
function parseBody<T>(response: { body?: string | object | null; jsonBody?: unknown }): T {
  // Azure Functions v4 uses jsonBody for JSON responses
  if (response.jsonBody !== undefined) {
    return response.jsonBody as T;
  }
  if (typeof response.body === 'string') {
    return JSON.parse(response.body) as T;
  }
  return (response.body ?? {}) as T;
}

describe('moderation_test route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.HIVE_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authentication', () => {
    it('returns 401 when no authentication provided', async () => {
      mockedAuth.mockRejectedValue(new Error('No token'));

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(401);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user lacks admin/moderator role', async () => {
      mockedAuth.mockResolvedValue(regularUserAuth);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(403);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('allows access for admin users', async () => {
      mockedAuth.mockResolvedValue(adminAuth);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'hello world' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
    });

    it('allows access for moderator users', async () => {
      mockedAuth.mockResolvedValue(moderatorAuth);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'hello world' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
    });
  });

  describe('request validation', () => {
    beforeEach(() => {
      mockedAuth.mockResolvedValue(adminAuth);
    });

    it('returns 400 when type is missing', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('INVALID_TYPE');
    });

    it('returns 400 when type is invalid', async () => {
      process.env.HIVE_API_KEY = 'test-api-key';
      mockedCreateHiveClient.mockReturnValue({
        moderateTextContent: jest.fn(),
        moderateImage: jest.fn(),
      } as unknown as ReturnType<typeof createHiveClient>);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'video', content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('INVALID_TYPE');
    });

    it('returns 400 when text content is missing', async () => {
      process.env.HIVE_API_KEY = 'test-api-key';
      mockedCreateHiveClient.mockReturnValue({
        moderateTextContent: jest.fn(),
        moderateImage: jest.fn(),
      } as unknown as ReturnType<typeof createHiveClient>);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text' },
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('MISSING_CONTENT');
    });

    it('returns 400 when text content is empty', async () => {
      process.env.HIVE_API_KEY = 'test-api-key';
      mockedCreateHiveClient.mockReturnValue({
        moderateTextContent: jest.fn(),
        moderateImage: jest.fn(),
      } as unknown as ReturnType<typeof createHiveClient>);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: '   ' },
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('MISSING_CONTENT');
    });

    it('returns 400 when image URL is missing', async () => {
      process.env.HIVE_API_KEY = 'test-api-key';
      mockedCreateHiveClient.mockReturnValue({
        moderateTextContent: jest.fn(),
        moderateImage: jest.fn(),
      } as unknown as ReturnType<typeof createHiveClient>);

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'image' },
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      const body = parseBody<{ error?: { code?: string } }>(response);
      expect(body.error?.code).toBe('MISSING_URL');
    });
  });

  describe('mock mode (no API key)', () => {
    beforeEach(() => {
      mockedAuth.mockResolvedValue(adminAuth);
      delete process.env.HIVE_API_KEY;
    });

    it('returns mock response for clean text', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'Hello, this is a friendly message!' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{
        isLive: boolean;
        action: string;
        classScores: Record<string, number>;
      }>(response);
      expect(body.isLive).toBe(false);
      expect(body.action).toBe('ALLOW');
      expect(body.classScores).toBeDefined();
    });

    it('returns WARN for potentially negative content', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'I hate everything and feel angry!' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ action: string; categories: string[] }>(response);
      expect(body.action).toBe('WARN');
      expect(body.categories).toContain('harassment');
    });

    it('returns BLOCK for explicit content', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'nsfw explicit adult content' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ action: string; categories: string[] }>(response);
      expect(body.action).toBe('BLOCK');
      expect(body.categories).toContain('adult_content');
    });

    it('returns mock response for image URL', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'image', url: 'https://example.com/safe-image.jpg' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ isLive: boolean; action: string }>(response);
      expect(body.isLive).toBe(false);
      expect(body.action).toBe('ALLOW');
    });
  });

  describe('live mode (with API key)', () => {
    const mockHiveClient = {
      moderateTextContent: jest.fn(),
      moderateImage: jest.fn(),
    };

    beforeEach(() => {
      mockedAuth.mockResolvedValue(adminAuth);
      process.env.HIVE_API_KEY = 'test-api-key';
      mockedCreateHiveClient.mockReturnValue(mockHiveClient as unknown as ReturnType<typeof createHiveClient>);
    });

    it('calls Hive API for text moderation', async () => {
      mockHiveClient.moderateTextContent.mockResolvedValue({
        action: 'ALLOW',
        confidence: 0.95,
        categories: [],
        reasons: ['No violations detected'],
        requestId: 'hive-req-123',
        raw: {},
      });

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'Hello world!' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ isLive: boolean; action: string; requestId: string }>(response);
      expect(body.isLive).toBe(true);
      expect(body.action).toBe('ALLOW');
      expect(body.requestId).toBe('hive-req-123');
      expect(mockHiveClient.moderateTextContent).toHaveBeenCalledWith({
        text: 'Hello world!',
        userId: 'admin-user-1',
        contentId: expect.stringMatching(/^test-/),
      });
    });

    it('calls Hive API for image moderation', async () => {
      mockHiveClient.moderateImage.mockResolvedValue({
        id: 'hive-img-456',
        status: [
          {
            response: {
              output: [
                {
                  classes: [
                    { class: 'safe', score: 0.98 },
                    { class: 'general', score: 0.95 },
                  ],
                },
              ],
            },
          },
        ],
      });

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'image', url: 'https://example.com/image.jpg' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ isLive: boolean; action: string }>(response);
      expect(body.isLive).toBe(true);
      expect(body.action).toBe('ALLOW');
      expect(mockHiveClient.moderateImage).toHaveBeenCalledWith(
        'admin-user-1',
        'https://example.com/image.jpg'
      );
    });

    it('returns BLOCK for high-score NSFW image', async () => {
      mockHiveClient.moderateImage.mockResolvedValue({
        id: 'hive-img-789',
        status: [
          {
            response: {
              output: [
                {
                  classes: [
                    { class: 'nsfw', score: 0.92 },
                    { class: 'nude', score: 0.88 },
                    { class: 'safe', score: 0.05 },
                  ],
                },
              ],
            },
          },
        ],
      });

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'image', url: 'https://example.com/image.jpg' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ action: string; categories: string[] }>(response);
      expect(body.action).toBe('BLOCK');
      expect(body.categories).toContain('adult_content');
    });

    it('returns WARN for borderline scores', async () => {
      mockHiveClient.moderateImage.mockResolvedValue({
        id: 'hive-img-borderline',
        status: [
          {
            response: {
              output: [
                {
                  classes: [
                    { class: 'nsfw', score: 0.6 },
                    { class: 'safe', score: 0.35 },
                  ],
                },
              ],
            },
          },
        ],
      });

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'image', url: 'https://example.com/borderline.jpg' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ action: string }>(response);
      expect(body.action).toBe('WARN');
    });

    it('handles API errors gracefully', async () => {
      mockHiveClient.moderateTextContent.mockRejectedValue(new Error('API timeout'));

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'test content' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ action: string; reasons: string[] }>(response);
      expect(body.action).toBe('ERROR');
      expect(body.reasons).toContain('API Error: API timeout');
    });

    it('extracts class scores from raw response', async () => {
      mockHiveClient.moderateTextContent.mockResolvedValue({
        action: 'ALLOW',
        confidence: 0.9,
        categories: [],
        reasons: [],
        requestId: 'test',
        raw: {
          status: [
            {
              response: {
                output: [
                  {
                    classes: [
                      { class: 'hate', score: 0.05 },
                      { class: 'violence', score: 0.02 },
                      { class: 'sexual', score: 0.01 },
                    ],
                  },
                ],
              },
            },
          ],
        },
      });

      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'Hello!' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ classScores: Record<string, number> }>(response);
      expect(body.classScores).toEqual({
        hate: 0.05,
        violence: 0.02,
        sexual: 0.01,
      });
    });
  });

  describe('response format', () => {
    beforeEach(() => {
      mockedAuth.mockResolvedValue(adminAuth);
    });

    it('includes all required fields in response', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<Record<string, unknown>>(response);
      
      expect(body).toHaveProperty('action');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('categories');
      expect(body).toHaveProperty('reasons');
      expect(body).toHaveProperty('requestId');
      expect(body).toHaveProperty('classScores');
      expect(body).toHaveProperty('processingTimeMs');
      expect(body).toHaveProperty('isLive');
    });

    it('returns valid confidence score between 0 and 1', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ confidence: number }>(response);
      expect(body.confidence).toBeGreaterThanOrEqual(0);
      expect(body.confidence).toBeLessThanOrEqual(1);
    });

    it('returns processingTimeMs as positive number', async () => {
      const response = await moderation_test(
        httpReqMock({
          method: 'POST',
          body: { type: 'text', content: 'test' },
        }),
        makeContext()
      );

      expect(response.status).toBe(200);
      const body = parseBody<{ processingTimeMs: number }>(response);
      expect(body.processingTimeMs).toBeGreaterThan(0);
    });
  });
});
