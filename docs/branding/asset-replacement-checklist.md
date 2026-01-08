# Lythaus Beta Asset Replacement Checklist

> **Status:** Required for beta launch  
> **Last updated:** 2026-01-08

This document tracks all assets that need replacement for the Lythaus rebrand.

---

## 1. App Icon Assets (REQUIRED)

### Android (Adaptive Icons)

Replace all launcher icons in the following directories:

| Directory | File | Size |
|-----------|------|------|
| `android/app/src/main/res/mipmap-hdpi/` | `ic_launcher.png` | 72×72 |
| `android/app/src/main/res/mipmap-mdpi/` | `ic_launcher.png` | 48×48 |
| `android/app/src/main/res/mipmap-xhdpi/` | `ic_launcher.png` | 96×96 |
| `android/app/src/main/res/mipmap-xxhdpi/` | `ic_launcher.png` | 144×144 |
| `android/app/src/main/res/mipmap-xxxhdpi/` | `ic_launcher.png` | 192×192 |

**Adaptive icon files (if using):**
- `ic_launcher_foreground.png` (each density)
- `ic_launcher_background.png` (each density)

### iOS

Replace all icons in `ios/Runner/Assets.xcassets/AppIcon.appiconset/`:

| File | Size |
|------|------|
| `Icon-App-20x20@1x.png` | 20×20 |
| `Icon-App-20x20@2x.png` | 40×40 |
| `Icon-App-20x20@3x.png` | 60×60 |
| `Icon-App-29x29@1x.png` | 29×29 |
| `Icon-App-29x29@2x.png` | 58×58 |
| `Icon-App-29x29@3x.png` | 87×87 |
| `Icon-App-40x40@1x.png` | 40×40 |
| `Icon-App-40x40@2x.png` | 80×80 |
| `Icon-App-40x40@3x.png` | 120×120 |
| `Icon-App-60x60@2x.png` | 120×120 |
| `Icon-App-60x60@3x.png` | 180×180 |
| `Icon-App-76x76@1x.png` | 76×76 |
| `Icon-App-76x76@2x.png` | 152×152 |
| `Icon-App-83.5x83.5@2x.png` | 167×167 |
| `Icon-App-1024x1024@1x.png` | 1024×1024 |

---

## 2. Splash Screen / Launch Screen (REQUIRED)

### iOS

Replace images in `ios/Runner/Assets.xcassets/LaunchImage.imageset/`:

| File | Resolution |
|------|------------|
| `LaunchImage.png` | 1x |
| `LaunchImage@2x.png` | 2x |
| `LaunchImage@3x.png` | 3x |

The launch screen storyboard (`ios/Runner/Base.lproj/LaunchScreen.storyboard`) uses `LaunchImage` as a centered image on white background.

### Android

Check `android/app/src/main/res/drawable/` for any splash/launch drawable.
The Flutter native splash uses theme configuration—verify `LaunchTheme` and `NormalTheme` in `styles.xml`.

---

## 3. In-App Brand Assets (REQUIRED)

Replace or rename assets in `assets/brand/`:

| Current File | Replace With |
|--------------|--------------|
| `asora_mark.svg` | `lythaus_mark.svg` (or update filename reference) |

**Update references in code:**
- [lib/ui/components/asora_top_bar.dart](lib/ui/components/asora_top_bar.dart#L52) — references `assets/brand/asora_mark.svg`

---

## 4. Store Listing Assets (REQUIRED FOR BETA)

### Android (Google Play Console)

| Asset | Specification | Priority |
|-------|---------------|----------|
| **Feature Graphic** | 1024×500 PNG/JPEG | HIGH |
| **Phone Screenshots** | 16:9 or 9:16, min 320px | HIGH (3-5 min) |
| **Tablet Screenshots** | Optional for beta | LOW |
| **App Icon (high-res)** | 512×512 PNG | HIGH |
| **Short Description** | ≤80 chars with "Lythaus" | HIGH |
| **Full Description** | Uses "Lythaus" branding | HIGH |

### iOS (App Store Connect / TestFlight)

| Asset | Specification | Priority |
|-------|---------------|----------|
| **App Icon** | 1024×1024 (from AppIcon.appiconset) | HIGH |
| **Screenshots (6.7")** | 1290×2796 or 2796×1290 | HIGH (3-5 min) |
| **Screenshots (6.5")** | 1242×2688 or 2688×1242 | MEDIUM |
| **App Name** | "Lythaus" | HIGH |
| **Subtitle** | ≤30 chars | MEDIUM |
| **Description** | Uses "Lythaus" branding | HIGH |
| **What's New (TestFlight)** | Beta release notes | HIGH |

---

## 5. Press Kit / Partner Assets (NICE TO HAVE)

Minimum for beta partner communications:

| Asset | Specification |
|-------|---------------|
| Logo (SVG/PNG) | Lythaus wordmark |
| App Icon (PNG) | 512×512 and 1024×1024 |
| 3 Screenshots | Top features |
| One-liner | "Lythaus – [tagline]" |

---

## 6. Code String Updates (COMPLETED ✅)

The following user-facing strings have been updated:

- [x] Android `android:label` → "Lythaus"
- [x] iOS `CFBundleDisplayName` → "Lythaus"
- [x] iOS `CFBundleName` → "Lythaus"
- [x] `MaterialApp.title` → "Lythaus"
- [x] Feed screen AppBar → "Lythaus"
- [x] About dialog `applicationName` → "Lythaus"
- [x] Starter feeds AppBar → "Lythaus"
- [x] Post success snackbar → "Posted to Lythaus"
- [x] Push notification channel → "Lythaus Notifications"
- [x] User-Agent header → "Lythaus-Flutter/..."
- [x] Mock data author → "Lythaus Newsdesk"

---

## 7. Internal References (DO NOT CHANGE)

These remain as "Asora" per the branding guide:

- Package identifier: `com.asora.app`
- OAuth redirect URIs: `com.asora.app://...`
- Azure B2C tenant: `asoraauthlife.onmicrosoft.com`
- API endpoints: `*.asora.co.za`
- Keychain/preferences: `asora_*` keys
- Dart class names: `AsoraApp`, `AsoraTheme`, `AsoraTracer`, etc.
- File names: `asora_*.dart`
- Observability service name: `asora-mobile`

---

## Action Items

### Immediate (Before Beta)

- [ ] Design: Create Lythaus app icon (all sizes)
- [ ] Design: Create Lythaus splash/launch images
- [ ] Design: Create `lythaus_mark.svg` for in-app use
- [ ] Dev: Replace Android mipmap icons
- [ ] Dev: Replace iOS AppIcon.appiconset
- [ ] Dev: Replace iOS LaunchImage.imageset
- [ ] Dev: Update `asora_top_bar.dart` asset reference

### Store Submission

- [ ] Create feature graphic (Android)
- [ ] Capture 5 screenshots (phone)
- [ ] Write store description with Lythaus branding
- [ ] Include test invite code in reviewer notes
- [ ] Prepare TestFlight "What's New" text
