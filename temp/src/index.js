"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
functions_1.app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check endpoint called');
        return {
            status: 200,
            jsonBody: {
                ok: true,
                timestamp: new Date().toISOString(),
                service: 'asora-functions'
            }
        };
    }
});
functions_1.app.http('feed', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'feed',
    handler: async (request, context) => {
        context.log('Feed endpoint called');
        return {
            status: 200,
            jsonBody: {
                ok: true,
                timestamp: new Date().toISOString(),
                service: 'feed',
                data: { posts: [] }
            }
        };
    }
});
//# sourceMappingURL=index.js.map