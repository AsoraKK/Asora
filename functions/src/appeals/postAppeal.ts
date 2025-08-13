import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getContainer } from "../shared/cosmosClient";
import { requireAuth } from "../shared/auth";
import { randomUUID } from "crypto";

app.http("postAppeal", {
  methods: ["POST"],
  route: "appeals",
  authLevel: "function",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const user = requireAuth(req); // throws on invalid
  const body = (await req.json().catch(() => ({}))) as Partial<{ postId: string; reason: string }>;
  const { postId, reason } = body || {} as any;
      if (!postId || !reason) return { status: 400, jsonBody: { error: "postId and reason required" } };

      const appeals = getContainer("appeals");
      const appeal = {
        id: randomUUID(),
        postId: String(postId),
        userId: user.sub,
        reason: String(reason).slice(0, 1000),
        status: "open" as const,
        createdAt: new Date().toISOString(),
      };
      await appeals.items.create(appeal);
      return { status: 201, jsonBody: appeal };
    } catch (err: any) {
      const status = err?.status || 500;
      return { status, jsonBody: { error: err?.message || "Internal server error" } };
    }
  }
});
