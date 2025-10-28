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

## HTTP Surface

| Route                               | Method | Module       | Notes                                  |
| ----------------------------------- | ------ | ------------ | --------------------------------------- |
| `/auth/token`                       | POST   | auth         | OAuth2 token exchange with PKCE         |
| `/auth/authorize`                   | GET    | auth         | Authorization code issuance             |
| `/auth/userinfo`                    | GET    | auth         | OIDC-compliant profile payload          |
| `/feed`                             | GET    | feed         | Guest-friendly feed with Redis support  |
| `/post`                             | POST   | feed         | Authenticated post creation w/ limits   |
| `/moderation/flag`                  | POST   | moderation   | Authenticated content flagging          |
| `/moderation/appeals`               | POST   | moderation   | Submit an appeal for review             |
| `/moderation/appeals/{id}/vote`     | POST   | moderation   | Vote on appeals (role aware)            |
| `/user/export`                      | GET    | privacy      | GDPR data export (24h rate limit)       |
| `/user/delete`                      | DELETE | privacy      | Irreversible account deletion workflow  |

Each entry maps to a `src/<module>/routes/*.ts` file that delegates to `service/` for Cosmos/Hive/Redis orchestration.

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
