# Azure Functions Flex Deploy: Operational Runbook

## TL;DR
- **Platform:** Azure Functions **Flex** Consumption, Node 20, classic file-based function for `health`.
- **Publish method:** Upload ZIP to deployment blob, then **publish via Kudu SCM `/api/publish`** with a **short-lived SAS**. Do **not** use ARM `/publish` for Flex. Do **not** set `WEBSITE_RUN_FROM_PACKAGE`.
- **Reindex:** Call `syncfunctiontriggers` and **restart**. **Wait 60–90 s** before liveness probes.

---

## Artifact layout (minimal)
```
functions/dist/
  host.json
  package.json            # must NOT set "type": "module"
  index.js                # empty (v4 file-based discovery)
  health/
    function.json         # httpTrigger GET /api/health
    index.js              # classic CJS handler (module.exports = async ...)
```

### Classic health handler contract
- CommonJS only. No imports. No external requires. Reads `process.env` directly. Returns JSON.

---

## CI steps (GitHub Actions)

### 1) Build and gate artifact
```bash
# from functions/
rimraf dist && tsc && tsc-alias && node scripts/write-dist-entry.cjs

# gates
[ -f dist/host.json ]
[ -f dist/package.json ]
[ -f dist/index.js ] && ! grep -q "require" dist/index.js
[ -f dist/health/function.json ]
[ -f dist/health/index.js ] && node -e "require('./dist/health/index.js');"

# zip the **contents** of dist so host.json is at zip root
cd dist && zip -r ../../functions-dist.zip .
```

### 2) Upload to deployment storage
```bash
# Resolve deployment storage from app config
RG="asora-psql-flex"; APP="asora-function-dev"
DEPLOY_VALUE=$(az functionapp show -g "$RG" -n "$APP" \
  --query "properties.functionAppConfig.deployment.storage.value" -o tsv)
STG=$(echo "$DEPLOY_VALUE"  | sed -n 's#https://\([^.]*\)\.blob\.core\.windows\.net/.*#\1#p')
CONT=$(echo "$DEPLOY_VALUE" | sed -n 's#https://[^/]*/\([^/]*\)/.*#\1#p')
BLOB=$(echo "$DEPLOY_VALUE" | sed -n 's#https://[^/]*/[^/]*/\([^?]*\).*#\1#p')

# Upload package
az storage blob upload --auth-mode login \
  --account-name "$STG" --container-name "$CONT" \
  --name "$BLOB" --file functions-dist.zip --overwrite
```

### 3) Publish via Kudu SCM using SAS
```bash
# Short SAS for publish pull
EXP=$(date -u -d '30 minutes' +%Y-%m-%dT%H:%MZ)
SAS=$(az storage blob generate-sas --account-name "$STG" \
  --container-name "$CONT" --name "$BLOB" --permissions r \
  --expiry "$EXP" --as-user --auth-mode login -o tsv)
PKG_URI="https://$STG.blob.core.windows.net/$CONT/$BLOB?$SAS"

# Kudu creds
CREDS=$(az webapp deployment list-publishing-credentials -g "$RG" -n "$APP" -o json)
USER=$(echo "$CREDS" | jq -r .publishingUserName)
PASS=$(echo "$CREDS" | jq -r .publishingPassword)
SCM="https://${APP}.scm.azurewebsites.net/api/publish"

# Publish
curl -fsSL -u "$USER:$PASS" -H 'Content-Type: application/json' -X POST \
  -d "{\"type\":\"zip\",\"packageUri\":\"$PKG_URI\"}" "$SCM"
```

### 4) Reindex and restart, then probe
```bash
SUBS=$(az account show --query id -o tsv)
az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUBS/resourceGroups/$RG/providers/Microsoft.Web/sites/$APP/syncfunctiontriggers?api-version=2023-12-01"

az functionapp restart -g "$RG" -n "$APP"
# Flex warm-up
sleep 90

# Liveness
curl -s -o /dev/null -w "health=%{http_code}\n" "https://${APP}.azurewebsites.net/api/health"
```

---

## Operational checks
- `GET /api/health` → **200**.
- `GET /api/<bogus>` → **404**.
- `GET /admin/functions` with master key → exactly one function: `health`.

---

## Troubleshooting
1. **500 with empty body**
   - Host running stale package. Republish via SCM + `syncfunctiontriggers` + restart + wait 90 s.
   - Confirm active blob equals CI artifact:
     ```bash
     az storage blob download -n functionapp.zip -c "$CONT" --account-name "$STG" -f /tmp/active.zip
     sha256sum /tmp/active.zip && sha256sum functions-dist.zip
     ```
2. **ARM `/publish` returns 400**
   - Not supported for Flex. Use **SCM `/api/publish`**.
3. **Admin lists many functions** but artifact is minimal
   - Instance cache not refreshed. Re-run publish + sync + restart.
4. **Node module errors**
   - Ensure `package.json` does **not** contain `"type": "module"`.
   - `health/index.js` must export CommonJS `module.exports = async (context, req) => {}`.
5. **WEBSITE_RUN_FROM_PACKAGE**
   - Do **not** set on Flex; Flex already runs from the deployment package.

---

## Optional hardening
- **Versioned blobs**: upload `functionapp-<shortsha>.zip`, then publish directly from versioned blob. Enables easy rollback.
- **Artifact integrity check**: generate SAS and download active package; diff with CI artifact before publishing.
- **Probe policy**: 20 attempts, 5 s interval, initial 60–90 s delay after restart.
- **Log capture on failure**: tail Kudu logs or query App Insights for exceptions around health.

---

## Rollback
1. Keep last N versioned blobs (e.g., `functionapp-<sha>.zip`).
2. Generate SAS for the previous good blob and POST to SCM `/api/publish` with that packageUri.
3. `syncfunctiontriggers`, restart, wait, probe.

---

## Security notes
- Use **short-lived SAS** (≤30 min) for publish.
- Limit RBAC: CI needs write to the **deployment container only**.
- Kudu publishing creds are per-app; rotate if leaked.

---

## Rationale
- Flex extracts the deployment package to instances. SCM publish updates the active package and invalidates stale content. ARM `/publish` and Kudu config-zip are not reliable for Flex Consumption.
