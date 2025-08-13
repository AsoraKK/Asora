/**
 * ASORA TELEMETRY & METRICS SYSTEM
 * 
 * 🎯 Purpose: Comprehensive KPI tracking and Azure App Insights integration
 * 📊 Metrics: Performance, user engagement, and quality metrics
 * 🔍 Monitoring: Real-time insights for production health
 * 📱 Platform: Azure Functions with Application Insights
 */

import { InvocationContext } from '@azure/functions';

// Application Insights client (will be initialized from connection string)
let appInsights: any = null;

/**
 * Initialize Application Insights with proper configuration
 */
export function initializeTelemetry(): void {
  try {
    // Import Application Insights
    const appInsightsModule = require('applicationinsights');
    
    // Get connection string from environment
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    
    if (!connectionString) {
      console.warn('⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not configured, telemetry disabled');
      return;
    }

    // Initialize with connection string
    appInsightsModule.setup(connectionString)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, false)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true)
      .start();

    appInsights = appInsightsModule.defaultClient;
    
    // Configure role name for query grouping
    if (appInsights?.context?.tags) {
      appInsights.context.tags['ai.cloud.role'] = 'asora-api';
    }

    console.log('✅ Application Insights initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize Application Insights:', error);
  }
}

/**
 * Telemetry decorator for wrapping Azure Functions with metrics
 */
export function withTelemetry<T extends any[], R>(
  name: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const context = args.find(arg => arg && typeof arg.info === 'function') as InvocationContext;
    
    try {
      context?.info(`🔍 Starting ${name}`);
      
      // Track operation start
      if (appInsights) {
        appInsights.trackEvent({
          name: `${name}_start`,
          properties: {
            operation: name,
            timestamp: new Date().toISOString(),
          }
        });
      }

      // Execute the handler
      const result = await handler(...args);
      
      const duration = Date.now() - startTime;
      
      // Track successful completion
      context?.info(`✅ ${name} completed in ${duration}ms`);
      
      if (appInsights) {
        // Custom metric for operation duration
        appInsights.trackMetric({
          name: `${name}_duration_ms`,
          value: duration,
          properties: {
            operation: name,
            status: 'success',
          }
        });
        
        // Custom event for operation completion
        appInsights.trackEvent({
          name: `${name}_completed`,
          properties: {
            operation: name,
            duration_ms: duration.toString(),
            status: 'success',
          }
        });
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      context?.error(`❌ ${name} failed after ${duration}ms:`, error);
      
      if (appInsights) {
        // Track the exception
        appInsights.trackException({
          exception: error as Error,
          properties: {
            operation: name,
            duration_ms: duration.toString(),
          }
        });
        
        // Track failure metric
        appInsights.trackMetric({
          name: `${name}_duration_ms`,
          value: duration,
          properties: {
            operation: name,
            status: 'error',
          }
        });
        
        // Track failure event
        appInsights.trackEvent({
          name: `${name}_failed`,
          properties: {
            operation: name,
            duration_ms: duration.toString(),
            error: error?.toString(),
            status: 'error',
          }
        });
      }
      
      throw error;
    }
  };
}

/**
 * Track custom KPI metrics for Asora platform
 */
export class AsoraKPIs {
  
