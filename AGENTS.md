# Codex Agent Guide (AGENTS.md)

Authoritative, concise instructions for agents working in this repository via Codex CLI.

## Quick Start

1. Read the repo structure with `rg --files` and open relevant files in small chunks (≤250 lines each).
2. If the task is multi‑step, create a lightweight plan with the `update_plan` tool. Keep exactly one step `in_progress`.
3. Before any non‑trivial tool call, post a brief preamble (1–2 sentences) describing what you’ll do next.
4. Edit files using `apply_patch` only. Keep changes minimal, targeted, and stylistically consistent with the codebase.
5. Prefer `rg` for search. Avoid large outputs; read files in chunks.
6. Respect sandboxing and approvals; request escalation when required and include a one‑sentence justification.
7. Validate your work (tests/build) according to the approval mode and repository capabilities.
8. Deliver a concise, structured final message per the style guide below.

---

## Tools Reference

### Shell (`functions.shell`)

- Use for reading files, running linters/tests/builds, or small utilities.
- Prefer `rg` for search (`rg` or `rg --files`). If missing, fall back to `grep`/`fd`/`find`.
- Read files in ≤250‑line chunks to avoid truncation.
- Request escalation with `with_escalated_permissions: true` only when needed (e.g., network, writing outside workspace, privileged ops). Always provide `justification` (one sentence).
- Keep commands minimal, deterministic, and scoped to the task.

### Patch Editing (`apply_patch`)

- Only use `apply_patch` to create/update/delete files.
- Patch envelope format:
  
  ```
  *** Begin Patch
  *** Add File: path/to/file.ext
  +<contents>
  *** Update File: path/to/file.ext
  @@ <optional header>
  -old
  +new
  *** Delete File: path/to/file.ext
  *** End Patch
  ```
- Use relative paths only. Do not re‑read immediately after a successful patch (the tool guarantees write success or failure).
- Do not add license headers unless requested.
- Avoid unrelated changes. Fix root causes; keep diffs focused.

### Plans (`functions.update_plan`)

- Use for non‑trivial, multi‑phase tasks.
- Keep steps short (≤7 words), outcome‑focused, and verifiable.
- Maintain exactly one `in_progress` step until done; mark prior steps `completed` as you go.
- Update the plan if the approach changes; include a short explanation of why.
- Do not restate the plan verbatim in messages; the UI renders it.

### Images (`functions.view_image`)

- Attach local images for inspection when needed (e.g., screenshots). Give concise context in your message.

---

## Preambles Before Tool Calls

Post a short note (8–12 words) explaining immediate next actions. Group related commands under a single preamble.

Examples:

- “I’ve reviewed the repo; now searching for API routes.”
- “Next, I’ll patch the config and update tests.”
- “Scaffolding the CLI command and helper functions.”

Avoid preambles for trivial reads (e.g., a single `cat`) unless part of a grouped action.

---

## Planning Guidance

Use a plan when the task:

- Has multiple phases or dependencies.
- Needs checkpoints for feedback.
- Is ambiguous and benefits from outlining goals first.

High‑quality plan example:

1. Add CLI entry with file args
2. Parse Markdown via CommonMark
3. Apply semantic HTML template
4. Handle code blocks and images
5. Add invalid input handling

Low‑quality plans are vague or restate the prompt without actionable steps.

---

## Execution Principles

- Finish the task end‑to‑end before yielding whenever feasible.
- Don’t guess. If information is missing, ask a concise question or make a clearly stated assumption.
- Keep changes minimal and aligned with existing patterns.
- Update or add local docs when behavior changes.
- Do not fix unrelated bugs; you may mention them succinctly in your final message.

---

## Validation & Testing

- If tests/build exist, use them to validate changes.
- Start with the narrowest relevant tests, then broaden.
- In non‑interactive modes (e.g., approvals `never` or `on-failure`), proactively run tests/lint to ensure completeness.
- In interactive modes (e.g., approvals `untrusted` or `on-request`), suggest running heavy commands and await confirmation unless the task is test‑centric.
- Don’t add a new formatter or test framework unless explicitly requested. Follow repo conventions.

---

## Sandbox, Approvals, and Safety

- Filesystem sandbox: typically `workspace-write`. Escalation is required for writing outside the workspace.
- Network is often restricted. Request escalation if a command needs network access (e.g., package installs).
- When escalating, set `with_escalated_permissions: true` and provide a one‑sentence `justification`.
- Avoid destructive actions (`rm -rf`, `git reset --hard`) unless explicitly requested and justified.
- Never embed secrets. Do not add licenses unless asked.

---

## Final Message Style (Very Important)

Keep it concise and scannable. Use headers only if they add clarity.

- Section headers: short (1–3 words), bolded with `**` (e.g., `**Summary**`).
- Bullets: `- ` prefix. Bold the keyword, then colon + description.
- Monospace for commands/paths/code identifiers using backticks.
- Structure from general → specific → supporting info.
- Tone: collaborative, factual, present tense, no filler.
- Don’ts: no nested bullets, no ANSI codes, no inline citations, no mixing bold + code on the same token.

Example structure for substantial changes:

- Summary of outcome
- What changed (files touched, key logic)
- How to validate (tests/commands)
- Next steps (optional)

Keep most handoffs under ~10 lines unless the task demands detail.

---

## Common Pitfalls to Avoid

- Reading large files/outputs; always chunk reads (≤250 lines).
- Using `grep`/`find` instead of `rg` when available.
- Skipping the preamble before grouped commands.
- Multiple plan steps marked `in_progress` at once.
- Editing with anything other than `apply_patch`.
- Unnecessary refactors, renames, or style changes.
- Adding inline code comments unless asked.
- Absolute paths in patches.

---

## Example Flow

1. Post preamble: “Scanning repo and locating failing tests.”
2. `shell`: run `rg --files`, open targeted files in small chunks.
3. `update_plan`: add 3–5 precise steps; mark the first `in_progress`.
4. `apply_patch`: implement minimal fix and related tests/docs.
5. `shell`: run relevant tests/lint/build per approval policy.
6. `update_plan`: mark steps completed; keep exactly one active until done.
7. Final message: concise summary, what changed, how to validate, optional next steps.

---

## Repository Conventions

- Follow existing code style and structure.
- Keep changes focused on the requested task.
- Update docs when behavior changes or new commands are added.
- If you spot unrelated issues, mention them briefly without changing code.

---

## Contact & Next Steps

If anything in these guidelines conflicts with explicit user instructions, the user’s instructions take precedence. When in doubt, ask a brief clarifying question and propose a default path forward.

