"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpReqMock = httpReqMock;
function httpReqMock(init = {}) {
    const headers = new Headers();
    // Add headers from init
    if (init.headers) {
        for (const [key, value] of Object.entries(init.headers)) {
            headers.set(key, value);
        }
    }
    return {
        method: init.method ?? 'GET',
        url: init.url ?? 'https://example.com/api',
        headers,
        query: init.query ?? {},
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
    };
}
//# sourceMappingURL=http.js.map