export function correlationId(request: Request): string {
  const supplied = request.headers.get('x-correlation-id')?.trim();
  return supplied && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export function logEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...event }));
}

export function assertExpectedHostname(request: Request, expectedHostnames?: string): void {
  const allowed = (expectedHostnames ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) throw new Error('hostname_not_configured');
  const hostname = new URL(request.url).hostname.toLowerCase();
  if (!allowed.includes(hostname)) throw new Error('hostname_not_allowed');
}

export function json<T>(body: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'private, no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}
