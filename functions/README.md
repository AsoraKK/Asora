# Asora Backend Functions

TypeScript Azure Functions that power Asora's feed, moderation, privacy, and authentication workflows. The runtime now follows a module-first layout with explicit middleware, making it easy to share logic between HTTP routes, timers, and future background jobs.

## Project Layout

```
functions/
├── src/
│   ├── auth/
│   │   ├── routes/         # HTTP triggers (token, authorize, userinfo)
│   │   └── service/        # OAuth2 + session logic
│   ├── feed/
│   │   ├── routes/         # GET /feed, POST /post
│   │   └── service/        # Redis cache + rate limiting
│   ├── moderation/
│   │   ├── routes/         # Flag content, submit appeals, vote on appeals
│   │   └── service/        # Cosmos + Hive orchestration
│   ├── privacy/
│   │   ├── routes/         # GDPR export/deletion workflows
│   │   └── service/        # Multi-container data scrubbing
│   └── shared/
│       ├── middleware/     # JWT verification helpers + requireAuth guard
│       ├── utils/          # HTTP helpers, validation, error types
│       └── clients/        # Cosmos, Redis, Hive, Postgres connectors
└── tests/                  # Module-aligned Jest suites
```

All application code lives under `src/`. Path aliases (`@shared/*`, `@feed/*`, `@moderation/*`, …) are configured in `tsconfig.json`, Jest, and ESLint for clean imports.

## Quick Start

> Install Azure Functions Core Tools v4 globally if you plan to run the local runtime: `npm i -g azure-functions-core-tools@4 --unsafe-perm`.

```bash
cd functions
npm install

# Type-check + emit to dist/
npm run build

# Run Jest tests (serialised for Cosmos/Redis mocks)
npm test

# Launch local Functions host at http://localhost:7071/api
npm start

# Lint TypeScript sources
npm run lint
```

Create `local.settings.json` with at least `JWT_SECRET`, `COSMOS_CONNECTION_STRING`, and any Hive/Redis keys you depend on. Everything in `src/shared/clients` reads from `process.env`.

## Middleware & Responses

- `parseAuth(req)` asynchronously inspects the `Authorization` header and returns a `Principal` when the bearer token is valid. Missing or invalid headers yield `null` so public endpoints can stay cache friendly.
- `requireAuth(handler)` wraps Azure Functions HTTP handlers. It verifies the B2C access token, attaches `principal` to `context.bindingData` and the request object, and returns a 401 with a `WWW-Authenticate` header when validation fails.
- `authRequired(principal)` remains available for legacy code paths that already pulled a principal via `parseAuth`.
- `@shared/utils/http` exposes typed helpers (`ok`, `created`, `badRequest`, `serverError`, …) so routes always return a serialised JSON body with consistent headers.

## Token Lifecycle & Refresh Rotation

The auth module issues two types of tokens:

| Token Type     | Lifetime | Storage                     | Notes                                       |
| -------------- | -------- | --------------------------- | ------------------------------------------- |
| Access token   | 15 min   | Client only                 | Short-lived, stateless JWT                  |
| Refresh token  | 7 days   | Postgres `refresh_tokens`   | Long-lived, tracked by `jti` for rotation   |

**Refresh Token Rotation** (implemented in `src/auth/service/tokenService.ts`):

1. **Initial Issue**: When a user completes OAuth2 authorization code exchange, both tokens are issued. The refresh token's `jti` is stored in Postgres.

2. **On Refresh**: When the client exchanges a refresh token for a new access token:
   - The `jti` is validated against the Postgres store
   - The old refresh token is revoked (deleted from store)
   - A new refresh token with a new `jti` is issued and stored
   - Both new access and refresh tokens are returned

3. **Reuse Detection**: If a client attempts to reuse an already-rotated refresh token:
   - The `jti` won't exist in the store (already deleted)
   - The request fails with a 500 error
   - This indicates potential token theft—consider revoking all user tokens

**Related Services**:
- `src/auth/service/refreshTokenStore.ts` - Postgres-backed `jti` tracking
- `revokeAllUserTokens(userId)` - Logout-all functionality
- `cleanupExpiredTokens()` - Periodic cleanup (call from timer trigger)

## HTTP Surface

