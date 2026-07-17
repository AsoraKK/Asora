import fs from 'node:fs';
import path from 'node:path';

describe('DSR trigger contract', () => {
  it('keeps request processing event-driven and separate from monitoring', () => {
    const processor = fs.readFileSync(
      path.resolve(__dirname, '../../src/privacy/worker/queueProcessor.ts'),
      'utf8',
    );
    const monitor = fs.readFileSync(
      path.resolve(__dirname, '../../src/privacy/worker/dsrQueueMonitor.ts'),
      'utf8',
    );

    expect(processor).toContain("app.storageQueue('privacyDsrProcessor'");
    expect(processor).not.toContain("app.timer('privacyDsrProcessor'");
    expect(monitor).toContain("app.timer('privacyDsrQueueMonitor'");
  });
});
