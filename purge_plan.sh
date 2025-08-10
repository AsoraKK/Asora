#!/usr/bin/env bash
# Purpose: Template to purge accidentally committed secrets from git history safely.
# NOTE: Read carefully and replace placeholders before running. Test on a disposable clone first.

set -euo pipefail

# 0) Preconditions
# - Ensure you have backups and that force-pushing rewritten history is acceptable for all collaborators.
# - All PRs/branches should be rebased after the purge.
# - Rotate any exposed secrets before or immediately after history rewrite.

# 1) Identify offending commits (fill in if any are found)
# git log --oneline -- <path>
# Example:
# BAD_FILE_PATHS=(
#   "local.settings.json" \
#   "Infra/terraform.tfvars" \
#   "Infra/terraform.tfstate.backup" \
# )

# 2) Use git filter-repo (preferred) OR BFG Repo-Cleaner
# Install git-filter-repo: https://github.com/newren/git-filter-repo
# python -m pip install git-filter-repo  # or brew install git-filter-repo

# Example using git filter-repo to remove files from entire history:
# git filter-repo --invert-paths --path local.settings.json --path Infra/terraform.tfvars --path Infra/terraform.tfstate.backup

# If specific strings (keys, passwords) must be purged from blobs, create a replacements file:
# cat > replacements.txt << 'EOF'
# regex:<SECRET_REGEX>=<REDACTED>
# EOF
# git filter-repo --replace-text replacements.txt

# 3) Force-push rewritten history (DANGEROUS, coordinate with team)
# git push --force --tags origin main
# for br in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v main); do
#   git push --force origin "$br"
# done

# 4) Invalidate caches and rotate credentials
# - Rotate Cosmos DB keys
# - Rotate Postgres user password
# - Rotate JWT secret
# - Invalidate any CI caches referencing old commit SHAs

# 5) Ask all collaborators to reclone
# - After force-push, everyone must reclone or run the appropriate filter-repo/BFG cleanup locally.

# End of template
