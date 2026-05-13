#!/usr/bin/env bash
# extract-spki-pins.sh
# ─────────────────────────────────────────────────────────────────────────────
# Extracts the SPKI SHA-256 fingerprint from a live TLS certificate chain and
# prints it as a base64-encoded string ready to paste into
# lib/core/config/environment_config.dart → spkiPinsBase64.
#
# Usage:
#   ./scripts/extract-spki-pins.sh <hostname> [port]
#
# Examples:
#   ./scripts/extract-spki-pins.sh asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net
#   ./scripts/extract-spki-pins.sh api.lythaus.com 443
#
# The script pins the LEAF certificate by default.  To pin an intermediate CA,
# pass CERT_INDEX=1 (or CERT_INDEX=2 for the root) before the hostname:
#   CERT_INDEX=1 ./scripts/extract-spki-pins.sh api.lythaus.com
#
# Requirements: openssl
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${1:?Usage: $0 <hostname> [port]}"
PORT="${2:-443}"
CERT_INDEX="${CERT_INDEX:-0}"

echo "Fetching certificate chain from ${HOST}:${PORT} ..."

# Retrieve the full PEM chain from the server
CHAIN=$(echo | openssl s_client \
  -connect "${HOST}:${PORT}" \
  -servername "${HOST}" \
  -showcerts 2>/dev/null)

# Extract the (CERT_INDEX)th certificate from the chain (0 = leaf)
PEM=$(echo "$CHAIN" \
  | awk "
    /-----BEGIN CERTIFICATE-----/{n++; buf=\"\"}
    n==$((CERT_INDEX + 1)){buf=buf\$0\"\n\"}
    /-----END CERTIFICATE-----/ && n==$((CERT_INDEX + 1)){print buf; exit}
  ")

if [ -z "$PEM" ]; then
  echo "ERROR: Could not extract certificate at index ${CERT_INDEX} from ${HOST}:${PORT}" >&2
  echo "       The server may not be reachable or the index is out of range." >&2
  exit 1
fi

# Compute the SPKI SHA-256 fingerprint and base64-encode it
SPKI_B64=$(echo "$PEM" \
  | openssl x509 -noout -pubkey \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl base64 -A)

echo ""
echo "SPKI SHA-256 (base64) for cert index ${CERT_INDEX} of ${HOST}:"
echo ""
echo "  ${SPKI_B64}"
echo ""
echo "Paste this value into lib/core/config/environment_config.dart:"
echo "  spkiPinsBase64: ['${SPKI_B64}'],"
echo ""
echo "For iOS native pinning, also add an NSPinnedDomains entry in ios/Runner/Info.plist:"
echo "  <key>${HOST}</key>"
echo "  <dict>"
echo "    <key>NSIncludesSubdomains</key><false/>"
echo "    <key>NSPinnedLeafIdentities</key>"
echo "    <array>"
echo "      <dict>"
echo "        <key>SPKI-SHA256-BASE64</key>"
echo "        <string>${SPKI_B64}</string>"
echo "      </dict>"
echo "    </array>"
echo "  </dict>"
