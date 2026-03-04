"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const reviewAppealedContent_1 = require("../reviewAppealedContent");
functions_1.app.http('reviewAppealedContent', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'moderation/review-queue',
    handler: reviewAppealedContent_1.reviewAppealedContent
});
//# sourceMappingURL=index.js.map