import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getContainer } from '../shared/cosmosClient';

app.http('feedNewCreators', {
  methods: ['GET'],
  route: 'feed/new-creators',
  authLevel: 'function',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const users = getContainer('users');
      const posts = getContainer('posts');

      // Get users created in last 14 days
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { resources: newUsers } = await users.items
        .query({
          query: `
          SELECT u.id FROM u
          WHERE u.accountCreatedAt >= @since
        `,
          parameters: [{ name: '@since', value: twoWeeksAgo }],
        })
        .fetchAll();

      if (newUsers.length === 0) {
        return { status: 200, jsonBody: { items: [] } };
      }

      const newUserIds = newUsers.map(u => u.id);
      const { resources } = await posts.items
        .query({
          query: `
          SELECT TOP 50 p.id, p.text, p.createdAt, p.authorId, p.likeCount
          FROM p WHERE ARRAY_CONTAINS(@userIds, p.authorId)
          ORDER BY p.createdAt DESC
        `,
          parameters: [{ name: '@userIds', value: newUserIds }],
        })
        .fetchAll();

      return { status: 200, jsonBody: { items: resources } };
    } catch (err: any) {
      ctx.error('New creators feed error:', err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  },
});
