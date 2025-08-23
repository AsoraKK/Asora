# ADR 001 — Architecture & Roadmap (TL;DR)

**Approved:** 29 Jul 2025 • **Scope:** Asora v1

## Stack
Client: Flutter 3 + Riverpod  
Edge: Cloudflare CDN, /feed TTL 30s  
API: Azure Functions (HTTP)  
Data: Cosmos DB Serverless (+ Redis for hot timelines)  
AI Safety: ContentRiskService = Hive v2 primary, Azure Content Safety fallback  
Auth: Firebase Auth emulator → Azure AD B2C (PKCE/OAuth2)  
Obs: App Insights + OpenTelemetry  
Privacy: Central PrivacyService (GDPR/POPIA)

## KPIs (ship gates)
p95 feed < 200 ms • Uptime ≥ 99.9% • Backend cost ≤ €0.05 / MAU

## Phases
P1 (→ Q4 2025): Feed, Auth, Hive detection, Moderation, PrivacyService MVP  
P2 (Q1 2026): Reputation, Gamification, Tier gating, Data export  
P3 (Q2 2026): Affiliate layer, Cosmos multi‑region, auto‑scaling

## Cost decision (AI safety)
Keep Hive primary; switch/rebalance if volume > 10M objs/mo or SLA/cost degrades; benchmark ACS quarterly.

## Privacy-by-design (ship in P1)
Per‑post audience; profile field visibility toggles; export controls; 3rd‑party opt‑ins; granular notifications.

## Execution guardrails
Tests ≥ 80% (client + functions) • Rollback if ≥1% error on ≥1k req • Alert at €0.04/MAU

## Ownership
Benchmarks & cost checks: Platform team  
Privacy/DPO/IO hiring & UX: Compliance owner  
Azure Boards: create EPICs per phase before implementation

## Links
Full ADR: docs/adr_001_overall_architecture_roadmap.md
