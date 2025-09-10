/**
 * Jest Test Setup
 * 
 * Global Jest configuration and type definitions
 */

// Global test timeout
jest.setTimeout(10000);

// Stabilize logger/env behavior for tests
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
process.env.AI_TELEMETRY = process.env.AI_TELEMETRY || 'off';
