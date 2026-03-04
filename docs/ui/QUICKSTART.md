# Lythaus Design System - Quick Start

**Status:** ✅ Ready to use  
**Created:** January 12, 2026  
**Commit:** 9dee8f5 (quality/coverage-gates)

---

## 🚀 Get Started in 5 Minutes

### 1. Update main.dart (CRITICAL - do this first)

Open [lib/main.dart](lib/main.dart) and change these lines:

**Find:**
```dart
import 'package:asora/ui/theme/asora_theme.dart';
...
MaterialApp(
  theme: AsoraTheme.light(),
  darkTheme: AsoraTheme.dark(),
```

**Replace with:**
```dart
import 'package:asora/design_system/index.dart';
...
MaterialApp(
  theme: LythausTheme.light(),
  darkTheme: LythausTheme.dark(),
```

✅ Done! The app now uses the new design system.

### 2. Try Using Components

In any widget:

```dart
import 'package:asora/design_system/index.dart';

class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lythaus')),
      body: Padding(
        padding: EdgeInsets.all(context.spacing.lg),
        child: Column(
          children: [
            LythTextInput.email(
              label: 'Email',
              onChanged: (value) {},
            ),
            SizedBox(height: context.spacing.md),
            LythButton.primary(
              label: 'Continue',
              onPressed: () {},
            ),
          ],
        ),
      ),
    );
  }
}
```

### 3. Run the App

```bash
flutter run
```

✅ App should build and run with the new theme!

---

## 📚 Available Components

### Currently Ready

- ✅ **LythButton** - Primary, secondary, tertiary, destructive variants
- ✅ **LythTextInput** - Standard, email, password variants
- ✅ **LythCard** - Standard, clickable, elevated variants
- ✅ **LythWordmark** - Animated logo with glow pulse
- ✅ **All tokens** - Spacing, radius, colors, motion, typography

### Coming Soon (Ready to Build)

- 📋 Icon Button
- 📋 Confirm Dialog
- 📋 Snackbar
- 📋 List Row
- 📋 Chip
- 📋 Slider
- 📋 Icon
- 📋 Empty State
- 📋 Skeleton

---

## 🎨 Using Design Tokens

Access tokens via BuildContext:

```dart
// Spacing
context.spacing.xs   // 4px
context.spacing.sm   // 8px
context.spacing.md   // 12px
context.spacing.lg   // 16px
context.spacing.xl   // 20px
context.spacing.xxl  // 24px
context.spacing.xxxl // 32px
context.spacing.huge // 48px

// Border radius
context.radius.xs              // 4px
context.radius.sm              // 8px (buttons)
context.radius.md              // 12px
context.radius.lg              // 16px
context.radius.xl              // 24px
context.radius.card            // 12px (semantic)
context.radius.button          // 8px (semantic)
context.radius.input           // 8px (semantic)
context.radius.dialog          // 16px (semantic)

// Colors
context.colorScheme.primary    // #EDE3C8 (warm ivory)
context.colorScheme.surface    // #F3F1EC or #121413 (light/dark)
context.colorScheme.onSurface  // #1A1A1A or #E6E2D9 (light/dark)
context.colorScheme.outline    // #B8B2A9 or #3A3D3B (light/dark)
context.colorScheme.error      // Material 3 error

// Animations
context.motion.quick           // 100ms
context.motion.standard        // 200ms
context.motion.prominent       // 300ms
context.motion.slow            // 6s
context.disableAnimations      // Boolean

// Text styles
context.textTheme.displayLarge
context.textTheme.headlineLarge
context.textTheme.titleLarge
context.textTheme.bodyLarge
context.textTheme.labelLarge
// ... and more (see Material 3 TextTheme)
```

---

## ✅ Verification Checklist

After updating main.dart:

- [ ] Run `flutter run` - app launches
- [ ] Tap a button - it responds
- [ ] Switch to dark mode - colors change
- [ ] Open Settings > Accessibility > Remove Animations - wordmark glow pauses
- [ ] Existing screens render with new colors/styling

---

## 🔗 Documentation

For detailed info, see:

- **[design-system-foundation.md](design-system-foundation.md)** - Complete token reference
- **[implementation-guide.md](implementation-guide.md)** - How to build components + migrate screens
- **[SESSION-SUMMARY.md](SESSION-SUMMARY.md)** - What was built and why

---

## 📞 Need Help?

**Q: Components aren't showing?**
A: Make sure you updated main.dart to use LythausTheme.

**Q: Colors look wrong?**
A: Test with `flutter run --enable-software-ui` and check brightness mode.

**Q: Want to add a new color/spacing?**
A: Add to tokens files, then use via context.colorScheme or context.spacing.

**Q: How do I migrate a screen?**
A: Replace hardcoded values with token accessors. See implementation-guide.md.

---

## 🎯 Next Priority

1. ✅ main.dart updated
2. 📋 Build remaining 9 components (~6 hours)
3. 📋 Migrate high-leverage screens (feed, auth, settings)
4. 📋 Set up lint enforcement
5. 📋 Complete screen migrations

---

**Last Updated:** January 12, 2026  
**Commit:** 9dee8f5  
**Status:** Ready for production use ✨
