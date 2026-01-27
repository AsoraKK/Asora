# Mobile Security SOP (Prod)

## Certificate Pinning

- Pin SPKI (SHA-256) for API hosts in `lib/core/security/cert_pinning.dart` under `kPinnedDomains`.
- Maintain TWO pins per host: primary and rollover.
- Extract SPKI pins (leaf cert):
  1. Export leaf certificate chain:
     ```bash
     openssl s_client -connect <host>:443 -servername <host> -showcerts < /dev/null | sed -n '/-----BEGIN CERTIFICATE-----/,$p' > chain.pem
     ```
  2. Extract LEAF public key (adjust index if multiple certs):
     ```bash
     awk 'BEGIN{c=0} /BEGIN CERT/{c++} c==1{print} /END CERT/{if(c==1) exit}' chain.pem > leaf.pem
     ```
  3. Derive SPKI SHA-256 (base64):
     ```bash
     openssl x509 -in leaf.pem -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | base64
     ```
  4. Add as `sha256/<base64>` to `kPinnedDomains` for the host. Repeat for rollover cert.
- Update pins prior to certificate rotation. Do NOT pin to root or intermediate.
- Rollover: keep both pins active for at least 14 days before and after rotation.

## Device Integrity

- Uses `flutter_jailbreak_detection` when available; fails secure if plugin errors.
- Blocks write ops (POST/PUT/PATCH/DELETE) when compromised; reads allowed.
- App sends `X-Device-Integrity` header on every request (secure/compromised/unknown) for server audit.

## Build Obfuscation

- Build release with obfuscation and split debug info (per-build unique symbols):
  ```bash
  flutter build appbundle --release --obfuscate --split-debug-info=build/symbols/android/<timestamp>
  flutter build ios --release --obfuscate --split-debug-info=build/symbols/ios/<timestamp>
  ```
- Store `build/symbols/*` artifacts securely for crash decoding.

## Support Bypass Policy

- Only with an authenticated, time-boxed support build signed with a special flavor.
- Default builds do not expose bypass toggles. Use remote kill-switch to TEMPORARILY disable pinning if outage.

## Pin Mismatch Handling

- Expected symptoms: connection failures to pinned host; user-friendly message:
  > "Secure connection could not be established. Please try again on a trusted network or update the app."
- Triage: verify SPKI, check if cert rotated; push hotfix with rollover pin if needed.
- Collect device reports with timestamp, OS version, and network type.

## References

- [Mobile Security Policies](mobile-security-policies.md)
- [Mobile Security QA Checklist](mobile-security-qa-checklist.md)
- [TLS Pinning Rotation Runbook](runbooks/tls-pinning-rotation.md)
