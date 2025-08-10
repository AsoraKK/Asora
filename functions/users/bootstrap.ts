import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireAuth } from "../shared/auth";
import { getContainer } from "../shared/cosmosClient";

app.http("bootstrapUser", {
  methods: ["POST"],
  route: "me/bootstrap",
  authLevel: "function",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const user = requireAuth(req);
      const users = getContainer("users");
      const now = new Date().toISOString();
      const body = (await req.json().catch(() => ({}))) as Partial<{ accountCreatedAt: string }>;
      const accountCreatedAt = body.accountCreatedAt ?? now;
      await users.items.upsert({
        id: user.sub,
        accountCreatedAt,
        accountLocked: false,
      });
      return { status: 204 };
    } catch (err: any) {
      return { status: err?.status || 500, jsonBody: { error: err?.message || 'Internal error' } };
    }
  }
});
