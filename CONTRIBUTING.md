# Contributing Guide

Thanks for helping improve this project! Please keep contributions focused, minimal, and aligned with existing patterns.

## For Codex Agents

- Read and follow `AGENTS.md` for day‑to‑day instructions, tool usage, preambles, planning, and final message style.
- Use `apply_patch` for all file edits. Prefer `rg` for search. Chunk reads to ≤250 lines.

## Workflow

1. Discuss or file an issue if scope is unclear.
2. Keep PRs small and single‑purpose; include rationale in the description.
3. Update documentation when behavior or commands change (link to files/paths touched).
4. Avoid unrelated refactors and style churn.

## Code Style

- Match existing patterns and naming; do not add license headers.
- Avoid inline comments unless requested; keep diffs focused on the task.
- Prefer straightforward, readable solutions over clever abstractions.

## Commit Messages

- Use the imperative mood: “Fix crash on empty input”.
- Include scope when useful: “ui: align button text”.
- Reference issues when applicable.

## PR Checklist

- Tests/build pass locally (as applicable).
- Docs updated (e.g., `README.md`, `AGENTS.md`, or feature notes).
- Changes are minimal and targeted; no unrelated files modified.
- Follows `AGENTS.md` execution and messaging guidelines.

## Safety & Approvals

- Respect sandboxing and approval mode. Request escalation only when required and include a one‑sentence justification.
- Avoid destructive actions unless explicitly requested.

---

Questions or clarifications? Open an issue with a concise proposal and assumptions.

