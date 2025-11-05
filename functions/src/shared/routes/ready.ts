import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';

const readyHandler = async (_req: HttpRequest): Promise<HttpResponseInit> => {
  try {
    // Example: perform dependency checks here (DB, KV, queues). Keep it lightweight.
    return { status: 200, jsonBody: { status: 'ready' } };
  } catch (e) {
    return { status: 503, jsonBody: { status: 'degraded', error: String((e as Error)?.message ?? e) } };
  }
};

app.http('ready', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ready',
  handler: readyHandler
});

export { readyHandler as ready };
