# Runbook: TLS Pinning — Initial Provisioning and Rotation

## Overview

This runbook covers two scenarios:

1. **Initial pin provisioning** — run once when staging/production environments are first deployed. The repo marks those configs as `PinLifecycleState.planned` until the live hostnames exist, then flips them to `live` after pin extraction.
2. **Pin rotation** — run when Azure Function App TLS certificates are renewed or rotated (every 6–12 months).

## When to Use

- **Initial provisioning**: `asora-function-staging` or `asora-function-prod` is deployed for the first time
- Azure automatically rotates certificates (every 6–12 months)
- Manual certificate renewal
- Moving to new Azure Function App hostname
- CI fails with "LAUNCH BLOCKER: staging/prod spkiPinsBase64 is empty"

---

## §Initial Pin Provisioning (pre-GA, first time)

These steps populate the empty `spkiPinsBase64` arrays in `environment_config.dart`.

### Prerequisites

- [ ] Target Azure Function App deployed and publicly reachable
- [ ] OpenSSL installed (`openssl version` → ≥ 1.1.1)
- [ ] `scripts/extract-spki-pins.sh` executable (`chmod +x scripts/extract-spki-pins.sh`)

### Step 1 — Extract staging SPKI pin

```bash
./scripts/extract-spki-pins.sh \
    asora-function-staging.northeurope-01.azurewebsites.net
```

Copy the base64 output (example: `abcDEF+123/=...`).

### Step 2 — Extract production SPKI pins (leaf + intermediate backup)

```bash
# Leaf certificate (primary pin)
./scripts/extract-spki-pins.sh \
    asora-function-prod.northeurope-01.azurewebsites.net

# Intermediate CA (backup pin — survives leaf cert rotation)
CERT_INDEX=1 ./scripts/extract-spki-pins.sh \
    asora-function-prod.northeurope-01.azurewebsites.net
```

Copy both base64 outputs.

### Step 3 — Update `environment_config.dart`

Open `lib/core/config/environment_config.dart` and populate:

```dart
// Staging
const _stagingMobileSecurity = MobileSecurityConfig(
  tlsPins: TlsPinConfig(
    enabled: true,
    strictMode: true,
    lifecycleState: PinLifecycleState.live,
    spkiPinsBase64: [
      'PASTE_STAGING_LEAF_PIN_HERE',
    ],
  ),
  ...
);

// Production
const _prodMobileSecurity = MobileSecurityConfig(
  tlsPins: TlsPinConfig(
    enabled: true,
    strictMode: true,
    lifecycleState: PinLifecycleState.live,
    spkiPinsBase64: [
      'PASTE_PROD_LEAF_PIN_HERE',       // primary
      'PASTE_PROD_INTERMEDIATE_PIN_HERE', // backup for rotation
    ],
  ),
  ...
);
```

### Step 4 — Update `mobile-expected-pins.json`

```json
{
  "_states": {
    "asora-function-staging.northeurope-01.azurewebsites.net": "planned",
    "asora-function-prod.northeurope-01.azurewebsites.net": "planned"
  },
  "_comment_staging": "planned until the staging host is provisioned",
  "asora-function-staging.northeurope-01.azurewebsites.net": [
    "PASTE_STAGING_LEAF_PIN_HERE"
  ],
  "_comment_prod": "planned until the production host is provisioned",
  "asora-function-prod.northeurope-01.azurewebsites.net": [
    "PASTE_PROD_LEAF_PIN_HERE",
    "PASTE_PROD_INTERMEDIATE_PIN_HERE"
  ]
}
```

### Step 5 — Update `cert_pinning_common.dart`

Add the staging and production hosts to `kPinnedDomains` in
`lib/core/security/cert_pinning_common.dart`:

```dart
const Map<String, List<String>> kPinnedDomains = {
  // ... existing dev entries ...
  'asora-function-staging.northeurope-01.azurewebsites.net': [
    'PASTE_STAGING_LEAF_PIN_HERE',
  ],
  'asora-function-prod.northeurope-01.azurewebsites.net': [
    'PASTE_PROD_LEAF_PIN_HERE',
    'PASTE_PROD_INTERMEDIATE_PIN_HERE',
  ],
};
```

