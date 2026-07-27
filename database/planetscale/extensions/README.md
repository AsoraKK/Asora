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

The development branch was checked on 2026-07-28. PlanetScale's current
extension catalog did not expose any of these names, and PostGIS was reported
temporarily disabled. This is a provider capability blocker, not permission to
remove the migrations or silently downgrade geography/search features.

To verify a sanitized live catalog without exposing credentials:

```powershell
node scripts/validate-planetscale-extensions.mjs --catalog .\artifacts\planetscale-extensions.json
```

The catalog file must contain either an array of extension names or an object
with an `extensions` array. Use `--require-catalog` in production validation;
missing catalog evidence is a failure.
