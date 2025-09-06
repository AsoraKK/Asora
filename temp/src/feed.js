"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const get_1 = require("./feed/get");
functions_1.app.http('feed', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'feed',
    handler: get_1.getFeed
});
//# sourceMappingURL=feed.js.map