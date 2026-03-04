#!/usr/bin/env bash
set -euo pipefail

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

require_env() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "Missing required secret: $key" >&2
    exit 1
  fi
}

validate_android() {
  require_env "ANDROID_KEYSTORE_BASE64"
  require_env "ANDROID_KEY_ALIAS"
  require_env "ANDROID_KEYSTORE_PASSWORD"

  local keystore_path="$tmp_dir/upload-keystore.jks"
  echo "${ANDROID_KEYSTORE_BASE64}" | base64 --decode > "$keystore_path"
  test -s "$keystore_path" || { echo "Decoded Android keystore is empty" >&2; exit 1; }

  keytool -list \
    -keystore "$keystore_path" \
    -storepass "$ANDROID_KEYSTORE_PASSWORD" \
    -alias "$ANDROID_KEY_ALIAS" >/dev/null
}

validate_ios() {
  require_env "IOS_CERTIFICATE_P12_BASE64"
  require_env "IOS_CERTIFICATE_PASSWORD"
  require_env "IOS_PROVISIONING_PROFILE_BASE64"

  local cert_path="$tmp_dir/signing.p12"
  local profile_path="$tmp_dir/profile.mobileprovision"

  echo "${IOS_CERTIFICATE_P12_BASE64}" | base64 --decode > "$cert_path"
  echo "${IOS_PROVISIONING_PROFILE_BASE64}" | base64 --decode > "$profile_path"

  test -s "$cert_path" || { echo "Decoded iOS certificate is empty" >&2; exit 1; }
  test -s "$profile_path" || { echo "Decoded iOS provisioning profile is empty" >&2; exit 1; }

  openssl pkcs12 -in "$cert_path" -nokeys -passin "pass:${IOS_CERTIFICATE_PASSWORD}" >/dev/null 2>&1
}

validate_android
validate_ios

echo "Signing material validation passed for Android and iOS."
