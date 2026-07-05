describe('handleDiagnosticQueuePing', () => {
  const makeContext = () => ({ log: jest.fn() });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.DSR_DIAGNOSTIC_QUEUE_ENABLED;
    delete process.env.DSR_DIAGNOSTIC_QUEUE_NAME;
    delete process.env.DSR_DIAGNOSTIC_QUEUE_CONNECTION;
  });

  function getModule() {
    const module = require('../../src/privacy/worker/diagnosticQueuePing');
    return {
      handleDiagnosticQueuePing: module.handleDiagnosticQueuePing as (
        payload: unknown,
        context: any,
      ) => Promise<void>,
    };
  }

  it('logs a sanitized correlation id for valid messages', async () => {
    const context = makeContext();
    process.env.DSR_DIAGNOSTIC_QUEUE_NAME = 'dsr-diagnostic-ping';

    const { handleDiagnosticQueuePing } = getModule();
    await handleDiagnosticQueuePing(
      JSON.stringify({ type: 'ping', correlationId: 'safe:test/id?123' }),
      context,
    );

    expect(context.log).toHaveBeenCalledWith('dsr.diagnostic.ping.received', {
      correlationId: 'safe_test_id_123',
      type: 'ping',
      queue: 'dsr-diagnostic-ping',
    });
  });

  it('logs invalid payloads without echoing message contents', async () => {
    const context = makeContext();
    const { handleDiagnosticQueuePing } = getModule();

    await handleDiagnosticQueuePing('not-json', context);

    expect(context.log).toHaveBeenCalledWith('dsr.diagnostic.ping.invalid', {
      payloadType: 'string',
    });
  });
});
