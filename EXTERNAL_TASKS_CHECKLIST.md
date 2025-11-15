# External Tasks Checklist

**Date:** 2025-01-15  
**Owner:** Operations / Platform Team  
**Status:** Ready for Execution

---

## Overview

All automated infrastructure provisioning and code implementation is complete. The following tasks require manual intervention due to portal access requirements, external validation, or operational procedures.

---

## Task 1: Import Feed Performance Workbook

**Priority:** High  
**Estimated Time:** 10 minutes  
**Prerequisites:** Azure Portal access to `appi-asora-dev` Application Insights resource

### Steps

1. Open the Azure Portal and navigate to `appi-asora-dev` Application Insights resource (subscription: `<YOUR_SUBSCRIPTION>`, resource group: `asora-psql-flex` or equivalent).

2. In the left navigation pane, select **Workbooks** → **+ New** → **Advanced Editor** (or **Upload**).

3. Upload or paste the contents of `observability/workbooks/feed-latency.json` (or download the `feed-workbook` artifact from the latest CI run).

4. Edit each query tile in the workbook editor:
   - Replace `/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/microsoft.insights/components/appi-asora-dev` with the actual resource ID for your `appi-asora-dev` Application Insights component.
   - You can find the resource ID by navigating to the Application Insights resource in the portal and copying the **Resource ID** from the **Properties** blade.

5. Save the workbook with the name **"Asora Feed SLO"** (or similar).

6. (Optional) Pin workbook tiles to your dashboard:
   - Open the saved workbook.
   - Click the **Pin** icon on each tile (Feed latency, Error rate, Cosmos RU).
   - Select your target dashboard or create a new one.

### Validation

- Workbook displays three tiles: **Feed latency (p50/p95/p99)**, **Feed error rate**, **Cosmos RU per feed page**.
- Time window defaults to last 1 hour; adjust as needed.
- Queries return data after feed traffic is generated (see Task 4).

### Documentation

- Full instructions: `observability/workbooks/README.md`
- Sample queries and telemetry details included in README.

---

## Task 2: Deploy Feed Alert Rules

**Priority:** High  
**Estimated Time:** 15 minutes  
**Prerequisites:** Azure CLI authenticated, action group IDs available, Application Insights resource ID known

### Steps

1. Retrieve the **Application Insights resource ID** for `appi-asora-dev`:
   ```bash
   az monitor app-insights component show \
     --app appi-asora-dev \
     --resource-group asora-psql-flex \
     --query id \
     --output tsv
   ```

2. Identify or create an **Action Group** for alert notifications (e.g., email, webhook, SMS):
   ```bash
   az monitor action-group list --resource-group asora-psql-flex --output table
   ```
   - If no action group exists, create one:
     ```bash
     az monitor action-group create \
       --name asora-ops-alerts \
       --resource-group asora-psql-flex \
       --short-name ops-alerts \
       --email-receiver ops-email ops-team@example.com
     ```
   - Note the action group resource ID for the next step.

3. Deploy the Bicep alert rules:
   ```bash
   az deployment group create \
     --resource-group asora-psql-flex \
     --template-file observability/alerts/feed-alerts.bicep \
     --parameters appInsightsId="<APP_INSIGHTS_RESOURCE_ID>" \
                  actionGroupIds='["<ACTION_GROUP_RESOURCE_ID>"]'
   ```

4. Verify deployment:
   ```bash
   az monitor scheduled-query list --resource-group asora-psql-flex --output table
   ```
   - Look for `feed-p95-latency` (severity 2, threshold 200 ms, 15-minute window).
   - Look for `feed-error-rate` (severity 3, threshold 1%, 15-minute window).

### Validation

- Both alert rules appear in the Azure Portal under **Monitor → Alerts → Alert rules**.
- Alert rules are **Enabled**.
- Action groups are correctly linked to each rule.

### Documentation

- Bicep template: `observability/alerts/feed-alerts.bicep`
- Alert rule definitions include query, schedule, threshold, severity, and auto-mitigation settings.

---

## Task 3: Execute End-to-End DSR Trace

**Priority:** High  
**Estimated Time:** 30 minutes  
**Prerequisites:** `privacy_admin` role JWT, access to `asora-function-dev` Function App logs, storage account access

### Steps

1. **Enqueue a DSR Export Request:**
   ```bash
   curl -X POST https://asora-function-dev-<unique-id>.northeurope-01.azurewebsites.net/admin/dsr/export \
     -H "Authorization: Bearer <PRIVACY_ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user-uuid-v7", "note": "E2E trace test"}'
   ```
   - Response should be `202 Accepted` with a request ID (e.g., `{"id": "req-123", "status": "queued", ...}`).
   - Note the `id` for subsequent steps.

2. **Monitor Queue Worker Execution:**
   ```bash
   az functionapp logs tail --name asora-function-dev --resource-group asora-psql-flex
   ```
   - Look for log entries:
     * `dsr.queue.invalid` (should not appear)
     * `queue.export.dispatch` with `requestId: req-123`
     * `export.fetch`, `export.package`, `export.upload` spans
   - Status should transition: `queued → running → awaiting_review`.

