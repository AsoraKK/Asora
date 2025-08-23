# Secure Context for Copilot

This document explains the local secrets workflow that provides GitHub Copilot with secure context without committing sensitive data.

## Overview

The `secrets/` directory contains git-ignored files that can be opened in VS Code to give Copilot context about:
- OAuth client IDs and endpoints
- Azure resource names and references  
- Environment-specific configuration
- Infrastructure references

This allows Copilot to provide accurate suggestions for API calls, configuration, and deployment scripts while keeping actual secrets secure.

## Files Structure

```
secrets/
├── dart.env           # Flutter/Dart development variables
├── infra.env          # Azure infrastructure references
└── (future files)     # Add as needed per environment
```

## Usage Workflow

### For Development
1. Open `secrets/dart.env` in VS Code when working on Flutter frontend
2. Copilot can now suggest correct OAuth client IDs, staging domains, etc.
3. Copy values to actual environment variables or Flutter configuration

### For Infrastructure Work  
1. Open `secrets/infra.env` when working on Azure resources
2. Copilot gets context about resource names, subscription IDs, endpoints
3. Use for generating scripts, ARM templates, or deployment configurations

### For Azure Functions
1. `functions/local.settings.json` references Key Vault secrets
2. For local development with actual secrets, create override file:
   ```bash
   cp functions/local.settings.json functions/local.settings.override.json
   # Edit override with actual values, never commit
   ```

## Security Principles

✅ **Safe Context**: Resource names, endpoints, client IDs (public info)  
✅ **Git Ignored**: All files in `secrets/` directory are never committed  
✅ **VS Code Access**: Copilot can read for suggestions, but files stay local  
✅ **Key Vault Integration**: Production uses Azure Key Vault references  

❌ **Never Include**: Actual API keys, connection strings, private keys  
❌ **Never Commit**: Override files with real secrets  

## Adding New Secrets Context

When adding new services or environments:

1. Add reference information to appropriate `.env` file in `secrets/`
2. Update `.gitignore` if creating new files
3. Use format: `SERVICE_NAME=reference-only-value`
4. Document the pattern in this file

## Example Usage

When Copilot sees this in `secrets/dart.env`:
```
GOOGLE_OAUTH_CLIENT_ID_ANDROID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

It can suggest:
```dart
static const googleClientId = String.fromEnvironment(
  'GOOGLE_OAUTH_CLIENT_ID_ANDROID',
  defaultValue: 'your-client-id-here'
);
```

This provides accurate patterns without exposing actual secrets in git history.

## Maintenance

- Review and update references when Azure resources change
- Keep format consistent for Copilot pattern recognition  
- Remove obsolete entries when services are decommissioned
- Test Copilot suggestions regularly to ensure context is helpful
