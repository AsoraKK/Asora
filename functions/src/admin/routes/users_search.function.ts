import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseLimit(value?: string | null): number {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export async function searchUsers(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const query = req.query?.get?.('q')?.trim();
  if (!query) {
    return createErrorResponse(400, 'missing_query', 'q is required');
  }

  const limit = parseLimit(req.query?.get?.('limit'));

  try {
    const db = getTargetDatabase();
    const q = query.toLowerCase();

    const result = await db.users.items
      .query(
        {
          query: `
            SELECT c.id, c.email, c.username, c.displayName, c.createdAt, c.isActive
            FROM c
            WHERE CONTAINS(LOWER(c.id), @q)
              OR CONTAINS(LOWER(c.username), @q)
              OR CONTAINS(LOWER(c.displayName), @q)
              OR CONTAINS(LOWER(c.email), @q)
            ORDER BY c.createdAt DESC
          `,
          parameters: [{ name: '@q', value: q }],
        },
        { maxItemCount: limit }
      )
      .fetchAll();

    const items = result.resources.map((user) => ({
      userId: user.id,
      displayName: user.displayName ?? null,
      handle: user.username ?? null,
      email: user.email ?? null,
      createdAt: user.createdAt ?? null,
      status: user.isActive === false ? 'DISABLED' : 'ACTIVE',
    }));

    return createSuccessResponse({
      items,
      count: items.length,
    });
  } catch (error) {
    context.error('admin.users.search_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to search users');
  }
}

app.http('admin_users_search', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/users/search',
  handler: requireActiveAdmin(searchUsers),
});
