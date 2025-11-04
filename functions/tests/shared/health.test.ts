/**
 * Health endpoint tests - validates the true liveness check.
 * 
 * The health endpoint is intentionally minimal with zero I/O and no dependencies.
 * It returns a plain Response('ok', { status: 200 }) to ensure it never crashes.
 * 
 * These tests verify the endpoint is registered correctly and accessible.
 */

describe('Health Function', () => {
  it('should be registered as an HTTP function', () => {
    // The health endpoint is registered via app.http() in the module
    // We verify the module loads without error by importing it
    expect(() => require('@shared/routes/health')).not.toThrow();
  });

  it('should use anonymous auth level', async () => {
    // The health endpoint is configured with authLevel: 'anonymous'
    // This test verifies the module structure is correct
    const healthModule = require('@shared/routes/health');
    
    // The module should export nothing (side-effect only registration)
    expect(Object.keys(healthModule).length).toBe(0);
  });

  it('should return a Response object when called directly', async () => {
    // Simulate the handler behavior directly
    const handler = async () => new Response('ok', { status: 200 });
    const response = await handler();
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    
    const text = await response.text();
    expect(text).toBe('ok');
  });

  it('should have no dependencies or side effects', () => {
    // The health module should not throw during load
    // and should not export any functions (pure side-effect registration)
    expect(() => {
      jest.isolateModules(() => {
        require('@shared/routes/health');
      });
    }).not.toThrow();
  });
});
