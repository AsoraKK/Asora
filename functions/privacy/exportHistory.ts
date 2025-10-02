import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { requireUser, isHttpError } from '../shared/auth-utils';
import { createErrorResponse, createSuccessResponse } from '../shared/http-utils';

export async function exportHistory(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await requireUser(context, req);
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
    const audit = database.container('privacy_audit');
    const { resources } = await audit.items.query({
      query: 'SELECT TOP 50 c.id, c.action, c.result, c.timestamp FROM c WHERE c.userId = @uid AND c.action = "export" ORDER BY c.timestamp DESC',
      parameters: [{ name: '@uid', value: user.sub }]
    }).fetchAll();
    return createSuccessResponse({ items: resources });
  } catch (e: any) {
    if (isHttpError(e)) return createErrorResponse(e.status, e.message);
    return createErrorResponse(500, 'Failed to load export history');
  }
}

app.http('privacy-export-history', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'privacy/history',
  handler: exportHistory,
});

export default exportHistory;

