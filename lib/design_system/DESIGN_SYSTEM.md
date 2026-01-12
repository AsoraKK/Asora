# Lythaus Design System

Comprehensive component library and design tokens for the Lythaus product.

## Components (12)

### 1. **Button** (`LythButton`)
Primary action component with multiple variants.

**Variants:**
- `.primary()` - Primary action (filled)
- `.secondary()` - Secondary action (outlined)
- `.tertiary()` - Tertiary action (text-only)
- `.loading()` - Loading state with spinner

**Features:**
- Loading states with spinner
- Disabled state support
- Full width option
- Semantic sizing
- Accessibility: 48x48 minimum tap target

**Usage:**
```dart
LythButton.primary(
  label: 'Submit',
  onPressed: _handleSubmit,
)

LythButton.loading(label: 'Processing')
```

---

### 2. **Text Input** (`LythTextInput`)
Form field with validation and error handling.

**Variants:**
- `.standard()` - Default text input
- `.password()` - Masked password field
- `.textarea()` - Multi-line text input
- `.email()` - Email validation
- `.numeric()` - Numeric input only

**Features:**
- Error state with message
- Helper text support
- Loading indicator
- Character count
- Focus indication

**Usage:**
```dart
LythTextInput.email(
  label: 'Email',
  onChanged: (value) => _email = value,
  validator: (value) => _validateEmail(value),
)

LythTextInput.textarea(
  label: 'Message',
  maxLines: 5,
  helperText: 'Max 500 characters',
)
```

---

### 3. **Card** (`LythCard`)
Container for grouped content.

**Variants:**
- `.standard()` - Default card
- `.elevated()` - Elevated with shadow
- `.filled()` - Filled background
- `.outlined()` - Border only

**Features:**
- On-tap handler
- Custom padding
- Flexible content layout

**Usage:**
```dart
LythCard.elevated(
  onTap: _handleTap,
  child: Column(
    children: [
      Text('Title'),
      Text('Content'),
    ],
  ),
)
```

---

### 4. **Icon Button** (`LythIconButton`)
Compact button for single icon action.

**Variants:**
- `.standard()` - Default icon button
- `.filled()` - Filled background
- `.tonal()` - Tonal background

**Features:**
- Loading state support
- Disabled state
- Tooltip support
- 48x48 minimum tap target

**Usage:**
```dart
LythIconButton.standard(
  icon: Icons.favorite,
  onPressed: _toggleLike,
  tooltip: 'Like',
)
```

---

### 5. **Confirm Dialog** (`LythConfirmDialog`)
Modal for confirmation actions.

**Features:**
- Customizable title and message
- Primary and secondary buttons
- Async handling
- Accessibility focused

**Usage:**
```dart
final confirmed = await showDialog<bool>(
  context: context,
  builder: (_) => LythConfirmDialog(
    title: 'Delete?',
    message: 'This cannot be undone.',
    confirmLabel: 'Delete',
    onConfirm: () => Navigator.pop(context, true),
  ),
) ?? false;
```

---

### 6. **Snackbar** (`LythSnackbar`)
Inline notifications and feedback.

**Variants:**
- `.info()` - Information message
- `.success()` - Success message
- `.warning()` - Warning message
- `.error()` - Error message

**Features:**
- Auto-dismiss with duration
- Action button support
- Animated entry/exit
- Respects reduce-motion

**Usage:**
```dart
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(content: LythSnackbar.success(
    message: 'Saved!',
    action: 'Undo',
    onAction: _undo,
  )),
);
```

---

### 7. **List Row** (`LythListRow`)
Semantic list item component.

**Features:**
- Title and subtitle support
- Leading and trailing widgets
- On-tap handler
- Divider support
- Visual feedback

**Usage:**
```dart
LythListRow(
  title: 'Settings',
  subtitle: 'App preferences',
  leadingIcon: Icons.settings,
  trailingIcon: Icons.arrow_forward,
  onTap: _openSettings,
)
```