  /**
   * Track feed latency percentiles (P95 focus)
   */
  static trackFeedLatency(duration: number, context: InvocationContext): void {
    context.info(`📊 Feed latency: ${duration}ms`);
    
    if (appInsights) {
      appInsights.trackMetric({
        name: 'feed_latency_p95',
        value: duration,
        properties: {
          metric_type: 'performance',
          operation: 'feed_request',
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Track Daily Active Users / Weekly Active Users ratio
   */
  static trackDAUWAURatio(dau: number, wau: number, context: InvocationContext): void {
    const ratio = wau > 0 ? (dau / wau) : 0;
    context.info(`📊 DAU/WAU ratio: ${ratio.toFixed(3)} (DAU: ${dau}, WAU: ${wau})`);
    
    if (appInsights) {
      appInsights.trackMetric({
        name: 'dau_wau_ratio',
        value: ratio,
        properties: {
          metric_type: 'engagement',
          dau: dau.toString(),
          wau: wau.toString(),
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Track user retention at Day 1 and Day 7
   */
  static trackRetention(day1Retention: number, day7Retention: number, context: InvocationContext): void {
    context.info(`📊 Retention - D1: ${(day1Retention * 100).toFixed(1)}%, D7: ${(day7Retention * 100).toFixed(1)}%`);
    
    if (appInsights) {
      appInsights.trackMetric({
        name: 'retention_d1_d7',
        value: day1Retention,
        properties: {
          metric_type: 'retention',
          period: 'day1',
          percentage: (day1Retention * 100).toFixed(2),
          timestamp: new Date().toISOString(),
        }
      });
      
      appInsights.trackMetric({
        name: 'retention_d1_d7',
        value: day7Retention,
        properties: {
          metric_type: 'retention',
          period: 'day7',
          percentage: (day7Retention * 100).toFixed(2),
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Track average appeal resolution time in hours
   */
  static trackAppealSLA(resolutionTimeHours: number, context: InvocationContext): void {
    context.info(`📊 Appeal SLA: ${resolutionTimeHours.toFixed(2)} hours`);
    
    if (appInsights) {
      appInsights.trackMetric({
        name: 'appeal_sla_hours',
        value: resolutionTimeHours,
        properties: {
          metric_type: 'quality',
          operation: 'appeal_resolution',
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Track false positive rate (appeals upheld / total appeals)
   */
  static trackFalsePositiveRate(falsePositiveRate: number, totalAppeals: number, uphelAppeals: number, context: InvocationContext): void {
    context.info(`📊 False positive rate: ${(falsePositiveRate * 100).toFixed(2)}% (${uphelAppeals}/${totalAppeals})`);
    
    if (appInsights) {
      appInsights.trackMetric({
        name: 'false_positive_rate',
        value: falsePositiveRate,
        properties: {
          metric_type: 'quality',
          total_appeals: totalAppeals.toString(),
          upheld_appeals: uphelAppeals.toString(),
          percentage: (falsePositiveRate * 100).toFixed(2),
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Track generic business metrics
   */
  static trackBusinessMetric(name: string, value: number, properties: Record<string, string>, context: InvocationContext): void {
    context.info(`📊 ${name}: ${value} ${JSON.stringify(properties)}`);
    
    if (appInsights) {
      appInsights.trackMetric({
        name,
        value,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Track user events for engagement analytics
   */
  static trackUserEvent(eventName: string, userId: string, properties: Record<string, any>, context: InvocationContext): void {
    context.debug(`👤 User event: ${eventName} by ${userId}`);
    
    if (appInsights) {
      appInsights.trackEvent({
        name: eventName,
        properties: {
          ...properties,
          user_id: userId,
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  /**
   * Flush telemetry data immediately (useful for testing)
   */
  static flush(): void {
    if (appInsights) {
      appInsights.flush();
    }
  }
}

/**
 * Performance timer utility for detailed measurements
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private context?: InvocationContext;

  constructor(name: string, context?: InvocationContext) {
    this.name = name;
    this.context = context;
    this.startTime = Date.now();
    this.context?.debug(`⏱️ Timer started: ${name}`);
  }

  stop(): number {
    const duration = Date.now() - this.startTime;
    this.context?.debug(`⏱️ Timer stopped: ${this.name} - ${duration}ms`);
    return duration;
  }

  stopAndTrack(properties?: Record<string, string>): number {
    const duration = this.stop();
    
    if (appInsights) {
      appInsights.trackMetric({
        name: `${this.name}_timing`,
        value: duration,
        properties: {
          ...properties,
          operation: this.name,
          timestamp: new Date().toISOString(),
        }
      });
    }
    
    return duration;
  }
}

// Initialize telemetry on module load
initializeTelemetry();
