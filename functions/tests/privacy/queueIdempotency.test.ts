jest.mock('../../src/privacy/common/telemetry', () => ({ emitSpan: jest.fn() }));
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
      getDsrRequest: require('../../src/privacy/service/dsrStore').getDsrRequest as jest.Mock,
      runExportJob: require('../../src/privacy/worker/exportJob').runExportJob as jest.Mock,
    };
  }

  it('skips requests whose status is already completed', async () => {
    const context = makeContext();
    const { handleDsrQueue, getDsrRequest, runExportJob } = getModule();
    getDsrRequest.mockResolvedValue({ id: 'req-finished', status: 'succeeded' });

    await handleDsrQueue(JSON.stringify({ id: 'req-finished', type: 'export' }), context);

    expect(runExportJob).not.toHaveBeenCalled();
    expect(context.log).toHaveBeenCalledWith('dsr.queue.skipped_status', {
      id: 'req-finished',
      status: 'succeeded',
    });
  });

  it('logs when the request record cannot be found', async () => {
    const context = makeContext();
    const { handleDsrQueue, getDsrRequest } = getModule();
    getDsrRequest.mockResolvedValue(null);

    await handleDsrQueue(JSON.stringify({ id: 'missing', type: 'delete' }), context);

    expect(context.log).toHaveBeenCalledWith('dsr.queue.missing_request', { id: 'missing' });
  });
});