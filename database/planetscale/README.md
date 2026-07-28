# Lythaus PlanetScale baseline

This directory is the authoritative migration source for the Cloudflare-native
Lythaus runtime. The legacy Azure SQL files are reference material only.

Execution rules:

- Apply migrations through the direct PlanetScale administrative connection.
- Never run migrations through Hyperdrive.
- Use `development` or an ephemeral `ci-*` branch for validation.
- Do not execute writes or DDL against `main` without explicit human approval.
- Reinstall extensions after every backup restore because restored branches do
  not automatically restore extensions.

PlanetScale's managed role API returns generated SQL identifiers such as
`pscale_api_<role-id>.<branch-id>`. The display labels (`lythaus_runtime`,
`lythaus_admin`, `lythaus_jobs`, `lythaus_privacy`, and `lythaus_migrations`)
are repository-level policy names, not SQL role names in the web-console
session. CI and direct migration runners must resolve and validate the
generated `pscale_api_*` prefix before substituting it into `grants/roles.sql`.
Never paste credentials or role reset output into source control or evidence.

The production branch is created only after the region, PostgreSQL 18 patch,
HA tier and dedicated Cloudflare account have passed the relevant gates.
