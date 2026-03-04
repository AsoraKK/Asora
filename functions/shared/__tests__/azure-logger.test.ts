import {
  getAzureLogger,
  logHttpRequest,
  logAuthAttempt,
  logPerformanceMetric,
} from '../../shared/azure-logger';
import { extractCorrelationId, logDatabaseOperation } from '../../shared/azure-logger';

describe('azure-logger', () => {
  const originalEnv = { ...process.env };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined as any);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined as any);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined as any);
    process.env.ASORA_TEST_LOGS = '1';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('info logs structured JSON', () => {
    const logger = getAzureLogger('unit/component');
    logger.info('hello', { requestId: 'r1' });
    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.message).toBe('hello');
    expect(payload.component).toBe('unit/component');
    expect(payload.requestId).toBe('r1');
  });

  test('suppresses console logs when override disabled in test env', () => {
    delete process.env.ASORA_TEST_LOGS;
    const logger = getAzureLogger('unit/component');
    logger.info('silent', { requestId: 'r-silent' });
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('debug only logs in dev or LOG_LEVEL=debug', () => {
    delete (process.env as any).LOG_LEVEL;
    const logger = getAzureLogger('comp');
    logger.debug('nope');
    expect(logSpy).not.toHaveBeenCalled();
    process.env.NODE_ENV = 'development';
    logger.debug('yep');
    expect(logSpy).toHaveBeenCalled();
    // Now test LOG_LEVEL=debug without dev
    logSpy.mockClear();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'debug';
    logger.debug('enabled-by-loglevel');
    expect(logSpy).toHaveBeenCalled();
  });

  test('AI integration path triggers warn/error when env set', () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=fake';
    const logger = getAzureLogger('ai/comp');
    logger.warn('warned');
    logger.error('errored');
    // Base log always happens
    expect(logSpy).toHaveBeenCalled();
    // Secondary AI-formatted logs
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('AI integration catch path logs fallback when console throws', () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=fake';
    const logger = getAzureLogger('ai/catch');
    // Make console.warn throw to hit the catch inside sendToApplicationInsights
    warnSpy.mockImplementationOnce(() => {
      throw new Error('console warn failed');
    });
    logger.warn('warned');
    // After throwing, logger should emit a fallback [LOG_ERROR] line via console.log
    const calls = logSpy.mock.calls.map(args => String(args[0]));
    expect(calls.some(s => s.includes('[LOG_ERROR] Failed to send to Application Insights'))).toBe(
      true
    );
  });

  test('helpers produce info logs', () => {
    const logger = getAzureLogger('helpers');
    logHttpRequest(logger, 'GET', '/x', 200, 5, 'r2');
    logAuthAttempt(logger, true, 'u1', undefined, 'r3');
    logPerformanceMetric(logger, 'latency', 10, 'ms', { region: 'eu' }, 'r4');
    expect(logSpy).toHaveBeenCalled();
  });

  test('extractCorrelationId supports both headers', () => {
    const h1 = extractCorrelationId({ 'x-correlation-id': 'c1' } as any);
    expect(h1).toBe('c1');
    const h2 = extractCorrelationId({ 'x-ms-client-tracking-id': 'c2' } as any);
    expect(h2).toBe('c2');
  });

  test('logDatabaseOperation includes optional requestCharge when provided', () => {
    const logger = getAzureLogger('db');
    logDatabaseOperation(logger, 'read', 'users', 12, 3.14, 'r5');
    expect(logSpy).toHaveBeenCalled();
  });
});
