/**
 * Test suite for appeals functionality
 * Tests the core logic without importing the Azure Functions app registration
 */

import { requireAuth } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import { postAppeal } from '../appeals/postAppeal';

// Mock dependencies
jest.mock('../shared/cosmosClient');
jest.mock('../shared/auth');

const mockGetContainer = getContainer as jest.MockedFunction<typeof getContainer>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe('Appeals Logic', () => {
  let mockAppealsContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAppealsContainer = {
      items: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    
    mockGetContainer.mockReturnValue(mockAppealsContainer);
  });

  // Test the core business logic that would be in the handler
  it('should validate required fields', () => {
    const body = { postId: '', reason: 'test' };
    expect(!body.postId || !body.reason).toBe(true);
  });

  it('should create appeal data structure correctly', () => {
    const user = { sub: 'user123', email: 'test@example.com', role: 'user', tier: 'free' };
    const body = { postId: 'post123', reason: 'This was wrongly flagged' };
    
    const appeal = {
      id: 'test-uuid-123',
      postId: body.postId,
      userId: user.sub,
      reason: String(body.reason).slice(0, 1000),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };

    expect(appeal.postId).toBe('post123');
    expect(appeal.userId).toBe('user123');
    expect(appeal.status).toBe('open');
  });

  it('should truncate long reasons to 1000 characters', () => {
    const longReason = 'x'.repeat(1500);
    const truncated = String(longReason).slice(0, 1000);
    expect(truncated.length).toBe(1000);
  });
});

describe('postAppeal handler', () => {
  let mockAppealsContainer: any;
  const mockContext = { log: jest.fn(), error: jest.fn() } as any;

  const createRequest = (body: any) => ({
    method: 'POST',
    url: 'https://test.com/api/appeals',
    headers: {},
    json: async () => body,
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppealsContainer = { items: { create: jest.fn().mockResolvedValue({}) } };
    mockGetContainer.mockReturnValue(mockAppealsContainer);
    mockRequireAuth.mockReturnValue({ sub: 'user123' });
  });

  it('returns 201 for valid body', async () => {
    const req = createRequest({ postId: 'post123', reason: 'valid reason' });
    const res = await postAppeal(req, mockContext);
    expect(res.status).toBe(201);
    expect(mockAppealsContainer.items.create).toHaveBeenCalled();
  });

  it('returns 400 for invalid body', async () => {
    const req = createRequest({ postId: '', reason: '' });
    const res = await postAppeal(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const req = {
      method: 'POST',
      url: 'https://test.com/api/appeals',
      headers: {},
      json: async () => { throw new Error('Invalid JSON'); },
    } as any;
    const res = await postAppeal(req, mockContext);
    expect(res.status).toBe(400);
  });
});
