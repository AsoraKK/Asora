export const DEFAULT_DSR_MONITOR_SCHEDULE = '0 0 */8 * * *';

export function resolveDsrMonitorSchedule(
  value: string | undefined = process.env.DSR_MONITOR_SCHEDULE,
): string {
  const schedule = value?.trim();
  return schedule || DEFAULT_DSR_MONITOR_SCHEDULE;
}
