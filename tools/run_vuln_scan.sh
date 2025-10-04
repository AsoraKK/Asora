#!/usr/bin/env bash
# Simple vuln scan helper: runs `npm audit` and, if installed, `snyk test`.
# Usage: TOOLS_RUN_DIR=$(pwd) ./tools/run_vuln_scan.sh

set -euo pipefail
OUT_DIR="audit_logs"
mkdir -p "$OUT_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT_FILE="$OUT_DIR/vuln_scan_$TS.txt"

echo "Vulnerability scan run at $TS" > "$OUT_FILE"
echo "===== npm audit =====" >> "$OUT_FILE"
if command -v npm >/dev/null 2>&1; then
  npm audit --json 2>/dev/null | jq . > "$OUT_DIR/npm_audit_$TS.json" || true
  npm audit >> "$OUT_FILE" || true
else
  echo "npm not found" >> "$OUT_FILE"
fi

if command -v snyk >/dev/null 2>&1; then
  echo "===== snyk test =====" >> "$OUT_FILE"
  snyk test >> "$OUT_FILE" || true
else
  echo "snyk not installed; skipping" >> "$OUT_FILE"
fi

echo "Wrote scan output to $OUT_FILE"
