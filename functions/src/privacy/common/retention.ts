export function isBeyondRetention(completedAt: string | undefined, retentionDays: number): boolean {
  if (!completedAt) {
    return true;
  }
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const completed = Date.parse(completedAt);
  if (Number.isNaN(completed)) {
    return true;
  }
  return completed < cutoff;
}
