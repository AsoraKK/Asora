/// <reference lib="dom" />

// The legacy gateway reuses the hardened proxy implementation. Its distinct
// Wrangler configuration supplies the legacy hostname allowlist and headers.
import gateway from '../api-gateway/worker';

export default gateway;
