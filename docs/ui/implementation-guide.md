# Lythaus Design System - Step 1 Implementation Guide

**Status:** Foundation Complete ✅  
**Last Updated:** January 12, 2026  
**Next Phase:** Main app integration + remaining components

---

## Overview

The Lythaus design system foundation has been successfully implemented. This guide covers:

1. What's been built (token layer + wordmark + 4 components)
2. How to integrate into the main app
3. How to build the remaining 9 components
4. How to migrate existing screens
5. Enforcement strategy

---

## Part 1: Integration into Main App

### Step 1.1: Update main.dart

Replace the MaterialApp theme configuration to use `LythausTheme`:

**File:** [lib/main.dart](lib/main.dart)

**Change from:**
```dart
MaterialApp(
  title: 'Lythaus',
  theme: AsoraTheme.light(),
  darkTheme: AsoraTheme.dark(),
  themeMode: ThemeMode.system,
  home: const AuthGate(),
)
```

**Change to:**
```dart
import 'package:asora/design_system/index.dart';

MaterialApp(
  title: 'Lythaus',
  theme: LythausTheme.light(),
  darkTheme: LythausTheme.dark(),
  themeMode: ThemeMode.system,
  home: const AuthGate(),
)
```

**Why:** This activates the new design system globally for all screens.

**Breakage:** None - Material components will use the new theme automatically.

---

## Part 2: What's Available Now

### 2.1 Token Access

In any widget, access tokens via BuildContext:

```dart
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(context.spacing.lg),
      child: Container(
        decoration: BoxDecoration(
          color: context.colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(context.radius.card.toDouble()),
        ),
        child: Text(
          'Hello Lythaus',
          style: context.textTheme.headlineMedium?.copyWith(
            color: context.colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}
```

**Available tokens:**
- `context.colorScheme.*` - Material 3 colors (primary, surface, error, etc.)
- `context.spacing.{xs, sm, md, lg, xl, xxl, xxxl, huge}`
- `context.radius.{xs, sm, md, lg, xl, pill, circle}` (plus semantic: card, button, input, dialog)
- `context.motion.{quick, standard, prominent, slow}`
- `context.motion.{wordmarkPulseInterval, wordmarkPulseDuration}`
- `context.textTheme.*` - Typography (displayLarge, headlineMedium, bodyLarge, labelSmall, etc.)
- `context.disableAnimations` - Boolean for accessibility

### 2.2 Built-In Components

Use semantic components instead of raw Material widgets:

```dart
// Buttons
LythButton.primary(
  label: 'Save',
  onPressed: _save,
)

LythButton.secondary(
  label: 'Cancel',
  onPressed: () => Navigator.pop(context),
)

LythButton.destructive(
  label: 'Delete Forever',
  onPressed: _delete,
  icon: Icons.delete,
)

// Text Inputs
LythTextInput.email(
  label: 'Email Address',
  placeholder: 'you@example.com',
  onChanged: (value) { /* ... */ },
)

LythTextInput.password(
  label: 'Password',
  onChanged: (value) { /* ... */ },
)

// Cards
LythCard(
  child: Column(
    children: [...],
  ),
)

LythCard.clickable(
  onTap: () => _showDetails(),
  child: Row(
    children: [...],
  ),
)

// Wordmark
LythWordmark(size: LythWordmarkSize.large)
```

---

## Part 3: Building Remaining Components

### 3.1 Which Components to Build

**Priority Order** (by dependency):
1. ✅ Button
2. ✅ Text Input
3. ✅ Card
4. 📋 **Icon Button** - Needed by: Dialog, List Row, Input fields
5. 📋 **Confirm Dialog** - Needed by: Destructive actions, Settings changes
6. 📋 **Snackbar** - Needed by: Feedback, Errors, Undo actions
7. 📋 **List Row** - Needed by: Feed, Settings, Lists
8. 📋 **Chip** - Needed by: Filters, Tags, Selection
9. 📋 **Slider** - Needed by: Settings (volume, sensitivity, etc.)
10. 📋 **Icon** - Needed by: Any icon usage (semantic sizing/color)
11. 📋 **Empty State** - Needed by: Empty feeds, no results
12. 📋 **Skeleton** - Needed by: Loading states

