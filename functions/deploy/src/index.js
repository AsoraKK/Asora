'use strict';
const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get() {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
const __importStar =
  (this && this.__importStar) ||
  (function () {
    let ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          const ar = [];
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      const result = {};
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
const functions_1 = require('@azure/functions');
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
      version: '1.0.0',
    };
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      jsonBody: healthResponse,
    };
  },
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
    const { exportUser } = await Promise.resolve().then(() =>
      __importStar(require('../privacy/exportUser.js'))
    );
    return exportUser(request, context);
  },
});
functions_1.app.http('deleteUser', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'privacy/deleteUser',
  handler: async (request, context) => {
    // Import the actual implementation
    const { deleteUser } = await Promise.resolve().then(() =>
      __importStar(require('../privacy/deleteUser.js'))
    );
    return deleteUser(request, context);
  },
});
// =============================================================================
// FUTURE FUNCTIONS
// =============================================================================
/*
TODO: Register additional functions here as they are migrated to v4:

app.http('feedGet', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'feed',
    handler: feedGetHandler
});

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
//# sourceMappingURL=index.js.map
