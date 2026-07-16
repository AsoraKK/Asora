# Lythaus

Lythaus (formerly Asora) is an invite-only social publishing platform focused on transparent authorship, trustworthy feeds, moderation appeals, and privacy rights. User-facing product copy uses **Lythaus**. Internal packages, Azure resources, Terraform identifiers, and legacy namespaces may retain **Asora** where renaming would create operational risk.

## Alpha scope

The controlled Alpha covers the Flutter web application, Azure Functions APIs, the moderation/control panel, and required operational tooling. It is limited to 25–250 invited users across explicitly approved stages. Android, iOS, store distribution, signing, payments, and mobile certificate-pin launch readiness are Beta work and are not Alpha gates.

Current release status and evidence: [Controlled Alpha packet](docs/evidence/alpha-readiness/2026-07-10-controlled-alpha-packet.md).

## Repository

| Path | Purpose |
| --- | --- |
| `lib/`, `web/` | Flutter web application and shared client code |
| `functions/` | Node 22 Azure Functions backend |
| `api/openapi/` | Public API source, bundle, and generated-client contract |
| `apps/control-panel/` | Administrative and moderation interface |
| `apps/marketing-site/` | Public Lythaus site |
| `database/`, `infra/`, `infrastructure/` | Cosmos, PostgreSQL, Azure, and alert configuration |
| `cloudflare/`, `workers/` | Pages configuration, prepared API gateway, and legacy anonymous feed cache worker |
| `docs/` | Architecture decisions, policies, runbooks, and release evidence |

See [README_INDEX.md](README_INDEX.md) for module-level documentation.

## Toolchain

- Flutter version: `.fvmrc`
- Node.js: 22.x
- npm: use the lockfiles committed for each workspace
- Java: 17 for OpenAPI generation and Android static validation
- Terraform: follow the version constraints in each infrastructure root

## Local setup

```powershell
npm ci --ignore-scripts
npm --prefix functions ci --ignore-scripts --workspaces=false
flutter pub get
```

Copy placeholders from `.env.example` into an ignored local environment file. Never place real keys in Flutter defines, source files, OpenAPI examples, evidence, or deployment archives. Alpha cloud secrets must resolve through Azure Key Vault, GitHub encrypted secrets, Cloudflare secrets, or workload identity.

## Validate

```powershell
npm --prefix functions run typecheck
npm --prefix functions test
flutter analyze
flutter test
npm run openapi:lint
npm run openapi:bundle
npm run openapi:validate:examples
npm run routes:guard
npm run audit:production
```

Build the web application with a public HTTPS API URL:

```powershell
flutter build web --release --dart-define="ENVIRONMENT=production" --dart-define="API_BASE_URL=https://api.lythaus.co/api" --dart-define="AUTH_URL=https://api.lythaus.co/api"
```

Build the backend artifact:

```powershell
npm --prefix functions run build
```

## Deployment

Deployment is approval-gated and immutable:

1. The full `CI` workflow must pass on the exact release SHA.
2. `.github/workflows/deploy-asora-function-mvp.yml` downloads the Functions artifact from that CI run and deploys only to the existing `asora-function-dev` MVP backend; it does not rebuild.
3. `.github/workflows/deploy-alpha-web.yml` deploys the web artifact from the same CI run; it does not rebuild.
4. Health, live contracts, browser smoke, DSR configuration, artifact digests, and release evidence must pass before the candidate is eligible.

Production deploy, rollback, cohort expansion, access-policy changes, secret rotation, destructive infrastructure changes, and bulk moderation always require Kyle’s explicit approval.

## References

- [Controlled Alpha ADR](docs/adr/ADR-004-controlled-web-api-alpha.md)
- [Auth architecture](docs/AUTH_ARCHITECTURE.md)
- [Alpha entitlement matrix](docs/product/alpha-entitlements.md)
- [AI authorship policy](docs/policy/alpha-ai-authorship-and-moderation.md)
- [Alpha operations runbook](docs/runbooks/alpha-operations.md)
- [Current Alpha go/no-go packet](docs/evidence/alpha-readiness/2026-07-10-controlled-alpha-packet.md)
- [Staged rollout specification](docs/alpha/staged-rollout.md)
- [Rollback plan](docs/runbooks/alpha-rollback.md)
- [Known risks](docs/alpha/known-risk-register.md)
- [Brand transition](docs/branding/lythaus-transition.md)
- [Public-domain cutover ADR](docs/adr/ADR-005-lythaus-public-domain-cutover.md)
- [Public-domain cutover runbook](docs/runbooks/lythaus-domain-cutover.md)
