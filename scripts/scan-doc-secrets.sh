#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

if ! command -v rg >/dev/null 2>&1; then
  echo "rg is required for docs secret scanning"
  exit 2
fi

FILES_PATTERN='*.md'

# Potentially sensitive markers commonly leaked in docs/reference files.
PATTERNS=(
  '(?i)(api[_-]?key|client[_-]?secret|jwt[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'"'"']?[A-Za-z0-9_\-]{16,}'
  'ghp_[A-Za-z0-9]{36}'
  'xox[baprs]-[A-Za-z0-9-]{24,}'
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  '(?i)cloudflare[^\\n]{0,40}(token|secret)\s*[:=]\s*["'"'"']?[A-Za-z0-9_\-]{20,}'
)

ALLOW_CONTEXT_REGEX='(example|placeholder|redacted|dummy|sample|<[^>]+>|your_|changeme|test_|begin private key.*block)'

TMP_RESULTS="$(mktemp)"
trap 'rm -f "$TMP_RESULTS"' EXIT

for pattern in "${PATTERNS[@]}"; do
  rg --pcre2 -n --glob "$FILES_PATTERN" -- "$pattern" "$ROOT" >> "$TMP_RESULTS" || true
done

if [[ ! -s "$TMP_RESULTS" ]]; then
  echo "✅ Docs secret scan passed (no suspicious patterns found)."
  exit 0
fi

FILTERED="$(mktemp)"
trap 'rm -f "$TMP_RESULTS" "$FILTERED"' EXIT

grep -Eiv "$ALLOW_CONTEXT_REGEX" "$TMP_RESULTS" > "$FILTERED" || true

if [[ ! -s "$FILTERED" ]]; then
  echo "✅ Docs secret scan passed (only placeholder/example matches found)."
  exit 0
fi

echo "❌ Potential secrets found in markdown/docs files:"
cat "$FILTERED"
echo
echo "Remediation: redact values and replace with placeholders."
exit 1
