import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getContainer } from "../shared/cosmosClient";
import { requireAuth } from "../shared/auth";
import { randomUUID } from "crypto";
import Joi from "joi";

const appealSchema = Joi.object({
  postId: Joi.string().trim().required(),
  reason: Joi.string().trim().required(),
});

export async function postAppeal(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = requireAuth(req); // throws on invalid

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON body" } };
    }

    const { error, value } = appealSchema.validate(body);
    if (error) {
      return { status: 400, jsonBody: { error: error.message } };
    }

    const { postId, reason } = value as { postId: string; reason: string };

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

app.http("postAppeal", {
  methods: ["POST"],
  route: "appeals",
  authLevel: "function",
  handler: postAppeal,
});
