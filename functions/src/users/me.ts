import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireAuth } from "../shared/auth";
import { getContainer } from "../shared/cosmosClient";

app.http("getMeProfile", {
  methods: ["GET"],
  route: "me",
  authLevel: "function",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const user = requireAuth(req);
      const users = getContainer("users");
      
      const { resource: profile } = await users.item(user.sub, user.sub).read();
      
      return {
        status: 200,
        jsonBody: {
          id: user.sub,
          email: user.email,
          accountLocked: profile?.accountLocked || false,
          accountCreatedAt: profile?.accountCreatedAt,
          tier: user.tier,
          role: user.role
        }
      };
    } catch (err: any) {
      const status = err?.status || 500;
      return { status, jsonBody: { error: err?.message || 'Internal server error' } };
    }
  }
});