3. **Check Request Status:**
   ```bash
   curl -X GET https://asora-function-dev-<unique-id>.northeurope-01.azurewebsites.net/admin/dsr/req-123 \
     -H "Authorization: Bearer <PRIVACY_ADMIN_JWT>"
   ```
   - Response should include `status: "awaiting_review"`, `exportBlobPath: "dsr-exports/dev/req-123.zip"`, `review: {}`, `audit: [...]`.

4. **Submit Reviewer A Decision (Safety Review):**
   ```bash
   curl -X POST https://asora-function-dev-<unique-id>.northeurope-01.azurewebsites.net/admin/dsr/req-123/reviewA \
     -H "Authorization: Bearer <PRIVACY_ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"pass": true, "notes": "Redaction verified, no raw IPs present"}'
   ```
   - Response should be `204 No Content`.

5. **Submit Reviewer B Decision (Operational Readiness):**
   ```bash
   curl -X POST https://asora-function-dev-<unique-id>.northeurope-01.azurewebsites.net/admin/dsr/req-123/reviewB \
     -H "Authorization: Bearer <PRIVACY_ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{"pass": true, "notes": "Blob uploaded, lifecycle policy active, watchdog clean"}'
   ```
   - Response should be `204 No Content`.
   - Status should now be `ready_to_release`.

6. **Release Export (Generate SAS Link):**
   ```bash
   curl -X POST https://asora-function-dev-<unique-id>.northeurope-01.azurewebsites.net/admin/dsr/req-123/release \
     -H "Authorization: Bearer <PRIVACY_ADMIN_JWT>"
   ```
   - Response should be `200 OK` with `{"id": "req-123", "signedUrl": "https://stasoradsrdev.blob...", "expiresAt": "..."}`.
   - Status is now `released`.

7. **Download Export ZIP:**
   ```bash
   curl -o req-123.zip "<SIGNED_URL_FROM_STEP_6>"
   ```
   - Verify ZIP can be extracted and contains expected files: `user.json`, `posts.jsonl`, `comments.jsonl`, `audit.jsonl`, `ai_scorecard.jsonl`, `media_links.jsonl`.

8. **Verify Application Insights Spans:**
   - Open `appi-asora-dev` in Azure Portal → **Transaction search**.
   - Filter by custom event `feed_page` or custom metric `cosmos_ru_feed_page`.
   - Verify spans for `dsr.enqueue`, `queue.export.dispatch`, `export.fetch`, `export.package`, `export.upload`, `dsr.review.pass`, `dsr.release.sas`.

9. **Check Cosmos Audit Log:**
   ```bash
   az cosmosdb sql query \
     --account-name asora-cosmos-dev \
     --database-name AsoraDatabase \
     --container-name audit_logs \
     --query "SELECT * FROM c WHERE c.meta.requestId = 'req-123'"
   ```
   - Should return audit entries for `enqueue.export`, `status.changed`, `review.pass`, `export.released`.

### Validation

- Export request transitions through all statuses correctly.
- Worker logs show successful fetch/package/upload operations.
- Dual-review workflow functions (both reviewers required before release).
- SAS URL generated and usable (12-hour TTL respected).
- ZIP contents match expected structure and pass redaction checks (no raw IPs).
- Application Insights spans and Cosmos audit log entries present and accurate.

### Documentation

- **Runbook:** `docs/runbooks/dsr.md` (Section 2-6: Submit Export, Monitor Status, Reviewer Checklists, Release Link)
- **OpenAPI Spec:** `api/openapi/openapi.yaml` (DSR admin endpoints)

---

## Task 4: Run Feed Load Test (Validate SLO)

**Priority:** High  
**Estimated Time:** 45 minutes  
**Prerequisites:** k6 or similar load testing tool, access to `asora-function-dev` Function App, Application Insights access

### Steps

1. **Prepare Test Script:**
   - Use k6 or similar tool to generate load against `/api/feed`.
   - Example k6 script (`feed-load-test.js`):
     ```javascript
     import http from 'k6/http';
     import { check, sleep } from 'k6';

     export const options = {
       stages: [
         { duration: '5m', target: 100 },  // ramp up to 100 VUs
         { duration: '10m', target: 100 }, // sustain 100 VUs
         { duration: '5m', target: 0 },    // ramp down
       ],
     };

     export default function () {
       const res = http.get('https://asora-function-dev-<unique-id>.northeurope-01.azurewebsites.net/api/feed');
       check(res, { 'status is 200': (r) => r.status === 200 });
       sleep(1);
     }
     ```

2. **Execute Load Test:**
   ```bash
   k6 run feed-load-test.js
   ```
   - Let the test run for 15-30 minutes to generate sufficient telemetry.

3. **Monitor Workbook During Test:**
   - Open the **Asora Feed SLO** workbook in Azure Portal (imported in Task 1).
   - Observe the three tiles:
     * **Feed latency (p50/p95/p99):** p95 should remain ≤ 200 ms (SLO target).
     * **Feed error rate:** Should remain ≤ 1% (ideally 0%).
     * **Cosmos RU per feed page:** Should stay within expected budget (e.g., avg ≤ 5 RU, p95 ≤ 10 RU).

