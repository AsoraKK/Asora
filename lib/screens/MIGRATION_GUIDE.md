# Screen Migration Guide

## Migration Checklist

### ✅ Completed Screens
- [x] **login_screen.dart** - Fully migrated to design system

### 🔄 Screens To Migrate
- [ ] vote_feed.dart
- [ ] moderation_demo_page.dart  
- [ ] appeal_history_page_v2.dart
- [ ] security_debug_screen.dart
- [ ] feed_screen.dart
- [ ] lock_screen.dart
- [ ] starter_feeds.dart

---

## Migration Pattern

### 1. Import Design System
```dart
import '../design_system/components/index.dart';
import '../design_system/theme/theme_build_context_x.dart';
```

### 2. Component Mapping

| Old Component | New Component | Example |
|---------------|---------------|---------|
| `TextField` | `LythTextInput.standard()` | Email, search |
| `TextField` (email) | `LythTextInput.email()` | Email validation |
| `TextField` (password) | `LythTextInput.password()` | Password fields |
| `TextField` (multiline) | `LythTextInput.textarea()` | Long text |
| `ElevatedButton` | `LythButton.primary()` | Primary actions |
| `TextButton` | `LythButton.tertiary()` | Secondary actions |
| `OutlinedButton` | `LythButton.secondary()` | Alternative actions |
| `IconButton` | `LythIconButton.standard()` | Icon-only buttons |
| `Card` | `LythCard.elevated()` | Content containers |
| `AlertDialog` | `LythConfirmDialog` | Confirmations |
| `SnackBar` (success) | `LythSnackbar.success()` | Success messages |
| `SnackBar` (error) | `LythSnackbar.error()` | Error messages |
| `SnackBar` (info) | `LythSnackbar.info()` | Info messages |
| `SnackBar` (warning) | `LythSnackbar.warning()` | Warnings |
| `Chip` (filter) | `LythChip.filter()` | Filter tags |
| `Chip` (input) | `LythChip.input()` | Input tags |
| `Slider` | `LythSlider` | Range input |
| `Icon` (24x24) | `LythIcon.medium()` | Standard icons |
| `Icon` (16x16) | `LythIcon.small()` | Small icons |
| `Icon` (32x32) | `LythIcon.large()` | Large icons |
| `CircularProgressIndicator` | `LythSkeleton.*` or `LythButton.loading()` | Loading states |
| Empty ListView | `LythEmptyState` | No content |

### 3. Token Usage

#### Spacing
```dart
// Old
padding: const EdgeInsets.all(16.0)
SizedBox(height: 24)

// New
padding: EdgeInsets.all(context.spacing.lg.toDouble())
SizedBox(height: context.spacing.xl.toDouble())
```

#### Radius
```dart
// Old
BorderRadius.circular(12)

// New
BorderRadius.circular(context.radius.card)
```

#### Colors
```dart
// Old
Colors.blue
Theme.of(context).primaryColor

// New
context.colorScheme.primary
context.colorScheme.onSurface
```

#### Typography
```dart
// Old
TextStyle(fontSize: 24, fontWeight: FontWeight.bold)

// New
context.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)
```

### 4. Loading States

#### Old Pattern
```dart
ElevatedButton(
  onPressed: _isLoading ? null : _handleAction,
  child: _isLoading
      ? const CircularProgressIndicator()
      : const Text('Submit'),
)
```

#### New Pattern
```dart
if (_isLoading)
  LythButton.loading(label: 'Processing...')
else
  LythButton.primary(
    label: 'Submit',
    onPressed: _handleAction,
  )
```

### 5. Form Validation

#### Old Pattern
```dart
String? _error;

TextField(
  decoration: InputDecoration(
    labelText: 'Email',
    errorText: _error,
  ),
)
```

#### New Pattern
```dart
String? _emailError;

LythTextInput.email(
  label: 'Email',
  errorText: _emailError,
  onChanged: (value) {
    if (_emailError != null) {
      setState(() => _emailError = null);
    }
  },
)
```

### 6. Snackbar Notifications

#### Old Pattern
```dart
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    content: Text('Success!'),
    backgroundColor: Colors.green,
  ),
);
```

#### New Pattern
```dart
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    content: LythSnackbar.success(message: 'Success!'),
  ),
);
```

### 7. Dialogs

