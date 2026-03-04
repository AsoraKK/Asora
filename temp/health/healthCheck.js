"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
/**
 * Health check endpoint for Azure Functions
 * Returns 200 OK with basic status information
 */
async function healthCheck(request, context) {
    context.log('Health check endpoint called');
    // Basic health response
    const healthResponse = {
        ok: true,
        timestamp: new Date().toISOString(),
        status: 'healthy',
        service: 'asora-functions',
        version: '1.0.0'
    };
    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        jsonBody: healthResponse
    };
}
//# sourceMappingURL=healthCheck.js.map