#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-zip}"
ZIP="${ZIP:-dist-v4-final.zip}"

if [ ! -f "$ZIP" ]; then
  echo "::error::ZIP artifact '$ZIP' not found"
  exit 1
fi

echo "Listing ZIP contents: $ZIP"
if ! unzip -Z1 "$ZIP" > _files_raw.txt; then
  echo "::error::Failed to list contents of $ZIP"
  exit 1
fi

# Normalize paths by stripping leading ./
sed 's#^\./##' _files_raw.txt > _files.txt
rm -f _files_raw.txt

has_file() {
  local pattern="$1"
  grep -qx "$pattern" _files.txt
}

if ! has_file "host.json"; then
  echo "::error::host.json missing at ZIP root. Ensure you zipped the contents of the build directory, not the directory itself."
  exit 1
fi

if ! has_file "package.json"; then
  echo "::error::package.json missing at ZIP root. Node runtimes require package.json alongside host.json."
  exit 1
fi

JS_CANDIDATE="$(grep -E '\.(js|mjs|cjs)$' _files.txt | head -n1 || true)"

if [ "$MODE" = "zip" ]; then
  if [ -z "$JS_CANDIDATE" ]; then
    echo "::error::Prebuilt ZIP must include at least one compiled JS/MJS/CJS file."
    exit 1
  fi

  echo "Found JS candidate: $JS_CANDIDATE"
else
  if ! grep -E '\.(ts|js|mjs|cjs)$' _files.txt >/dev/null; then
    echo "::error::Remote-build package must include TS/JS sources."
    exit 1
  fi
fi

echo "✓ Artifact structure validation passed."

rm -f _files.txt
