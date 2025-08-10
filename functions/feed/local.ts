import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getContainer } from "../shared/cosmosClient";
import { getUserContext } from "../shared/auth";

app.http("feedLocal", {
  methods: ["GET"],
  route: "feed/local",
  authLevel: "function",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const posts = getContainer("posts");
      let userCountry = "ZA"; // Default to South Africa
      
      // Try to get user's country from auth context
      const userContext = getUserContext(req);
      if (userContext) {
        const users = getContainer("users");
        try {
          const { resource: user } = await users.item(userContext.userId, userContext.userId).read();
          if (user?.profile?.country) {
            userCountry = user.profile.country;
          }
        } catch {
          // Continue with default
        }
      }
      
      const { resources } = await posts.items.query({
        query: `
          SELECT TOP 50 p.id, p.text, p.createdAt, p.authorId, p.likeCount
          FROM p WHERE (p.author.country = @country OR NOT IS_DEFINED(p.author.country))
          ORDER BY p.createdAt DESC
        `,
        parameters: [{ name: "@country", value: userCountry }],
      }).fetchAll();
      
      return { status: 200, jsonBody: { items: resources } };
    } catch (err: any) {
      ctx.error('Local feed error:', err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  }
});
