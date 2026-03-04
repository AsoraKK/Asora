#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_file() {
  local file="$1"
  local expected_header="$2"

  if [[ ! -f "$ROOT_DIR/$file" ]]; then
    echo "Missing legal register: $file"
    exit 1
  fi

  local header
  header="$(head -n 1 "$ROOT_DIR/$file" | tr -d '\r')"
  if [[ "$header" != "$expected_header" ]]; then
    echo "Invalid header in $file"
    echo "Expected: $expected_header"
    echo "Actual:   $header"
    exit 1
  fi
}

check_file \
  "docs/legal/registers/vendors.csv" \
  "vendor,service,purpose,data_categories,transfer_mechanism,dpa_status,scc_or_idta_status,operator_agreement_status,last_reviewed_utc,owner,status,notes"

check_file \
  "docs/legal/registers/processing_activities.csv" \
  "activity_id,activity_name,purpose,lawful_basis,data_subjects,data_categories,storage_location,retention_rule,dsr_path,last_reviewed_utc,owner,status,notes"

check_file \
  "docs/legal/registers/incident_assessments.csv" \
  "incident_id,detected_utc,summary,severity,contains_personal_data,assessment_due_utc,assessment_completed_utc,notifiable,owner,status,notes"

echo "Legal register validation passed."
