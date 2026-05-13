# Store Submission Evidence (Android + iOS)

Last updated: <!-- update when items are checked off -->
Purpose: Track external console completion with auditable evidence before GA.
Owner: Mobile lead + product lead joint sign-off required.

> **How to use:** Check each item `- [x]` when done.
> `scripts/validate-store-submission-evidence.sh` will fail CI if any item is unchecked.

---

## 1. Google Play Console

Console: <https://play.google.com/console>

### 1.1 App Record
- [ ] Play Console app record exists and is not in draft
- [ ] App access set to "All functionality available — no restrictions"
- [ ] App category set (Social / Social Networking)
- [ ] Contact email, website URL, and privacy policy URL all saved

### 1.2 Data Safety Form
> Dashboard → Policy → App content → Data safety

- [ ] Data Safety form submitted (status shows "Submitted", not just "Saved")
- [ ] Data collected — account info (Name, Email Address) declared
- [ ] Data collected — user content (Photos or videos, Other user content) declared
- [ ] Data sharing — third-party sharing with Hive AI (content moderation) declared
- [ ] Security practices — data encrypted in transit ✓ declared
- [ ] Security practices — users can request data deletion ✓ declared

### 1.3 Content Rating
> Dashboard → Policy → App content → Content rating

- [ ] Content rating: IARC questionnaire completed and rating issued
- [ ] Rating category confirmed appropriate (Teen or Mature 17+ depending on questionnaire outcome)

### 1.4 Store Listing Copy
> Dashboard → Store presence → Main store listing

- [ ] App title (≤ 30 chars): confirmed and spell-checked
- [ ] Short description (≤ 80 chars): confirmed and spell-checked
- [ ] Full description (≤ 4 000 chars): confirmed, includes key features and Lythaus branding
- [ ] Privacy policy URL resolves (HTTP 200, no redirect loop)

### 1.5 Graphic Assets
> Dashboard → Store presence → Main store listing → Graphics

- [ ] Hi-res icon (512 × 512 PNG, no alpha channel): uploaded
- [ ] Feature graphic (1 024 × 500 JPG or PNG): uploaded
- [ ] Phone screenshots — portrait (min 2, max 8): uploaded
- [ ] 7-inch tablet screenshots: uploaded or N/A (mark which)
- [ ] 10-inch tablet screenshots: uploaded or N/A (mark which)

### 1.6 Internal Testing Release
> Dashboard → Testing → Internal testing

- [ ] Play internal testing release uploaded (signed AAB, not APK)
- [ ] Internal testers added and build distributed
- [ ] At least one successful install confirmed from Play internal track

Evidence links/notes:
- Console URL:
- Internal track release ID / version code:
- Data Safety form submission screenshot:
- Content rating certificate:

---

## 2. App Store Connect

Console: <https://appstoreconnect.apple.com>

### 2.1 App Record
- [ ] App Store Connect app record exists (bundle ID: com.asora.app)
- [ ] Primary language set
- [ ] App category: Social Networking (primary), Entertainment (secondary)
- [ ] Age rating questionnaire completed (expected: 17+)

### 2.2 App Privacy (Nutrition Labels)
> App record → App Privacy

- [ ] App Privacy section submitted (not just saved — must show "Submitted" status)
- [ ] Contact Info → Name declared (collected, linked to identity, app functionality)
- [ ] Contact Info → Email Address declared (collected, linked to identity, app functionality)
- [ ] User Content → Photos or Videos declared (collected, linked to identity)
- [ ] User Content → Other User Content declared (collected, linked to identity)
- [ ] Identifiers → User ID declared (collected, linked to identity)
- [ ] Usage Data → Product Interaction declared (collected, linked to identity)
- [ ] Data linked to identity vs. not linked: correctly classified for each data type
- [ ] All uncollected data types acknowledged as "Data Not Collected"

### 2.3 Store Listing Copy
> App record → App Information + Pricing and Availability + Version Information

- [ ] App name (≤ 30 chars): confirmed and spell-checked
- [ ] Subtitle (≤ 30 chars): confirmed
- [ ] Promotional text (≤ 170 chars, updatable without review): confirmed
- [ ] Description (≤ 4 000 chars): confirmed, includes key features and Lythaus branding
- [ ] Keywords (≤ 100 chars total, comma-separated): confirmed
- [ ] Privacy policy URL resolves (HTTP 200, no redirect loop)
- [ ] Support URL resolves

### 2.4 Screenshots
> App record → Version Information → Screenshots

- [ ] iPhone 6.7-inch screenshots (min 3, max 10): uploaded
- [ ] iPhone 6.5-inch screenshots: uploaded or N/A (auto-scaled from 6.7)
- [ ] iPad 12.9-inch (6th gen) screenshots: uploaded or N/A
- [ ] All screenshots pass Apple composition rules (no simulated device frames unless pixel-accurate)

### 2.5 TestFlight
> TestFlight tab in App Store Connect

- [ ] TestFlight build uploaded and processed (status: "Ready to Submit", not "Processing")
- [ ] Beta App Review information filled (beta description + feedback email + contact info)
- [ ] Internal testers added and build distributed
- [ ] At least one successful install confirmed from TestFlight

### 2.6 Review Notes
> App record → Version Information → Review Information

- [ ] Review notes added explaining moderation/safety features (Hive AI, user reporting flow)
- [ ] Demo account credentials provided (non-production, non-PII test account)
- [ ] Notes confirm no login wall for reviewer (or demo credentials allow full access)

Evidence links/notes:
- App Store Connect URL:
- TestFlight build number / version string:
- App Privacy submission screenshot:
- Review notes reference:

---

## 3. Signing Material
> All secrets stored in GitHub → Settings → Secrets and variables → Actions

### 3.1 Android Upload Keystore
- [ ] ANDROID_KEYSTORE_BASE64 — GitHub Actions secret set
- [ ] ANDROID_KEY_ALIAS — GitHub Actions secret set
- [ ] ANDROID_KEYSTORE_PASSWORD — GitHub Actions secret set
- [ ] ANDROID_KEY_PASSWORD — GitHub Actions secret set
- [ ] Keystore backed up securely offline (password manager or key escrow — NOT in git)
- [ ] Keystore SHA-256 fingerprint recorded below
- [ ] scripts/validate-signing-material.sh passes locally

### 3.2 iOS Distribution Certificate + Provisioning Profile
- [ ] IOS_CERTIFICATE_P12_BASE64 — GitHub Actions secret set (Apple Distribution cert)
- [ ] IOS_CERTIFICATE_PASSWORD — GitHub Actions secret set
- [ ] IOS_PROVISIONING_PROFILE_BASE64 — GitHub Actions secret set (App Store distribution profile)
- [ ] iOS certificate expiry > 90 days from today
- [ ] Provisioning profile expiry > 90 days from today
- [ ] scripts/validate-signing-material.sh passes locally

### 3.3 Firebase / Google Services
- [ ] GOOGLE_SERVICES_JSON — GitHub Actions secret set (base64-encoded google-services.json)
- [ ] GOOGLE_SERVICES_PLIST_BASE64 — GitHub Actions secret set (base64-encoded GoogleService-Info.plist)

Evidence links/notes:
- Keystore generation date:
- Keystore SHA-256 fingerprint (from `keytool -list -v -keystore upload-keystore.jks`):
- iOS certificate serial number:
- Provisioning profile UUID:

---

## Sign-off

All items above must be checked before GA. CI gate (`launch-readiness-gate.yml`) enforces §1–§2 automatically.

| Role | Name | Date | Approved |
|------|------|------|----------|
| Mobile lead | | | |
| Product lead | | | |
