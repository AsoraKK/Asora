jest.mock('../../src/privacy/common/telemetry', () => ({
  emitSpan: jest.fn(),
  safeHashIdentifier: jest.fn((value?: string) => (value ? 'hashed-user' : undefined)),
  trackDsrEvent: jest.fn(),
}));
jest.mock('../../src/privacy/service/dsrStore', () => ({ getDsrRequest: jest.fn() }));
jest.mock('../../src/privacy/worker/exportJob', () => ({ runExportJob: jest.fn() }));
jest.mock('../../src/privacy/worker/deleteJob', () => ({ runDeleteJob: jest.fn() }));

describe('handleDsrQueue idempotency', () => {
  const makeContext = () => ({ log: jest.fn() });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function getModule() {
    const module = require('../../src/privacy/worker/queueProcessor');
    return {
      handleDsrQueue: module.handleDsrQueue as (payload: unknown, context: any) => Promise<void>,
      parseDsrQueueMessage: module.parseDsrQueueMessage as (payload: unknown) => any,
      getDsrRequest: require('../../src/privacy/service/dsrStore').getDsrRequest as jest.Mock,
      runExportJob: require('../../src/privacy/worker/exportJob').runExportJob as jest.Mock,
      runDeleteJob: require('../../src/privacy/worker/deleteJob').runDeleteJob as jest.Mock,
      trackDsrEvent: require('../../src/privacy/common/telemetry').trackDsrEvent as jest.Mock,
    };
  }

  it('parses only the supported queue payload shape', () => {
    const { parseDsrQueueMessage } = getModule();

    expect(parseDsrQueueMessage(JSON.stringify({
      id: 'req-1',
      type: 'export',
      submittedAt: '2026-06-29T00:00:00.000Z',
    }))).toEqual({
      id: 'req-1',
      type: 'export',
      submittedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(parseDsrQueueMessage({ id: 'req-2', type: 'delete', submittedAt: 'now' })).toEqual({
      id: 'req-2',
      type: 'delete',
      submittedAt: 'now',
    });

    expect(parseDsrQueueMessage('{bad-json')).toBeNull();
    expect(parseDsrQueueMessage({ id: 'req-3', type: 'unknown', submittedAt: 'now' })).toBeNull();
    expect(parseDsrQueueMessage({ id: 'req-4', type: 'export' })).toBeNull();
  });

  it('logs sanitized receive and resolution evidence before dispatch', async () => {
    const context = { invocationId: 'inv-queue', log: jest.fn() };
    const { handleDsrQueue, getDsrRequest, runDeleteJob, trackDsrEvent } = getModule();
    getDsrRequest.mockResolvedValue({
      id: 'req-delete',
      type: 'delete',
      userId: '019f1004-3063-7159-828a-3f0a4ebcec3c',
      status: 'queued',
      attempt: 0,
    });
    runDeleteJob.mockResolvedValue(undefined);

    await handleDsrQueue(JSON.stringify({
      id: 'req-delete',
      type: 'delete',
      submittedAt: '2026-06-29T00:00:00.000Z',
    }), context);

    expect(runDeleteJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-delete' }), context);
    expect(context.log).toHaveBeenCalledWith('dsr.queue.received', expect.objectContaining({
      invocationId: 'inv-queue',
      requestId: 'req-delete',
      type: 'delete',
      submittedAt: '2026-06-29T00:00:00.000Z',
    }));
    expect(context.log).toHaveBeenCalledWith('dsr.queue.resolved_request', expect.objectContaining({
      invocationId: 'inv-queue',
      requestId: 'req-delete',
      type: 'delete',
      status: 'queued',
      attempt: 0,
      userIdHash: expect.any(String),
    }));
    expect(context.log).toHaveBeenCalledWith('dsr.queue.completed', expect.objectContaining({
      requestId: 'req-delete',
      type: 'delete',
      previousAttempt: 0,
    }));
    expect(trackDsrEvent).toHaveBeenCalledWith('dsr.queue.completed', expect.objectContaining({
      requestId: 'req-delete',
      type: 'delete',
      previousAttempt: 0,
    }));

    const serializedLogs = JSON.stringify(context.log.mock.calls);
    expect(serializedLogs).not.toContain('019f1004-3063-7159-828a-3f0a4ebcec3c');
  });

  it('logs and rethrows worker failures for host retry/dead-letter handling', async () => {
    const context = { invocationId: 'inv-fail', log: jest.fn() };
    const { handleDsrQueue, getDsrRequest, runExportJob, trackDsrEvent } = getModule();
    getDsrRequest.mockResolvedValue({
      id: 'req-fail',
      type: 'export',
      userId: 'user-fail',
      status: 'queued',
      attempt: 2,
    });
    runExportJob.mockRejectedValue(new Error('export failed'));

    await expect(handleDsrQueue(JSON.stringify({
      id: 'req-fail',
      type: 'export',
      submittedAt: '2026-06-29T00:00:00.000Z',
    }), context)).rejects.toThrow('export failed');

    expect(context.log).toHaveBeenCalledWith('dsr.queue.failed', expect.objectContaining({
      invocationId: 'inv-fail',
      requestId: 'req-fail',
      type: 'export',
      previousAttempt: 2,
      message: 'export failed',
    }));
    expect(trackDsrEvent).toHaveBeenCalledWith('dsr.queue.failed', expect.objectContaining({
      invocationId: 'inv-fail',
      requestId: 'req-fail',
      type: 'export',
      previousAttempt: 2,
      message: 'export failed',
    }));
  });

  it('rejects invalid queue messages before request lookup', async () => {
    const context = makeContext();
    const { handleDsrQueue, getDsrRequest, runExportJob } = getModule();
    getDsrRequest.mockResolvedValue({ id: 'req-finished', status: 'succeeded' });

    await handleDsrQueue(JSON.stringify({ id: 'req-finished', type: 'export' }), context);

    expect(getDsrRequest).not.toHaveBeenCalled();
    expect(runExportJob).not.toHaveBeenCalled();
    expect(context.log).toHaveBeenCalledWith('dsr.queue.invalid', { reason: 'invalid_shape' });
  });

  it('logs when the request record cannot be found', async () => {
    const context = makeContext();
    const { handleDsrQueue, getDsrRequest } = getModule();
    getDsrRequest.mockResolvedValue(null);

    await handleDsrQueue(JSON.stringify({
      id: 'missing',
      type: 'delete',
      submittedAt: '2026-06-29T00:00:00.000Z',
    }), context);

    expect(context.log).toHaveBeenCalledWith('dsr.queue.missing_request', { id: 'missing' });
  });

  it('skips requests whose status is already completed', async () => {
    const context = makeContext();
    const { handleDsrQueue, getDsrRequest, runExportJob } = getModule();
    getDsrRequest.mockResolvedValue({ id: 'req-finished', status: 'succeeded' });

    await handleDsrQueue(JSON.stringify({
      id: 'req-finished',
      type: 'export',
      submittedAt: '2026-06-29T00:00:00.000Z',
    }), context);

    expect(runExportJob).not.toHaveBeenCalled();
    expect(context.log).toHaveBeenCalledWith('dsr.queue.skipped_status', {
      id: 'req-finished',
      status: 'succeeded',
    });
  });
});
