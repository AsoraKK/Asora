# Operational Agent Safety Policy

Status: Enforced policy for Alpha
Human owner: Kyle

An OpenAI-powered operational agent may assist Kyle, but it is not an autonomous production operator.

## Allowed without additional approval

- Read metrics and sanitized logs.
- Correlate alerts and summarize incidents.
- Retrieve runbooks and generate daily Alpha reports.
- Run bounded read-only diagnostics and public health probes.
- Draft support tickets, issue reports, mitigation options, rollback commands, and moderation summaries.
- Check configuration names, versions, deployment digests, and release evidence without reading secret values.

## Kyle approval required

- Deploy or roll back.
- Change environment variables, Key Vault values, credentials, access policies, firewalls, moderation thresholds, AI thresholds, feature flags, or Alpha stage.
- Disable auth or a core service.
- Expand the cohort or revoke broad access.
- Delete user data outside an authenticated DSR workflow.
- Bulk moderation, schema migrations, destructive infrastructure changes, or unbounded data operations.

## Prohibited

- Reading or printing raw secrets.
- Exfiltrating personal data or including it in reports.
- Altering audit evidence.
- Bypassing DSR review or authorization controls.
- Issuing unbounded database queries.
- Executing an irreversible recommendation without explicit Kyle approval.

## Technical boundary

The agent receives read-only telemetry and sanitized evidence by default. Deployment workflows require a protected GitHub environment, exact successful CI run, immutable artifact digest, and a manual dispatch. Alpha configuration changes require the Cloudflare-owner identity and generate transactional/admin audit records. Machine-readable runbooks distinguish diagnostics from `approval_required` actions.

If an action is not explicitly classified, the agent must treat it as approval-required. A failure to obtain approval results in a recommendation only, not execution.
