# 🚀 Asora Backend Functions

## Overview
Complete TypeScript-based Azure Functions backend for the Asora platform, featuring AI-powered content moderation, JWT authentication, and tier-based user management.

## 🏗️ Architecture

```
Asora Backend Functions
├── shared/           # Reusable utilities
│   ├── auth.ts      # JWT validation & user extraction
│   ├── cosmosClient.ts # Cosmos DB connection helpers
│   └── validation.ts   # Input validation utilities
├── auth/            # Authentication endpoints
│   └── userinfo.ts  # Enhanced user profile data
├── post/            # Content management
│   ├── create.ts    # AI-moderated post creation
│   └── delete.ts    # Authorized post deletion
├── feed/            # Content discovery
│   └── get.ts       # Personalized feeds with tier features
└── moderation/      # Community safety
    └── flag.ts      # AI-assisted content reporting
```

## 🔧 Quick Start

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Configure Environment
Create `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "JWT_SECRET": "your_jwt_secret",
    "COSMOS_ENDPOINT": "https://your-cosmos.documents.azure.com:443/",
    "COSMOS_KEY": "your_cosmos_key",
    "HIVE_API_KEY": "your_hive_ai_key"
  }
}
```

### 3. Build & Start
```bash
npm run build
npm start
```

## 🤖 GitHub Copilot Integration

Each function is documented with comprehensive prompts for GitHub Copilot:

### Example: Post Creation
Open `/post/create.ts` and start typing after the docstring. Copilot will auto-generate:
- JWT token validation
- Input sanitization  
- Hive AI moderation call
- Cosmos DB insertion
- Error handling
- Response formatting

### Copilot-Ready Features
- ✅ **Detailed function specifications**
- ✅ **Request/response schemas**
- ✅ **Integration requirements**
- ✅ **Error handling patterns**
- ✅ **Security considerations**

## 🔐 Security Features

### JWT Authentication
- Token validation with configurable expiration
- User role extraction (user/moderator/admin)
- Tier-based access control (free/premium/enterprise)

### Input Validation
- Schema-based request validation
- SQL injection prevention
- XSS protection
- Rate limiting by user tier

### Content Moderation
- Hive AI integration for real-time analysis
- Automated action triggers
- Human moderator workflow
- Appeal process support

## 🎯 Tier-Based Features

| Feature | Free | Premium | Enterprise |
|---------|------|---------|------------|
| API Rate Limit | 100/hour | 1000/hour | Unlimited |
| Post Character Limit | 280 | 2000 | 5000 |
| Media Attachments | 1 | 5 | Unlimited |
| AI Priority | Standard | High | Instant |
| Custom Feeds | Basic | Advanced | Full Control |

## 🗄️ Database Schema

### Collections
- **users**: User profiles, authentication data
- **posts**: Content with AI moderation scores
- **comments**: Threaded discussions
- **likes**: User interactions (+1/-1 voting)
- **feeds**: Personalized content algorithms
- **flags**: Content moderation reports
- **reputation**: User scoring and achievements

## 📡 API Endpoints

### Authentication
- `GET /auth/userinfo` - Get comprehensive user profile

### Content Management  
- `POST /post/create` - Create AI-moderated posts
- `DELETE /post/delete` - Delete posts with authorization

### Content Discovery
- `GET /feed/get` - Personalized content feeds

### Community Safety
- `POST /moderation/flag` - Report inappropriate content

## 🧪 Testing

### Local Testing
```bash
# Test with curl
curl -H "Authorization: Bearer <JWT>" \
  http://localhost:7072/api/auth/userinfo

# Create test post
curl -X POST -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test post content"}' \
  http://localhost:7072/api/post/create
```

### Flutter Integration
```dart
// AuthService already configured for 10.0.2.2:7072
final userInfo = await authService.getCurrentUser();
```

## 🔄 Development Workflow

1. **Modify Function**: Edit TypeScript files with Copilot assistance
2. **Build**: `npm run build` (or use watch mode)
3. **Test Locally**: Functions run on `localhost:7072`
4. **Deploy**: Use Azure Functions deployment tools

## 📦 Dependencies

### Core
- `@azure/functions` - Azure Functions runtime
- `@azure/cosmos` - Cosmos DB SDK v4
- `jsonwebtoken` - JWT token handling
- `axios` - HTTP requests to external APIs

### Development
- `typescript` - TypeScript compiler
- `@types/*` - Type definitions
- `jest` - Testing framework

## 🚀 Deployment

### Azure Functions Deployment
```bash
# Deploy to Azure
func azure functionapp publish <function-app-name>

# Set environment variables in Azure
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings JWT_SECRET=<value> COSMOS_ENDPOINT=<value>
```

## 📈 Monitoring & Analytics

- **Application Insights**: Function performance monitoring
- **Cosmos DB Metrics**: Database performance tracking  
- **Custom Telemetry**: User engagement analytics
- **Error Tracking**: Comprehensive error logging

## 🔜 Future Enhancements

- [ ] GraphQL endpoint for complex queries
- [ ] Real-time notifications via SignalR
- [ ] Advanced AI features (sentiment analysis, topic detection)
- [ ] Multi-language content support
- [ ] Blockchain integration for content verification
- [ ] Advanced analytics and reporting dashboard

---

**Ready for GitHub Copilot to accelerate your Asora backend development!** 🚀
