describe('monitorDsrQueue', () => {
  const trackDsrEvent = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('../../src/privacy/common/telemetry', () => ({
      trackDsrEvent,
    }));
  });

  it('logs queue depth and poison queue state', async () => {
    jest.doMock('../../src/privacy/common/storage', () => ({
      getDsrQueueMonitorSnapshot: jest.fn().mockResolvedValue({
        queueName: 'dsr-requests',
        queueConnectionSetting: 'DsrQueueStorage',
        queueServiceAccount: 'stasoradsrdev',
        exportStorageAccount: 'stasoradsrdev',
        approximateMessageCount: 0,
        poisonQueueName: 'dsr-requests-poison',
        poisonApproximateMessageCount: null,
        poisonQueueExists: false,
      }),
    }));
    jest.doMock('../../src/privacy/service/dsrStore', () => ({
      getDsrOperationalCounts: jest.fn().mockResolvedValue({
        stuckQueuedCount: 0,
        failedRequestCount: 0,
      }),
    }));

    const { monitorDsrQueue } = require('../../src/privacy/worker/dsrQueueMonitor');
    const context = { invocationId: 'invocation-1', log: jest.fn() };

    await monitorDsrQueue({} as any, context as any);

    expect(context.log).toHaveBeenCalledWith('dsr.queue.monitor', {
      invocationId: 'invocation-1',
      queueName: 'dsr-requests',
      queueConnectionSetting: 'DsrQueueStorage',
      queueServiceAccount: 'stasoradsrdev',
      exportStorageAccount: 'stasoradsrdev',
      approximateMessageCount: 0,
      poisonQueueName: 'dsr-requests-poison',
      poisonApproximateMessageCount: null,
      poisonQueueExists: false,
      stuckQueuedCount: 0,
      failedRequestCount: 0,
    });
    expect(trackDsrEvent).toHaveBeenCalledWith('dsr.queue.monitor', {
      invocationId: 'invocation-1',
      queueName: 'dsr-requests',
      queueConnectionSetting: 'DsrQueueStorage',
      queueServiceAccount: 'stasoradsrdev',
      exportStorageAccount: 'stasoradsrdev',
      approximateMessageCount: 0,
      poisonQueueName: 'dsr-requests-poison',
      poisonApproximateMessageCount: null,
      poisonQueueExists: false,
      stuckQueuedCount: 0,
      failedRequestCount: 0,
    });
  });

  it('logs and rethrows monitor failures', async () => {
    jest.doMock('../../src/privacy/common/storage', () => ({
      getDsrQueueMonitorSnapshot: jest.fn().mockRejectedValue(new Error('queue unavailable')),
    }));
    jest.doMock('../../src/privacy/service/dsrStore', () => ({
      getDsrOperationalCounts: jest.fn().mockResolvedValue({
        stuckQueuedCount: 0,
        failedRequestCount: 0,
      }),
    }));

    const { monitorDsrQueue } = require('../../src/privacy/worker/dsrQueueMonitor');
    const context = { invocationId: 'invocation-2', log: jest.fn() };

    await expect(monitorDsrQueue({} as any, context as any)).rejects.toThrow('queue unavailable');
    expect(context.log).toHaveBeenCalledWith('dsr.queue.monitor.failed', {
      invocationId: 'invocation-2',
      message: 'queue unavailable',
    });
    expect(trackDsrEvent).toHaveBeenCalledWith('dsr.queue.monitor.failed', {
      invocationId: 'invocation-2',
      message: 'queue unavailable',
    });
  });
});
