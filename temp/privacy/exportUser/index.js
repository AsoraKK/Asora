"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const exportUser_1 = require("../exportUser");
functions_1.app.http('exportUser', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'user/export',
    handler: exportUser_1.exportUser
});
//# sourceMappingURL=index.js.map