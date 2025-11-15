# TLS Certificate Pinning Guide

## Overview

ASORA implements SPKI (Subject Public Key Info) certificate pinning to protect against man-in-the-middle attacks and certificate authority compromises. This guide explains how to extract, configure, and rotate TLS pins.

## What is SPKI Pinning?

SPKI pinning validates the server's public key (not the full certificate) by comparing its SHA-256 hash against a pre-configured list of trusted pins. This approach:

- Survives certificate renewal (same key, new cert)
- Allows smooth pin rotation with multiple pins
- Reduces attack surface compared to trusting all CAs

## Extracting SPKI Pins

### Method 1: Using OpenSSL (Recommended)

```bash
# Extract SPKI hash from live server
echo | openssl s_client -servername your-host.azurewebsites.net \
  -connect your-host.azurewebsites.net:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  base64
```

**Example for dev environment:**
```bash
echo | openssl s_client -servername asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net \
  -connect asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  base64
```

**Output:**
```
sAgmPn4rf81EWKQFg+momPe9NFYswENqbsBnpcm16jM=
```

### Method 2: From PEM Certificate File

```bash
# If you have a .pem or .crt file
openssl x509 -in cert.pem -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  base64
```

### Method 3: Using Dart Tool (Limited)

```bash
dart run tools/extract_spki.dart https://your-host.azurewebsites.net
```

⚠️ **Note:** The Dart tool currently hashes the full certificate DER (not just SPKI). Use OpenSSL for production pins.

## Configuring Pins

Edit `lib/core/config/environment_config.dart`:

```dart
static final _devConfig = EnvironmentConfig(
  environment: Environment.development,
  apiBaseUrl: 'https://asora-function-dev-xxx.azurewebsites.net/api',
  security: MobileSecurityConfig(
    tlsPins: TlsPinConfig(
      enabled: true,
      strictMode: false,  // Warn-only in dev
      spkiPinsBase64: [
        'sAgmPn4rf81EWKQFg+momPe9NFYswENqbsBnpcm16jM=',  // Current pin
      ],
    ),
    // ... other config
  ),
);
```

### Configuration Parameters

- **enabled**: Master switch for pinning (true/false)
- **strictMode**: 
  - `true`: Block connections on pin mismatch (production)
  - `false`: Warn but allow (development/staging)
- **spkiPinsBase64**: List of valid SPKI hashes (supports multiple pins for rotation)

## Pin Rotation Strategy

### Phase 1: Add New Pin (Dual Pinning)

```dart
spkiPinsBase64: [
  'oldPinHash==',  // Current certificate
  'newPinHash==',  // New certificate (not yet deployed)
],
```

Deploy this config to all clients **before** rotating the server certificate.

### Phase 2: Rotate Server Certificate

Deploy the new certificate to your Azure Function App. Clients will accept both pins during this transition.

### Phase 3: Remove Old Pin

After all clients have updated (monitor telemetry), remove the old pin:

```dart
spkiPinsBase64: [
  'newPinHash==',  // Now the only valid pin
],
```

### Timeline

1. **T+0**: Add new pin to app config, release update
2. **T+7 days**: Wait for majority of users to update
3. **T+7 days**: Rotate server certificate
4. **T+14 days**: Remove old pin from app config, release update

## Environment-Specific Behavior

| Environment | Pinning Enabled | Strict Mode | Behavior |
|-------------|----------------|-------------|----------|
| Development | Yes | No | Warn-only (logs telemetry, allows connection) |
| Staging | Yes | Yes | Block on mismatch, unless QA override |
| Production | Yes | Yes | Block on mismatch |

## Testing

### Manual Testing

1. **Valid Certificate Test:**
   ```bash
   flutter run --dart-define=ENVIRONMENT=development
   # Should connect successfully
   ```

2. **Invalid Certificate Test (Staging/Prod):**
   ```bash
   # Temporarily set wrong pin in config
   spkiPinsBase64: ['wrongPinHashForTesting==']
   flutter run --dart-define=ENVIRONMENT=production
   # Should fail to connect
   ```

3. **Warn-Only Test (Dev):**
   ```bash
   # Set wrong pin in dev config
   flutter run --dart-define=ENVIRONMENT=development
   # Should warn but allow connection
   ```

### Automated Testing

See `test/core/security/tls_pinning_test.dart` for unit tests covering:
- Pin matching logic
- Strict vs warn-only modes
- Multiple pin support
- Disabled pinning

## Monitoring

Security telemetry logs TLS pinning events:

```json
{
  "type": "tlsPinning",
  "result": "pin_mismatch",
  "environment": "production",
  "reason": "computed_hash_not_in_pins",
  "strictMode": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Monitor these events in your telemetry dashboard to detect:
- Pin rotation issues
- MITM attack attempts
- Configuration errors

## Troubleshooting

### Error: "TLS handshake failed"

**Symptom:** App fails to connect to backend in staging/production.

**Causes:**
1. Pin mismatch (wrong SPKI hash configured)
2. Server certificate rotated without client update
3. Network intercepting proxy (corporate firewalls)

**Resolution:**
1. Extract current SPKI from server: `echo | openssl s_client -servername your-host ...`
2. Compare with configured pin in `environment_config.dart`
3. Update pin if mismatch found
4. For corporate networks, document proxy exclusions in support docs

### Warning: "Pin mismatch in development mode"

**Symptom:** Console logs show pin mismatch warnings in dev builds.

**Cause:** Development certificate changed (e.g., local testing with self-signed certs).

**Resolution:**
- Extract new SPKI and update dev config
- Or temporarily disable pinning: `enabled: false`

### Support Escalation

If users report connection issues:

1. **Check environment:** Which build (dev/staging/prod)?
2. **Check telemetry:** Any TLS pinning events for this user?
3. **Verify certificate:** Extract SPKI from live server
4. **Compare pins:** Does extracted hash match configured pins?
5. **Issue override:** Use `SecurityOverrideConfig.forSupport()` if legitimate issue

## Security Considerations

### DO

- ✅ Use OpenSSL for production pin extraction
- ✅ Support multiple pins for rotation
- ✅ Test pin rotation in staging first
- ✅ Monitor telemetry for pin mismatches
- ✅ Document override usage in audit logs

### DO NOT

- ❌ Disable pinning in production without security review
- ❌ Use single pin without rotation strategy
- ❌ Extract pins from Dart tool for production
- ❌ Commit secrets/pins to public repositories
- ❌ Share support overrides outside incident response

## References

- OWASP Mobile Top 10: M3 Insecure Communication
- RFC 7469: Public Key Pinning Extension for HTTP
- [ADR-00X Mobile Security Hardening](../adr/ADR-00X-mobile-security-hardening.md)
- [TLS Pinning Rotation Runbook](../runbooks/tls-pinning-rotation.md)
