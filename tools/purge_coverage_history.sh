#!/usr/bin/env bash
set -euo pipefail

TARGET_ARGS=(
  --path 'coverage/'
  --path 'coverage-artifacts/'
  --path-glob 'coverage-*.xml'
  --path-glob '*.lcov'
  --path 'code-coverage-results.md'
)

cat <<'INSTRUCTIONS'
This helper surfaces the git-filter-repo command required to purge coverage
artifacts from repository history. History rewrites require coordination and a
force push—do not run on shared branches without agreement.

Usage:
  tools/purge_coverage_history.sh            # Print the recommended command
  tools/purge_coverage_history.sh --execute  # Execute git-filter-repo locally

Safety checklist before execution:
  1. Ensure `git status` is clean.
  2. Create a fresh clone or backup tag in case rollback is required.
  3. Coordinate the upcoming force-push with the whole team.
INSTRUCTIONS

COMMAND=(git filter-repo "${TARGET_ARGS[@]}" --invert-paths)

if [[ "${1:-}" != "--execute" ]]; then
  printf '\nCommand to run:\n  %s\n' "${COMMAND[*]}"
  exit 0
fi

if ! command -v git-filter-repo >/dev/null 2>&1 && ! command -v git-filter-repo.py >/dev/null 2>&1; then
  cat <<'ERR' >&2
error: git-filter-repo not found. Install with:
  pip install git-filter-repo
or follow https://github.com/newren/git-filter-repo#installation.
ERR
  exit 2
fi

printf 'Executing: %s\n' "${COMMAND[*]}"
"${COMMAND[@]}"

echo "Coverage artifacts purged from history. Force-push to update remote branches."