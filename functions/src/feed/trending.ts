import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getContainer } from '../shared/cosmosClient';
import { withTelemetry, AsoraKPIs, PerformanceTimer } from '../shared/telemetry';

async function feedTrendingInternal(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const timer = new PerformanceTimer('feed_trending', ctx);

  try {
    const posts = getContainer('posts');
    const { resources } = await posts.items
      .query({
        query: `
        SELECT TOP 50 p.id, p.text, p.createdAt, p.authorId, p.likeCount
        FROM p WHERE p.authorReputation >= @min
        ORDER BY p.createdAt DESC
      `,
        parameters: [{ name: '@min', value: 10 }],
      })
      .fetchAll();

    // Track metrics
    const duration = timer.stopAndTrack({
      operation: 'trending_feed',
      result_count: resources.length.toString(),
    });
    AsoraKPIs.trackFeedLatency(duration, ctx);

    return { status: 200, jsonBody: { items: resources } };
  } catch (err: any) {
    const duration = timer.stop();
    ctx.error('Trending feed error:', err);

    AsoraKPIs.trackBusinessMetric(
      'feed_errors',
      1,
      {
        error_type: 'trending_feed_error',
        duration_ms: duration.toString(),
      },
      ctx
    );

    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('feedTrending', {
  methods: ['GET'],
  route: 'feed/trending',
  authLevel: 'function',
  handler: withTelemetry('feed_trending', feedTrendingInternal),
});