### Step 6 — Verify with launch-gate tests

```bash
SPKI_GATE=true flutter test test/security/environment_spki_pin_test.dart
```

All 4 tests must pass. Then run the full security check locally:

```bash
python3 scripts/verify_pins.py   # requires BASE_URL or EXTRA_PIN_HOSTS set
```

### Step 7 — Commit and push

```bash
git add lib/core/config/environment_config.dart \
        mobile-expected-pins.json \
        lib/core/security/cert_pinning_common.dart
git commit -m "security: populate staging/prod SPKI pins for GA launch"
```

CI (`mobile-security-check.yml`) will now pass the pin check.

---

## §Rotation Procedure

**Total duration: 14–21 days**

| Phase | Duration | Description |
|-------|----------|-------------|
| Preparation | Day 0 | Extract new pin, update config |
| Deploy dual pins | Day 0–7 | Release app with old + new pins |
| User adoption | Day 7–14 | Wait for users to update |
| Rotate certificate | Day 14 | Deploy new cert to Azure |
| Monitor | Day 14–17 | Watch telemetry for issues |
| Remove old pin | Day 17–21 | Release app with new pin only |


     base64
   ```

   **Output example:**
   ```
   newPinHashBase64String1234567890==
   ```

   ```bash
   # For PEM file
   openssl x509 -in new-cert.pem -pubkey -noout | \
     openssl pkey -pubin -outform der | \
     openssl dgst -sha256 -binary | \
     base64
   ```

3. **Verify pin extraction:**
   - Run command twice, ensure identical output
   - Compare with current pin (should be different)

4. **Document pins:**
   ```
   Environment: Production
   Old pin: oldPinHashBase64==
   New pin: newPinHashBase64==
   Extracted by: [Your name]
   Date: [YYYY-MM-DD]
   ```

### Phase 2: Update Configuration for Dual Pinning

1. **Edit `lib/core/config/environment_config.dart`:**

   ```dart
   static final _prodConfig = EnvironmentConfig(
     environment: Environment.production,
     apiBaseUrl: 'https://asora-function-prod.northeurope-01.azurewebsites.net/api',
     security: MobileSecurityConfig(
       tlsPins: TlsPinConfig(
         enabled: true,
         strictMode: true,
         spkiPinsBase64: [
           'oldPinHashBase64==',  // Current production cert
           'newPinHashBase64==',  // New cert (not yet deployed)
         ],
       ),
       // ... rest of config
     ),
   );
   ```

2. **Create pull request:**
   - Title: "Add dual TLS pins for certificate rotation"
   - Description: Reference this runbook, include pin extraction commands
   - Reviewers: Security team + engineering lead

3. **Test in staging first:**
   - Deploy dual pins to staging config
   - Verify app connects with both old and new staging certs
   - Run smoke tests

### Phase 3: Deploy App with Dual Pins

1. **Build release candidate:**
   ```bash
   flutter build apk --release --dart-define=ENVIRONMENT=production
   flutter build ios --release --dart-define=ENVIRONMENT=production
   ```

2. **Test release build:**
   - Install on physical device
   - Verify connection to production backend
   - Check telemetry for pin match events

3. **Submit to app stores:**
   - Google Play: Production track, staged rollout (10% → 50% → 100%)
   - App Store: Phased release

4. **Monitor adoption:**
   - Check app store analytics for update rate
   - Target: ≥80% users on new version before cert rotation

### Phase 4: Rotate Azure Certificate

**⚠️ WAIT until ≥80% users have dual-pin app installed**

1. **Backup current configuration:**
   ```bash
   az functionapp config appsettings list \
     --name asora-function-prod \
     --resource-group asora-prod-rg \
     > backup-appsettings.json
   ```

2. **Deploy new certificate:**
   - If using Azure-managed cert: Wait for auto-rotation
   - If custom cert: Upload via Azure Portal or CLI

3. **Verify certificate deployment:**
   ```bash
   echo | openssl s_client -servername asora-function-prod.northeurope-01.azurewebsites.net \
     -connect asora-function-prod.northeurope-01.azurewebsites.net:443 2>/dev/null | \
     openssl x509 -noout -fingerprint -sha256
   ```

   Compare fingerprint with expected new certificate.

4. **Monitor telemetry (first 24 hours):**
   - Watch for TLS pinning events
   - Expected: `result: "pin_match"` with new pin hash
   - Alert: Any `result: "pin_mismatch"` events

### Phase 5: Remove Old Pin (After 7-14 days)

1. **Verify user adoption:**
   - Check app store analytics: ≥95% users on dual-pin version
   - Check telemetry: No more connections with old pin

2. **Update configuration:**

   ```dart
   spkiPinsBase64: [
     'newPinHashBase64==',  // Only the new pin
   ],
   ```

3. **Deploy app update:**
   - Build and test release
   - Submit to app stores
   - Standard rollout process

4. **Clean up documentation:**
   - Archive old pin values
   - Update pin inventory spreadsheet

## Rollback Procedure

### If Users Report Connection Issues After Phase 4

**Symptoms:**
- Spike in "TLS handshake failed" errors
- Telemetry shows `pin_mismatch` events
- User complaints about app not connecting

**Immediate Actions:**

1. **Verify pin extraction was correct:**
   ```bash
   # Extract SPKI from LIVE production server
   echo | openssl s_client -servername asora-function-prod.northeurope-01.azurewebsites.net \
     -connect asora-function-prod.northeurope-01.azurewebsites.net:443 2>/dev/null | \
     openssl x509 -pubkey -noout | \
     openssl pkey -pubin -outform der | \
     openssl dgst -sha256 -binary | \
     base64
   ```

2. **Compare with configured new pin:**
   - If mismatch: Incorrect pin was added in Phase 2
   - Action: Hotfix app with correct pin, expedited store review

3. **If pin is correct but certificate rotation failed:**
   - Revert Azure certificate to old one
   - Monitor telemetry for pin_match with old pin

4. **Emergency override (last resort):**
   - Contact engineering to deploy hotfix with pinning disabled
   - File incident report
   - Re-run full rotation process

## Monitoring

### Telemetry Queries

**Pin match rate:**
```
SELECT result, COUNT(*) 
FROM security_events 
WHERE type = 'tlsPinning' 
  AND environment = 'production'
  AND timestamp > NOW() - INTERVAL 24 HOURS
