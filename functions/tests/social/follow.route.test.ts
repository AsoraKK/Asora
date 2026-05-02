import type { InvocationContext } from '@azure/functions';

import { follow_create, follow_delete } from '@social/follow';
import { httpReqMock } from '../helpers/http';

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn().mockResolvedValue({ userId: 'user-1' }),
}));

jest.mock('@shared/clients/postgres', () => ({
  withClient: jest.fn(),
}));

jest.mock('@shared/services/notificationEvents', () => ({
  enqueueUserNotification: jest.fn(),
}));

jest.mock('@rate-limit/policies', () => ({
  getPolicyForRoute: jest.fn().mockReturnValue({ limit: 100, windowMs: 60_000 }),
}));

jest.mock('@http/withRateLimit', () => ({
  withRateLimit: (_policy: unknown, handler: Function) => handler,
}));

const { withClient } = require('@shared/clients/postgres');
const contextStub = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as InvocationContext;

describe('follow route — POST (create)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when targetId equals own userId', async () => {
    const req = httpReqMock({
      method: 'POST',
      params: { id: 'user-1' },
      headers: { authorization: 'Bearer valid' },
    });
    const res = await follow_create(req as any, contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 400 when targetId is missing', async () => {
    const req = httpReqMock({
      method: 'POST',
      params: {},
      headers: { authorization: 'Bearer valid' },
    });
    const res = await follow_create(req as any, contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 200 and following=true when insert succeeds', async () => {
    withClient
      .mockResolvedValueOnce(true) // INSERT
      .mockResolvedValueOnce(5);   // COUNT

    const req = httpReqMock({
      method: 'POST',
      params: { id: 'user-2' },
      headers: { authorization: 'Bearer valid' },
    });
    const res = await follow_create(req as any, contextStub);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.following).toBe(true);
    expect(body.followerCount).toBe(5);
  });

  it('returns 200 and following=true even when already followed (ON CONFLICT DO NOTHING)', async () => {
    withClient
      .mockResolvedValueOnce(false) // INSERT — no rows inserted (conflict)
      .mockResolvedValueOnce(3);    // COUNT

    const req = httpReqMock({
      method: 'POST',
      params: { id: 'user-2' },
      headers: { authorization: 'Bearer valid' },
    });
    const res = await follow_create(req as any, contextStub);
    expect(res.status).toBe(200);
  });
});

describe('follow route — DELETE (unfollow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when targetId equals own userId', async () => {
    const req = httpReqMock({
      method: 'DELETE',
      params: { id: 'user-1' },
      headers: { authorization: 'Bearer valid' },
    });
    const res = await follow_delete(req as any, contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 200 with following=false after successful delete', async () => {
    withClient
      .mockResolvedValueOnce(undefined) // DELETE
      .mockResolvedValueOnce(4);        // COUNT

    const req = httpReqMock({
      method: 'DELETE',
      params: { id: 'user-2' },
      headers: { authorization: 'Bearer valid' },
    });
    const res = await follow_delete(req as any, contextStub);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.following).toBe(false);
    expect(body.followerCount).toBe(4);
  });
});
