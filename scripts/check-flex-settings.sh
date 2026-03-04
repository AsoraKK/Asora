#!/usr/bin/env bash
set -Eeuo pipefail

# Fail if workflows or scripts attempt to set Flex-incompatible app settings.
if grep -R --line-number -E "FUNCTIONS_(WORKER_RUNTIME|EXTENSION_VERSION)|WEBSITE_NODE_DEFAULT_VERSION" \
     .github workflows scripts -n --include \*.sh --include \*.yml --include \*.yaml 2>/dev/null; then
  echo "Error: Flex-incompatible app setting detected in repository scripts/workflows." >&2
  exit 1
fi
