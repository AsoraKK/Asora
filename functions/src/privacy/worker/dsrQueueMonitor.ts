import { app, InvocationContext, Timer } from '@azure/functions';

import { getDsrQueueMonitorSnapshot } from '../common/storage';
import { getDsrOperationalCounts } from '../service/dsrStore';
import { getErrorMessage } from '@shared/errorUtils';
import { resolveDsrMonitorSchedule } from './dsrMonitorSchedule';

export async function monitorDsrQueue(_timer: Timer, context: InvocationContext): Promise<void> {
  try {
    const [snapshot, operationalCounts] = await Promise.all([
      getDsrQueueMonitorSnapshot(),
      getDsrOperationalCounts(),
    ]);
    const event = {
      invocationId: context.invocationId,
      ...snapshot,
      ...operationalCounts,
    };
    context.log('dsr.queue.monitor', event);
  } catch (error: unknown) {
    const event = {
      invocationId: context.invocationId,
      message: getErrorMessage(error),
    };
    context.error('dsr.queue.monitor.failed', event);
    throw error;
  }
}

app.timer('privacyDsrQueueMonitor', {
  schedule: resolveDsrMonitorSchedule(),
  handler: monitorDsrQueue,
});
