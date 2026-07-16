#!/usr/bin/env bash
set -euo pipefail

config_file="lib/core/config/environment_config.dart"
pins_file="lib/core/security/cert_pinning_common.dart"
expected_file="mobile-expected-pins.json"

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

echo "MVP TLS pinning configuration is internally consistent."
