# 🧠 GitHub Copilot Development Guide for Asora

## Quick Start: Post Creation Function

### 1. Copy the Enhanced Copilot Prompt
The complete prompt is already at the top of `functions/post/create.ts`. This provides Copilot with:
- ✅ **Exact requirements** for authentication, validation, and moderation
- ✅ **Data structure specifications** for Cosmos DB storage  
- ✅ **Response format examples** for consistent API design
- ✅ **Error handling patterns** for production reliability

### 2. Development Workflow

#### Step 1: Open the Function File
```bash
code functions/post/create.ts
```

#### Step 2: Position Cursor for Auto-completion
Place cursor after the function signature:
```typescript
export async function postCreate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // 🔥 START TYPING HERE - Copilot will auto-complete
```

#### Step 3: Trigger Copilot with Key Phrases
Start typing these phrases to get intelligent completions:

```typescript
// Get moderation configuration
const moderationConfig = await getModerationConfig();

// Validate JWT and extract user
const userContext = getUserContext(request);

// Validate input with Joi
const schema = Joi.object({

// Call Hive AI for moderation
const hiveResult = await moderateText({

// Store in Cosmos DB
const postsContainer = getContainer('posts');
```

### 3. Advanced Copilot Patterns

#### Context-Aware Moderation
```typescript
// Copilot understands this pattern from our documentation
if (hiveResult.decision === 'block') {
    return {
        status: 403,
        jsonBody: {
            error: 'Content rejected due to AI moderation',
            details: {
                score: hiveResult.score,
                triggeredRules: hiveResult.triggeredRules,
                categories: hiveResult.categories
            }
        }
    };
}
```

#### Dynamic Configuration Usage
```typescript
// Copilot knows to use dynamic config from our setup
const schema = Joi.object({
    text: Joi.string().max(moderationConfig.charLimits.post).required(),
    mediaUrl: Joi.string().uri().optional()
});
```

#### Enhanced Error Handling
```typescript
// Copilot will generate comprehensive error patterns
try {
    const hiveResult = await moderateText({ content, userId, contextType: 'post' });
} catch (hiveError: any) {
    context.warn(`Hive AI request failed: ${hiveError.message}`);
    // Copilot suggests graceful fallback patterns
}
```

## Function Development Templates

### Authentication Function Template
```typescript
/**
 * COPILOT PROMPT: Create JWT authentication endpoint
 * - Validate email input with Joi
 * - Generate JWT token with 24h expiration
 * - Store session in Cosmos DB
 * - Return user profile data
 */
export async function authenticate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Copilot completes from here...
}
```

### User Profile Function Template
```typescript
/**
 * COPILOT PROMPT: Create user profile endpoint
 * - Validate JWT token via getUserContext()
 * - Fetch user data from Cosmos DB users collection
 * - Aggregate statistics (posts, comments, likes)
 * - Return comprehensive profile with preferences
 */
export async function getUserProfile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Copilot completes from here...
}
```

### Moderation Admin Function Template
```typescript
/**
 * COPILOT PROMPT: Create admin moderation override
 * - Validate admin JWT token
 * - Update moderationConfig in Cosmos DB
 * - Clear configuration cache
 * - Log admin action for audit trail
 * - Return updated configuration
 */
export async function updateModerationConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Copilot completes from here...
}
```

## Best Practices for Copilot Development

### 1. **Descriptive Comments**
```typescript
// ✅ Good: Copilot understands intent
// Check if user has reached daily post limit based on their tier
const dailyLimit = getDailyPostLimit(userContext.tier);

// ❌ Poor: Too vague
// Check limit
```

### 2. **Function Signatures with Context**
```typescript
// ✅ Good: Clear parameters help Copilot
async function moderateContent(
    content: string, 
    userId: string, 
    contentType: 'post' | 'comment'
): Promise<ModerationResult> {

// ❌ Poor: Generic parameters
async function moderate(data: any): Promise<any> {
```

### 3. **Import Statements**
Always include proper imports at the top - Copilot uses these for context:
```typescript
import { getModerationConfig } from '../shared/moderationConfig';
import { moderateText } from '../shared/hiveClient';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
```

### 4. **Type Definitions**
Use TypeScript interfaces to guide Copilot:
```typescript
interface PostCreateRequest {
    text: string;
    mediaUrl?: string;
}

interface PostCreateResponse {
    success: boolean;
    postId: string;
    post: {
        id: string;
        text: string;
        visibility: 'public' | 'warned' | 'blocked';
        moderation: ModerationResult;
    };
}
```

## Debugging with Copilot

### 1. **Add Debug Comments**
```typescript
// TODO: Add rate limiting check for user tier
// TODO: Implement media URL validation
// TODO: Add post analytics tracking
```

### 2. **Error Handling Patterns**
```typescript
// Copilot learns from our error patterns
catch (error: any) {
    context.error('Operation failed:', error);
    return {
        status: 500,
        jsonBody: { 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Operation failed'
        }
    };
}
```

## Result
With these patterns and the enhanced documentation in our functions, GitHub Copilot becomes a powerful assistant that understands:
- 🎯 **Asora's specific architecture** and business logic
- 🔐 **Security patterns** for JWT and input validation  
- 🤖 **AI moderation workflows** with dynamic configuration
- 📊 **Database operations** with proper error handling
- 🚀 **Azure Functions** best practices and TypeScript patterns

**Start typing in any function and watch Copilot generate production-ready code that follows Asora's patterns!** 🧠✨
