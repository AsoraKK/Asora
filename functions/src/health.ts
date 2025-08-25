import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function health(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  return { status: 200, jsonBody: { ok: true } };
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: health
});
