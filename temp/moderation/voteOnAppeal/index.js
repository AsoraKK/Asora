"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const voteOnAppeal_1 = require("../voteOnAppeal");
functions_1.app.http('voteOnAppeal', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'moderation/vote-appeal',
    handler: voteOnAppeal_1.voteOnAppeal
});
//# sourceMappingURL=index.js.map