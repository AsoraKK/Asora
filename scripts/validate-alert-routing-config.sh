#!/usr/bin/env bash
set -euo pipefail

check_tfvars() {
  local env_name="$1"
  local tfvars_file="infra/terraform/envs/${env_name}/${env_name}.tfvars"

  if [[ ! -f "$tfvars_file" ]]; then
    echo "Missing tfvars file: $tfvars_file" >&2
    return 1
  fi

  local enabled
  enabled="$(awk -F= '/^observability_enabled/ {gsub(/[[:space:]]/, "", $2); print $2}' "$tfvars_file" | tail -n1)"
  if [[ "$enabled" != "true" ]]; then
    echo "observability_enabled must be true in $tfvars_file" >&2
    return 1
  fi

  local inside=0
  local recipients=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^observability_alert_email_addresses[[:space:]]*= ]]; then
      inside=1
      continue
    fi
    if [[ $inside -eq 1 ]]; then
      if [[ "$line" =~ \] ]]; then
        break
      fi
      if [[ "$line" =~ \"[^\"]+\" ]]; then
        recipients=$((recipients + 1))
      fi
    fi
  done < "$tfvars_file"

  if [[ $recipients -lt 1 ]]; then
    echo "No alert recipients configured in $tfvars_file" >&2
    return 1
  fi
}

check_tfvars "staging"
check_tfvars "prod"

echo "Alert routing tfvars validation passed for staging/prod."
