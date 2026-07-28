# PlanetScale extension contract

The required extension set is recorded in
[`required-extensions.json`](./required-extensions.json). It is part of the
database acceptance contract and must be verified against the live PlanetScale
branch before Gate 3 can pass.

Required extensions:

- `pgcrypto`
- `pg_trgm`
- `unaccent`
- `postgis`

The development branch was checked on 2026-07-28. `pgcrypto`, `pg_trgm`, and
`unaccent` are installed; PostGIS is present in the server catalog but is
temporarily disabled by PlanetScale and excluded from the branch's immutable
extension allowlist. This is a provider capability blocker, not permission to
remove the migrations or silently downgrade geography/search features. The
official extension documentation currently carries the same temporary-disable
notice: https://planetscale.com/docs/postgres/extensions.

To verify a sanitized live catalog without exposing credentials:

```powershell
node scripts/validate-planetscale-extensions.mjs --catalog .\artifacts\planetscale-extensions.json
```

The catalog file must contain either an array of extension names or an object
with an `extensions` array. Use `--require-catalog` in production validation;
missing catalog evidence is a failure.
