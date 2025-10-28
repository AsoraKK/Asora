# Key Vault secret map

The `kv-asora-dev` vault (and environment-specific equivalents) must host the
following secrets. Azure Functions app settings reference each value using the
`@Microsoft.KeyVault(SecretUri=...)` syntax to satisfy Flex compliance.

| Secret name | Purpose | Notes |
| --- | --- | --- |
| `JwtSigningKey` | JWT signing/validation key | Rotate with `openssl rand -hex 64`. |
| `OAuthClientSecret` | Confidential OAuth client secret | Matches the AAD app registration. |
| `PostgresConnectionString` | PostgreSQL connection string | Used by migration tooling and Functions. |
| `CosmosConnectionString` | Cosmos DB primary connection string | Serverless/dev account `asora-cosmos-dev`. |
| `CosmosDatabaseName` | Cosmos DB database identifier (e.g., `asora`) | Consumed by migration tooling. |
| `HiveTextApiKey` | Hive text moderation API key | Required for moderation functions. |
| `HiveImageApiKey` | Hive image moderation API key | Required for moderation functions. |
| `HiveDeepfakeApiKey` | Hive deepfake detection API key | Required for moderation functions. |
| `CloudflareEdgeToken` | Cloudflare Zero Trust service token | Used by edge diagnostics. |
| `JwtJwksUri` | Remote JWKS URL for token validation | Optional; set when using federated auth. |

After populating secrets, run `scripts/compare-cosmos-indexes.sh` and
`scripts/secret-scan.sh` as part of release validation to confirm compliance.