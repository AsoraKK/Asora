import type { TelemetryClient } from 'applicationinsights';

import { AppInsightsSink } from '../../src/analytics/sink';

describe('AppInsightsSink', () => {
  it('emits privacy-safe metadata without routine flushes', async () => {
    const client = {
      trackEvent: jest.fn(),
      flush: jest.fn(),
    } as unknown as TelemetryClient;
    const sink = new AppInsightsSink(client);

    await sink.sendEvent({
      userId: 'user-identifier',
      sessionId: 'session-identifier',
      eventName: 'feed_opened',
      eventTimestamp: new Date('2026-07-17T00:00:00Z'),
      properties: { surface: 'discover' },
      appVersion: '1.0.0',
      platform: 'web',
      metadata: {
        env: 'shared-mvp',
        region: 'northeurope',
        userType: 'registered',
        ipHash: 'hashed-ip',
        ingestedAt: new Date('2026-07-17T00:00:01Z'),
      },
    });

    expect(client.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: 'feed_opened',
      properties: expect.not.objectContaining({
        userId: expect.anything(),
        sessionId: expect.anything(),
        ipHash: expect.anything(),
      }),
    }));
    expect(client.flush).not.toHaveBeenCalled();
  });
});
