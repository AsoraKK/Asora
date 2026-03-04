"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const getMyAppeals_1 = require("../getMyAppeals");
functions_1.app.http('getMyAppeals', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'moderation/my-appeals',
    handler: getMyAppeals_1.getMyAppeals
});
//# sourceMappingURL=index.js.map