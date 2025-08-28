# Copilot Instructions

## Project Overview
Asora is a social media platform for human-authored content with AI-powered moderation. The codebase is organized as:
- **Frontend**: Flutter 3 + Riverpod (multi-platform: iOS, Android, Web)
- **Backend**: Azure Functions (Node.js 20) with TypeScript
- **Database**: Azure Cosmos DB + Redis for caching
- **AI Safety**: Hive AI v2 (primary) + Azure Content Safety (fallback)

## Architecture Reference
📋 **Start Here**: See [`docs/ADR_001_TLDR.md`](../docs/ADR_001_TLDR.md) for stack overview, KPIs, and phase roadmap.

## Key Patterns & Conventions

### Flutter Architecture
- **State Management**: Riverpod providers in `lib/services/service_providers.dart`
- **Feature Structure**: Clean architecture with `domain/`, `application/`, and `presentation/` layers
- **Critical Modules**: P1 modules in `lib/p1_modules/` require ≥80% test coverage
- **Navigation**: AuthGate pattern - `lib/features/auth/presentation/auth_gate.dart` handles auth flow

### Azure Functions Backend
- **Entry Points**: Each function has `index.js` + `function.json` in its directory
- **Shared Utils**: Common code in `functions/shared/` (auth, cosmos, validation)
- **Authentication**: JWT validation via `functions/shared/auth.ts`
- **Testing**: Jest config in `functions/jest.config.ts`

### Development Workflows
**Flutter Tests**: `flutter test --coverage` + `bash check_p1_coverage.sh` for P1 coverage gate
**Functions Tests**: `cd functions && npm test`
**Local Backend**: `cd functions && npm start` (port 7072)
**Deployment**: Automated CI/CD pipelines handle Azure Functions + Flutter web deployment

### API Integration
- **Base Config**: `lib/core/config/api_config.dart` for environment-based endpoints
- **HTTP Client**: `lib/core/network/dio_client.dart` with certificate pinning
- **Service Layer**: `lib/services/` contains typed service classes with error handling

### Moderation System
- **AI Processing**: Content passes through Hive AI → Azure Content Safety fallback
- **Appeal Flow**: Users can appeal via `lib/features/moderation/` components
- **Demo Mode**: `lib/screens/moderation_demo_page.dart` showcases full moderation workflow

## Common Tasks
- **Add new API endpoint**: Create function in `functions/` + corresponding service in `lib/services/`
- **New Flutter screen**: Follow feature structure in `lib/features/[feature]/presentation/screens/`
- **Update auth flow**: Modify `lib/features/auth/application/auth_service.dart`
- **Add test coverage**: Focus on P1 modules first (auth, core security, privacy)

## Tool Usage Instructions
- **Terminal Output Fallback**: The `run_in_terminal` tool sometimes fails to capture command output. If that happens, use the `get_terminal_last_command` tool to retrieve the last command output from the terminal. If that fails, ask the user to copy-paste the output from the terminal.

## Key Files to Reference
- `lib/main.dart` - App entry point with providers
- `functions/package.json` - Backend dependencies and scripts
- `lib/features/auth/presentation/auth_gate.dart` - Authentication routing
- `functions/shared/auth.ts` - JWT validation logic
