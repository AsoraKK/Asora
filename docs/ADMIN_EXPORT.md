Admin Data Export

Endpoint
- GET `/api/admin/export?userId={id}`
- Auth: JWT with `role=admin` (validated via unified access guard)
- Returns: same JSON as user self‑export
- Audit: writes `privacy_audit` record with `operator=admin` and result status

CLI Usage
- Env: `ADMIN_BEARER_TOKEN` (admin JWT), `FUNCTION_BASE_URL` (optional)
- Command:
  - `node scripts/admin-export.js <userId> [outDir]`
  - Saves `admin_export_<userId>_<ts>.json`

Notes
- Output size: JSON is streamed by fetch and saved to disk; for very large outputs consider chunking in future.
- Support: keep admin tokens short‑lived and scoped; audit entries provide traceability.

