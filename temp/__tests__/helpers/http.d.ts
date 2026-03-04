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
export declare function httpReqMock(init?: MockRequestInit): HttpRequest;
export {};
//# sourceMappingURL=http.d.ts.map