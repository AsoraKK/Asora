/**
 * Integration tests for post creation with tier-based media limits
 */

import { HttpRequest } from '@azure/functions';
import { postCreate } from '../post/create';

// Mock dependencies
jest.mock('../shared/auth');
jest.mock('../shared/cosmosClient');
jest.mock('../shared/moderationConfig');
jest.mock('../shared/hiveClient');
jest.mock('../shared/privacyUtils');

const mockGetUserContext = require('../shared/auth').getUserContext as jest.MockedFunction<any>;
const mockGetContainer = require('../shared/cosmosClient').getContainer as jest.MockedFunction<any>;
const mockGetModerationConfig = require('../shared/moderationConfig').getModerationConfig as jest.MockedFunction<any>;
const mockModerateText = require('../shared/hiveClient').moderateText as jest.MockedFunction<any>;
const mockHashEmail = require('../shared/privacyUtils').hashEmail as jest.MockedFunction<any>;
const mockPrivacyLog = require('../shared/privacyUtils').privacyLog as jest.MockedFunction<any>;

describe('Post Creation - Tier Media Limits', () => {
  const mockContext = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  const mockCosmosContainer = {
    items: {
      create: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetContainer.mockReturnValue(mockCosmosContainer);
    mockGetModerationConfig.mockResolvedValue({
      charLimits: { post: 2000 },
      thresholds: { safe: 0.3, warned: 0.7 }
    });
    mockModerateText.mockResolvedValue({
      score: 0.1,
      decision: 'approve',
      categories: {},
      triggeredRules: [],
      raw: {}
    });
    mockHashEmail.mockReturnValue('hashedEmail');
    mockPrivacyLog.mockReturnValue('logData');
    mockCosmosContainer.items.create.mockResolvedValue({});
  });

  const createMockRequest = (body: any): HttpRequest => ({
    method: 'POST',
    url: 'https://test.com/api/post/create',
    headers: {},
    body: {
      string: JSON.stringify(body)
    },
    json: async () => body
  } as any);

  describe('Free Tier Media Limits', () => {
    beforeEach(() => {
      mockGetUserContext.mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
        tier: 'Free'
      });
    });

    it('should allow Free tier user to create post with 1 attachment', async () => {
      const requestBody = {
        text: 'Test post with one image',
        attachments: [
          { url: 'https://example.com/image1.jpg', type: 'image' }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await postCreate(request, mockContext as any);

      expect(response.status).toBe(201);
      expect(mockCosmosContainer.items.create).toHaveBeenCalled();
    });

    it('should reject Free tier user with 2 attachments', async () => {
      const requestBody = {
        text: 'Test post with two images',
        attachments: [
          { url: 'https://example.com/image1.jpg', type: 'image' },
          { url: 'https://example.com/image2.jpg', type: 'image' }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await postCreate(request, mockContext as any);

      expect(response.status).toBe(403);
      expect(response.jsonBody).toEqual({
        error: 'Tier media limit exceeded',
        code: 'TIER_MEDIA_LIMIT',
        allowed: 1,
        attempted: 2,
        tier: 'Free'
      });
      expect(mockCosmosContainer.items.create).not.toHaveBeenCalled();
    });
  });

  describe('Black Tier Media Limits', () => {
    beforeEach(() => {
      mockGetUserContext.mockReturnValue({
        userId: 'user456',
        email: 'black@example.com',
        tier: 'Black'
      });
    });

    it('should allow Black tier user to create post with 3 attachments', async () => {
      const requestBody = {
        text: 'Test post with three images',
        attachments: [
          { url: 'https://example.com/image1.jpg', type: 'image' },
          { url: 'https://example.com/image2.jpg', type: 'image' },
          { url: 'https://example.com/image3.jpg', type: 'image' }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await postCreate(request, mockContext as any);

      expect(response.status).toBe(201);
      expect(mockCosmosContainer.items.create).toHaveBeenCalled();
    });

    it('should reject Black tier user with 4 attachments', async () => {
      const requestBody = {
        text: 'Test post with four images',
        attachments: [
          { url: 'https://example.com/image1.jpg', type: 'image' },
          { url: 'https://example.com/image2.jpg', type: 'image' },
          { url: 'https://example.com/image3.jpg', type: 'image' },
          { url: 'https://example.com/image4.jpg', type: 'image' }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await postCreate(request, mockContext as any);

      expect(response.status).toBe(403);
      expect(response.jsonBody).toEqual({
        error: 'Tier media limit exceeded',
        code: 'TIER_MEDIA_LIMIT',
        allowed: 3,
        attempted: 4,
        tier: 'Black'
      });
      expect(mockCosmosContainer.items.create).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing tier gracefully (default to Free)', async () => {
      mockGetUserContext.mockReturnValue({
        userId: 'user789',
        email: 'noTier@example.com'
        // tier is undefined
      });

      const requestBody = {
        text: 'Test post without tier',
        attachments: [
          { url: 'https://example.com/image1.jpg', type: 'image' },
          { url: 'https://example.com/image2.jpg', type: 'image' }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await postCreate(request, mockContext as any);

      expect(response.status).toBe(403);
      expect(response.jsonBody.allowed).toBe(1); // Free tier limit
    });

    it('should allow posts with no attachments regardless of tier', async () => {
      mockGetUserContext.mockReturnValue({
        userId: 'user000',
        email: 'text@example.com',
        tier: 'Free'
      });

      const requestBody = {
        text: 'Text-only post with no attachments'
      };

      const request = createMockRequest(requestBody);
      const response = await postCreate(request, mockContext as any);

      expect(response.status).toBe(201);
      expect(mockCosmosContainer.items.create).toHaveBeenCalled();
    });
  });
});