4. **Check Function App Logs:**
   ```bash
   az functionapp logs tail --name asora-function-dev --resource-group asora-psql-flex
   ```
   - Look for `feed.get.complete` log entries with `durationMs`, `queryDurationMs`, `ru`, `authorCount`.
   - Verify no errors or exceptions.

5. **Query Application Insights for p95 Latency:**
   ```kql
   requests
   | where url has "/api/feed"
   | where timestamp > ago(30m)
   | summarize p95=percentile(duration,95)
   ```
   - p95 value should be ≤ 200 ms.

6. **Query Application Insights for Error Rate:**
   ```kql
   requests
   | where url has "/api/feed"
   | where timestamp > ago(30m)
   | summarize err_rate=100.0 * countif(success == false) / count()
   ```
   - Error rate should be ≤ 1%.

### Validation

- p95 latency ≤ 200 ms during sustained load (SLO met).
- Error rate ≤ 1% (ideally 0%).
- Cosmos RU budget within expected range (no excessive cross-partition queries).
- Function App logs show no errors or timeout exceptions.
- Workbook displays accurate real-time metrics.

### Documentation

- **Feed Implementation:** `docs/FEED_IMPLEMENTATION.md`
- **Feed Service Code:** `functions/src/feed/service/feedService.ts`
- **Workbook README:** `observability/workbooks/README.md`

---

## Task 5: Verify Alert Rules Fire Correctly

**Priority:** Medium  
**Estimated Time:** 15 minutes  
**Prerequisites:** Alert rules deployed (Task 2), load test completed (Task 4)

### Steps

1. **Trigger p95 Latency Alert (Optional Negative Test):**
   - Temporarily increase load beyond capacity (e.g., 500 VUs) to push p95 > 200 ms.
   - Wait 15 minutes for the alert evaluation window.

2. **Trigger Error Rate Alert (Optional Negative Test):**
   - Introduce a deliberate failure (e.g., invalid cursor parameter) to increase error rate > 1%.
   - Wait 15 minutes for the alert evaluation window.

3. **Check Fired Alerts:**
   - Open Azure Portal → **Monitor → Alerts → Alert history**.
   - Verify `feed-p95-latency` and/or `feed-error-rate` alerts appear in history.
   - Confirm action groups were notified (email, webhook, etc.).

4. **Verify Auto-Mitigation:**
   - Return load to normal levels (or fix deliberate errors).
   - Wait 15 minutes.
   - Confirm alerts auto-resolve (mitigate) once metrics fall below thresholds.

### Validation

- Alert rules fire when thresholds are exceeded.
- Action groups receive notifications (email, webhook, etc.).
- Alerts auto-resolve when conditions improve.
- Alert history visible in Azure Portal.

### Documentation

- **Bicep Template:** `observability/alerts/feed-alerts.bicep`
- **Runbook:** `docs/runbooks/dsr.md` (Section 11: Monitoring & Observability)

---

## Task 6: Document Completion and Handoff

**Priority:** Medium  
**Estimated Time:** 10 minutes  
**Prerequisites:** All above tasks complete

### Steps

1. Update this checklist with completion dates and any issues encountered.

2. Add notes to `DSR_INFRASTRUCTURE_SETUP_COMPLETE.md` if any deviations from expected behavior occurred.

3. Share results with the team:
   - Feed SLO metrics (p95 latency, error rate, Cosmos RU) from load test.
   - DSR E2E trace screenshots or log snippets.
   - Alert rule test results.

4. Archive logs and telemetry for reference:
   - Save Application Insights query results.
   - Export workbook tiles as screenshots or PDF.
   - Save k6 load test summary report.

5. Update operational runbooks if new learnings emerged during validation.

### Validation

- All tasks completed and documented.
- Team notified of completion status.
- Logs and telemetry archived for future reference.

---

## Checklist Summary

| Task | Priority | Owner | Status | Completion Date |
|------|----------|-------|--------|-----------------|
| 1. Import Feed Performance Workbook | High | Ops | ⏳ Pending | |
| 2. Deploy Feed Alert Rules | High | Ops | ⏳ Pending | |
| 3. Execute End-to-End DSR Trace | High | Platform | ⏳ Pending | |
| 4. Run Feed Load Test (Validate SLO) | High | Platform | ⏳ Pending | |
| 5. Verify Alert Rules Fire Correctly | Medium | Ops | ⏳ Pending | |
| 6. Document Completion and Handoff | Medium | Platform | ⏳ Pending | |

---

## Support

- For questions or issues, refer to:
  * **Runbook:** `docs/runbooks/dsr.md`
  * **Infrastructure Scripts:** `infra/scripts/`
  * **Observability Docs:** `observability/workbooks/README.md`
  * **Test Suites:** `functions/tests/`

- For infrastructure provisioning issues, contact the Platform team.
- For DSR workflow questions, consult Privacy Engineering.

---

**End of Checklist**
