#!/usr/bin/env bash
# Toggle POSTGRES_ENABLED in a .env.staging file (or specified file)
# Usage: ./tools/toggle_postgres_flag.sh on|off [path-to-env-file]

set -euo pipefail
MODE=${1:-}
ENVFILE=${2:-.env.staging}
if [ -z "$MODE" ]; then
  echo "Usage: $0 on|off [env-file]"; exit 2
fi

if [ ! -f "$ENVFILE" ]; then
  echo "Creating $ENVFILE";
  touch "$ENVFILE"
fi

if grep -q '^POSTGRES_ENABLED=' "$ENVFILE"; then
  sed -i "s/^POSTGRES_ENABLED=.*/POSTGRES_ENABLED=$( [ "$MODE" = "on" ] && echo true || echo false )/" "$ENVFILE"
else
  echo "POSTGRES_ENABLED=$( [ "$MODE" = "on" ] && echo true || echo false )" >> "$ENVFILE"
fi

echo "Set POSTGRES_ENABLED=${MODE} in $ENVFILE"
