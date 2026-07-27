# Password hashing ADR

Status: implementation-ready; production benchmark evidence required before
any fallback is enabled.

The native API uses Argon2id with `m=19456 KiB`, `t=2`, `p=1`, a unique
16-byte salt, and a versioned Worker Secret pepper. The implementation uses
`@noble/hashes` and stores the algorithm and profile version with each hash.

Scrypt (`N=2^14`, `r=8`, `p=5`) is an explicit compatibility fallback only. It
is enabled when `PASSWORD_HASH_ALLOW_SCRYPT_FALLBACK=true`; production defaults
to `false`. A production change to `true` requires benchmark evidence showing
that the Argon2id profile cannot meet Worker CPU/memory limits, an approved
parameter decision, and a rehash-on-login plan.

This setting is deliberately fail-closed: an Argon2id failure in production
must surface as an authentication configuration error instead of silently
downgrading password storage.
