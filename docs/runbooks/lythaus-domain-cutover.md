# Lythaus domain cutover runbook

## Gate

This pass is audit and repository preparation only. Do not perform provider writes without separate authorization after both Cloudflare zones, Pages, Workers, custom domains/routes, Access, rulesets, certificates, the Azure MVP origin, CORS, OAuth callbacks, secrets, and rollback snapshots are verified.

## Environment model

- **Local:** local Flutter and Functions where supported.
- **Preview:** exact Cloudflare Pages preview plus temporary Worker preview; both use the existing Azure MVP origin.
- **MVP live:** official Lythaus domains using the same Azure origin.

Do not create permanent staging hostnames, new Azure Function Apps, or new databases.

## Pre-change capture

Store raw exports only under `.artifacts/cloudflare-audit/`; commit sanitized summaries. Capture DNS, Pages domains/deployments, Worker routes/custom domains/version, Access apps/policies, rulesets, Azure app-setting names/redacted state, platform CORS, OAuth callbacks, Function deployment SHA/package, and database backup posture.

## Preview sequence

1. Re-run `scripts/cloudflare/audit-domains.ps1`; require both exact zones and all read permissions.
2. Identify marketing, Flutter, and control-panel Pages projects by source, output, response content, and deployment SHA.
3. Deploy the exact PR Flutter artifact to a Pages preview.
4. Deploy the gateway temporarily through Wrangler preview/workers.dev with explicit preview hostname and CORS origin, the existing MVP `ORIGIN_BASE`, secret `ORIGIN_AUTH_TOKEN`, and rate-limit binding.
5. Keep `ORIGIN_GATEWAY_AUTH_REQUIRED=false` initially; do not change production DNS.
6. Validate health, path forwarding, preflight, discovery, authenticated cache bypass, protected rejection, header stripping, correlation IDs, origin concealment, SPA refresh, login, and callback error handling.
7. Add only the exact Pages preview origin to Azure CORS for the validation window, record it, and remove it afterward unless separately approved.
8. Enable origin enforcement only after gateway and emergency paths are proven; repeat health/auth/deployment checks.
9. Restore the prior Function package and Worker version, verify rollback, then restore the exact candidate SHA and repeat tests.

## Authorised provider-change plan

After a separate approval:

1. Attach `lythaus.co` to the identified marketing Pages project and verify canonical/sitemap output.
2. Configure the path/query-preserving `www.lythaus.co` redirect.
3. Attach `app.lythaus.co` to the identified Flutter Pages project and verify SPA/OAuth behavior.
4. Attach `api.lythaus.co` to the verified gateway using the existing MVP origin.
5. Set exact Lythaus Azure CORS and OAuth callback values.
6. Attach administration domains only after Access policy, audience, service-token, and origin-role checks pass.
7. Begin reviewed legacy redirects/API compatibility without deleting old bindings.
8. Record DNS, TLS, Pages/Worker versions, Access, CORS, OAuth, monitoring, and exact deployment identifiers.

## Rollback order

1. Restore the previous Worker version.
2. Restore previous Worker custom-domain/route bindings.
3. Restore the previous Function package.
4. Restore previous Pages deployments/bindings.
5. Restore previous DNS and redirects.
6. Restore prior CORS, OAuth callbacks, and origin-token enforcement.
7. Run health, readiness, discovery, auth, cache, Access, and split-brain checks.

Rollback uses exported, still-existing resources. Initial cutover does not delete old DNS, bindings, versions, Access applications, or compatibility routes.

## Current execution

On 2026-07-13 PR 453 completed preview-only provider work without binding production domains: immutable marketing and Flutter Pages previews, an ephemeral gateway Worker, exact preview CORS/OAuth values, target Access applications, and wildcard control-panel preview protection. Worker and Pages preview rollback were proven. The candidate Functions package was deployed, failed mandatory live OpenAPI acceptance, and was rolled back to `0cb3ffdeca506e891553c74b9e8b66de8f60890b`; health passed after restoration, but the same moderation-appeal schema drift still blocks full acceptance. Origin enforcement remains disabled because it would currently block active legacy Asora HTTP paths. Registrar, Bulk Redirect, and managed-ruleset detail reads still return HTTP 403. Production DNS, custom domains, redirects, and certificates remain unchanged.
