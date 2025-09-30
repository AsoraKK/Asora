export class HiveClient {
  constructor(private readonly textKey?: string, private readonly baseUrl: string = "https://api.thehive.ai/api/v2") {}

  async classifyText(text: string): Promise<number | null> {
    if (!this.textKey) return null;
    try {
      const res = await fetch(`${this.baseUrl}/task/text/classification`, {
        method: "POST",
        headers: {
          Authorization: `token ${this.textKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      const score = typeof (data as any)?.result?.human_score === "number" ? (data as any).result.human_score : null;
      return typeof score === "number" ? Math.max(0, Math.min(1, score)) : null;
    } catch {
      return null;
    }
  }
}
