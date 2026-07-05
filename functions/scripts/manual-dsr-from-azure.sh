#!/usr/bin/env bash
set -euo pipefail

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"
REQUEST_ID=""
PASSTHROUGH_ARGS=()

usage() {
  cat <<'EOF'
Usage: bash functions/scripts/manual-dsr-from-azure.sh --request-id <dsr-request-id> [--dry-run] [--force] [--app <name>] [--resource-group <rg>]

Resolves the required DSR manual-processor environment values from the Azure
Function App and Key Vault references, then runs:

  npm run dsr:manual -- --request-id <id> ...

No secrets are written to disk.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --request-id|-r)
      REQUEST_ID="${2:-}"
      shift 2
      ;;
    --app)
      APP_NAME="${2:-}"
      shift 2
      ;;
    --resource-group|-g)
      RESOURCE_GROUP="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      PASSTHROUGH_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$REQUEST_ID" ]]; then
  echo "manual-dsr-from-azure: --request-id is required" >&2
  exit 1
fi

APP_SETTINGS_JSON="$(az functionapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" -o json)"

get_setting() {
  local name="$1"
  APP_SETTINGS_NAME="$name" APP_SETTINGS_JSON="$APP_SETTINGS_JSON" node <<'NODE'
const settings = JSON.parse(process.env.APP_SETTINGS_JSON);
const match = settings.find(item => item.name === process.env.APP_SETTINGS_NAME);
process.stdout.write(match?.value ?? '');
NODE
}

resolve_value() {
  local raw="$1"
  if [[ "$raw" == @Microsoft.KeyVault\(SecretUri=* ]]; then
    local uri="${raw#@Microsoft.KeyVault(SecretUri=}"
    uri="${uri%)}"
    az keyvault secret show --id "$uri" --query value -o tsv
  else
    printf '%s' "$raw"
  fi
}

COSMOS_CONNECTION_STRING="$(resolve_value "$(get_setting COSMOS_CONNECTION_STRING)")"
POSTGRES_CONNECTION_STRING="$(resolve_value "$(get_setting POSTGRES_CONNECTION_STRING)")"
COSMOS_DATABASE_NAME="$(get_setting COSMOS_DATABASE_NAME)"
DSR_EXPORT_STORAGE_ACCOUNT="$(get_setting DSR_EXPORT_STORAGE_ACCOUNT)"
DSR_EXPORT_CONTAINER="$(get_setting DSR_EXPORT_CONTAINER)"
DSR_EXPORT_SIGNED_URL_TTL_HOURS="$(get_setting DSR_EXPORT_SIGNED_URL_TTL_HOURS)"
DSR_BLOB_UPLOAD_BUFFER_SIZE="$(get_setting DSR_BLOB_UPLOAD_BUFFER_SIZE)"
DSR_BLOB_UPLOAD_CONCURRENCY="$(get_setting DSR_BLOB_UPLOAD_CONCURRENCY)"
DSR_QUEUE_NAME="$(get_setting DSR_QUEUE_NAME)"
DSR_EXPORT_STORAGE_CONNECTION_STRING="$(
  az storage account show-connection-string \
    -g "$RESOURCE_GROUP" \
    -n "$DSR_EXPORT_STORAGE_ACCOUNT" \
    --query connectionString -o tsv
)"

export COSMOS_CONNECTION_STRING
export POSTGRES_CONNECTION_STRING
export DSR_EXPORT_STORAGE_CONNECTION_STRING
export DSR_EXPORT_STORAGE_ACCOUNT
export DSR_EXPORT_CONTAINER
export DSR_QUEUE_NAME

if [[ -n "$COSMOS_DATABASE_NAME" ]]; then
  export COSMOS_DATABASE_NAME
fi

if [[ -n "$DSR_EXPORT_SIGNED_URL_TTL_HOURS" ]]; then
  export DSR_EXPORT_SIGNED_URL_TTL_HOURS
fi

if [[ -n "$DSR_BLOB_UPLOAD_BUFFER_SIZE" ]]; then
  export DSR_BLOB_UPLOAD_BUFFER_SIZE
fi

if [[ -n "$DSR_BLOB_UPLOAD_CONCURRENCY" ]]; then
  export DSR_BLOB_UPLOAD_CONCURRENCY
fi

cd /home/kylee/asora/functions
npm run dsr:manual -- --request-id "$REQUEST_ID" "${PASSTHROUGH_ARGS[@]}"
