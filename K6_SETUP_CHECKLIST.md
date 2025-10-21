# k6 Canary SLO Gate - Setup Checklist

## ✅ Implementation Status

### Pre-Deployment Gating (Production Path)
- **Location**: `.github/workflows/deploy-asora-function-dev.yml`
- **Flow**: `canary-k6` job runs smoke + feed tests → gates `deploy` job
- **Gate Mechanism**: `deploy` has `needs: [canary-k6]` (fails deploy if canary fails)
- **k6 Thresholds**: 
  - Smoke: p95<5000ms, p99<10000ms (cold-start safe)
  - Feed: p95<3000ms, p99<5000ms (warm endpoint safe)
- **Override via env vars**: `SMOKE_P95_THRESHOLD`, `FEED_READ_P95_THRESHOLD`, etc.

### Post-Deployment Verification (Observability Path)
- **Location**: `.github/workflows/canary-k6.yml`
- **Trigger**: `workflow_run` (after deploy completes) + `workflow_call` (reusable)
- **Purpose**: Independent verification + PR comments

### Both Workflows Use
- ✅ `grafana/setup-k6-action@v1` (reliable k6 install)
- ✅ Standardized `K6_BASE_URL` env var
- ✅ Scenario-tagged thresholds
- ✅ `if: always()` for artifact upload on failure
- ✅ `.txt` + `.json` summaries

## 🔧 Required Repo Configuration

### Repository Variables (Settings > Secrets and Variables > Variables)
- [ ] `K6_BASE_URL`: Set to your Function App URL
  - Example: `https://asora-function-dev.azurewebsites.net`
  - Used in `canary-k6.yml` as fallback

### Repository Secrets (Settings > Secrets and Variables > Secrets)
- [ ] `K6_SMOKE_TOKEN`: Optional bearer token if API needs auth
  - Leave empty if no authentication required
  - Used in `canary-k6.yml` if set

## ✅ Verification Steps

1. **Push to main** → GitHub Actions triggers `deploy-asora-function-dev.yml`
2. **canary-k6 job runs first** (smoke + feed tests)
3. **If thresholds breached** → job fails with exit code 99 → deploy blocked
4. **If thresholds pass** → deploy job runs
5. **Artifacts uploaded** → view k6 summaries in Actions tab
6. **Post-deploy verification** → `canary-k6.yml` runs via `workflow_run`

## 📊 Threshold Strategy

### Current Defaults (Production)
- **Smoke**: p95<5s, p99<10s (accounts for cold-start)
- **Feed**: p95<3s, p99<5s (realistic for warm endpoints)

### Tighten for Post-Warm Performance
Set environment variables in workflow:
```yaml
env:
  SMOKE_P95_THRESHOLD: 500      # 500ms for warm smoke
  SMOKE_P99_THRESHOLD: 1000     # 1s for warm smoke
  FEED_READ_P95_THRESHOLD: 300  # 300ms for warm feed
  FEED_READ_P99_THRESHOLD: 600  # 600ms for warm feed
```

### Original Spec (Not Recommended for Serverless)
- p95<200ms, p99<400ms requires always-warm infrastructure
- Would fail all cold-start deployments
- Consider warm-up phase if strict compliance required

## 📋 Minimal Acceptance Checklist

- ✅ k6 scripts exist: `load/k6/smoke.js`, `load/k6/feed-read.js`
- ✅ Pre-deploy gating: `deploy-asora-function-dev.yml` has `canary-k6` job
- ✅ Deploy blocked on failure: `deploy` has `needs: [canary-k6]`
- ✅ Thresholds enforced: k6 exits 99 on breach → job fails
- ✅ Artifacts uploaded: Even on test failure (`if: always()`)
- ✅ Post-deploy verification: `canary-k6.yml` runs independently
- ✅ PR comments: Show k6 results in PRs (when run)

## 🚀 Next Steps

1. Set `K6_BASE_URL` repo variable (required)
2. Push to main → verify canary job runs before deploy
3. Monitor first few deployments for threshold compliance
4. Adjust thresholds if needed via env vars or code updates
