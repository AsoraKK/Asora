Canary Rollout Plan (Front Door, Flex Consumption)

Scope
- Apps: asora-function-flex (prod), asora-function-flex-canary (canary)
- Traffic split via Azure Front Door origin weights (90/10)
- Monitor App Insights requests failure rate for canary for 10 minutes
- Rollback if failureRate > 1%

Prereqs
- Front Door profile/endpoint/origin group exist with both origins added
- Both Function Apps share the same App Insights resource

Steps
1) Deploy to CANARY:
   - Publish `functions/` to `asora-function-flex-canary` via Functions Action (OneDeploy)
2) Shift traffic:
   - Set Front Door origin weights: prod=90, canary=10
3) Monitor (10 min):
   - Run KQL: `observability/appinsights-canary-failure.kql`
   - Threshold: failureRate <= 1%
4) Rollback (if needed):
   - Set weights: prod=100, canary=0
   - Post a commit comment with failure details
5) Promote (manual):
   - Increase canary share gradually (25% â†’ 50% â†’ 100%) if metrics are healthy

Test Plan
- Pre-checks: `/api/health` and `/api/feed?page=1` green via smoke tests
- During canary: observe requests, failures, latency (p95) on canary role only
- Post-canary: run full regression for auth flows and feed endpoints


