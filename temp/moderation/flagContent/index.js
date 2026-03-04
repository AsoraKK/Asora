"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const flagContent_1 = require("../flagContent");
functions_1.app.http('flagContent', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'moderation/flag-content',
    handler: flagContent_1.flagContent
});
//# sourceMappingURL=index.js.map