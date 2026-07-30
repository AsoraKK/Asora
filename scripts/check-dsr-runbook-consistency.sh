#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNBOOK="$ROOT/docs/runbooks/dsr-settings.md"
JOBS_CONFIG="$ROOT/apps/lythaus-jobs/wrangler.jsonc"
JOBS_SOURCE="$ROOT/apps/lythaus-jobs/src/index.ts"
ADMIN_CONFIG="$ROOT/apps/lythaus-admin-api/wrangler.jsonc"

for required in "$RUNBOOK" "$JOBS_CONFIG" "$JOBS_SOURCE" "$ADMIN_CONFIG"; do
  [[ -f "$required" ]] || { echo "Missing native privacy contract file: $required"; exit 1; }
done

required_config_tokens=(
  DB_PRIVACY_FRESH
  PRIVATE_EXPORTS
  PRIVACY_QUEUE
  lythaus-privacy-dlq-dev
  ACCOUNT_DELETE
  ACCOUNT_EXPORT
  RETENTION_CLEANUP
  lythaus-private-exports-dev
  lythaus-audit-archive-dev
)

required_source_tokens=(
  AccountDeleteWorkflow
  AccountExportWorkflow
  RetentionCleanupWorkflow
  privacy.reconcile_subject_data_locations
  privacy.legal_holds
  privacy.deletion_tombstones
  privacy.export_manifests
)

missing=()
for token in "${required_config_tokens[@]}"; do
  grep -Fq "$token" "$JOBS_CONFIG" || missing+=("jobs config: $token")
  grep -Fq "$token" "$RUNBOOK" || missing+=("runbook: $token")
done
for token in "${required_source_tokens[@]}"; do
  grep -Fq "$token" "$JOBS_SOURCE" || missing+=("jobs source: $token")
  grep -Fq "$token" "$RUNBOOK" || missing+=("runbook: $token")
done
grep -Fq 'DB_PRIVACY_FRESH' "$ADMIN_CONFIG" || missing+=("admin config: DB_PRIVACY_FRESH")
grep -Fq 'PRIVATE_EXPORTS' "$ADMIN_CONFIG" || missing+=("admin config: PRIVATE_EXPORTS")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Native privacy runbook consistency drift detected:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

echo "Native privacy runbook consistency check passed."
