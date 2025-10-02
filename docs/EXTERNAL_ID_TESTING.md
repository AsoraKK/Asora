# External ID (Microsoft Entra) Verification Checklist

This guide explains how to validate the Microsoft Entra External ID integration end-to-end.

## 1. Configure Environment

Set the following app settings for the Functions app (or populate `%LOCALAPPDATA%/AzureFunctions` when running locally):

```
AUTH_ALLOWED_TENANT_IDS=<tenant-id>
AUTH_ALLOWED_AUDIENCES=api://<functions-app-client-id>
AUTH_CLIENT_ID=<functions-app-client-id>
AUTH_OPENID_CONFIGURATION_URL=https://<tenant>.b2clogin.com/<tenant>.onmicrosoft.com/<policy>/v2.0/.well-known/openid-configuration
AUTH_MICROSOFT_DOMAIN=<tenant>.onmicrosoft.com
```

> Keep `AUTH_ALLOWED_TENANT_IDS` in sync with the Entra tenant configured for the Flutter client.

## 2. Acquire a Test Token

1. Register a **Public client** (mobile/desktop) application for testing. Add redirect URI `http://localhost:8400/redirect`.
2. Use the following Azure CLI command to obtain an access token (requires [`az login`](https://learn.microsoft.com/cli/azure/authenticate-azure-cli) with sufficient permissions):

    ```bash
    az account get-access-token \
      --tenant <tenant-id> \
      --client-id <public-client-app-id> \
      --scopes api://<functions-app-client-id>/.default \
      --query accessToken -o tsv > token.txt
    ```

   Alternatively, use Postman or MSAL to perform the PKCE flow against the user flow/policy configured for Asora.

## 3. Call a Protected Endpoint

With the token, exercise one of the protected endpoints (e.g. `/api/privacy/export`) using `curl`:

```bash
curl -v https://<functions-host>/api/privacy/export \
  -H "Authorization: Bearer $(cat token.txt)"
```

Expected outcomes:

- `200 OK` with export payload when the token matches an active user in Cosmos DB.
- `401 Unauthorized` when the token is expired, invalid, or signed for a different audience/tenant.

## 4. Observability Checklist

- Azure Functions **Application Insights** should record the invocation with `auth` metadata.
- Verify the `privacy_audit` container in Cosmos DB records success/failure entries for export/delete flows.
- Check the `auth` logs for `Token tenant is not allowed` errors to confirm enforcement.

## 5. Flutter Client Smoke Test

1. Provide the Flutter client with the following dart-defines:

    ```bash
    flutter run \
      --dart-define=OAUTH2_AUTHORIZATION_ENDPOINT=https://<tenant>.b2clogin.com/<tenant>.onmicrosoft.com/<policy>/oauth2/v2.0/authorize \
      --dart-define=OAUTH2_TOKEN_ENDPOINT=https://<tenant>.b2clogin.com/<tenant>.onmicrosoft.com/<policy>/oauth2/v2.0/token \
      --dart-define=OAUTH2_USERINFO_ENDPOINT=https://<tenant>.b2clogin.com/<tenant>.onmicrosoft.com/<policy>/openid/userinfo \
      --dart-define=OAUTH2_CLIENT_ID=<public-client-id> \
      --dart-define=OAUTH2_SCOPE="openid offline_access api://<functions-app-client-id>/user_impersonation"
    ```

    > Tip: When using [flutter_appauth](https://pub.dev/packages/flutter_appauth) you can optionally supply `--dart-define=OAUTH2_DISCOVERY_URL=<openid-configuration-url>` instead of the explicit authorization/token endpoints above.

    > Redirect URIs default to `com.asora.app://oauth/callback` on Android and `asora://oauth/callback` on Apple platforms; override them only when testing custom schemes.

2. From the sign-in screen choose “Sign in with Microsoft”.
3. Confirm the browser handshake completes, the Flutter app receives the deep-link, and subsequent API calls succeed with the returned `access_token`.

## 6. Troubleshooting

| Symptom | Likely Cause | Resolution |
| --- | --- | --- |
| `unauthorized` / `Token tenant is not allowed` | Tenant ID missing from `AUTH_ALLOWED_TENANT_IDS`. | Update app setting and redeploy. |
| Browser returns `AADB2C90057` | Redirect URI mismatch. | Ensure redirect URI registered in Entra matches the one passed via dart-defines. |
| Flutter never receives callback | Deep link not registered. | Verify Android `intent-filter` / iOS URL scheme configured for the redirect URI. |

Documenting these steps ensures we can rerun the External ID handshake as part of pre-release validation.
