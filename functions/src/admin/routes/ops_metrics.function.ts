import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';
import { createErrorResponse, createSuccessResponse, handleCorsAndMethod } from '@shared/utils/http';
import { requireActiveModerator } from '../adminAuthUtils';
import { buildOpsMetrics, isValidOpsWindow, OpsMetricsWindow } from '../service/opsMetricsService';

async function getOpsMetrics(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const windowQuery = req.query?.get?.('window') ?? '24h';
  if (!isValidOpsWindow(windowQuery)) {
    return createErrorResponse(400, 'invalid_window', 'window must be 24h or 7d', {
      'Cache-Control': 'private, no-store',
    });
  }

  try {
    const metrics = await buildOpsMetrics(windowQuery as OpsMetricsWindow, context);
    return createSuccessResponse(metrics, {
      'Cache-Control': 'private, no-store',
    });
  } catch (error) {
    context.error('admin.ops.metrics_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to load operations metrics', {
      'Cache-Control': 'private, no-store',
    });
  }
}

app.http('admin_ops_metrics', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/ops/metrics',
  handler: withRateLimit(requireActiveModerator(getOpsMetrics), (req) => getPolicyForRoute(req)),
});

export { getOpsMetrics };
