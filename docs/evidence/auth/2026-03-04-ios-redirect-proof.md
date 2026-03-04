# iOS Redirect Proof

Date: 2026-03-04  
Environment: staging (update if different)

## Redirect Configuration

- Expected callback URI: `asora://oauth/callback`
- iOS registered schemes source: `ios/Runner/Info.plist`

## Verification Checklist

- [ ] URL scheme present in Info.plist
- [ ] Auth provider callback returns control to app
- [ ] No "redirect URI invalid" class errors
- [ ] No "scheme not registered" class errors

## Artifacts

- Info.plist screenshot/snippet proof:
- Callback success screenshot:
- Device logs (sanitized):

## Notes

- Any provider-specific redirect issues:
- Follow-up tasks:

