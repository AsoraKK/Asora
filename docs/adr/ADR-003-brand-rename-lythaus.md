# ADR-003: Brand Rename – Asora → Lythaus

## Status

**Accepted** | 2026-01-08

## Context

The product formerly known as "Asora" is rebranding to **Lythaus** for all user-facing contexts. This decision is driven by marketing and brand identity considerations, not technical architecture changes.

Key stakeholders confirmed that:

- The **architecture decisions** in ADR-001 (overall roadmap) and ADR-002 (Cosmos partitioning) remain valid.
- Auth flows, user IDs, privacy policy approaches, AI transparency rules, and moderation pipelines are **unchanged**.
- Azure resource naming (e.g., `asora-function-dev`, `kv-asora-dev`) will **not** be modified to avoid infrastructure churn.

## Decision

1. **User-facing brand = Lythaus**
   - App UI, store listings, marketing copy, transactional emails.

2. **Internal/infra brand = Asora**
   - Repository name, Azure resources, Terraform modules, package identifiers (`com.asora.app`).

3. **Domain layout**
   - `lythaus.co` — marketing site, waitlist, invite links.
   - `asora.co.za` — API base, admin portals, Azure Functions host.

4. **No architectural changes**
   - This ADR explicitly confirms that prior ADRs (001, 002, 00X-mobile-security) are **not superseded** by the rename.
   - Auth, privacy, moderation, and AI transparency decisions remain intact.

5. **Locked naming decisions for beta**
   - **App identifiers:** `com.asora.app` retained for iOS/Android/macOS (avoids OAuth, deep link, Firebase churn).
   - **API base URL:** `*.asora.co.za` unchanged.
   - **JWT claims, user IDs, DB schemas:** No changes—UUIDv7 strategy from ADR-002 intact.

## Consequences

### Positive

- Clear brand identity for users.
- Internal engineers and agents can distinguish user-facing copy from infra code.
- Avoids costly infrastructure rename (ARM, Terraform state, CI/CD).

### Negative

- Temporary dual-naming during transition (mitigated by documentation).
- Agents may generate "Asora" in UI copy if not properly instructed (mitigated by `docs/branding/lythaus-transition.md`).

## References

- [Branding guide](../branding/lythaus-transition.md)
- ADR-001: Overall architecture roadmap
- ADR-002: Cosmos partitioning
- ADR-00X: Mobile security hardening