#### Old Pattern
```dart
showDialog(
  context: context,
  builder: (context) => AlertDialog(
    title: const Text('Delete?'),
    content: const Text('This cannot be undone.'),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      TextButton(
        onPressed: () {
          _delete();
          Navigator.pop(context);
        },
        child: const Text('Delete'),
      ),
    ],
  ),
);
```

#### New Pattern
```dart
final confirmed = await showDialog<bool>(
  context: context,
  builder: (context) => LythConfirmDialog(
    title: 'Delete?',
    message: 'This cannot be undone.',
    confirmLabel: 'Delete',
    onConfirm: () => Navigator.pop(context, true),
  ),
) ?? false;

if (confirmed) {
  _delete();
}
```

### 8. Empty States

#### Old Pattern
```dart
if (items.isEmpty) {
  return const Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.inbox, size: 64, color: Colors.grey),
        SizedBox(height: 16),
        Text('No items'),
      ],
    ),
  );
}
```

#### New Pattern
```dart
if (items.isEmpty) {
  return LythEmptyState(
    icon: Icons.inbox,
    title: 'No Items',
    subtitle: 'Try adding some items',
    actionLabel: 'Add Item',
    onAction: _addItem,
  );
}
```

### 9. List Items

#### Old Pattern
```dart
ListTile(
  title: const Text('Settings'),
  subtitle: const Text('App preferences'),
  leading: const Icon(Icons.settings),
  trailing: const Icon(Icons.arrow_forward),
  onTap: _openSettings,
)
```

#### New Pattern
```dart
LythListRow(
  title: 'Settings',
  subtitle: 'App preferences',
  leadingIcon: Icons.settings,
  trailingIcon: Icons.arrow_forward,
  onTap: _openSettings,
)
```

### 10. Loading Skeletons

#### New Pattern (no old equivalent)
```dart
// While loading list
ListView.builder(
  itemCount: 5,
  itemBuilder: (_, i) => Padding(
    padding: EdgeInsets.all(context.spacing.md.toDouble()),
    child: LythSkeleton.box(
      width: double.infinity,
      height: 80,
    ),
  ),
)

// While loading text
LythSkeleton.line(height: 16, width: 200)

// While loading avatar
LythSkeleton.circle(radius: 24)
```

---

## Migration Priority

### P0 (Critical User Flows)
1. ✅ login_screen.dart
2. feed_screen.dart
3. lock_screen.dart

### P1 (Core Features)
4. vote_feed.dart
5. moderation_demo_page.dart
6. appeal_history_page_v2.dart

### P2 (Admin/Debug)
7. security_debug_screen.dart
8. starter_feeds.dart

---

## Best Practices

1. **Always use tokens** - Never hard-code spacing, colors, or radius values
2. **Semantic constructors** - Use `.primary()`, `.email()`, etc. for clarity
3. **Error states** - Always handle error text for inputs
4. **Loading states** - Use `.loading()` variants or skeletons
5. **Accessibility** - Design system handles tap targets, contrast, reduce-motion
6. **Consistency** - Use design system components exclusively

---

## Testing Checklist

After migrating each screen:
- [ ] Visual appearance matches or improves original
- [ ] All interactions work (buttons, inputs, etc.)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Accessibility features work (keyboard nav, screen reader)
- [ ] Reduce motion is respected
- [ ] Dark mode works correctly
- [ ] No analysis errors
- [ ] No lint warnings for deprecated components

---

## Common Issues

### Issue: Text input not clearing error
**Solution:** Add `onChanged` handler to clear error state

### Issue: Button not showing loading state
**Solution:** Use conditional rendering with `LythButton.loading()`

### Issue: Spacing looks wrong
**Solution:** Use `context.spacing.*` tokens instead of hardcoded values

### Issue: Colors don't match theme
**Solution:** Use `context.colorScheme.*` instead of `Colors.*`

### Issue: Component not found
**Solution:** Ensure you imported `../design_system/components/index.dart`

---

## Next Steps

1. Migrate remaining P0 screens (feed_screen, lock_screen)
2. Migrate P1 screens (vote_feed, moderation_demo_page, appeal_history)
3. Migrate P2 screens (security_debug, starter_feeds)
4. Remove old unused components
5. Update component documentation with screenshots
6. Create integration tests for migrated screens