| Route                               | Method | Module       | Notes                                  |
| ----------------------------------- | ------ | ------------ | --------------------------------------- |
| `/auth/token`                       | POST   | auth         | OAuth2 token exchange with PKCE         |
| `/auth/authorize`                   | GET    | auth         | Authorization code issuance             |
| `/auth/userinfo`                    | GET    | auth         | OIDC-compliant profile payload          |
| `/auth/redeem-invite`               | POST   | auth         | Redeem invite code to activate account  |
| `/admin/invites`                    | POST   | auth/admin   | Create invite code (admin only)         |
| `/admin/invites`                    | GET    | auth/admin   | List invite codes (admin only)          |
| `/admin/invites/{code}`             | GET    | auth/admin   | Get single invite (admin only)          |
| `/admin/invites/{code}`             | DELETE | auth/admin   | Delete invite code (admin only)         |
| `/feed`                             | GET    | feed         | Guest-friendly feed with Redis support  |
| `/post`                             | POST   | feed         | Authenticated post creation w/ limits   |
| `/moderation/flag`                  | POST   | moderation   | Authenticated content flagging          |
| `/moderation/appeals`               | POST   | moderation   | Submit an appeal for review             |
| `/moderation/appeals/{id}/vote`     | POST   | moderation   | Vote on appeals (role aware)            |
| `/user/export`                      | GET    | privacy      | GDPR data export (24h rate limit)       |
| `/user/delete`                      | DELETE | privacy      | Irreversible account deletion workflow  |

Each entry maps to a `src/<module>/routes/*.ts` file that delegates to `service/` for Cosmos/Hive/Redis orchestration.

## Invite System (Alpha Gating)

The invite system gates new user access during alpha. Users register but remain inactive until they redeem a valid invite code.

### How It Works

1. **Admin creates invite**: `POST /admin/invites` with optional `email` (restricts to specific email) and `expiresInDays` (default 30, max 365).

2. **User redeems invite**: After OAuth registration, user calls `POST /auth/redeem-invite` with their invite code.

3. **Account activation**: On successful redemption:
   - Invite is marked as used with `usedAt` and `usedByUserId`
   - User's `isActive` flag is set to `true`
   - Fresh access and refresh tokens are issued

### Invite Code Format

Codes follow the pattern `XXXX-XXXX` (e.g., `A3K9-B7M2`) using alphanumeric characters excluding confusables (0/O, 1/I).

### Admin Endpoints

```bash
# Create unrestricted invite (anyone can use)
curl -X POST /admin/invites \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"expiresInDays": 14}'

# Create email-restricted invite
curl -X POST /admin/invites \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"email": "newuser@example.com", "expiresInDays": 7}'

# List all invites
curl /admin/invites \
  -H "Authorization: Bearer <admin-token>"

# List unused invites only
curl "/admin/invites?unused=true" \
  -H "Authorization: Bearer <admin-token>"

# Delete an invite
curl -X DELETE /admin/invites/A3K9-B7M2 \
  -H "Authorization: Bearer <admin-token>"
```

### User Redemption

```bash
# Redeem invite (user must be authenticated but inactive)
curl -X POST /auth/redeem-invite \
  -H "Authorization: Bearer <user-token>" \
  -d '{"inviteCode": "A3K9-B7M2"}'
```

### Error Codes

| Code | Meaning |
|------|---------|
| `not_found` | Invite code doesn't exist |
| `expired` | Invite has passed expiration date |
| `already_used` | Invite was redeemed by another user |
| `email_mismatch` | Email-restricted invite used by wrong email |
| `already_active` | User account is already activated |

### Storage

Invites are stored in Cosmos DB `invites` container, partitioned by `inviteCode`.

## Testing

- Jest roots: `src/` and `tests/` (configured via `jest.config.ts`).
- Module-specific suites live in `functions/tests/<module>/`.
- Example commands:

```bash
# Run all suites
npm test

# Target a single file
npx jest tests/feed/createPost.route.test.ts
```

Minimum coverage expectations include:

- Middleware behaviour (`parseAuth`, `requireAuth`).
- Feed service Redis integration and rate limiting.
- Route-level guards returning 401/403 when principals are missing.

## Maintenance Notes

- When introducing new modules, update `tsconfig.json`, Jest `moduleNameMapper`, and ESLint `settings.import/resolver` so alias imports continue to work.
- Keep heavy business logic in `service/` files; routes should stay focused on HTTP parsing and response shaping. This keeps services reusable from timers or future queue triggers.
- Shared infrastructure (Cosmos clients, Redis connectors, schema validation helpers) belongs under `src/shared/` to avoid duplication.

## Azure AD B2C configuration

1. Open the discovery document for your user flow or custom policy at:
   `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}/v2.0/.well-known/openid-configuration`.
2. Copy the exact `issuer` field into `B2C_EXPECTED_ISSUER`.
3. Use the Application (client) ID or App ID URI of this API registration for `B2C_EXPECTED_AUDIENCE`.
4. Set `B2C_TENANT`, `B2C_POLICY`, `B2C_ALLOWED_ALGS`, `AUTH_CACHE_TTL_SECONDS`, `AUTH_MAX_SKEW_SECONDS`, and `B2C_STRICT_ISSUER_MATCH` in your environment configuration. The cache TTL controls discovery/JWKS refreshes; max skew tolerates small clock drift during expiry validation.
