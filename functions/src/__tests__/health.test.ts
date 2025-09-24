import { healthHandler } from "../health";

describe("healthHandler", () => {
  it("returns ok with timestamp", async () => {
    const response = await healthHandler();

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({
      ok: true,
      ts: expect.any(String),
    });
  });
});
