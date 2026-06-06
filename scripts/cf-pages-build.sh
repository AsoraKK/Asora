#!/usr/bin/env bash
# Cloudflare Pages build script for the Lythaus Flutter web app.
# CF Pages build command:  bash scripts/cf-pages-build.sh
# CF Pages output dir:     build/web
set -euo pipefail

: "${API_BASE_URL:?API_BASE_URL is required}"
: "${AUTH_URL:?AUTH_URL is required}"
: "${ENVIRONMENT:=production}"

python3 - <<'PY'
import os
import sys
from urllib.parse import urlparse

def is_private_or_local(host: str) -> bool:
    host = host.strip().lower()
    if not host:
        return True
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        return True
    if host.endswith(".local"):
        return True
    parts = host.split(".")
    if len(parts) == 4 and all(p.isdigit() for p in parts):
        a, b = int(parts[0]), int(parts[1])
        if a in (10, 127):
            return True
        if a == 192 and b == 168:
            return True
        if a == 172 and 16 <= b <= 31:
            return True
    return False

for name in ("API_BASE_URL", "AUTH_URL"):
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"{name} is required")
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname:
        raise SystemExit(f"{name} must be a public HTTPS origin")
    if is_private_or_local(parsed.hostname):
        raise SystemExit(f"{name} must not target localhost or a private host")

env = os.environ.get("ENVIRONMENT", "").strip().lower()
if env and env not in {"production", "prod", "staging", "stg"}:
    raise SystemExit("ENVIRONMENT must be production or staging for release web builds")
PY

# Read pinned Flutter version from .fvmrc
FLUTTER_VERSION=$(python3 -c "import json,sys; print(json.load(open('.fvmrc'))['flutter'])")
echo "==> Installing Flutter ${FLUTTER_VERSION}"

FLUTTER_TAR="flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"
FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/${FLUTTER_TAR}"

curl -fsSL -o "/tmp/${FLUTTER_TAR}" "${FLUTTER_URL}"
tar xf "/tmp/${FLUTTER_TAR}" -C /tmp
export PATH="/tmp/flutter/bin:/tmp/flutter/bin/cache/dart-sdk/bin:${PATH}"

flutter precache --web
flutter --version

echo "==> Getting dependencies"
flutter pub get

echo "==> Building web release"
flutter build web --release --no-tree-shake-icons \
  --dart-define=ENVIRONMENT="${ENVIRONMENT}" \
  --dart-define=API_BASE_URL="${API_BASE_URL}" \
  --dart-define=AUTH_URL="${AUTH_URL}"

echo "==> Copying _redirects for SPA routing"
cp web/_redirects build/web/_redirects
echo "==> Copying _headers for CSP and cache rules"
cp web/_headers build/web/_headers

echo "==> Build complete — output in build/web"