GROUP BY result
```

**Expected:**
- During Phase 3-4: Mix of old and new pin matches
- After Phase 4: 100% new pin matches
- After Phase 5: New pin matches with single-pin config

**Alert conditions:**
- `pin_mismatch` rate >1% after Phase 4
- Connection error rate >5% after certificate rotation

### App Store Analytics

- Monitor crash-free rate (should remain ≥99.5%)
- Check user reviews for connection complaints
- Track update adoption percentage

## Checklist

### Pre-Rotation
- [ ] New pin extracted and verified
- [ ] Dual pins added to config
- [ ] PR reviewed and merged
- [ ] App released with dual pins
- [ ] ≥80% user adoption achieved

### Rotation
- [ ] Azure configuration backed up
- [ ] New certificate deployed to Azure
- [ ] Certificate verified with OpenSSL
- [ ] Telemetry monitored for 24 hours
- [ ] No pin_mismatch events

### Post-Rotation
- [ ] Old pin removed from config
- [ ] App released with single pin
- [ ] Documentation updated
- [ ] Incident report filed (if issues occurred)

## Contacts

- **Security Team**: security@asora.com
- **DevOps**: devops@asora.com
- **On-Call Engineer**: [PagerDuty link]

## References

- [TLS Pinning Guide](../tls-pinning.md)
- [Mobile Security ADR](../adr/ADR-00X-mobile-security-hardening.md)
- OpenSSL documentation: https://www.openssl.org/docs/

---

**Last Updated:** 2024-01-15  
**Next Review:** Before next certificate rotation
