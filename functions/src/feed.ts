import { app, HttpRequest, HttpResponseInit } from "@azure/functions";

export async function feedHandler(_req: HttpRequest): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: {
      items: [],
    },
  };
}

app.http("feed", {
  route: "feed",
  methods: ["GET"],
  authLevel: "function",
  handler: feedHandler,
});
