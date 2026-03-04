/**
 * Health endpoint tests - validates the empty placeholder.
 *
 * The health endpoint is intentionally empty to prevent duplicate registration.
 * Classic /api/health provides liveness, so v4 route is disabled.
 */

describe('Health Function', () => {
  it('should be an empty placeholder to prevent duplicate registration', () => {
    // The health endpoint module should be empty (no exports)
    const healthModule = require('@shared/routes/health');

    // Should export nothing - just prevents duplicate registration
    expect(Object.keys(healthModule).length).toBe(0);
  });

  it('should load without registering any HTTP functions', () => {
    // Loading the module should not throw and should not register functions
    expect(() => require('@shared/routes/health')).not.toThrow();

    // Verify it's truly empty
    const healthModule = require('@shared/routes/health');
    expect(healthModule).toEqual({});
  });
});
