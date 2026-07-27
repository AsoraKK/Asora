# Workspace Copy Validation

## Source

`C:\Users\kylee\Projects\Lythaus\docs\evidence\azure-exit\2026-07-26`

## Temporary destinations

- `C:\Users\kylee\.codex\azure-exit-primary`
- `C:\Users\kylee\.codex\azure-exit-secondary`

## Result

- Source files: 39
- Primary files: 39
- Secondary files: 39
- Source-to-primary file hashes: match
- Source-to-secondary file hashes: match
- Primary-to-secondary file hashes: match by source-equivalent comparison
- Raw database, Cosmos, queue, media, DSR, credential, and secret exports: none

Both destinations are on the same `C:` disk. They are temporary execution copies only and do not satisfy independent disaster-recovery or geographic redundancy. They must not be treated as the two required long-term backup locations.
