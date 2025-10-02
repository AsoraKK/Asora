import { withAccessGuard } from '../shared/access-guard';
import { HttpRequest, InvocationContext } from '@azure/functions';

jest.mock('../shared/auth-utils', () => ({
  requireUser: jest.fn().mockResolvedValue({ sub: 'user-1', roles: ['user'], isActive: true }),
  hasRole: (_: any, r: string) => r === 'user',
  HttpError: class HttpError extends Error { constructor(public status: number, public body: any){ super('http'); } },
}));

function req(): HttpRequest { return ({ headers: new Headers(), method: 'GET', url: 'http://localhost' } as any); }
function ctx(): InvocationContext { return ({ invocationId: 't', log: jest.fn() } as any); }

test('allows user with role', async () => {
  const handler = withAccessGuard(async () => ({ status: 200 }), { role: 'user' });
  const res = await handler(req(), ctx());
  expect(res.status).toBe(200);
});

test('blocks missing role', async () => {
  const handler = withAccessGuard(async () => ({ status: 200 }), { role: 'admin' });
  await expect(handler(req(), ctx())).rejects.toBeTruthy();
});