### 3.2 Icon Button Template

**File:** `lib/design_system/components/lyth_icon_button.dart`

```dart
library;

import 'package:flutter/material.dart';
import '../theme/theme_build_context_x.dart';

/// Icon-only button component
class LythIconButton extends StatelessWidget {
  /// The icon to display
  final IconData icon;
  
  /// Size of the button (48x48 recommended for touch)
  final double size;
  
  /// Callback when pressed
  final VoidCallback? onPressed;
  
  /// Whether button is disabled
  final bool disabled;
  
  /// Tooltip for accessibility
  final String? tooltip;
  
  /// Custom icon color
  final Color? color;

  const LythIconButton({
    required this.icon,
    this.size = 48,
    this.onPressed,
    this.disabled = false,
    this.tooltip,
    this.color,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final iconColor = color ?? context.colorScheme.onSurface;
    
    return Tooltip(
      message: tooltip ?? '',
      child: SizedBox(
        width: size,
        height: size,
        child: IconButton(
          icon: Icon(icon, color: iconColor),
          onPressed: disabled ? null : onPressed,
          splashRadius: size / 2,
        ),
      ),
    );
  }
}
```

### 3.3 Pattern for Building Components

Each component should:

1. **Use semantic naming** - `LythComponentName` prefix
2. **Provide variants** - `.primary()`, `.secondary()`, etc. named constructors
3. **Include sizes** - Small, Medium, Large enums
4. **Support common states** - Loading, disabled, error
5. **Access tokens only via BuildContext**
6. **Include Dart doc comments** with usage examples
7. **Respect reduce-motion** for animations
8. **Have min 48x48 tap targets** for buttons/interactive

**Template:**
```dart
library;

import 'package:flutter/material.dart';
import '../theme/theme_build_context_x.dart';

/// [LythComponentName] brief description
/// 
/// Longer description of what this component does and when to use it.
/// 
/// Usage:
/// ```dart
/// LythComponentName(
///   property: value,
/// )
/// ```
class LythComponentName extends StatelessWidget {
  final String? property;

  const LythComponentName({
    this.property,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      // Always use tokens, never hardcode values
      padding: EdgeInsets.all(context.spacing.lg),
      decoration: BoxDecoration(
        color: context.colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(context.radius.card.toDouble()),
      ),
      child: Text(
        property ?? 'Default',
        style: context.textTheme.bodyMedium?.copyWith(
          color: context.colorScheme.onSurface,
        ),
      ),
    );
  }
}
```

---

## Part 4: Migrating Existing Screens

### 4.1 Migration Checklist

For each screen, systematically replace:

**Before (Old System):**
```dart
Container(
  padding: const EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: const Color(0xFFF7F9FC),
    borderRadius: BorderRadius.circular(12),
  ),
  child: ElevatedButton(
    style: ElevatedButton.styleFrom(
      backgroundColor: const Color(0xFF1CA3A3),
    ),
    onPressed: () {},
    child: const Text('Click'),
  ),
)
```

**After (New System):**
```dart
LythCard(
  child: LythButton.primary(
    label: 'Click',
    onPressed: () {},
  ),
)
```

### 4.2 Migration Plan by Screen

Create [docs/ui/migration-tracker.md](docs/ui/migration-tracker.md):

```markdown
# Migration Tracker

