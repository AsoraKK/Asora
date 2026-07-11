#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-zip}"
ZIP="${ZIP:-dist-v4-final.zip}"

if [ ! -f "$ZIP" ]; then
  echo "::error::ZIP artifact '$ZIP' not found"
  exit 1
fi

echo "Listing ZIP contents: $ZIP"
FILES_LIST=$(mktemp)
trap 'rm -f "$FILES_LIST"' EXIT
if ! unzip -Z1 "$ZIP" | sed 's#^\./##' > "$FILES_LIST"; then
  echo "::error::Failed to list contents of $ZIP"
  exit 1
fi

has_file() {
  local pattern="$1"
  grep -qx "$pattern" "$FILES_LIST"
}

if ! has_file "host.json"; then
  echo "::error::host.json missing at ZIP root. Ensure you zipped the contents of the build directory, not the directory itself."
  exit 1
fi

if ! has_file "package.json"; then
  echo "::error::package.json missing at ZIP root. Node runtimes require package.json alongside host.json."
  exit 1
fi

MAIN_ENTRYPOINT=$(unzip -p "$ZIP" package.json | node -e '
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", () => {
    const main = JSON.parse(input).main;
    if (typeof main === "string") process.stdout.write(main.replace(/^\.\//, ""));
  });
')
if [ -z "$MAIN_ENTRYPOINT" ]; then
  echo "::error::package.json must define a Node runtime main entrypoint."
  exit 1
fi
if ! has_file "$MAIN_ENTRYPOINT"; then
  echo "::error::package.json main entrypoint '$MAIN_ENTRYPOINT' is missing from the ZIP."
  exit 1
fi

RELATIVE_REQUIRES=$(unzip -p "$ZIP" "$MAIN_ENTRYPOINT" | node -e '
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", () => {
    const pattern = /require\(\s*["\x27]\.\/([^"\x27]+)["\x27]\s*\)/g;
    for (const match of input.matchAll(pattern)) process.stdout.write(`${match[1]}\n`);
  });
')
while IFS= read -r required_path; do
  [ -z "$required_path" ] && continue
  if ! has_file "$required_path" && ! has_file "${required_path}.js" && ! has_file "${required_path}/index.js"; then
    echo "::error::Runtime entrypoint '$MAIN_ENTRYPOINT' requires missing ZIP path './$required_path'."
    exit 1
  fi
done <<<"$RELATIVE_REQUIRES"

JS_CANDIDATE="$(grep -E '\.(js|mjs|cjs)$' "$FILES_LIST" | head -n1 || true)"

if [ "$MODE" = "zip" ]; then
  if [ -z "$JS_CANDIDATE" ]; then
    echo "::error::Prebuilt ZIP must include at least one compiled JS/MJS/CJS file."
    exit 1
  fi

  echo "Found JS candidate: $JS_CANDIDATE"
else
  if ! grep -E '\.(ts|js|mjs|cjs)$' "$FILES_LIST" >/dev/null; then
    echo "::error::Remote-build package must include TS/JS sources."
    exit 1
  fi
fi

echo "✓ Artifact structure validation passed."
