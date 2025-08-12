import { HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { userInfo } from '../auth/userinfo';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';

jest.mock('../shared/auth');
jest.mock('../shared/cosmosClient');

const mockGetUserContext = getUserContext as jest.MockedFunction<typeof getUserContext>;
const mockGetContainer = getContainer as jest.MockedFunction<typeof getContainer>;

const createRequest = (token: string): HttpRequest => ({
  method: 'GET',
  url: 'http://test',
  headers: {
    get: (name: string) => {
      if (name.toLowerCase() === 'authorization') {
        return `Bearer ${token}`;
      }
      return undefined;
    }
  }
} as any);

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('userInfo token metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts issuedAt and expiresAt from JWT', async () => {
    const token = jwt.sign({ sub: 'user123' }, 'secret', { expiresIn: '1h' });
    const decoded: any = jwt.decode(token);
    const expected = {
      issuedAt: new Date(decoded.iat * 1000).toISOString(),
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    };

    mockGetUserContext.mockReturnValue({ userId: 'user123', email: 'test@example.com' });

    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      created_at: new Date().toISOString()
    };
    const container = { item: jest.fn().mockReturnThis(), read: jest.fn().mockResolvedValue({ resource: mockUser }) };
    mockGetContainer.mockReturnValue(container as any);

    const request = createRequest(token);
    const response = await userInfo(request, mockContext as any);

    expect(response.status).toBe(200);
    expect(response.jsonBody.tokenInfo).toEqual(expected);
  });
});
