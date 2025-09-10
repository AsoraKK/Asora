import { httpReqMock } from '../../__tests__/helpers/http';
import { InvocationContext } from '@azure/functions';

jest.mock('../../shared/moderation-text', () => ({
  moderateProfileText: jest.fn()
}));

// Partially mock auth-utils, keep real HttpError/isHttpError
jest.mock('../../shared/auth-utils', () => {
  const actual = jest.requireActual('../../shared/auth-utils');
  return { ...actual, requireUser: jest.fn() };
});

// In-memory Cosmos double via DI factory
const cosmosStub: any = { usersDoc: null as any, patchCalls: [] as any[], auditCreates: 0 };
function fakeCosmos() {
  const containers: any = {
    profile_audit: { items: { create: async () => { cosmosStub.auditCreates++; return {}; } } },
    users: {
      item: () => ({
        read: async () => ({ resource: cosmosStub.usersDoc }),
        patch: async (ops: any) => { cosmosStub.patchCalls.push(ops); }
      })
    }
  };
  return { database: (_: string) => ({ container: (n: string) => containers[n] }) } as any;
}

const { moderateProfileText } = require('../../shared/moderation-text');
const { requireUser, HttpError } = require('../../shared/auth-utils');
const upsertProfile = require('../../users/profile').default as any;

const ctx: Partial<InvocationContext> = { invocationId: 't', log: jest.fn() };

describe('users/profile upsertProfile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    cosmosStub.usersDoc = null;
    cosmosStub.patchCalls = [];
  });

  it('handles CORS preflight (OPTIONS)', async () => {
    const req = httpReqMock({ method: 'OPTIONS' });
    const res = await upsertProfile(req as any, ctx as InvocationContext);
    expect(res.status).toBe(200);
    expect(res.body).toBe('');
  });

  it('rejects when moderation decision is reject', async () => {
    (requireUser as jest.Mock).mockReturnValue({ sub: 'u1' });
    moderateProfileText.mockResolvedValue({ provider: 'unit', decision: 'reject', score: 0.9 });
    const req = httpReqMock({ method: 'POST', body: { displayName: 'bad', bio: 'text' } });
    const res = await upsertProfile(req as any, ctx as InvocationContext, () => fakeCosmos());
    expect(res.status).toBe(400);
    expect((res.headers as any)['X-Moderation-Decision']).toBe('reject');
  });

  it('creates profile with add when no existing profile and review status', async () => {
    (requireUser as jest.Mock).mockReturnValue({ sub: 'u2' });
    moderateProfileText.mockResolvedValue({ provider: 'unit', decision: 'review', score: 0.5 });
    cosmosStub.usersDoc = { id: 'u2' };
    const req = httpReqMock({ method: 'PUT', body: { displayName: 'Alice' } });
    const res = await upsertProfile(req as any, ctx as InvocationContext, () => fakeCosmos());
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.data.status).toBe('under_review');
    expect(Array.isArray(cosmosStub.patchCalls[0])).toBe(true);
    const firstOp = cosmosStub.patchCalls[0][0];
    expect(firstOp.op).toBe('add');
    expect(firstOp.path).toBe('/profile');
    expect(cosmosStub.auditCreates).toBeGreaterThan(0);
  });

  it('replaces profile when existing and approved status', async () => {
    (requireUser as jest.Mock).mockReturnValue({ sub: 'u3' });
    moderateProfileText.mockResolvedValue({ provider: 'unit', decision: 'approve', score: 0.1 });
    cosmosStub.usersDoc = { id: 'u3', profile: { displayName: 'Old' } };
    const req = httpReqMock({ method: 'POST', body: { displayName: 'New' } });
    const res = await upsertProfile(req as any, ctx as InvocationContext, () => fakeCosmos());
    expect(res.status).toBe(200);
    const firstOp = cosmosStub.patchCalls[0][0];
    expect(firstOp.op).toBe('replace');
    expect(cosmosStub.auditCreates).toBeGreaterThan(0);
  });

  it('returns 401 via HttpError when requireUser fails', async () => {
    (requireUser as jest.Mock).mockImplementation(() => { throw new HttpError(401, { code: 'unauthorized' }); });
    const req = httpReqMock({ method: 'POST', body: {} });
    const res = await upsertProfile(req as any, ctx as InvocationContext);
    expect(res.status).toBe(401);
  });

  it('returns 500 on unexpected errors (e.g., Cosmos failure)', async () => {
    (requireUser as jest.Mock).mockReturnValue({ sub: 'u4' });
    moderateProfileText.mockResolvedValue({ provider: 'unit', decision: 'approve', score: 0.2 });
    // Fake cosmos that throws on read
    const throwingCosmos = {
      database: () => ({ container: () => ({ item: () => ({ read: async () => { throw new Error('boom'); } }) }) })
    } as any;
    const req = httpReqMock({ method: 'POST', body: { displayName: 'X' } });
    const res = await upsertProfile(req as any, ctx as InvocationContext, () => throwingCosmos);
    expect(res.status).toBe(500);
  });
});