---

### 8. **Chip** (`LythChip`)
Compact, selectable tag component.

**Variants:**
- `.filter()` - Filter/selection chip
- `.input()` - Input chip with delete
- `.suggestion()` - Suggestion chip
- `.action()` - Action chip

**Features:**
- Selected state
- Removable option
- Icon support
- On-tap handler

**Usage:**
```dart
LythChip.filter(
  label: 'Flutter',
  selected: isFlutterSelected,
  onSelected: (selected) => _toggleFilter('Flutter'),
)

LythChip.input(
  label: 'Tag',
  onDeleted: () => _removeTag('Tag'),
)
```

---

### 9. **Slider** (`LythSlider`)
Range input component.

**Features:**
- Value label display
- Min/max value support
- Division marks
- Accessibility: Keyboard navigation
- Respects reduce-motion

**Usage:**
```dart
LythSlider(
  value: _volume,
  onChanged: (value) => setState(() => _volume = value),
  min: 0,
  max: 100,
  label: 'Volume',
)
```

---

### 10. **Icon** (`LythIcon`)
Semantic icon component with sizing.

**Factories:**
- `.small()` - 16x16
- `.medium()` - 24x24
- `.large()` - 32x32

**Features:**
- Semantic sizing
- Custom color support
- Consistent scaling

**Usage:**
```dart
LythIcon.medium(
  icon: Icons.check,
  color: context.colorScheme.primary,
)
```

---

### 11. **Empty State** (`LythEmptyState`)
Placeholder for empty content.

**Features:**
- Icon display
- Title and subtitle
- Optional action button
- Centered layout

**Usage:**
```dart
LythEmptyState(
  icon: Icons.inbox,
  title: 'No Messages',
  subtitle: 'You have no new messages',
  actionLabel: 'Refresh',
  onAction: _refresh,
)
```

---

### 12. **Skeleton** (`LythSkeleton`)
Loading placeholder component.

**Factories:**
- `.line()` - Text placeholder
- `.box()` - Content placeholder
- `.circle()` - Avatar placeholder

**Features:**
- Animated pulsing (respects reduce-motion)
- Custom sizing
- Customizable border radius

**Usage:**
```dart
LythSkeleton.line(height: 16)
LythSkeleton.box(width: 100, height: 100)
LythSkeleton.circle(radius: 24)
```

---

## Design Tokens

### Spacing
Token-based spacing values for consistent margins and padding.

```dart
context.spacing.xs      // 4
context.spacing.sm      // 8
context.spacing.md      // 12
context.spacing.lg      // 16
context.spacing.xl      // 24
context.spacing.xxl     // 32
context.spacing.xxxl    // 48
context.spacing.huge    // 64
```

### Radius
Standardized border radius values.

```dart
context.radius.xs       // 2
context.radius.sm       // 4
context.radius.md       // 8
context.radius.lg       // 12
context.radius.xl       // 16
context.radius.pill     // 24
context.radius.circle   // 999
context.radius.card     // 12
context.radius.button   // 8
context.radius.input    // 8
context.radius.dialog   // 16
```

### Motion
Animation durations and curves.

```dart
context.motion.quick           // 150ms
context.motion.standard        // 300ms
context.motion.prominent       // 500ms
context.motion.slow            // 1000ms
context.motion.standardCurve   // Curves.easeInOutCubic
context.motion.entranceCurve   // Curves.easeOutCubic
context.motion.exitCurve       // Curves.easeInCubic
context.motion.emphasisCurve   // Curves.elasticOut
```

### Color Scheme
Material 3 compliant color scheme with semantic colors.

```dart
context.colorScheme.primary
context.colorScheme.secondary
context.colorScheme.surface
context.colorScheme.error
context.colorScheme.onSurface
```

---

## Accessibility

All components follow Material 3 accessibility guidelines:

