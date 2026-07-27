# Azure Exit Evidence - 2026-07-26

This packet is a non-destructive audit of Azure dependencies for Lythaus (formerly Asora).

- Subscription: `99df7ef7-776a-4235-84a4-c77899b2bb04`
- Tenant: `275643fa-37e0-4f67-b616-85a7da674bea`
- Collection date: 2026-07-26
- Azure writes: none observed; all Azure commands were read-only
- Secret values, queue bodies, database records, and personal data: excluded
- Historical evidence reconciled: `docs/evidence/cloudflare/2026-07-13-azure-mvp-audit.json`

The packet is not shutdown authorization. It remains `NOT READY FOR AZURE SHUTDOWN` because backups, restore tests, cost evidence, privacy-record access, operational migration, and several permissions remain unresolved.

The 39-file sanitized packet was copied and hash-verified into temporary local destinations:

- `C:\Users\kylee\.codex\azure-exit-primary`
- `C:\Users\kylee\.codex\azure-exit-secondary`

Both are on the same `C:` disk. They are execution copies, not independent disaster-recovery locations.
