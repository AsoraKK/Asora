"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const deleteUser_1 = require("../deleteUser");
functions_1.app.http('deleteUser', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'user/delete',
    handler: deleteUser_1.deleteUser
});
//# sourceMappingURL=index.js.map