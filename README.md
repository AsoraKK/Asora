# Asora

[Architecture TL;DR](docs/ADR_001_TLDR.md) • [Full ADR](docs/adr_001_overall_architecture_roadmap.md)

Social media platform for human-authored content with AI-powered moderation.

## 🚀 Quick Start

### Prerequisites
- Flutter 3.24.3+
- Node.js 20.x
- Azure account (for deployment)

### Development Setup

```bash
# Install Flutter dependencies
flutter pub get

# Install Functions dependencies
cd functions && npm install

# Run Flutter app
flutter run

# Run Azure Functions locally
cd functions && npm run start
```

## 🏗️ Architecture

### Frontend (Flutter)
- **Target**: iOS, Android, Web
- **State Management**: Riverpod
- **HTTP Client**: Dio with certificate pinning
- **Storage**: FlutterSecureStorage for sensitive data

### Backend (Azure Functions)
- **Runtime**: Node.js 20.x
- **Database**: Azure Cosmos DB
- **AI Moderation**: Hive AI integration
- **Authentication**: JWT tokens

## 📡 API Endpoints

### Authentication
- `POST /auth` - User authentication
- `GET /api/user` - Get own profile
- `GET /api/user/{userId}` - Get user profile

### Posts
- `POST /api/posts` - Create post (with AI moderation)
- `DELETE /api/posts/{postId}` - Delete post
- `GET /api/feed` - Get feed (cursor pagination)

### Moderation (Admin)
- `POST /api/admin/moderation/flag` - Flag content
- `POST /api/admin/moderation/approve` - Approve content
- `POST /api/admin/moderation/block` - Block content

### Health
- `GET /api/health` - Service health check

## 🧪 Testing

### Flutter Tests
```bash
# Run all tests with coverage
flutter test --coverage

# Check P1 module coverage (must be >= 80%)
bash check_p1_coverage.sh
```

### Azure Functions Tests
```bash
cd functions
npm test
```

## 🚀 Deployment

### Automated CI/CD
The project uses a single GitHub Actions workflow that:
- Runs Flutter tests with coverage validation
- Builds and tests Azure Functions
- Deploys to Azure dev environment (`asora-function-dev` in `asora-psql-flex`)

**Trigger**: Push to `main` or `develop` branches, or manual dispatch

### Manual Deployment
For manual deployments or troubleshooting:
```bash
# Manual Azure Functions deployment
./deploy-functions-manual.sh
```

**Target Environment**:
- Function App: `asora-function-dev`
- Resource Group: `asora-psql-flex`
- Runtime: Node.js 20.x, Functions v4

## 🛠️ Quick Commands

**Prerequisites**: Ensure you're authenticated with Azure CLI (`az login`) or using GitHub Actions OIDC for automated deployments.

### Cosmos DB Operations
```bash
# Verify posts indexing policy
az cosmosdb sql container show -g asora-psql-flex -a asora-cosmos-dev -d asora -n posts --query "resource.indexingPolicy"

# Apply posts indexing policy (off-peak recommended)
az cosmosdb sql container update -g asora-psql-flex -a asora-cosmos-dev -d asora -n posts --idx @database/cosmos-posts-indexing-policy.json
```

### Performance Monitoring
```bash
# Feed metrics (requires PowerShell - install PowerShell Core or use Windows PowerShell)
powershell.exe -File .\scripts\feed-metrics.ps1 -BaseUrl 'https://asora-function-dev.azurewebsites.net' -Count 20 -AuthToken '<jwt>'

# Alternative with PowerShell Core (if installed):
# pwsh ./scripts/feed-metrics.ps1 -BaseUrl 'https://asora-function-dev.azurewebsites.net' -Count 20 -AuthToken '<jwt>'
```

### Deployment Validation
```bash
# Cloudflare cache validation
CF_URL='https://api.your-domain.com' bash scripts/cf-validate.sh
```

**Note**: The canary monitoring system is embedded in `.github/workflows/deploy-functions-flex.yml` and automatically handles traffic shifting, monitoring, and rollback during deployments.

## 📊 Coverage Requirements
- **P1 Critical Modules**: >= 80% line coverage required
- **Overall Project**: Monitored and reported

## 🔒 Security Features
- Certificate pinning for HTTPS
- JWT token management
- Device integrity checks
- AI-powered content moderation
- GDPR compliance ready

## 📱 Supported Platforms
- ✅ Android
- ✅ iOS  
- ✅ Web
- 🔄 Desktop (planned)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow, code style, and PR checks. If you’re using Codex CLI, also read [AGENTS.md](AGENTS.md).

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
