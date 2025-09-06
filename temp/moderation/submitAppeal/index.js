"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const submitAppeal_1 = require("../submitAppeal");
functions_1.app.http('submitAppeal', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'moderation/submit-appeal',
    handler: submitAppeal_1.submitAppeal
});
//# sourceMappingURL=index.js.map