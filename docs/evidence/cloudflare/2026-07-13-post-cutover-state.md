# Post-cutover state - 2026-07-13

No MVP domain cutover was executed.

- Production Cloudflare DNS: unchanged.
- Production Pages custom domains: unchanged.
- Production Worker routes/custom domains: unchanged.
- Redirects and Bulk Redirects: unchanged.
- Email DNS: unchanged.
- New Azure resources: none.
- Target Access applications: prepared but not bound to DNS.
- Control-panel Pages previews: protected by wildcard Access.
- Marketing and Flutter: immutable preview deployments only.
- API gateway: ephemeral `workers.dev` deployment only.
- Azure CORS/OAuth: exact preview values temporarily added while explicit legacy compatibility origins were preserved.
- Azure candidate package: deployed, failed mandatory live contract acceptance, then rolled back.
- Current Azure package: `0cb3ffdeca506e891553c74b9e8b66de8f60890b`; direct and Worker health are 200.
- Origin enforcement: not enabled.
- Worker rollback: proven and current version restored.
- Pages rollback: proven on the preview branch and current artifact restored.
- Azure package rollback: previous package restored; full acceptance remains blocked by the same pre-existing OpenAPI schema drift.

This is a NO-GO evidence state, not a successful cutover record.
