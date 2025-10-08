// Azure Content Safety Text Moderation (REST)
// Docs: https://learn.microsoft.com/azure/ai-services/content-safety/how-to/text

export interface ACSTextResult {
  score: number; // normalized 0..1 of max category score
  categoryScores: Record<string, number>;
}

export async function moderateTextWithACS(
  text: string,
  categories: string[],
  timeoutMs: number
): Promise<ACSTextResult> {
  const endpoint = process.env.ACS_ENDPOINT || '';
  const key = process.env.ACS_KEY || '';
  if (!endpoint || !key) {
    throw new Error('Azure Content Safety not configured');
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${endpoint.replace(/\/$/, '')}/contentsafety/text:analyze?api-version=2024-02-15-preview`;
    const payload = {
      text,
      categories,
      outputType: 'FourSeverityLevels',
    } as any;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': key,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    } as any);
    if (!res.ok) {
      throw new Error(`ACS error: ${res.status}`);
    }
    const data: any = await res.json();
    // Map categories to scores (0..1). ACS returns severity 0..3; normalize to 0..1.
    const categoryScores: Record<string, number> = {};
    let max = 0;
    for (const c of data?.categoriesAnalysis || []) {
      const name = c?.category || 'Unknown';
      const sev = typeof c?.severity === 'number' ? c.severity : 0; // 0..3
      const score = Math.max(0, Math.min(1, sev / 3));
      categoryScores[name] = score;
      if (score > max) max = score;
    }
    return { score: max, categoryScores };
  } finally {
    clearTimeout(t);
  }
}
