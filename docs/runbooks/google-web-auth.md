# Google Web Authentication

Lythaus uses one Google Cloud project (`lythaus`), one Google Auth Platform
configuration, and one Web OAuth client (`Lythaus Web`) for preview and
production.

## Protected configuration

- Public build/runtime identifier: repository variable `GOOGLE_OAUTH_CLIENT_ID`.
- Requested scopes: repository variable `GOOGLE_OAUTH_SCOPES`, fixed to
  `openid email profile` for the MVP.
- Confidential web-client secret: repository secret
  `GOOGLE_OAUTH_CLIENT_SECRET_WEB`.
- Azure Key Vault secret: `google-oauth-client-secret-web` in
  `kv-asora-flex-dev`.
- Function App Key Vault reference: app setting
  `GOOGLE_OAUTH_CLIENT_SECRET_WEB` on `asora-function-dev`.

The protected Function deployment workflow copies the GitHub secret directly
to Key Vault and installs the Key Vault reference. It must never expose the
secret in logs, repository variables, Flutter defines, Pages assets, workflow
artifacts, or evidence.

## Registered web routes

Permanent production entries:

- JavaScript origin: `https://app.lythaus.co`
- Redirect URI: `https://app.lythaus.co/auth/callback`

The exact immutable Pages preview origin and `/auth/callback` may be registered
temporarily on the same Web OAuth client. If a deployment creates a different
immutable preview URL, replace the old temporary origin and callback on
`Lythaus Web`; do not create another project or OAuth client.

After production Google login succeeds, remove the temporary preview entries
unless an explicitly time-bounded validation still requires them.
