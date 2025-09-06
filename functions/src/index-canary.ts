import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("ping", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ping",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    ctx.log("ping called");
    return { status: 200, body: "ok" };
  },
});

