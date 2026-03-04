"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
require("./feed");
/**
 * ASORA AZURE FUNCTIONS v4 ENTRY POINT
 *
 * This file registers all HTTP-triggered functions using the Azure Functions v4 programming model.
 * Each function is registered with app.http() and includes proper typing and error handling.
 */
// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check endpoint called');
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
});
// =============================================================================
// PRIVACY FUNCTIONS (GDPR/POPIA Compliance)
// =============================================================================
functions_1.app.http('exportUser', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'privacy/exportUser',
    handler: async (request, context) => {
        // Import the actual implementation
        const { exportUser } = await Promise.resolve().then(() => __importStar(require('../privacy/exportUser.js')));
        return exportUser(request, context);
    }
});
functions_1.app.http('deleteUser', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'privacy/deleteUser',
    handler: async (request, context) => {
        // Import the actual implementation
        const { deleteUser } = await Promise.resolve().then(() => __importStar(require('../privacy/deleteUser.js')));
        return deleteUser(request, context);
    }
});
// =============================================================================
// FEED FUNCTIONS are registered in src/feed/index.ts (v4 style)
// =============================================================================
// =============================================================================
// FUTURE FUNCTIONS
// =============================================================================
/*
TODO: Register additional functions here as they are migrated to v4:

app.http('userAuth', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth',
    handler: userAuthHandler
});
*/
// =============================================================================
// EXPORT FOR AZURE FUNCTIONS RUNTIME
// =============================================================================
// The app object is automatically exported by @azure/functions v4
// No explicit export needed - the runtime discovers registered functions
//# sourceMappingURL=index-complex.js.map