- **Minimum tap targets**: 48x48 logical pixels for interactive elements
- **Keyboard navigation**: Full support via Material widgets
- **Color contrast**: WCAG AA compliance
- **Semantic colors**: Used consistently across components
- **Reduce motion**: Animations respect `disableAnimations` setting
- **Screen readers**: Proper labeling and semantics

---

## Theme Integration

Access tokens via `BuildContext` extension:

```dart
// In any widget with BuildContext
Widget build(BuildContext context) {
  return Padding(
    padding: EdgeInsets.all(context.spacing.lg.toDouble()),
    child: Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(context.radius.card),
      ),
      child: Text(
        'Hello',
        style: context.textTheme.headlineSmall,
      ),
    ),
  );
}
```

---

## File Structure

```
lib/design_system/
├── components/              # 12 component files
│   ├── lyth_button.dart
│   ├── lyth_card.dart
│   ├── lyth_chip.dart
│   ├── lyth_confirm_dialog.dart
│   ├── lyth_empty_state.dart
│   ├── lyth_icon.dart
│   ├── lyth_icon_button.dart
│   ├── lyth_list_row.dart
│   ├── lyth_skeleton.dart
│   ├── lyth_slider.dart
│   ├── lyth_snackbar.dart
│   ├── lyth_text_input.dart
│   └── index.dart           # Barrel export
│
├── theme/                   # Theme configuration
│   ├── lyth_color_schemes.dart
│   ├── lyth_theme_extensions.dart
│   ├── lyth_theme_data.dart
│   ├── theme_build_context_x.dart
│   └── index.dart
│
├── tokens/                  # Design tokens
│   ├── motion.dart
│   ├── radius.dart
│   ├── spacing.dart
│   └── color.dart
│
└── widgets/                 # Utility widgets
    ├── lyth_wordmark.dart
    └── index.dart
```

---

## Best Practices

### 1. Use Semantic Constructors
```dart
// ✅ Good
LythButton.primary(label: 'Save', onPressed: _save)

// ❌ Avoid
RaisedButton(child: Text('Save'), onPressed: _save)
```

### 2. Access Tokens via BuildContext
```dart
// ✅ Good
padding: EdgeInsets.all(context.spacing.md.toDouble())

// ❌ Avoid
padding: EdgeInsets.all(16)
```

### 3. Respect Accessibility Settings
```dart
// ✅ Good - Built-in to all components
LythSkeleton.line()  // Auto-respects reduce-motion

// ❌ Avoid
AnimatedContainer()  // Without checking disableAnimations
```

### 4. Use Confirm Dialog for Destructive Actions
```dart
// ✅ Good
final confirmed = await showDialog<bool>(
  context: context,
  builder: (_) => LythConfirmDialog(...),
) ?? false;

// ❌ Avoid
final confirmed = await _showCustomDialog();
```

### 5. Maintain Consistent Spacing
```dart
// ✅ Good
Column(
  spacing: context.spacing.md.toDouble(),
  children: [...],
)

// ❌ Avoid
Column(
  children: [
    child1,
    SizedBox(height: 16),
    child2,
  ],
)
```

---

## Extending the Design System

To add a new component:

1. Create `lib/design_system/components/lyth_my_component.dart`
2. Implement semantic named constructors
3. Use `BuildContext` to access tokens
4. Add comprehensive Dart doc comments
5. Support all required states (loading, disabled, error)
6. Export from `lib/design_system/components/index.dart`
7. Document in this README

---

## Testing Components

Each component should include:
- Widget tests for all variants
- Accessibility tests (semantic colors, contrast)
- State transition tests
- Responsive layout tests

---

## Version History

- **v1.0.0** - Initial 12 components, full theme integration
  - Button, Text Input, Card
  - Icon Button, Confirm Dialog, Snackbar
  - List Row, Chip, Slider
  - Icon, Empty State, Skeleton
  - Complete token system (spacing, radius, motion)

