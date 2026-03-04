import type { InvocationContext } from '@azure/functions';
import { emitSpan, auditLog } from '../src/privacy/common/telemetry';

describe('DSR Audit Span Coverage', () => {
  let mockContext: InvocationContext;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    mockContext = {
      invocationId: 'test-inv-id',
      log: jest.fn(),
    } as unknown as InvocationContext;
    logSpy = jest.spyOn(mockContext, 'log');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Required telemetry spans', () => {
    const requiredSpans = [
      'queue.export.dispatch',
      'queue.delete.dispatch',
      'export.fetch',
      'export.package',
      'export.upload',
      'export.error',
      'delete.started',
      'delete.completed',
      'delete.error',
    ];

    requiredSpans.forEach((spanName) => {
      it(`should emit ${spanName} span`, () => {
        emitSpan(mockContext, spanName, { test: true });
        expect(logSpy).toHaveBeenCalledWith(
          `dsr.${spanName}`,
          expect.objectContaining({
            invocationId: 'test-inv-id',
            test: true,
          }),
        );
      });
    });
  });

  describe('Audit logging', () => {
    it('should emit audit log with timestamp and invocation context', () => {
      auditLog(mockContext, 'Test audit event', { userId: 'user123' });
      expect(logSpy).toHaveBeenCalledWith(
        'dsr.audit',
        expect.objectContaining({
          message: 'Test audit event',
          timestamp: expect.any(String),
          invocationId: 'test-inv-id',
          userId: 'user123',
        }),
      );
    });

    it('should include ISO timestamp in audit log', () => {
      auditLog(mockContext, 'Test event');
      const callArgs = logSpy.mock.calls[0][1];
      expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Span metadata propagation', () => {
    it('should propagate request context in export spans', () => {
      const requestMeta = { requestId: 'dsr_123', userId: 'user456' };
      emitSpan(mockContext, 'export.fetch', requestMeta);
      expect(logSpy).toHaveBeenCalledWith(
        'dsr.export.fetch',
        expect.objectContaining(requestMeta),
      );
    });

    it('should include blob metadata in upload span', () => {
      const uploadMeta = { blobPath: 'exports/2025/11/dsr_123.zip', bytes: 1024 };
      emitSpan(mockContext, 'export.upload', uploadMeta);
      expect(logSpy).toHaveBeenCalledWith(
        'dsr.export.upload',
        expect.objectContaining(uploadMeta),
      );
    });

    it('should include error context in failure spans', () => {
      const errorMeta = { reason: 'Storage unavailable' };
      emitSpan(mockContext, 'export.error', errorMeta);
      expect(logSpy).toHaveBeenCalledWith(
        'dsr.export.error',
        expect.objectContaining(errorMeta),
      );
    });
  });

  describe('Log event naming conventions', () => {
    it('should prefix all DSR events with "dsr."', () => {
      emitSpan(mockContext, 'custom.event', {});
      expect(logSpy).toHaveBeenCalledWith('dsr.custom.event', expect.any(Object));
    });

    it('should maintain hierarchical event names', () => {
      const hierarchicalEvents = ['export.fetch', 'delete.started', 'queue.export.dispatch'];
      hierarchicalEvents.forEach((event) => {
        logSpy.mockClear();
        emitSpan(mockContext, event, {});
        expect(logSpy).toHaveBeenCalledWith(`dsr.${event}`, expect.any(Object));
      });
    });
  });
});
