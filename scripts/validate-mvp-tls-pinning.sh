#!/usr/bin/env bash
set -euo pipefail

config_file="lib/core/config/environment_config.dart"
pins_file="lib/core/security/cert_pinning_common.dart"
expected_file="mobile-expected-pins.json"
report_file="mobile-pin-report.json"

for required_file in "$config_file" "$pins_file" "$expected_file"; do
  [[ -f "$required_file" ]] || { echo "Missing $required_file" >&2; exit 1; }
done

if grep -Eq 'const Map<String, List<String>> kPinnedDomains = \{\};' "$pins_file"; then
  if grep -Eq 'defaultValue:[[:space:]]*true' "$pins_file"; then
    echo "Strict pinning cannot default to true while no validated pins are shipped." >&2
    exit 1
  fi
fi

for block in _previewMobileSecurity _prodMobileSecurity; do
  section="$(awk "/^const ${block}/,/^const _[a-zA-Z]*Config/" "$config_file")"
  if [[ "$section" == *"enabled: true"* && "$section" == *"strictMode: true"* ]]; then
    pin_count="$(printf '%s\n' "$section" | grep -Ec "'[^']{43,44}'" || true)"
    if (( pin_count < 2 )); then
      echo "${block} enables strict pinning without current and backup pins." >&2
      exit 1
    fi
  fi
done

if grep -Eq 'lifecycleState: PinLifecycleState\.disabled' "$config_file"; then
  grep -Eq '"api\.lythaus\.co"[[:space:]]*:[[:space:]]*"disabled"' "$expected_file" || {
    echo "Disabled MVP pinning must be recorded in $expected_file." >&2
    exit 1
  }
fi

state_for() {
  local block="$1"
  awk "/^const ${block}/,/^const _[a-zA-Z]*Config/" "$config_file" \
    | sed -n 's/.*lifecycleState: PinLifecycleState\.\([a-z]*\).*/\1/p' \
    | head -n 1
}

pin_count_for() {
  local block="$1"
  awk "/^const ${block}/,/^const _[a-zA-Z]*Config/" "$config_file" \
    | grep -Ec "'[^']{43,44}'" || true
}

preview_state="$(state_for _previewMobileSecurity)"
prod_state="$(state_for _prodMobileSecurity)"
preview_pin_count="$(pin_count_for _previewMobileSecurity)"
prod_pin_count="$(pin_count_for _prodMobileSecurity)"

case "$preview_state:$prod_state" in
  *[!a-z:]*|:*)
    echo "Unable to produce a pinning report from $config_file." >&2
    exit 1
    ;;
esac

cat > "$report_file" <<EOF
{
  "policy": "mvp-tls-pinning",
  "preview": {"lifecycleState": "$preview_state", "pinCount": $preview_pin_count},
  "production": {"lifecycleState": "$prod_state", "pinCount": $prod_pin_count}
}
EOF

echo "MVP TLS pinning configuration is internally consistent."
