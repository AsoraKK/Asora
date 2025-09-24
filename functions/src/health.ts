import { app, HttpResponseInit } from "@azure/functions";

export async function healthHandler(): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: {
      ok: true,
      ts: new Date().toISOString(),
    },
  };
}

app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: healthHandler,
});
