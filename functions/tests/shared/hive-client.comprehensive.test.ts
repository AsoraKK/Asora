/**
 * Comprehensive tests for Hive AI client
 * Tests moderation functionality, error handling, retries, and response parsing
 */
import {
  HiveAIClient,
  HiveAPIError,
  ModerationAction,
  ModerationCategory,
  createHiveClient,
} from '../../shared/hive-client';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HiveAIClient', () => {
  const testApiKey = 'test-api-key-12345';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to create mock response
  function mockFetchResponse(
    body: any,
    status = 200,
    statusText = 'OK'
  ): Promise<Response> {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText,
      json: () => Promise.resolve(body),
    } as Response);
  }

  // Helper to create a successful Hive response
  function createHiveResponse(
    action: 'accept' | 'review' | 'reject' = 'accept',
    score = 0.1,
    classes: { class: string; score: number }[] = []
  ) {
    return {
      status: 'success' as const,
      response: {
        outputs: {
          general_text_classification: {
            summary: {
              action,
              action_reason: action === 'accept' ? '' : 'Policy violation detected',
              score,
            },
            classes,
          },
        },
      },
      request_id: 'test-request-id-123',
    };
  }

  describe('constructor', () => {
    it('accepts string API key for backwards compatibility', () => {
      const client = new HiveAIClient(testApiKey);
      expect(client).toBeInstanceOf(HiveAIClient);
    });

    it('accepts config object with custom settings', () => {
      const client = new HiveAIClient({
        apiKey: testApiKey,
        baseUrl: 'https://custom.hive.ai/api',
        timeoutMs: 5000,
        retries: 3,
        retryDelayMs: 500,
      });
      expect(client).toBeInstanceOf(HiveAIClient);
    });
  });

  describe('moderateTextContent', () => {
    it('returns ALLOW for safe content', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(createHiveResponse('accept', 0.1, []))
      );

      const result = await client.moderateTextContent({
        text: 'Hello, this is a friendly message!',
        userId: 'user-123',
      });

      expect(result.action).toBe(ModerationAction.ALLOW);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.categories).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns WARN for borderline content', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('review', 0.6, [{ class: 'harassment', score: 0.6 }])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Some questionable content',
        userId: 'user-123',
      });

      expect(result.action).toBe(ModerationAction.WARN);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.categories).toContain(ModerationCategory.HARASSMENT);
    });

    it('returns BLOCK for violating content', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('reject', 0.95, [
            { class: 'hate_speech', score: 0.95 },
            { class: 'violence', score: 0.88 },
          ])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Hateful and violent content',
        userId: 'user-123',
        contentId: 'post-456',
      });

      expect(result.action).toBe(ModerationAction.BLOCK);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.categories).toContain(ModerationCategory.HATE_SPEECH);
      expect(result.categories).toContain(ModerationCategory.VIOLENCE);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('returns ALLOW immediately for empty text', async () => {
      const client = new HiveAIClient(testApiKey);

      const result = await client.moderateTextContent({
        text: '',
        userId: 'user-123',
      });

      expect(result.action).toBe(ModerationAction.ALLOW);
      expect(result.reasons).toContain('Empty content');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns ALLOW immediately for whitespace-only text', async () => {
      const client = new HiveAIClient(testApiKey);

      const result = await client.moderateTextContent({
        text: '   \n\t  ',
        userId: 'user-123',
      });

      expect(result.action).toBe(ModerationAction.ALLOW);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends correct request body', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(createHiveResponse())
      );

      await client.moderateTextContent({
        text: 'Test content',
        userId: 'user-123',
        contentId: 'content-456',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.thehive.ai/api/v2/task/sync',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testApiKey}`,
            'X-Content-Id': 'content-456',
          }),
          body: expect.stringContaining('"user_id":"user-123"'),
        })
      );
    });

    it('uses custom models when provided', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(createHiveResponse())
      );

      await client.moderateTextContent({
        text: 'Test content',
        userId: 'user-123',
        models: ['custom_model_1', 'custom_model_2'],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.models).toEqual(['custom_model_1', 'custom_model_2']);
    });
  });

  describe('error handling', () => {
    it('throws HiveAPIError on 400 response', async () => {
      const client = new HiveAIClient({
        apiKey: testApiKey,
        retries: 0, // No retries for this test
      });
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Bad request' }, 400, 'Bad Request')
      );

      await expect(
        client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        })
      ).rejects.toThrow(HiveAPIError);
    });

    it('includes correct error properties on 400', async () => {
      const client = new HiveAIClient({
        apiKey: testApiKey,
        retries: 0,
      });
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Bad request' }, 400, 'Bad Request')
      );

      try {
        await client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        });
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(HiveAPIError);
        const error = e as HiveAPIError;
        expect(error.code).toBe('API_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.retryable).toBe(false);
      }
    });

    it('throws HiveAPIError on 500 response after retries', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const client = new HiveAIClient({
        apiKey: testApiKey,
        retries: 1,
        retryDelayMs: 10, // Very short delay for testing
      });

      // Mock all retries to fail with 500
      mockFetch
        .mockResolvedValueOnce(mockFetchResponse({}, 500, 'Internal Server Error'))
        .mockResolvedValueOnce(mockFetchResponse({}, 500, 'Internal Server Error'));

      await expect(
        client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        })
      ).rejects.toThrow(HiveAPIError);
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    });

    it('retries on 429 rate limit', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const client = new HiveAIClient({
        apiKey: testApiKey,
        retries: 1,
        retryDelayMs: 10, // Very short delay for testing
      });

      // First call: rate limited, second call: success
      mockFetch
        .mockResolvedValueOnce(mockFetchResponse({}, 429, 'Too Many Requests'))
        .mockResolvedValueOnce(mockFetchResponse(createHiveResponse()));

      const result = await client.moderateTextContent({
        text: 'Test content',
        userId: 'user-123',
      });

      expect(result.action).toBe(ModerationAction.ALLOW);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    });

    it('throws HiveAPIError on invalid JSON response', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      } as Response);

      await expect(
        client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        })
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        message: 'Invalid JSON response from Hive API',
      });
    });

    it('throws HiveAPIError on missing outputs in response', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({
          status: 'success',
          response: {},
          request_id: 'test-123',
        })
      );

      await expect(
        client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('throws HiveAPIError on error status in response', async () => {
      const client = new HiveAIClient({
        apiKey: testApiKey,
        retries: 0,
      });
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse({
          status: 'error',
          response: { outputs: {} },
          request_id: 'test-123',
        })
      );

      await expect(
        client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        })
      ).rejects.toMatchObject({
        code: 'API_ERROR_STATUS',
      });
    });

    it('throws HiveAPIError on timeout', async () => {
      const client = new HiveAIClient({
        apiKey: testApiKey,
        retries: 0,
      });

      // Mock fetch to throw an AbortError (what happens on timeout)
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        client.moderateTextContent({
          text: 'Test content',
          userId: 'user-123',
        })
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: expect.stringContaining('timed out'),
      });
    });
  });

  describe('category mapping', () => {
    it('maps hate speech classes correctly', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('reject', 0.9, [{ class: 'hate', score: 0.9 }])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Test',
        userId: 'user-123',
      });

      expect(result.categories).toContain(ModerationCategory.HATE_SPEECH);
    });

    it('maps violence classes correctly', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('reject', 0.9, [{ class: 'gore', score: 0.9 }])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Test',
        userId: 'user-123',
      });

      expect(result.categories).toContain(ModerationCategory.VIOLENCE);
    });

    it('maps adult content classes correctly', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('reject', 0.9, [{ class: 'nudity', score: 0.9 }])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Test',
        userId: 'user-123',
      });

      expect(result.categories).toContain(ModerationCategory.ADULT_CONTENT);
    });

    it('maps self-harm classes correctly', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('reject', 0.9, [{ class: 'suicide', score: 0.9 }])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Test',
        userId: 'user-123',
      });

      expect(result.categories).toContain(ModerationCategory.SELF_HARM);
    });

    it('maps unknown classes to OTHER', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(
          createHiveResponse('review', 0.6, [
            { class: 'unknown_category_xyz', score: 0.6 },
          ])
        )
      );

      const result = await client.moderateTextContent({
        text: 'Test',
        userId: 'user-123',
      });

      expect(result.categories).toContain(ModerationCategory.OTHER);
    });
  });

  describe('legacy moderateText method', () => {
    it('maintains backwards compatibility', async () => {
      const client = new HiveAIClient(testApiKey);
      mockFetch.mockResolvedValueOnce(
        mockFetchResponse(createHiveResponse())
      );

      const result = await client.moderateText('user-123', 'Test content');

      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('request_id');
    });
  });

  describe('static parseModerationResult', () => {
    it('parses accept response correctly', () => {
      const response = createHiveResponse('accept', 0.1, []);
      const result = HiveAIClient.parseModerationResult(response);

      expect(result.action).toBe('accept');
      expect(result.confidence).toBe(0.1);
      expect(result.flaggedCategories).toHaveLength(0);
    });

    it('parses reject response with categories', () => {
      const response = createHiveResponse('reject', 0.95, [
        { class: 'violence', score: 0.95 },
        { class: 'safe', score: 0.05 },
      ]);
      const result = HiveAIClient.parseModerationResult(response);

      expect(result.action).toBe('reject');
      expect(result.confidence).toBe(0.95);
      expect(result.flaggedCategories).toContain(
        'general_text_classification:violence'
      );
    });
  });

  describe('createHiveClient factory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('creates client from environment variable', () => {
      process.env.HIVE_API_KEY = 'env-api-key';

      const client = createHiveClient();
      expect(client).toBeInstanceOf(HiveAIClient);
    });

    it('throws error when HIVE_API_KEY is missing', () => {
      delete process.env.HIVE_API_KEY;

      expect(() => createHiveClient()).toThrow(
        'HIVE_API_KEY environment variable is required'
      );
    });

    it('allows overriding API key via config', () => {
      process.env.HIVE_API_KEY = 'env-api-key';

      const client = createHiveClient({ apiKey: 'override-key' });
      expect(client).toBeInstanceOf(HiveAIClient);
    });

    it('uses HIVE_API_URL environment variable for base URL', () => {
      process.env.HIVE_API_KEY = 'test-key';
      process.env.HIVE_API_URL = 'https://custom.hive.ai';

      const client = createHiveClient();
      expect(client).toBeInstanceOf(HiveAIClient);
    });
  });
});

describe('HiveAPIError', () => {
  it('has correct name and properties', () => {
    const error = new HiveAPIError('Test error', 'TEST_CODE', 500, true);

    expect(error.name).toBe('HiveAPIError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it('defaults retryable to false', () => {
    const error = new HiveAPIError('Test error', 'TEST_CODE');

    expect(error.retryable).toBe(false);
  });
});
