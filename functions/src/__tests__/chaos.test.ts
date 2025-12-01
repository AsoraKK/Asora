import type { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';

const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function buildRequest(): HttpRequest {
  return {
    method: 'POST',
    url: 'https://example.com',
    headers: {},
  } as unknown as HttpRequest;
}

async function importChaosWithLogger(env: Record<string, string> = {}) {
  jest.resetModules();
  const warn = jest.fn();
  const info = jest.fn();

  jest.doMock('@shared/utils/logger', () => ({
    getAzureLogger: () => ({
      warn,
      info,
    }),
  }));

  Object.assign(process.env, env);
  const module = await import('@shared/middleware/chaos');
  return { ...module, warn, info };
}

describe('Chaos middleware', () => {
  afterEach(() => {
    jest.dontMock('@shared/utils/logger');
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.CHAOS_ENABLED;
    delete process.env.CHAOS_LATENCY_MS;
    delete process.env.CHAOS_ERROR_RATE;
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
  });

  it('is a no-op when disabled', async () => {
    const { withChaos } = await importChaosWithLogger();
    const handler = jest.fn(async () => ({ status: 200, headers: {}, body: 'ok' } as HttpResponseInit));
    const decorated = withChaos(handler);

    const start = Date.now();
    const response = await decorated(buildRequest(), contextStub);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
    expect(duration).toBeLessThan(50);
  });

  it('injects latency when configured', async () => {
    const { withChaos } = await importChaosWithLogger({
      CHAOS_ENABLED: 'true',
      CHAOS_LATENCY_MS: '200',
      CHAOS_ERROR_RATE: '0',
    });
    const handler = jest.fn(async () => ({ status: 200, headers: {}, body: 'ok' } as HttpResponseInit));
    const decorated = withChaos(handler);

    const start = Date.now();
    const response = await decorated(buildRequest(), contextStub);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThanOrEqual(200);
    expect(handler).toHaveBeenCalled();
  });

  it('injects a 503 when error rate is 1.0', async () => {
    const { withChaos } = await importChaosWithLogger({
      CHAOS_ENABLED: 'true',
      CHAOS_ERROR_RATE: '1',
    });
    const handler = jest.fn(async () => ({ status: 200, headers: {}, body: 'ok' } as HttpResponseInit));
    const decorated = withChaos(handler);

    const response = await decorated(buildRequest(), contextStub);
    expect(response.status).toBe(503);
    const body = JSON.parse(response.body as string);
    expect(body.code).toBe('CHAOS_INJECTED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows requests when error rate is 0', async () => {
    const { withChaos } = await importChaosWithLogger({
      CHAOS_ENABLED: 'true',
      CHAOS_ERROR_RATE: '0',
    });
    const handler = jest.fn(async () => ({ status: 200, headers: {}, body: 'ok' } as HttpResponseInit));
    const decorated = withChaos(handler);

    const response = await decorated(buildRequest(), contextStub);
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('won’t enable chaos in production even if configured', async () => {
    const { withChaos, warn } = await importChaosWithLogger({
      CHAOS_ENABLED: 'true',
      CHAOS_LATENCY_MS: '200',
      CHAOS_ERROR_RATE: '1',
      APP_ENV: 'prod',
      NODE_ENV: 'production',
    });
    const handler = jest.fn(async () => ({ status: 200, headers: {}, body: 'ok' } as HttpResponseInit));
    const decorated = withChaos(handler);

    const start = Date.now();
    const response = await decorated(buildRequest(), contextStub);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(50);
    expect(handler).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      'Chaos injection disabled in production environment',
      expect.objectContaining({
        appEnv: 'prod',
      })
    );
  });
});
