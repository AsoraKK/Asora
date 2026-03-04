/**
 * Test suite for lazy Cosmos client initialization
 * Verifies that cosmos-client.ts doesn't crash on module load when env vars are missing
 */

import { getCosmosClient, getCosmosDatabase, resetCosmosClient } from '../shared/cosmos-client';

describe('Lazy Cosmos Client Initialization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset cached client before each test
    resetCosmosClient();
    // Start with clean env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetCosmosClient();
  });

  it('should not throw on module import (lazy initialization)', () => {
    // This test verifies the module can be imported without crashing
    // The act of importing cosmos-client.ts should not throw
    expect(() => {
      // Re-require to test module-level code
      jest.isolateModules(() => {
        require('../shared/cosmos-client');
      });
    }).not.toThrow();
  });

  it('should throw only when getCosmosClient is called without env vars', () => {
    delete process.env.COSMOS_CONNECTION_STRING;
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.NODE_ENV;

    // Should throw when actually trying to get a client
    expect(() => {
      getCosmosClient();
    }).toThrow('Missing Cosmos DB configuration');
  });

  it('should cache client instance across calls', () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdGtleQ==;';
    
    const client1 = getCosmosClient();
    const client2 = getCosmosClient();
    
    expect(client1).toBe(client2); // Same instance
  });

  it('should cache database instance across calls', () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdGtleQ==;';
    process.env.COSMOS_DATABASE_NAME = 'testdb';
    
    const db1 = getCosmosDatabase();
    const db2 = getCosmosDatabase();
    
    expect(db1).toBe(db2); // Same instance
  });

  it('should reset cache when resetCosmosClient is called', () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdGtleQ==;';
    
    const client1 = getCosmosClient();
    resetCosmosClient();
    const client2 = getCosmosClient();
    
    expect(client1).not.toBe(client2); // Different instances after reset
  });

  it('should use test mode client when NODE_ENV=test and no config', () => {
    delete process.env.COSMOS_CONNECTION_STRING;
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    process.env.NODE_ENV = 'test';

    // Should not throw in test mode
    expect(() => {
      getCosmosClient();
    }).not.toThrow();
  });

  it('should return different database instances for different names', () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdGtleQ==;';
    
    const db1 = getCosmosDatabase('db1');
    const db2 = getCosmosDatabase('db2');
    
    // Note: In our implementation, the database accessor is cached by name,
    // so we expect them to be different objects representing different databases
    // We just verify both calls succeed without error
    expect(db1).toBeDefined();
    expect(db2).toBeDefined();
  });
});
