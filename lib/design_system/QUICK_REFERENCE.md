# Lythaus Design System - Quick Reference

## 12 Components at a Glance

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Button** | Primary actions | 4 variants, loading state, disabled support |
| **Text Input** | Form fields | 5 input types, validation, error messages |
| **Card** | Content containers | 4 styles, elevation, tap handlers |
| **Icon Button** | Compact actions | 3 variants, 48x48 tap target, tooltips |
| **Confirm Dialog** | Confirmation flows | Async handling, customizable buttons |
| **Snackbar** | Notifications | 4 types (info/success/warning/error), dismissable |
| **List Row** | List items | Title/subtitle, leading/trailing, divider |
| **Chip** | Tags & filters | 4 types, selectable, removable |
| **Slider** | Range input | Min/max, value labels, keyboard nav |
| **Icon** | Icons | 3 sizes (small/medium/large), semantic |
| **Empty State** | No content | Icon, title, subtitle, optional action |
| **Skeleton** | Loading | 3 shapes (line/box/circle), animated pulse |

---

## Token Access Patterns

### Via BuildContext
```dart
context.spacing.lg       // 16.0
context.radius.card      // 12.0
context.motion.standard  // Duration(ms: 300)
context.colorScheme.primary
context.textTheme.bodyMedium
```

### Common Usage
```dart
Padding(
  padding: EdgeInsets.all(context.spacing.md.toDouble()),
  child: Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(context.radius.card),
      color: context.colorScheme.surface,
    ),
    child: Text(
      'Hello',
      style: context.textTheme.headlineSmall,
    ),
  ),
)
```

---

## Component Snippets

### Button
```dart
LythButton.primary(label: 'Save', onPressed: _save)
LythButton.secondary(label: 'Cancel', onPressed: _cancel)
LythButton.loading(label: 'Processing')
```

### Text Input
```dart
LythTextInput.email(label: 'Email', onChanged: _setEmail)
LythTextInput.password(label: 'Password', onChanged: _setPwd)
LythTextInput.textarea(label: 'Message', maxLines: 5)
```

### Card
```dart
LythCard.elevated(onTap: _handleTap, child: content)
LythCard.filled(child: content)
```

### Icon Button
```dart
LythIconButton.standard(icon: Icons.favorite, onPressed: _like)
LythIconButton.filled(icon: Icons.delete, onPressed: _delete)
```

### Dialog
```dart
showDialog<bool>(
  context: context,
  builder: (_) => LythConfirmDialog(
    title: 'Delete?',
    onConfirm: () => Navigator.pop(context, true),
  ),
)
```

### Snackbar
```dart
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(content: LythSnackbar.success(message: 'Saved!'))
)
```

### List Row
```dart
LythListRow(
  title: 'Settings',
  subtitle: 'Preferences',
  leadingIcon: Icons.settings,
  onTap: _openSettings,
)
```

### Chip
```dart
LythChip.filter(
  label: 'Flutter',
  selected: _isSelected,
  onSelected: _toggle,
)
```

### Slider
```dart
LythSlider(
  value: _volume,
  onChanged: (v) => _setVolume(v),
  min: 0,
  max: 100,
)
```

### Icon
```dart
LythIcon.medium(icon: Icons.check, color: Colors.green)
LythIcon.large(icon: Icons.star)
```

### Empty State
```dart
LythEmptyState(
  icon: Icons.inbox,
  title: 'No Messages',
  actionLabel: 'Refresh',
  onAction: _refresh,
)
```

### Skeleton
```dart
LythSkeleton.line(height: 16)
LythSkeleton.box(width: 100, height: 100)
LythSkeleton.circle(radius: 24)
```

---

## Accessibility Checklist

- ✅ All interactive elements: 48x48 tap target minimum
- ✅ Color contrast: WCAG AA compliant
- ✅ Keyboard support: Full navigation via Material
- ✅ Semantic colors: Used consistently
- ✅ Reduce motion: Animations respect setting
- ✅ Screen readers: Proper labeling

---

## Common Patterns

### Loading with Skeleton
```dart
FutureBuilder(
  future: _loadData(),
  builder: (context, snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return ListView.builder(
        itemCount: 5,
        itemBuilder: (_) => Padding(
          padding: EdgeInsets.all(context.spacing.md.toDouble()),
          child: LythSkeleton.box(width: double.infinity, height: 60),
        ),
      );
    }
    return _buildContent();
  },
)
```

### Form with Validation
```dart
LythTextInput.email(
  label: 'Email',
  onChanged: _setEmail,
  errorText: _emailError,
)
LythButton.primary(
  label: 'Submit',
  onPressed: _isFormValid ? _submit : null,
)
```

### List with Empty State
```dart
if (_items.isEmpty) {
  LythEmptyState(
    icon: Icons.shopping_cart,
    title: 'No Items',
    actionLabel: 'Browse',
    onAction: _browse,
  )
} else {
  ListView.builder(
    itemCount: _items.length,
    itemBuilder: (_, i) => LythListRow(
      title: _items[i].title,
      onTap: () => _viewItem(_items[i]),
    ),
  )
}
```

---

## File Imports

### Import all components
```dart
import 'package:lythaus/design_system/components/index.dart';
```

### Import theme helpers
```dart
import 'package:lythaus/design_system/theme/theme_build_context_x.dart';
```

### Individual imports
```dart
import 'package:lythaus/design_system/components/lyth_button.dart';
import 'package:lythaus/design_system/components/lyth_text_input.dart';
```

---

## Design System Integration

The design system is organized as:

```
lib/design_system/
├── components/      # 12 UI components
├── theme/          # Color schemes, extensions, tokens access
├── tokens/         # Spacing, radius, motion, color definitions
└── widgets/        # Utility widgets (Wordmark, etc.)
```

**Access tokens in any widget:**
```dart
// All of these work via BuildContext
context.spacing.lg          // Spacing token
context.radius.card         // Radius token
context.motion.standard     // Motion token
context.colorScheme.primary // Material 3 color
context.textTheme.bodyMedium // Material text style
```

---

## Version
**v1.0.0** - Full design system with 12 components + complete token system
