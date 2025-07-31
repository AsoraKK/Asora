# 🔐 Auth Module - Asora Backend

## Overview
The Auth module handles user authentication, authorization, and profile management for the Asora platform. It provides secure JWT-based authentication with tier-based access control.

## Functions

### `/auth/userinfo` - GET
**Purpose**: Retrieve comprehensive user profile information

**Authentication**: Required (JWT Bearer token)

**Features**:
- Complete user profile with statistics
- Tier-based data access (free/premium/enterprise)
- Token metadata and expiration info
- User preferences and privacy settings

**Response Example**:
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "kyle.kern@asora.co.za",
    "role": "user",
    "tier": "premium",
    "reputationScore": 150,
    "stats": {
      "postsCount": 42,
      "commentsCount": 128,
      "likesReceived": 89
    }
  }
}
```

## Security Features
- ✅ JWT token validation with expiration checks
- ✅ Role-based access control (user/moderator/admin)
- ✅ Tier-based feature access (free/premium/enterprise)
- ✅ Rate limiting and abuse prevention
- ✅ Secure password handling (future enhancement)

## Dependencies
- `shared/auth.ts` - JWT validation utilities
- `shared/cosmosClient.ts` - Database connections
- `@azure/cosmos` - Cosmos DB SDK v4
- `jsonwebtoken` - JWT token verification

## Environment Variables
```bash
JWT_SECRET=your_jwt_secret_key
COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
```

## Usage in Flutter App
```dart
// Get current user profile
final userInfo = await authService.getCurrentUser();
if (userInfo != null) {
  print('User: ${userInfo['user']['email']}');
  print('Tier: ${userInfo['user']['tier']}');
}
```

## Testing
```bash
# Test user info endpoint
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:7072/api/auth/userinfo
```

## Error Codes
- `401` - Invalid or expired JWT token
- `404` - User profile not found
- `429` - Rate limit exceeded
- `500` - Internal server error

## Future Enhancements
- [ ] OAuth integration (Google, Microsoft, Apple)
- [ ] Multi-factor authentication (MFA)
- [ ] Password reset functionality
- [ ] Account verification system
- [ ] Social login providers
