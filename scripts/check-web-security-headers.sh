#!/usr/bin/env bash
# Verify the Cloudflare Pages web headers manifest contains the baseline policy.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEADER_FILE="${1:-${ROOT_DIR}/web/_headers}"

python3 - "$HEADER_FILE" <<'PY'
from pathlib import Path
import sys

header_file = Path(sys.argv[1])
if not header_file.is_file():
    raise SystemExit(f'Missing header file: {header_file}')

content = header_file.read_text(encoding='utf-8', errors='replace')

required = [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'X-Frame-Options: DENY',
    'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), local-network-access=()',
    'Strict-Transport-Security: max-age=31536000; includeSubDomains',
    "Content-Security-Policy-Report-Only: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://api.lythaus.co; upgrade-insecure-requests",
]

missing = [line for line in required if line not in content]
if missing:
    print(f'Header policy check failed for {header_file}', file=sys.stderr)
    for line in missing:
        print(f'- missing: {line}', file=sys.stderr)
    raise SystemExit(1)

if 'Content-Security-Policy:' in content.replace('Content-Security-Policy-Report-Only:', ''):
    raise SystemExit(
        f'{header_file} still includes an enforced Content-Security-Policy header; '
        'keep the rollout report-only until the browser asset set is confirmed.',
    )
PY

echo "==> Web security headers manifest is complete"
