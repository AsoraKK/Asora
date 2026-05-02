#!/usr/bin/env bash
# check-dsr-runbook-consistency.sh
#
# Validates that the required DSR app settings listed in docs/runbooks/dsr-settings.md
# are all set (or have visible defaults) in the deployment workflow.
#
# This prevents "runbook says X is required but deploy never sets it" drift.
#
# Exit codes:
#   0 – all required DSR keys are covered
#   1 – missing keys found (drift detected)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RUNBOOK="$ROOT/docs/runbooks/dsr-settings.md"
DEPLOY_WORKFLOW="$ROOT/.github/workflows/deploy-asora-function-dev.yml"

if [[ ! -f "$RUNBOOK" ]]; then
  echo "❌ DSR runbook not found: $RUNBOOK"
  exit 1
fi

if [[ ! -f "$DEPLOY_WORKFLOW" ]]; then
  echo "❌ Deploy workflow not found: $DEPLOY_WORKFLOW"
  exit 1
fi

# ─── Extract required DSR keys from runbook ─────────────────────────────────
# The runbook lists required settings as bullet points like: "- DSR_EXPORT_STORAGE_ACCOUNT"
# Optional keys are flagged with "(optional" in the same line.
mapfile -t REQUIRED_KEYS < <(
  grep -E '^\s*-\s+DSR_[A-Z_]+' "$RUNBOOK" \
  | grep -iv '(optional' \
  | grep -oE 'DSR_[A-Z_]+'
)

if [[ ${#REQUIRED_KEYS[@]} -eq 0 ]]; then
  echo "⚠️  No required DSR keys found in $RUNBOOK – check runbook format."
  exit 0
fi

echo "Required DSR keys from runbook (${#REQUIRED_KEYS[@]}):"
printf '  %s\n' "${REQUIRED_KEYS[@]}"
echo ""

# ─── Extract DSR keys set by the deploy workflow ─────────────────────────────
# Grep for `DSR_xxx` names used in az appsettings set calls.
mapfile -t DEPLOY_KEYS < <(
  grep -oE 'DSR_[A-Z_]+' "$DEPLOY_WORKFLOW" | sort -u
)

echo "DSR keys in deploy workflow (${#DEPLOY_KEYS[@]}):"
printf '  %s\n' "${DEPLOY_KEYS[@]}"
echo ""

# Also check local.settings.json.example
SETTINGS_EXAMPLE="$ROOT/local.settings.json.example"
EXAMPLE_KEYS=()
if [[ -f "$SETTINGS_EXAMPLE" ]]; then
  mapfile -t EXAMPLE_KEYS < <(
    grep -oE '"DSR_[A-Z_]+"' "$SETTINGS_EXAMPLE" | tr -d '"' | sort -u
  )
fi

# ─── Compare ──────────────────────────────────────────────────────────────────
MISSING=()
for key in "${REQUIRED_KEYS[@]}"; do
  in_deploy=false
  in_example=false
  for dk in "${DEPLOY_KEYS[@]}"; do
    [[ "$dk" == "$key" ]] && in_deploy=true && break
  done
  for ek in "${EXAMPLE_KEYS[@]}"; do
    [[ "$ek" == "$key" ]] && in_example=true && break
  done
  if ! $in_deploy && ! $in_example; then
    MISSING+=("$key")
  fi
done

# ─── Report ───────────────────────────────────────────────────────────────────
if [[ ${#MISSING[@]} -eq 0 ]]; then
  echo "✅ DSR runbook consistency check passed: all required keys are set in the deploy workflow."
  exit 0
fi

echo "❌ DSR runbook consistency drift detected!"
echo ""
echo "The following required DSR keys are documented in $RUNBOOK"
echo "but are NOT set in $DEPLOY_WORKFLOW (or local.settings.json.example):"
printf '  - %s\n' "${MISSING[@]}"
echo ""
echo "Remediation:"
echo "  1. Add the missing key(s) to the 'Configure DSR app settings' step in the deploy workflow, OR"
echo "  2. Add them to local.settings.json.example with a placeholder value, OR"
echo "  3. Mark them as '(optional)' in the runbook if they are truly optional."
exit 1
