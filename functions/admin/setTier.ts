import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { withAccessGuard } from '../shared/access-guard';

async function setTier(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const body = (await req.json().catch(() => ({}))) as any;
  const userId = String(body.userId || '');
  const tier = String(body.tier || '');
  if (!userId || !tier) {
    return { status: 400, jsonBody: { error: 'missing_parameters', required: ['userId', 'tier'] } };
  }
  const cosmos = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
  const db = cosmos.database(process.env.COSMOS_DATABASE_NAME || 'asora');
  const users = db.container('users');
  const { resource } = await users.item(userId, userId).read();
  if (!resource) return { status: 404, jsonBody: { error: 'user_not_found' } };
  await users.item(userId, userId).replace({ ...resource, tier });
  return { status: 200, jsonBody: { userId, tier } };
}

app.http('admin-set-tier', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/tier',
  handler: withAccessGuard(setTier, { role: 'admin' })
});

export default setTier;
