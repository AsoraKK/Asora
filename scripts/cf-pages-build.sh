#!/usr/bin/env bash
# Cloudflare Pages build script for the Lythaus Flutter web app.
# CF Pages build command:  bash scripts/cf-pages-build.sh
# CF Pages output dir:     build/web
set -euo pipefail

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
flutter build web --release --no-tree-shake-icons

echo "==> Copying _redirects for SPA routing"
cp web/_redirects build/web/_redirects

echo "==> Build complete — output in build/web"
