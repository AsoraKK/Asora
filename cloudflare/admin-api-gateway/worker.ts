/// <reference lib="dom" />

// Cloudflare Access applies before this Worker. The Worker still limits paths,
// forwards the Access assertion for origin-side verification, and injects the
// separate origin token required by Azure.
import gateway from '../api-gateway/worker';

export default gateway;
