import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock window.location before importing the module
const mockOrigin = 'https://control.asora.co.za';

// We need to mock window for the tests
beforeEach(() => {
  // Set up window.location mock
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        origin: mockOrigin,
        href: `${mockOrigin}/`
      },
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    },
    writable: true,
    configurable: true
  });
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('adminApi URL construction', () => {
  describe('resolveToAbsoluteUrl', () => {
    it('should return absolute URLs unchanged', async () => {
      const { default: adminApi } = await import('../api/adminApi.js');
      
      // Test that absolute URLs pass through
      const absUrl = 'https://admin-api.asora.co.za/api';
      // We can test via getAbsoluteAdminApiUrl when localStorage returns absolute URL
      window.localStorage.getItem = vi.fn(() => absUrl);
      
      const result = adminApi.getAbsoluteAdminApiUrl();
      expect(result).toBe(absUrl);
    });

    it('should resolve relative paths against window.location.origin', async () => {
      window.localStorage.getItem = vi.fn(() => null); // Use default
      
      const { getAbsoluteAdminApiUrl } = await import('../api/adminApi.js');
      const result = getAbsoluteAdminApiUrl();
      
      expect(result).toBe(`${mockOrigin}/api/admin`);
    });

    it('should handle relative paths from localStorage', async () => {
      window.localStorage.getItem = vi.fn(() => '/api/v2/admin');
      
      const { getAbsoluteAdminApiUrl } = await import('../api/adminApi.js');
      const result = getAbsoluteAdminApiUrl();
      
      expect(result).toBe(`${mockOrigin}/api/v2/admin`);
    });
  });

  describe('buildUrl via adminRequest', () => {
    it('should build correct URL for moderation test upload', async () => {
      window.localStorage.getItem = vi.fn((key) => {
        if (key === 'controlPanelAdminApiUrl') return null;
        if (key === 'controlPanelAdminToken') return 'test-token';
        return null;
      });

      // Mock fetch to capture the URL
      let capturedUrl = null;
      globalThis.fetch = vi.fn(async (url) => {
        capturedUrl = url;
        return {
          ok: true,
          text: async () => '{"status":"ok"}'
        };
      });

      const { adminRequest } = await import('../api/adminApi.js');
      await adminRequest('/moderation/test/upload', { method: 'POST' });

      expect(capturedUrl).toBe(`${mockOrigin}/api/admin/moderation/test/upload`);
    });

    it('should handle paths without leading slash', async () => {
      window.localStorage.getItem = vi.fn(() => null);
      
      let capturedUrl = null;
      globalThis.fetch = vi.fn(async (url) => {
        capturedUrl = url;
        return {
          ok: true,
          text: async () => '{"status":"ok"}'
        };
      });

      const { adminRequest } = await import('../api/adminApi.js');
      await adminRequest('moderation/test', { method: 'GET' });

      expect(capturedUrl).toBe(`${mockOrigin}/api/admin/moderation/test`);
    });

    it('should handle base URL with trailing slash', async () => {
      window.localStorage.getItem = vi.fn((key) => {
        if (key === 'controlPanelAdminApiUrl') return '/api/admin/';
        return null;
      });

      let capturedUrl = null;
      globalThis.fetch = vi.fn(async (url) => {
        capturedUrl = url;
        return {
          ok: true,
          text: async () => '{"status":"ok"}'
        };
      });

      const { adminRequest } = await import('../api/adminApi.js');
      await adminRequest('/config', { method: 'GET' });

      // Should not have double slashes
      expect(capturedUrl).toBe(`${mockOrigin}/api/admin/config`);
    });

    it('should preserve query parameters', async () => {
      window.localStorage.getItem = vi.fn(() => null);

      let capturedUrl = null;
      globalThis.fetch = vi.fn(async (url) => {
        capturedUrl = url;
        return {
          ok: true,
          text: async () => '{"items":[]}'
        };
      });

      const { adminRequest } = await import('../api/adminApi.js');
      await adminRequest('/users', { 
        method: 'GET',
        query: { limit: 10, offset: 20 }
      });

      const parsedUrl = new URL(capturedUrl);
      expect(parsedUrl.pathname).toBe('/api/admin/users');
      expect(parsedUrl.searchParams.get('limit')).toBe('10');
      expect(parsedUrl.searchParams.get('offset')).toBe('20');
    });

    it('should work with absolute admin API URL', async () => {
      const directApiUrl = 'https://admin-api.asora.co.za';
      window.localStorage.getItem = vi.fn((key) => {
        if (key === 'controlPanelAdminApiUrl') return directApiUrl;
        return null;
      });

      let capturedUrl = null;
      globalThis.fetch = vi.fn(async (url) => {
        capturedUrl = url;
        return {
          ok: true,
          text: async () => '{"status":"ok"}'
        };
      });

      const { adminRequest } = await import('../api/adminApi.js');
      await adminRequest('/moderation/test', { method: 'POST' });

      expect(capturedUrl).toBe(`${directApiUrl}/moderation/test`);
    });
  });

  describe('edge cases', () => {
    it('should not produce double slashes in URL', async () => {
      const testCases = [
        { base: '/api/admin', path: '/test', expected: '/api/admin/test' },
        { base: '/api/admin/', path: '/test', expected: '/api/admin/test' },
        { base: '/api/admin/', path: 'test', expected: '/api/admin/test' },
        { base: '/api/admin', path: 'test', expected: '/api/admin/test' }
      ];

      for (const { base, path, expected } of testCases) {
        vi.resetModules();
        window.localStorage.getItem = vi.fn((key) => {
          if (key === 'controlPanelAdminApiUrl') return base;
          return null;
        });

        let capturedUrl = null;
        globalThis.fetch = vi.fn(async (url) => {
          capturedUrl = url;
          return {
            ok: true,
            text: async () => '{}'
          };
        });

        const { adminRequest } = await import('../api/adminApi.js');
        await adminRequest(path, { method: 'GET' });

        const parsedUrl = new URL(capturedUrl);
        expect(parsedUrl.pathname).toBe(expected);
      }
    });

    it('should filter out empty query parameters', async () => {
      window.localStorage.getItem = vi.fn(() => null);

      let capturedUrl = null;
      globalThis.fetch = vi.fn(async (url) => {
        capturedUrl = url;
        return {
          ok: true,
          text: async () => '{}'
        };
      });

      const { adminRequest } = await import('../api/adminApi.js');
      await adminRequest('/users', { 
        method: 'GET',
        query: { 
          limit: 10, 
          search: '', 
          filter: null, 
          page: undefined,
          active: 'true'
        }
      });

      const parsedUrl = new URL(capturedUrl);
      expect(parsedUrl.searchParams.get('limit')).toBe('10');
      expect(parsedUrl.searchParams.get('active')).toBe('true');
      expect(parsedUrl.searchParams.has('search')).toBe(false);
      expect(parsedUrl.searchParams.has('filter')).toBe(false);
      expect(parsedUrl.searchParams.has('page')).toBe(false);
    });
  });
});
