/**
 * Test helpers for mocking Azure Functions HTTP requests
 */
import { HttpRequest } from '@azure/functions';

interface MockRequestInit {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
}

export function httpReqMock(init: MockRequestInit = {}): HttpRequest {
  const headers = new Headers();

  // Add headers from init
  if (init.headers) {
    for (const [key, value] of Object.entries(init.headers)) {
      headers.set(key, value);
    }
  }

  // Create a URLSearchParams-like query object
  const queryParams = new Map<string, string>(Object.entries(init.query ?? {}));
  const queryWithEntries = {
    ...init.query,
    entries() {
      return queryParams.entries();
    },
    get(key: string) {
      return queryParams.get(key);
    },
  };

  return {
    method: init.method ?? 'GET',
    url: init.url ?? 'https://example.com/api',
    headers,
    query: queryWithEntries as any,
    params: init.params ?? {},
    body: init.body ?? undefined,

    // Required HttpRequest methods
    async json() {
      return init.body ?? {};
    },

    async text() {
      return JSON.stringify(init.body ?? {});
    },

    bodyUsed: false,

    clone() {
      return this;
    },
  } as unknown as HttpRequest;
}
