# Feed Performance Workbook

Tracks the `/api/feed` Service Level Objective (p95 ≤ 200 ms) inside `appi-asora-dev`. It combines latency percentiles, error rate, and the custom `cosmos_ru_feed_page` metric emitted from the feed service to give a holistic view.

## Manual import

1. Open the **appi-asora-dev** Application Insights resource in the Azure portal.
2. Choose **Workbooks > Add** and select **Upload**. Point to `observability/workbooks/feed-latency.json` (or download the `feed-workbook` artifact produced by CI).
3. Edit each query tile and replace `/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/microsoft.insights/components/appi-asora-dev` with the correct resource ID for your deployment.
4. Save the workbook, then optionally **Pin to dashboard** so the tiles stay visible.

## Queries

### Feed latency p50/p95/p99

```kql
requests
| where url has "/api/feed"
| summarize p50=percentile(duration,50),
            p95=percentile(duration,95),
            p99=percentile(duration,99)
  by bin(timestamp, 5m)
```

### Feed error rate

```kql
requests
| where url has "/api/feed"
| summarize err_rate = 100.0 * countif(success == false) / count()
  by bin(timestamp, 5m)
```

### Cosmos RU per feed page

```kql
customMetrics
| where name == "cosmos_ru_feed_page"
| summarize avgRU=avg(value), p95RU=percentile(value,95)
  by bin(timestamp, 5m)
```

## Telemetry

The backend currently emits `cosmos_ru_feed_page` and a `feed_page` event from the feed service (`functions/src/feed/service/feedService.ts`). These offer the data surfaced in the workbook as well as the accompanying alerts (see `observability/alerts/feed-alerts.bicep`).

## CI artifact

`observability/workbooks/feed-latency.json` is uploaded via the `functions_build` job as the `feed-workbook` artifact. Grab that artifact if you want to reuse the workbook in automation or deployment scripts.
