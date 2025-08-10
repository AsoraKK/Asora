/**
 * TELEMETRY SYSTEM TESTS
 * 
 * 🎯 Purpose: Unit tests for Application Insights integration
 * 📊 Coverage: KPI tracking, performance timers, telemetry decorators
 * 🧪 Testing: Mock-based testing for telemetry functions
 */

import { AsoraKPIs, PerformanceTimer, withTelemetry, initializeTelemetry } from '../telemetry';
import { InvocationContext } from '@azure/functions';

// Mock Application Insights
jest.mock('applicationinsights', () => ({
  setup: jest.fn().mockReturnThis(),
  setAutoCollectRequests: jest.fn().mockReturnThis(),
  setAutoCollectPerformance: jest.fn().mockReturnThis(),
  setAutoCollectExceptions: jest.fn().mockReturnThis(),
  setAutoCollectDependencies: jest.fn().mockReturnThis(),
  setAutoCollectConsole: jest.fn().mockReturnThis(),
  setUseDiskRetryCaching: jest.fn().mockReturnThis(),
  setSendLiveMetrics: jest.fn().mockReturnThis(),
  start: jest.fn(),
  defaultClient: {
    context: {
      tags: {}
    },
    trackMetric: jest.fn(),
    trackEvent: jest.fn(),
    trackException: jest.fn(),
    flush: jest.fn()
  }
}));

describe('Telemetry System', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    } as any;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initializeTelemetry', () => {
    it('should initialize Application Insights with connection string', () => {
      // Set environment variable
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test-key';
      
      // Mock fresh initialization
      jest.resetModules();
      
      expect(() => initializeTelemetry()).not.toThrow();
    });

    it('should handle missing connection string gracefully', () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => initializeTelemetry()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('APPLICATIONINSIGHTS_CONNECTION_STRING not configured')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('AsoraKPIs', () => {
    it('should track feed latency metrics', () => {
      const duration = 250;
      
      AsoraKPIs.trackFeedLatency(duration, mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`Feed latency: ${duration}ms`)
      );
    });

    it('should track DAU/WAU ratio', () => {
      const dau = 100;
      const wau = 300;
      const expectedRatio = dau / wau;
      
      AsoraKPIs.trackDAUWAURatio(dau, wau, mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`DAU/WAU ratio: ${expectedRatio.toFixed(3)}`)
      );
    });

    it('should handle zero WAU gracefully', () => {
      const dau = 50;
      const wau = 0;
      
      AsoraKPIs.trackDAUWAURatio(dau, wau, mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining('DAU/WAU ratio: 0.000')
      );
    });

    it('should track retention rates', () => {
      const day1 = 0.75;
      const day7 = 0.45;
      
      AsoraKPIs.trackRetention(day1, day7, mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`Retention - D1: ${(day1 * 100).toFixed(1)}%, D7: ${(day7 * 100).toFixed(1)}%`)
      );
    });

    it('should track appeal SLA', () => {
      const slaHours = 2.5;
      
      AsoraKPIs.trackAppealSLA(slaHours, mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`Appeal SLA: ${slaHours.toFixed(2)} hours`)
      );
    });

    it('should track false positive rate', () => {
      const rate = 0.15;
      const total = 100;
      const upheld = 15;
      
      AsoraKPIs.trackFalsePositiveRate(rate, total, upheld, mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`False positive rate: ${(rate * 100).toFixed(2)}%`)
      );
    });

    it('should track user events', () => {
      const eventName = 'user_action';
      const userId = 'test-user-123';
      const properties = { action: 'like_post' };
      
      AsoraKPIs.trackUserEvent(eventName, userId, properties, mockContext);
      
      expect(mockContext.debug).toHaveBeenCalledWith(
        expect.stringContaining(`User event: ${eventName} by ${userId}`)
      );
    });
  });

  describe('PerformanceTimer', () => {
    it('should measure execution time', () => {
      const timer = new PerformanceTimer('test-operation', mockContext);
      
      expect(mockContext.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer started: test-operation')
      );
      
      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Wait
      }
      
      const duration = timer.stop();
      
      expect(duration).toBeGreaterThan(0);
      expect(mockContext.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Timer stopped: test-operation - ${duration}ms`)
      );
    });

    it('should stop and track metrics', () => {
      const timer = new PerformanceTimer('tracked-operation', mockContext);
      const properties = { operation_type: 'test' };
      
      const duration = timer.stopAndTrack(properties);
      
      expect(duration).toBeGreaterThan(0);
      expect(mockContext.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer stopped: tracked-operation')
      );
    });
  });

  describe('withTelemetry decorator', () => {
    it('should wrap function with telemetry', async () => {
      const mockHandler = jest.fn().mockResolvedValue('test-result');
      const wrappedHandler = withTelemetry('test-handler', mockHandler);
      
      const result = await wrappedHandler('arg1', mockContext);
      
      expect(result).toBe('test-result');
      expect(mockHandler).toHaveBeenCalledWith('arg1', mockContext);
    });

    it('should track successful operations', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = withTelemetry('success-handler', mockHandler);
      
      await wrappedHandler(mockContext);
      
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting success-handler')
      );
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringMatching(/success-handler completed in \d+ms/)
      );
    });

    it('should track failed operations', async () => {
      const testError = new Error('Test error');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = withTelemetry('error-handler', mockHandler);
      
      await expect(wrappedHandler(mockContext)).rejects.toThrow('Test error');
      
      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringMatching(/error-handler failed after \d+ms:/),
        testError
      );
    });

    it('should handle functions without context parameter', async () => {
      const mockHandler = jest.fn().mockResolvedValue('no-context');
      const wrappedHandler = withTelemetry('no-context-handler', mockHandler);
      
      const result = await wrappedHandler('arg1', 'arg2');
      
      expect(result).toBe('no-context');
      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('Integration tests', () => {
    it('should work with realistic function signature', async () => {
      const mockHttpHandler = jest.fn(async (request: any, context: InvocationContext) => {
        context.info('Processing request');
        return { status: 200, body: 'OK' };
      });
      
      const wrappedHandler = withTelemetry('http-endpoint', mockHttpHandler);
      
      const mockRequest = { url: 'https://example.com/test' };
      const result = await wrappedHandler(mockRequest, mockContext);
      
      expect(result).toEqual({ status: 200, body: 'OK' });
      expect(mockContext.info).toHaveBeenCalledWith('Processing request');
    });

    it('should handle complex error scenarios', async () => {
      const complexError = {
        message: 'Database connection failed',
        code: 'DB_ERROR',
        details: { connection: 'cosmos-db', retry: false }
      };
      
      const mockHandler = jest.fn().mockRejectedValue(complexError);
      const wrappedHandler = withTelemetry('db-operation', mockHandler);
      
      await expect(wrappedHandler(mockContext)).rejects.toEqual(complexError);
      
      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining('db-operation failed'),
        complexError
      );
    });
  });
});
