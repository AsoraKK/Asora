# World ID Staging Validation

Date: 2026-03-05  
Environment: staging

## Config Checks

- [ ] Redirect URI configured and matches app callback
- [ ] Provider metadata endpoint returns expected values
- [ ] Key Vault secret references configured (no plaintext secrets)

## Positive Path

- [ ] Start World ID auth
- [ ] Complete provider flow
- [ ] Session established in app
- [ ] Refresh succeeds
- [ ] Revoke/logout succeeds

## Negative Paths

- [ ] User cancels auth flow -> clean recovery
- [ ] Invalid token exchange -> actionable error
- [ ] Network failure during callback -> retry path shown

## Security/Logging Checks

- [ ] No access token in logs
- [ ] No refresh token in logs
- [ ] Error logs are redacted/safe

## Artifacts

- Positive flow screenshots:
- Negative flow screenshots:
- Sanitized log excerpts:

## Result

- Overall pass/fail:
- Blockers:

