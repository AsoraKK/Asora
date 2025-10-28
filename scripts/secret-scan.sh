#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
BIN_DIR="$ROOT_DIR/.cache/tools"
mkdir -p "$BIN_DIR"

GITLEAKS_BIN=""
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS_BIN=$(command -v gitleaks)
else
  VERSION="${GITLEAKS_VERSION:-8.18.0}"
  ARCHIVE="gitleaks_${VERSION}_linux_x64.tar.gz"
  URL="https://github.com/zricethezav/gitleaks/releases/download/v${VERSION}/${ARCHIVE}"
  TARGET="$BIN_DIR/gitleaks"
  if [ ! -x "$TARGET" ]; then
    echo "Downloading gitleaks ${VERSION}..." >&2
    TMP_TAR=$(mktemp)
    if ! curl -sSL "$URL" -o "$TMP_TAR"; then
      echo "Failed to download gitleaks from $URL" >&2
      echo "Attempting docker fallback" >&2
    else
      tar -xf "$TMP_TAR" -C "$BIN_DIR" gitleaks
      rm -f "$TMP_TAR"
      chmod +x "$TARGET"
      GITLEAKS_BIN="$TARGET"
    fi
  else
    GITLEAKS_BIN="$TARGET"
  fi
fi

if [ -z "$GITLEAKS_BIN" ]; then
  if command -v docker >/dev/null 2>&1; then
    echo "Running gitleaks via docker..." >&2
    exec docker run --rm -v "$ROOT_DIR:/repo" -w /repo zricethezav/gitleaks:8.18.0 detect \
      --no-banner --redact --config=.gitleaks.toml --source=/repo "$@"
  else
    echo "gitleaks is not available and docker fallback failed." >&2
    echo "Install gitleaks 8.18.0 or provide docker to run this script." >&2
    exit 2
  fi
fi

exec "$GITLEAKS_BIN" detect --no-banner --redact --config "$ROOT_DIR/.gitleaks.toml" --source "$ROOT_DIR" "$@"