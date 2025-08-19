/// ASORA SHARED AZURE LOGGER
///
/// 🎯 Purpose: Structured logging for Azure Functions with Application Insights
/// 🏗️ Architecture: Centralized logging with correlation IDs and structured data
/// 📊 Observability: Integration with Azure Monitor and custom telemetry
/// 🔍 Debugging: Rich context and correlation for troubleshooting

export interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface AzureLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

class StructuredAzureLogger implements AzureLogger {
  constructor(private component: string) {}

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.log('DEBUG', message, context);
    }
  }

  private log(level: string, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...context
    };

    // In Azure Functions, console.log integrates with Application Insights
    console.log(JSON.stringify(logEntry));

    // For Application Insights custom telemetry
    if (typeof process !== 'undefined' && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      this.sendToApplicationInsights(level, message, logEntry);
    }
  }

  private sendToApplicationInsights(level: string, message: string, logEntry: any): void {
    // This would integrate with Application Insights SDK
    // For now, we'll just ensure the log format is AI-friendly
    try {
      // Application Insights will automatically pick up console.log
      // But we can also send custom telemetry if needed
      if (level === 'ERROR') {
        // Custom error tracking
        console.error(`[AI_ERROR] ${this.component}: ${message}`, logEntry);
      } else if (level === 'WARN') {
        console.warn(`[AI_WARN] ${this.component}: ${message}`, logEntry);
      }
    } catch (error) {
      // Fallback logging if AI integration fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[LOG_ERROR] Failed to send to Application Insights: ${errorMessage}`);
    }
  }
}

// Factory function to create component-specific loggers
export function getAzureLogger(component: string): AzureLogger {
  return new StructuredAzureLogger(component);
}

// Utility functions for common logging scenarios
export function logHttpRequest(
  logger: AzureLogger,
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  requestId?: string
): void {
  logger.info('HTTP Request completed', {
    requestId,
    httpMethod: method,
    url,
    statusCode,
    duration,
    type: 'http_request'
  });
}

export function logDatabaseOperation(
  logger: AzureLogger,
  operation: string,
  collection: string,
  duration: number,
  requestCharge?: number,
  requestId?: string
): void {
  logger.info('Database operation completed', {
    requestId,
    operation,
    collection,
    duration,
    requestCharge,
    type: 'database_operation'
  });
}

export function logAuthAttempt(
  logger: AzureLogger,
  success: boolean,
  userId?: string,
  reason?: string,
  requestId?: string
): void {
  const level = success ? 'info' : 'warn';
  const message = success ? 'Authentication successful' : 'Authentication failed';
  
  logger[level](message, {
    requestId,
    userId,
    success,
    reason,
    type: 'auth_attempt'
  });
}

export function logBusinessEvent(
  logger: AzureLogger,
  event: string,
  data: Record<string, any>,
  requestId?: string
): void {
  logger.info('Business event', {
    requestId,
    event,
    ...data,
    type: 'business_event'
  });
}

export function logPerformanceMetric(
  logger: AzureLogger,
  metric: string,
  value: number,
  unit: string = 'ms',
  tags?: Record<string, string>,
  requestId?: string
): void {
  logger.info('Performance metric', {
    requestId,
    metric,
    value,
    unit,
    tags,
    type: 'performance_metric'
  });
}

// Error logging with stack traces
export function logError(
  logger: AzureLogger,
  error: Error,
  context?: LogContext
): void {
  logger.error('Unhandled error occurred', {
    ...context,
    errorName: error.name,
    errorMessage: error.message,
    stackTrace: error.stack,
    type: 'unhandled_error'
  });
}

// Correlation ID utilities for tracking requests across services
export function generateCorrelationId(): string {
  return `asora-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function extractCorrelationId(headers: Record<string, string>): string | undefined {
  return headers['x-correlation-id'] || headers['x-ms-client-tracking-id'];
}
