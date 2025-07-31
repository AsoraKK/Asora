# 📝 Post Module - Asora Backend

## Overview
The Post module manages content creation, deletion, and lifecycle for the Asora platform. It integrates AI-powered content moderation and supports rich media attachments.

## Functions

### `/post/create` - POST
**Purpose**: Create new posts with AI moderation and validation

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "text": "Your post content here (required, max 2000 chars)",
  "mediaUrl": "https://example.com/image.jpg (optional)"
}
```

**Features**:
- ✅ Real-time content validation
- ✅ Hive AI moderation integration
- ✅ Automatic toxicity scoring
- ✅ User reputation impact
- ✅ Rich media support
- ✅ Tier-based posting limits

**Response Example**:
```json
{
  "success": true,
  "postId": "post_abc123",
  "post": {
    "id": "post_abc123",
    "text": "Your post content",
    "userId": "user123",
    "createdAt": "2025-07-28T10:30:00Z",
    "aiScore": {
      "toxicity": 0.1,
      "profanity": 0.0,
      "overall": "safe"
    }
  }
}
```

### `/post/delete` - DELETE
**Purpose**: Delete posts with proper authorization

**Authentication**: Required (JWT Bearer token)

**Query Parameters**:
- `postId` - ID of post to delete

**Features**:
- ✅ Ownership verification
- ✅ Moderator override capabilities
- ✅ Soft delete for audit trail
- ✅ Cascade handling (comments, likes)
- ✅ Reputation adjustment

## Content Moderation
The Post module integrates with **Hive AI** for automated content screening:

### Safety Levels
- **Safe** (0.0-0.3): Auto-approved, full visibility
- **Warning** (0.3-0.7): Limited visibility, human review
- **Unsafe** (0.7-1.0): Hidden, immediate moderator alert

### Moderation Actions
- Toxicity detection and scoring
- Profanity filtering
- Hate speech identification
- Spam pattern recognition
- NSFW content flagging

## Tier-Based Features

| Feature | Free | Premium | Enterprise |
|---------|------|---------|------------|
| Posts per day | 10 | 50 | Unlimited |
| Media attachments | 1 | 5 | Unlimited |
| Character limit | 280 | 2000 | 5000 |
| AI priority | Standard | High | Instant |

## Dependencies
- `shared/auth.ts` - JWT validation
- `shared/cosmosClient.ts` - Database operations
- `shared/validation.ts` - Input validation
- Hive AI API - Content moderation
- Azure Cosmos DB - Data persistence

## Environment Variables
```bash
JWT_SECRET=your_jwt_secret
COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
HIVE_API_KEY=your_hive_api_key
HIVE_API_URL=https://api.thehive.ai/api/v2/task/sync
```

## Database Schema (Cosmos DB)
```json
{
  "id": "post_abc123",
  "text": "Post content",
  "mediaUrl": "https://example.com/image.jpg",
  "userId": "user123",
  "createdAt": "2025-07-28T10:30:00Z",
  "updatedAt": "2025-07-28T10:30:00Z",
  "isDeleted": false,
  "deletedAt": null,
  "aiScore": {
    "toxicity": 0.1,
    "profanity": 0.0,
    "overall": "safe",
    "confidence": 0.95
  },
  "stats": {
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0,
    "flagsCount": 0
  },
  "visibility": "public"
}
```

## Usage in Flutter App
```dart
// Create a new post
final result = await postService.createPost(
  text: "Hello Asora community!",
  mediaUrl: "https://example.com/image.jpg"
);

// Delete a post
await postService.deletePost(postId: "post_abc123");
```

## Testing
```bash
# Create a post
curl -X POST -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test post content"}' \
  http://localhost:7072/api/post/create

# Delete a post
curl -X DELETE -H "Authorization: Bearer <JWT>" \
  "http://localhost:7072/api/post/delete?postId=abc123"
```

## Error Codes
- `400` - Invalid post data or validation failure
- `401` - Missing or invalid authentication
- `403` - Insufficient permissions for deletion
- `404` - Post not found
- `429` - Rate limit exceeded (tier-based)
- `500` - Server error or AI service failure

## Future Enhancements
- [ ] Post editing functionality
- [ ] Advanced media support (video, audio)
- [ ] Post scheduling for premium users
- [ ] Content templates and formatting
- [ ] Advanced analytics and insights
- [ ] Collaborative posts and co-authoring
