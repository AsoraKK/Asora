import { app, InvocationContext, Timer } from "@azure/functions";
import { getContainer } from "../shared/cosmosClient";

async function sendEmail(to: string, subject: string, body?: string) {
  // TODO: integrate real provider later
  return true;
}

app.timer("firstPostEnforcer", {
  schedule: "0 0 3 * * *",
  handler: async (_t: Timer, ctx: InvocationContext) => {
    const users = getContainer("users");
    const posts = getContainer("posts");

    const now = Date.now();
    const h36 = new Date(now - 36 * 3600_000).toISOString();
    const h48 = new Date(now - 48 * 3600_000).toISOString();

    // 36h reminder
    const { resources: remindUsers } = await users.items
      .query({
        query: `
          SELECT u.id, u.email
          FROM u
          WHERE u.accountCreatedAt <= @h36 AND (NOT IS_DEFINED(u.accountLocked) OR u.accountLocked=false)
        `,
        parameters: [{ name: "@h36", value: h36 }],
      })
      .fetchAll();

    for (const u of remindUsers) {
      const { resources: userPosts } = await posts.items
        .query({ query: "SELECT TOP 1 p.id FROM p WHERE p.authorId=@uid", parameters: [{ name: "@uid", value: u.id }] })
        .fetchAll();
      if (userPosts.length === 0 && u.email) await sendEmail(u.email, "Create your first post to unlock full access");
    }

    // 48h lock
    const { resources: lockUsers } = await users.items
      .query({
        query: `
          SELECT u.id FROM u
          WHERE u.accountCreatedAt <= @h48 AND (NOT IS_DEFINED(u.accountLocked) OR u.accountLocked=false)
        `,
        parameters: [{ name: "@h48", value: h48 }],
      })
      .fetchAll();

    for (const u of lockUsers) {
      const { resources: userPosts } = await posts.items
        .query({ query: "SELECT TOP 1 p.id FROM p WHERE p.authorId=@uid", parameters: [{ name: "@uid", value: u.id }] })
        .fetchAll();
      if (userPosts.length === 0) {
        await users.item(u.id, u.id).patch([{ op: "add", path: "/accountLocked", value: true }]);
      }
    }
  },
});
