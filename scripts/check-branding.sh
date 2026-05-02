#!/usr/bin/env bash
# check-branding.sh – Scan Flutter Dart files for 'Asora' in user-visible UI contexts.
#
# Per docs/branding/lythaus-transition.md: user-facing strings must say "Lythaus".
# "Asora" is permitted only in internal code (package IDs, imports, infra names, log tags).
#
# Exits 1 if violations found, 0 otherwise.

set -euo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LIB_DIR="$ROOT/lib"

if ! command -v rg >/dev/null 2>&1; then
  echo "rg (ripgrep) is required"
  exit 2
fi

# Patterns that indicate a user-visible UI string containing 'Asora'.
# We look for 'Asora' inside Flutter UI constructors / named params that are
# shown to end-users: Text(), title:, label:, hint:, tooltip:, message:,
# hintText:, labelText:, titleText:, subtitle:, semanticsLabel:
UI_PATTERN="(Text\s*\(['\"]|(?:title|label|hint|tooltip|message|hintText|labelText|titleText|subtitle|semanticsLabel)\s*:\s*(const\s+)?Text\s*\(|(?:title|label|hint|tooltip|message|hintText|labelText|titleText|subtitle|semanticsLabel)\s*:\s*['\"]).{0,200}Asora"

# Patterns that are allowed (internal / infra / comments)
#   - comments (// or /* )
#   - package identifiers (com.asora)
#   - import / export / part statements
#   - logger/tag defaults (e.g. _tag = 'Asora')
#   - pubspec names
#   - 'formerly Asora' transition phrase
ALLOW_PATTERN="(//|/\*|\bcom\.asora\b|import |export |part |_tag\s*=\s*'Asora'|\"tag\"\s*:\s*\"Asora\"|formerly Asora|asora-|asora_)"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

rg --pcre2 -n --glob "*.dart" -- "$UI_PATTERN" "$LIB_DIR" > "$TMP" 2>/dev/null || true

if [[ ! -s "$TMP" ]]; then
  echo "✅ Branding guard passed: no 'Asora' in user-visible UI strings."
  exit 0
fi

FILTERED="$(mktemp)"
trap 'rm -f "$TMP" "$FILTERED"' EXIT

grep -Eiv "$ALLOW_PATTERN" "$TMP" > "$FILTERED" || true

if [[ ! -s "$FILTERED" ]]; then
  echo "✅ Branding guard passed: only allowed internal uses of 'Asora' found."
  exit 0
fi

echo "❌ Found 'Asora' in user-facing UI strings (should be 'Lythaus'):"
cat "$FILTERED"
echo ""
echo "Per docs/branding/lythaus-transition.md: replace 'Asora' with 'Lythaus' in all user-visible contexts."
exit 1
