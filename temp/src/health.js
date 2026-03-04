"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.health = health;
const functions_1 = require("@azure/functions");
async function health(_req, _ctx) {
    return { status: 200, jsonBody: { ok: true } };
}
functions_1.app.http("health", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "health",
    handler: health
});
//# sourceMappingURL=health.js.map