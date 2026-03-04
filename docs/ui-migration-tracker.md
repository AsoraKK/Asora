# UI Migration Tracker (Lythaus Step 1)

This tracker covers Flutter screens and the web control panel. It tracks:
- Hardcoded color usage (Color(0xFF...)) outside `lib/design_system/**`
- Direct `TextStyle(...)` usage outside `lib/design_system/**`

Spacing/radius token cleanup is tracked in notes until fully enforced.

| Area | Paths | Status | Hardcoded Color | TextStyle | Notes |
| --- | --- | --- | --- | --- | --- |
| App shell | `lib/ui/components/asora_top_bar.dart` | Migrated | 0 | 0 | Uses `LythWordmark` and tokens |
| App shell | `lib/ui/components/asora_bottom_nav.dart` | Pending | 0 | 0 | Needs Lyth component pass |
| Auth | `lib/features/auth/presentation/sign_in_page.dart` | Migrated | 0 | 0 | Lyth buttons + spacing tokens |
| Auth | `lib/features/auth/presentation/oauth2_signin_screen.dart` | Migrated | 0 | 0 | Lyth inputs + buttons |
| Auth | `lib/features/auth/presentation/auth_choice_screen.dart` | Migrated | 0 | 0 | Lyth buttons applied |
| Feed | `lib/screens/feed_screen.dart` | Migrated | 0 | 0 | Tokenized text + surfaces |
| Feed | `lib/widgets/post_card.dart` | Migrated | 0 | 0 | Lyth cards + chips |
| Feed | `lib/widgets/post_actions.dart` | Migrated | 0 | 0 | Lyth buttons |
| Feed | `lib/ui/components/feed_card.dart` | Migrated | 0 | 0 | Lyth card |
| Create post | `lib/ui/components/create_post_modal.dart` | Migrated | 0 | 0 | Lyth inputs + buttons |
| Create post | `lib/features/feed/presentation/create_post_screen.dart` | Pending | 0 | 0 | Replace stock fields/buttons |
| Post insights | `lib/features/feed/presentation/post_insights_panel.dart` | Migrated | 0 | 0 | Tokens only |
| Moderation | `lib/features/moderation/presentation/moderation_console/*.dart` | Migrated | 0 | 0 | Lyth components |
| Moderation | `lib/features/moderation/presentation/widgets/*.dart` | Migrated | 0 | 0 | No numeric AI scores |
| Appeals | `lib/widgets/appeal_dialog.dart` | Migrated | 0 | 0 | 5-minute appeal text |
| Appeals | `lib/widgets/appeal_sheet.dart` | Migrated | 0 | 0 | Lyth inputs + buttons |
| Appeals | `lib/features/moderation/presentation/screens/appeal_history_screen.dart` | Migrated | 0 | 0 | Lyth cards |
| Security | `lib/features/security/security_debug_panel.dart` | Migrated | 0 | 0 | Lyth components |
| Security | `lib/screens/security_debug_screen.dart` | Migrated | 0 | 0 | Tokens + Lyth buttons |
| Paywall | `lib/features/paywall/upgrade_prompt.dart` | Migrated | 0 | 0 | Lyth cards + buttons |
| Admin (Flutter) | `lib/features/admin/ui/admin_config_screen.dart` | Migrated | 0 | 0 | Lyth slider + buttons |
| Profile | `lib/ui/screens/profile/settings_screen.dart` | Migrated | 0 | 0 | Uses standard toggles only |
| Notifications | `lib/features/notifications/presentation/*.dart` | Migrated | 0 | 0 | Lyth buttons + cards |
| Privacy | `lib/features/privacy/widgets/*.dart` | Migrated | 0 | 0 | Lyth buttons + cards |
| Web control panel | `apps/control-panel/src/**` | Migrated | 0 | 0 | Tokens + Lyth components |
