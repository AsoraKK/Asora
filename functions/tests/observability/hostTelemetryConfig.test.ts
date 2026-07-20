import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hostConfig = JSON.parse(readFileSync(resolve(__dirname, '../../host.json'), 'utf8'));

describe('Functions host telemetry configuration', () => {
  const sampling = hostConfig.logging.applicationInsights.samplingSettings;
  const logLevel = hostConfig.logging.logLevel;

  it('samples successful request and dependency telemetry', () => {
    expect(sampling.isEnabled).toBe(true);
    expect(sampling.maxTelemetryItemsPerSecond).toBeLessThanOrEqual(5);
    expect(sampling.excludedTypes).not.toContain('Request');
    expect(sampling.excludedTypes).not.toContain('Dependency');
  });

  it('retains exceptions, structured events, and DSR traces', () => {
    expect(sampling.excludedTypes).toContain('Exception');
    expect(sampling.excludedTypes).toContain('Event');
    expect(sampling.excludedTypes).toContain('Trace');
  });

  it('suppresses routine host information logs while retaining DSR alert signals', () => {
    expect(logLevel.default).toBe('Warning');
    expect(logLevel['Azure.Core']).toBe('Warning');
    expect(logLevel['Function.privacyDsrQueueMonitor.User']).toBe('Information');
    expect(logLevel['Function.privacyDsrProcessor.User']).toBe('Information');
    expect(logLevel['Function.privacy-admin-dsr-enqueue-export.User']).toBe('Information');
    expect(logLevel['Function.privacy-admin-dsr-enqueue-delete.User']).toBe('Information');
  });
});
