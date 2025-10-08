import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withAccessGuard } from '../shared/access-guard';
import { exportUser as userExportHandler } from '../privacy/exportUser';
import { CosmosClient } from '@azure/cosmos';

function buildUnsignedJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
    })
  ).toString('base64url');
  const signature = '';
  return `${header}.${payload}.${signature}`;
}

async function adminExport(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || '';
  if (!userId) {
    return { status: 400, jsonBody: { error: 'missing_userId' } };
  }

  // Build a faux request with Authorization for the target user
  const token = buildUnsignedJwt(userId);
  const adminReq: HttpRequest = {
    method: 'GET',
    url: req.url,
    headers: new Headers({ authorization: `Bearer ${token}` }),
    query: new URLSearchParams(),
    params: {},
    user: null as any,
    json: async () => ({}) as any,
  } as any;

  // Invoke the existing export handler to keep output identical
  const result = await userExportHandler(adminReq, ctx);

  // Log privacy audit with operator=admin
  try {
    const cosmos = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const db = cosmos.database(process.env.COSMOS_DATABASE_NAME || 'asora');
    const audit = db.container('privacy_audit');
    await audit.items.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action: 'export',
      result: result.status === 200 ? 'success' : 'failure',
      operator: 'admin',
      timestamp: new Date().toISOString(),
    });
  } catch {
    // TODO: Handle audit log failure - consider retry or alternative logging
  }

  return result;
}

app.http('admin-export', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/export',
  handler: withAccessGuard(adminExport, { role: 'admin' }),
});

export default adminExport;
