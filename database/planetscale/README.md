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

The production branch is created only after the region, PostgreSQL 18 patch,
HA tier and dedicated Cloudflare account have passed the relevant gates.
