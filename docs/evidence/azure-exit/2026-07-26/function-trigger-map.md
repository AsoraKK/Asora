# Function Trigger Map

The live running app exposes 131 deployed functions. Repository source is under `functions/src/`, with generated `function.json`/index wiring and explicit privacy functions under `functions/privacy/`.

| Trigger family | Live names | Repository mapping | Azure dependency |
|---|---|---|---|
| HTTP API | auth, users, posts, feed, moderation, admin, notifications, payments | `functions/src/**` | Function host, Cosmos, PostgreSQL, storage, Key Vault |
| DSR HTTP | `privacy-export-user`, `privacy-delete-user`, admin DSR routes | `functions/privacy/**`, `functions/src/privacy/**` | Cosmos, PostgreSQL, DSR storage and queue |
| DSR queue | `privacyDsrProcessor`, `privacyDsrPurge`, `privacyDsrQueueMonitor` | repository DSR processor/purge modules and runbooks | `stasoradsrdev`, queue names, Application Insights |
| Timer | `processPendingNotifications`, `resolveExpiredAppeals`, `curatedNewsIngest` | `functions/src/**/timers` | Function scheduler, Cosmos, external providers |

Exact trigger bindings and package-to-source reconciliation require a deployment-package export or Function App read permission not collected in this packet. No deployed function is claimed source-unmatched solely from name differences.
