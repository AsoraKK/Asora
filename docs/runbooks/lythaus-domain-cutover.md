# Lythaus domain cutover runbook

## Gate

Provider preparation is authorised for immutable previews, ACS email, controlled
origin-guard rehearsals, and rollback proof. Do not attach final public Lythaus
custom domains until the mandatory live authentication and rollback gates pass.

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
5. Start Azure with `ORIGIN_GATEWAY_AUTH_MODE=observe` and all three distinct token settings installed through approved secret stores; do not change production DNS.
6. Validate health, path forwarding, preflight, discovery, authenticated cache bypass, protected rejection, header stripping, correlation IDs, origin concealment, SPA refresh, login, and callback error handling.
7. Add only the exact Pages preview origin to Azure CORS for the validation window, record it, and remove it afterward unless separately approved.
8. Enable origin enforcement only after gateway and emergency paths are proven; repeat health/auth/deployment checks.
9. Restore the prior Function package and Worker version, verify rollback, then restore the exact candidate SHA and repeat tests.

## Authorised provider-change plan

1. Attach `lythaus.co` to the identified marketing Pages project and verify canonical/sitemap output.
2. Configure the path/query-preserving `www.lythaus.co` redirect.
3. Attach `app.lythaus.co` to the identified Flutter Pages project and verify SPA/OAuth behavior.
4. Attach `api.lythaus.co` to the verified gateway using the existing MVP origin.
5. Set exact Lythaus Azure CORS and OAuth callback values.
6. Attach administration domains only after Access policy, audience, service-token, and origin-role checks pass.
7. Begin reviewed legacy redirects/API compatibility without deleting old bindings.
8. Record DNS, TLS, Pages/Worker versions, Access, CORS, OAuth, monitoring, and exact deployment identifiers.

## Rollback order

1. Move Azure origin authentication from `enforce` to `observe` or a reviewed, unexpired `dual` configuration.
2. Verify direct Azure health using only the health-scoped operational token.
3. Restore the previous Worker version.
4. Restore previous Worker custom-domain and route bindings.
5. Verify both gateway and legacy-compatibility traffic.
6. Restore the previous Pages deployment if required.
7. Restore CORS and OAuth values only when they were changed.
8. Check for split-brain routing before restoring the candidate.
9. Restore the candidate Worker and Pages artifacts.
10. Re-run health, auth, cache, Access, contract, and DSR checks.
11. Re-enable `enforce` only after every path passes.

Rollback uses exported, still-existing resources. Initial cutover does not delete old DNS, bindings, versions, Access applications, or compatibility routes.

## Current execution

PR 453 is draft and stacked on PR 452. Repository preparation is complete only
where evidence is recorded in `docs/evidence/cloudflare/`; current Worker,
Pages, Azure origin-authentication, browser-authentication, Access, and
rollback rehearsals must be repeated against the exact candidate before
cutover. PR 452 has merged; retarget PR 453 to `main` after the new commit exists.
ACS Email resources and the additive empty email-auth schema are prepared.
Email DNS changes are limited to exact Azure-issued verification records through
the protected workflow; public app/API/marketing custom domains remain unchanged.
