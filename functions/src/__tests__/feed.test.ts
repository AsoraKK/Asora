import { HttpRequest } from "@azure/functions";
import { feedHandler } from "../feed";

describe("feedHandler", () => {
  it("returns empty items array", async () => {
    const response = await feedHandler({} as HttpRequest);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ items: [] });
  });
});