## Priority 1: App Shell (High Leverage)
- [ ] lib/main.dart - Update theme (1 change)
- [ ] lib/features/auth/presentation/auth_gate.dart - Check no hardcoded colors
- [ ] lib/screens/* - Check app-level styling

## Priority 2: Core Flows (User-Facing)
- [ ] Auth/Login screens
- [ ] Feed screen
- [ ] Post card components

## Priority 3: Supporting Screens
- [ ] Settings screens
- [ ] Profile screens
- [ ] Detail screens

## Priority 4: Admin/Internal
- [ ] Moderation screens
- [ ] Admin dashboard
- [ ] Developer tools

## Pattern: For Each Screen
1. Find all `EdgeInsets.all(...)` → Replace with `context.spacing.*`
2. Find all `const Color(0xFF...)` → Replace with `context.colorScheme.*`
3. Find all `BorderRadius.circular(...)` → Replace with `context.radius.*`
4. Find all `ElevatedButton/OutlinedButton/TextButton` → Replace with `LythButton.variant()`
5. Find all `TextField` → Replace with `LythTextInput.variant()`
6. Find all bare `Container(...)` that looks like a card → Replace with `LythCard`
```

---

## Part 5: Enforcement Strategy

### 5.1 Lint Rules (Option A: Custom Lint)

**File:** `analysis_options.yaml`

Add rule to prevent hardcoded colors in feature code:

```yaml
custom_lint:
  rules:
    - no_hardcoded_colors:
        # Allow only in: design_system, theme
        exclude: ['lib/design_system/**', 'lib/ui/theme/**']
    - no_hardcoded_spacing:
        exclude: ['lib/design_system/**', 'lib/ui/theme/**']
```

### 5.2 CI Checks (Option B: Simple Grep)

**File:** `.github/scripts/check-design-system-compliance.sh`

```bash
#!/bin/bash

# Fail if hardcoded colors found outside design_system
VIOLATIONS=$(grep -r "Color(0x" lib/features lib/screens lib/widgets \
  | grep -v "design_system" \
  | wc -l)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "❌ Found $VIOLATIONS hardcoded colors outside design system"
  exit 1
fi

# Fail if hardcoded spacing found
SPACING=$(grep -r "EdgeInsets.all(1[0-9]\|EdgeInsets.symmetric(horizontal: [0-9]\+," lib/features lib/screens \
  | grep -v "design_system" \
  | wc -l)

if [ "$SPACING" -gt 0 ]; then
  echo "❌ Found $SPACING hardcoded spacing values"
  exit 1
fi

echo "✅ Design system compliance check passed"
```

**Add to:** `.github/workflows/ci.yml`

```yaml
- name: Check Design System Compliance
  run: bash .github/scripts/check-design-system-compliance.sh
```

---

## Part 6: Testing

### 6.1 Component Tests

**File:** `test/design_system/components/lyth_button_test.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:asora/design_system/index.dart';

void main() {
  group('LythButton', () {
    testWidgets('renders primary variant', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: LythausTheme.light(),
          home: Scaffold(
            body: LythButton.primary(
              label: 'Test',
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.text('Test'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('calls onPressed when tapped', (WidgetTester tester) async {
      var pressed = false;
      
      await tester.pumpWidget(
        MaterialApp(
          theme: LythausTheme.light(),
          home: Scaffold(
            body: LythButton.primary(
              label: 'Press',
              onPressed: () => pressed = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Press'));
      expect(pressed, isTrue);
    });

    testWidgets('respects disabled state', (WidgetTester tester) async {
      var pressed = false;
      
      await tester.pumpWidget(
        MaterialApp(
          theme: LythausTheme.light(),
          home: Scaffold(
            body: LythButton(
              label: 'Disabled',
              onPressed: () => pressed = true,
              disabled: true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Disabled'));
      expect(pressed, isFalse);
    });
  });
}
```

---

## Part 7: Documentation

### 7.1 Component API Docs

Each component should have comprehensive Dart doc comments:

```dart
/// Semantic text input field
/// 
/// High-level wrapper around TextField providing consistent design system styling.
/// 
/// **Variants:**
/// - Standard: General text input
/// - `.email()`: Email-specific validation and keyboard
/// - `.password()`: Obscured text with lock icon
/// 
/// **Features:**
/// - Label and placeholder text
/// - Helper text and error messages
/// - Leading and trailing icons with callbacks
/// - Full accessibility support (labels, error states)
/// - Loading state support
/// 
/// **Styling:**
/// All styling uses design system tokens:
/// - Colors: Via colorScheme (outline, surface, error)
/// - Spacing: Via spacing tokens (contentPadding, gaps)
/// - Radius: Via radius.input token
/// - Typography: Via textTheme.bodyLarge/labelSmall
/// 
/// Do not pass hardcoded colors, spacing, or border radius.
/// 
/// **Examples:**
/// 
/// Basic input:
/// ```dart
/// LythTextInput(
///   label: 'Username',
///   placeholder: 'user@example.com',
///   onChanged: (value) { /* ... */ },
/// )
/// ```
/// 
/// Email input:
/// ```dart
/// LythTextInput.email(
///   label: 'Email',
///   onChanged: (value) { /* ... */ },
///   onSubmitted: () { /* validate */ },
/// )
/// ```
/// 
/// Password with error:
/// ```dart
/// LythTextInput.password(
///   label: 'Password',
///   onChanged: _validatePassword,
///   errorText: _passwordError,
/// )
/// ```
class LythTextInput extends StatefulWidget {
  // ...
}
```

---

## Part 8: Next Steps

### Immediate (1-2 days)
1. ✅ Foundation built (DONE)
2. 📋 Update main.dart to use LythausTheme
3. 📋 Create 4 remaining high-priority components:
   - Icon Button (30 min)
   - Confirm Dialog (60 min)
   - Snackbar (45 min)
   - List Row (60 min)

### Short-term (1-2 weeks)
4. 📋 Migrate high-leverage screens:
   - App shell / Navigation
   - Auth screens
   - Feed + Post cards
   - Settings

5. 📋 Create lint enforcement rules
6. 📋 Create component tests (golden tests)

### Medium-term (3-4 weeks)
7. 📋 Complete remaining 4 components
8. 📋 Migrate all screens systematically
9. 📋 Remove old theme system (lib/ui/theme/asora_theme.dart)
10. 📋 Web control panel equivalents (React/CSS)

---

## FAQ

**Q: Can I keep using the old theme?**
A: For now, yes. Both systems coexist. But new code must use the design system.

**Q: What if I need a value not in the tokens?**
A: Don't hardcode it. Add it as a token (for design consistency), or ask design team.

**Q: Do I have to use LythButton?**
A: In new code, yes. Existing code can be migrated gradually.

**Q: Can I customize component styling?**
A: Use constructor parameters (size, variant, color overrides). Don't add inline styles.

**Q: What about dark mode?**
A: Automatic. LythausTheme.dark() provides the colors. Just use context.colorScheme.

**Q: Does reduce-motion work?**
A: Yes. All animations check MediaQuery.disableAnimationsOf(context). Test it!

---

## Validation Checklist

Before considering Step 1 complete:

- [ ] main.dart updated to use LythausTheme
- [ ] App builds and runs without errors
- [ ] Light and dark themes render correctly
- [ ] All token accessors work (spacing, radius, etc.)
- [ ] Existing buttons/cards/inputs render with new theme
- [ ] Wordmark displays and animates (when reduce-motion off)
- [ ] No hardcoded colors in new components
- [ ] Component tests pass
- [ ] Migration tracker document created
- [ ] Lint rules configured (or grep checks ready)

---

## Files Summary

**Created:**
- ✅ 13 Dart files in lib/design_system/
- ✅ 1 barrel export (index.dart)
- ✅ 2 documentation files

**Modified:**
- 📋 lib/main.dart (needs theme update)

**Total:** ~1,369 lines of production code

---

## Support & Questions

If you get stuck:
1. Check the Dart doc comments in component files
2. Review design-system-foundation.md for token reference
3. Look at template examples in this guide
4. Test with `flutter analyze lib/design_system`

**Next action:** Update main.dart and verify app still builds ✨
