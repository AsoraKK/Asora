# ADR 001 — Overall Architecture & Roadmap

This document provides the full architectural rationale, design decisions, and implementation roadmap for Asora v1. For a summary, see [ADR_001_TLDR.md](ADR_001_TLDR.md).

## 1. Stack Overview
- **Client:** Flutter 3 + Riverpod
- **Edge:** Cloudflare CDN, /feed TTL 30s
- **API:** Azure Functions (HTTP)
- **Data:** Cosmos DB Serverless (+ Redis for hot timelines)
- **AI Safety:** ContentRiskService = Hive v2 primary, Azure Content Safety fallback
- **Auth:** Firebase Auth emulator → Azure AD B2C (PKCE/OAuth2)
- **Observability:** App Insights + OpenTelemetry
- **Privacy:** Central PrivacyService (GDPR/POPIA)

## 2. KPIs (Ship Gates)
- p95 feed < 200 ms
- Uptime ≥ 99.9%
- Backend cost ≤ €0.05 / MAU

## 3. Phases
- **P1 (→ Q4 2025):** Feed, Auth, Hive detection, Moderation, PrivacyService MVP
- **P2 (Q1 2026):** Reputation, Gamification, Tier gating, Data export
- **P3 (Q2 2026):** Affiliate layer, Cosmos multi‑region, auto‑scaling

## 4. Cost Decision (AI Safety)
- Keep Hive primary; switch/rebalance if volume > 10M objs/mo or SLA/cost degrades; benchmark ACS quarterly.

## 5. Privacy-by-Design (Ship in P1)
- Per‑post audience
- Profile field visibility toggles
- Export controls
- 3rd‑party opt‑ins
- Granular notifications

## 6. Execution Guardrails
- Tests ≥ 80% (client + functions)
- Rollback if ≥1% error on ≥1k req
- Alert at €0.04/MAU

## 7. Ownership
- Benchmarks & cost checks: Platform team
- Privacy/DPO/IO hiring & UX: Compliance owner
- Azure Boards: create EPICs per phase before implementation

## 8. Links
- [TL;DR](ADR_001_TLDR.md)
