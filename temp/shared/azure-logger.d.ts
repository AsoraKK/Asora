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
export declare function getAzureLogger(component: string): AzureLogger;
export declare function logHttpRequest(logger: AzureLogger, method: string, url: string, statusCode: number, duration: number, requestId?: string): void;
export declare function logDatabaseOperation(logger: AzureLogger, operation: string, collection: string, duration: number, requestCharge?: number, requestId?: string): void;
export declare function logAuthAttempt(logger: AzureLogger, success: boolean, userId?: string, reason?: string, requestId?: string): void;
export declare function logBusinessEvent(logger: AzureLogger, event: string, data: Record<string, any>, requestId?: string): void;
export declare function logPerformanceMetric(logger: AzureLogger, metric: string, value: number, unit?: string, tags?: Record<string, string>, requestId?: string): void;
export declare function logError(logger: AzureLogger, error: Error, context?: LogContext): void;
export declare function generateCorrelationId(): string;
export declare function extractCorrelationId(headers: Record<string, string>): string | undefined;
//# sourceMappingURL=azure-logger.d.ts.map