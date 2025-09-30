import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { buildPipeline } from "./pipeline";
import { FeedContext } from "./pipeline/types";

app.http("feed-get", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "feed",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const userId = req.query.get("userId") ?? "anon"; // TODO: replace with JWT auth
    const mode = (req.query.get("mode") ?? "discovery") as FeedContext["mode"];
    const pageSize = Number(req.query.get("limit") ?? 20);

    const context: FeedContext = {
      mode,
      pageSize,
      region: req.query.get("region") ?? undefined,
      localToGlobalRatio: Number(req.query.get("localRatio") ?? 0.2), // 0.2 = 20% local
      hardFilters: {
        followOnly: req.query.get("followOnly") === "true" || false,
        includeKeywords: (req.query.get("include") ?? "").split(",").filter(Boolean),
        excludeKeywords: (req.query.get("exclude") ?? "").split(",").filter(Boolean),
        includeTopics: (req.query.get("topics") ?? "").split(",").filter(Boolean),
        regions: (req.query.get("regions") ?? "").split(",").filter(Boolean),
      },
      userPrefs: {
        rankMode: (req.query.get("rankMode") ?? "balanced") as "balanced" | "chronological" | "qualityFirst",
      },
      featureFlags: {
        fairnessQuotas: true,
        explorationSlots: true,
      },
    };

    const pipeline = buildPipeline(ctx);
    const result = await pipeline.run(userId, context);

    return {
      jsonBody: {
        items: result.items, // already fairness/mixed
        meta: {
          count: result.items.length,
          nextCursor: result.nextCursor ?? null,
          timingsMs: result.timingsMs,
          applied: result.meta,
        },
      },
    };
  },
});
