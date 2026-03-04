"use strict";
/// ASORA SHARED AZURE LOGGER
///
/// 🎯 Purpose: Structured logging for Azure Functions with Application Insights
/// 🏗️ Architecture: Centralized logging with correlation IDs and structured data
/// 📊 Observability: Integration with Azure Monitor and custom telemetry
/// 🔍 Debugging: Rich context and correlation for troubleshooting
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAzureLogger = getAzureLogger;
exports.logHttpRequest = logHttpRequest;
exports.logDatabaseOperation = logDatabaseOperation;
exports.logAuthAttempt = logAuthAttempt;
exports.logBusinessEvent = logBusinessEvent;
exports.logPerformanceMetric = logPerformanceMetric;
exports.logError = logError;
exports.generateCorrelationId = generateCorrelationId;
exports.extractCorrelationId = extractCorrelationId;
class StructuredAzureLogger {
    constructor(component) {
        this.component = component;
    }
    info(message, context) {
        this.log('INFO', message, context);
    }
    warn(message, context) {
        this.log('WARN', message, context);
    }
    error(message, context) {
        this.log('ERROR', message, context);
    }
    debug(message, context) {
        if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
            this.log('DEBUG', message, context);
        }
    }
    log(level, message, context) {
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
    sendToApplicationInsights(level, message, logEntry) {
        // This would integrate with Application Insights SDK
        // For now, we'll just ensure the log format is AI-friendly
        try {
            // Application Insights will automatically pick up console.log
            // But we can also send custom telemetry if needed
            if (level === 'ERROR') {
                // Custom error tracking
                console.error(`[AI_ERROR] ${this.component}: ${message}`, logEntry);
            }
            else if (level === 'WARN') {
                console.warn(`[AI_WARN] ${this.component}: ${message}`, logEntry);
            }
        }
        catch (error) {
            // Fallback logging if AI integration fails
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`[LOG_ERROR] Failed to send to Application Insights: ${errorMessage}`);
        }
    }
}
// Factory function to create component-specific loggers
function getAzureLogger(component) {
    return new StructuredAzureLogger(component);
}
// Utility functions for common logging scenarios
function logHttpRequest(logger, method, url, statusCode, duration, requestId) {
    logger.info('HTTP Request completed', {
        requestId,
        httpMethod: method,
        url,
        statusCode,
        duration,
        type: 'http_request'
    });
}
function logDatabaseOperation(logger, operation, collection, duration, requestCharge, requestId) {
    logger.info('Database operation completed', {
        requestId,
        operation,
        collection,
        duration,
        requestCharge,
        type: 'database_operation'
    });
}
function logAuthAttempt(logger, success, userId, reason, requestId) {
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
function logBusinessEvent(logger, event, data, requestId) {
    logger.info('Business event', {
        requestId,
        event,
        ...data,
        type: 'business_event'
    });
}
function logPerformanceMetric(logger, metric, value, unit = 'ms', tags, requestId) {
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
function logError(logger, error, context) {
    logger.error('Unhandled error occurred', {
        ...context,
        errorName: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
        type: 'unhandled_error'
    });
}
// Correlation ID utilities for tracking requests across services
function generateCorrelationId() {
    return `asora-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function extractCorrelationId(headers) {
    return headers['x-correlation-id'] || headers['x-ms-client-tracking-id'];
}
//# sourceMappingURL=azure-logger.js.map