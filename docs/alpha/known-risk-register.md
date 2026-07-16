# Controlled Alpha Known-Risk Register

Status: current as of 2026-07-11

| Priority | Risk | Current control | Closure evidence |
| --- | --- | --- | --- |
| P0 | Provider credentials named in the exposure register are not verified rotated | Repository references use Key Vault/GitHub/provider stores; deployment refuses plaintext fallbacks | Kyle records provider identifiers, rotation/revocation time, health checks, and session invalidation |
| P0 | Exact release SHA has not passed full CI or live deployment validation | Exact-SHA artifact and summary gates implemented | Successful CI and generated release manifest for deployed SHA |
| P0 | Alpha cohort table may not exist in target PostgreSQL | Migration supplied; release ops preflight fails if snapshot is unavailable | Applied migration plus non-partial cohort snapshot |
| P1 | Current dev feed p95 exceeds 200 ms | Query/hydration/index/cursor remediation plus exact-SHA k6 matrix | Representative warm p95 below approved threshold and errors below 1% |
| P1 | Rollback procedure is implemented but not rehearsed | Protected manual immutable-artifact rollback workflow | Successful staging rehearsal and restoration evidence |
| P1 | Kyle is the only human operator | Cohort limits, kill switches, alerts, daily reports, reversible config, approval boundaries | Stage A operational review shows sustainable workload |
| P1 | Cost-constrained Technical Alpha DSR storage and Cosmos DB use public Azure service endpoints | DSR is private-container and Entra/RBAC-only with HTTPS/TLS 1.2 and 30-day lifecycle; Cosmos requires TLS 1.2 and a deployment-verified Key Vault connection reference | Private networking and Cosmos managed identity before Controlled Alpha, or a new Kyle-approved measured ADR amendment |
| P1 | Active-user estimate depends on authenticated telemetry identity population | Report labels it as an estimate and excludes raw identities | Telemetry validation against aggregate cohort/account counts |
| P2 | Moderate npm advisories remain in non-production telemetry/tooling paths | High/critical production audit fails closed; dependency review remains required | Upstream upgrades or documented dependency replacement |
| P2 | Old architecture/product snapshots remain for historical context | Superseded banners and canonical index identify current sources | Periodic documentation drift check |
| P3 | Mobile code continues to evolve outside Alpha | Mobile stays in static/unit checks but is excluded from launch gates | Beta readiness packet |

No risk acceptance automatically advances an Alpha stage. Kyle must review exit metrics and explicitly approve each stage change.
