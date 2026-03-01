# Alert Inventory

Date: 2026-03-06  
Environment: staging first, then prod

## Inputs

- Function app resource ID:
- Resource group:
- Subscription:

## Metric Alerts (expected non-empty)

Command:

```bash
az monitor metrics alert list --resource-group <rg> --query "[].{name:name,enabled:enabled}" -o table
```

Output:

```text
<paste output>
```

## Scheduled Query Alerts (expected non-empty)

Command:

```bash
az monitor scheduled-query list --resource-group <rg> --query "[].{name:name,enabled:enabled}" -o table
```

Output:

```text
<paste output>
```

## Result

- Staging alerts deployed: ⬜
- Prod alerts deployed: ⬜
- Notes:

