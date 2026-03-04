# Lythaus / Asora Reference Map

> Quick reference for agents and developers on when to use **Lythaus** (user-facing) vs **Asora** (infrastructure).

## Summary

| Context | Name | Example |
|---------|------|---------|
| **User-facing UI** | Lythaus | "Welcome to Lythaus", button labels, dialogs |
| **Store listings** | Lythaus | App Store title, Play Store description |
| **Marketing/website** | Lythaus | lythaus.co landing pages |
| **Email templates** | Lythaus | "Your Lythaus account is ready" |
| **Repository name** | Asora | `asora/`, `git clone` |
| **Azure resources** | Asora | `asora-function-dev`, `asora-cosmos-*` |
| **Package identifiers** | Asora | `com.asora.app`, `applicationId` |
| **Terraform resources** | Asora | `azurerm_*` names, resource groups |
| **Internal code** | Asora | import paths, class names, services |
| **Database schemas** | Asora | Cosmos containers, collection names |

---

## Detailed Mappings

### Flutter / Dart Code

| Item | Name | File Location |
|------|------|---------------|
| App display name | **Lythaus** | `android/app/src/main/AndroidManifest.xml` (`android:label`) |
| iOS display name | **Lythaus** | `ios/Runner/Info.plist` (`CFBundleDisplayName`) |
| Package identifier | `com.asora.app` | `android/app/build.gradle`, Xcode project |
| Import prefix | `asora` | `import 'package:asora/...'` |
| Provider/service names | Asora-style | `authControllerProvider`, `moderationService` |

### Azure Resources

| Resource | Name Pattern | Example |
|----------|--------------|---------|
| Function App | `asora-function-{env}` | `asora-function-dev` |
| Cosmos DB | `asora-cosmos-{env}` | `asora-cosmos-dev` |
| Storage Account | `asora{env}storage` | `asoradevfunctions` |
| Key Vault | `asora-kv-{env}` | `asora-kv-dev` |
| Resource Group | `rg-asora-{env}` | `rg-asora-dev` |

### API & Endpoints

| Item | Value | Notes |
|------|-------|-------|
| API base URL | `https://api.asora.co.za/v1/` | Not changing for beta |
| Functions host | `asora-function-{env}.azurewebsites.net` | Internal |
| JWT issuer | Azure B2C tenant | Unchanged |
| OAuth redirect URIs | `com.asora.app://...` | Matches package ID |

### User Interface Strings

Always use **Lythaus** for:

- ✅ App name in headers/footers
- ✅ Welcome messages ("Welcome to Lythaus")
- ✅ Onboarding screens
- ✅ Error messages ("Lythaus encountered an error")
- ✅ Notifications ("New activity on Lythaus")
- ✅ Support/help text
- ✅ Store listing copy
- ✅ Marketing emails

Use **Asora** for:

- ✅ Technical logs
- ✅ Error codes (internal)
- ✅ API response structures
- ✅ Database fields
- ✅ Terraform resource names
- ✅ Azure portal resources
- ✅ Git commit messages (repo context)

---

## Agent Instructions

When generating code:

1. **UI strings → Lythaus**
   ```dart
   // ✅ Good
   const appTitle = 'Lythaus';
   Text('Welcome to Lythaus');
   
   // ❌ Bad
   const appTitle = 'Asora';
   ```

2. **Imports & identifiers → Asora**
   ```dart
   // ✅ Good
   import 'package:asora/features/auth/...';
   
   // ❌ Bad (don't rename)
   import 'package:lythaus/features/auth/...';
   ```

3. **Azure resources → Asora**
   ```hcl
   # ✅ Good
   resource "azurerm_linux_function_app" "main" {
     name = "asora-function-${var.environment}"
   }
   
   # ❌ Bad
   resource "azurerm_linux_function_app" "main" {
     name = "lythaus-function-${var.environment}"
   }
   ```

4. **Documentation introductions**
   ```markdown
   # ✅ Good
   Lythaus (formerly Asora) is a community-driven content platform...
   
   # ❌ Avoid
   Asora is a community-driven content platform...
   ```

---

## Migration Checklist (Post-Beta)

Future migration from `com.asora.app` to `com.lythaus.app` will require:

- [ ] New Apple App ID + provisioning profiles
- [ ] New Android signing key
- [ ] OAuth redirect URI updates (Azure B2C, Google)
- [ ] Firebase project reconfiguration
- [ ] Deep link domain verification updates
- [ ] User data migration (keychain, secure storage)
- [ ] Store listing migration (new app entry or transfer)

**Status:** Not planned for beta phase.

---

## Grep Checklist

Run these quick checks before shipping UI changes:

```bash
# UI strings should say Lythaus, not Asora
rg -n "Asora" lib ui apps

# Infra/ops should not introduce Lythaus names
rg -n "Lythaus" infrastructure functions database scripts

# Marketing/site content should say Lythaus
rg -n "Asora" apps/marketing-site
```

If any results appear, confirm the string is in the correct context
(user-facing vs internal) before merging.

---

## Related Documents

- [Lythaus Transition Guide](../branding/lythaus-transition.md) - Full brand transition details
- [Asset Replacement Checklist](../branding/asset-replacement-checklist.md) - Icons, splash screens
- [Lythaus Migration Notes](lythaus-migration.md) - Additional migration context

---

**Last Updated:** January 2025
