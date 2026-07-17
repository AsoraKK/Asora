describe('monitorDsrQueue', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses the shared-MVP default and accepts an app-setting override', () => {
    const { DEFAULT_DSR_MONITOR_SCHEDULE, resolveDsrMonitorSchedule } = require('../../src/privacy/worker/dsrMonitorSchedule');

    expect(DEFAULT_DSR_MONITOR_SCHEDULE).toBe('0 0 */8 * * *');
    expect(resolveDsrMonitorSchedule(undefined)).toBe(DEFAULT_DSR_MONITOR_SCHEDULE);
    expect(resolveDsrMonitorSchedule(' 0 0 * * * * ')).toBe('0 0 * * * *');
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
    const context = { invocationId: 'invocation-1', log: jest.fn(), error: jest.fn() };

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
    const context = { invocationId: 'invocation-2', log: jest.fn(), error: jest.fn() };

    await expect(monitorDsrQueue({} as any, context as any)).rejects.toThrow('queue unavailable');
    expect(context.error).toHaveBeenCalledWith('dsr.queue.monitor.failed', {
      invocationId: 'invocation-2',
      message: 'queue unavailable',
    });
  });
});
