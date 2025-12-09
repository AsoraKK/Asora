# OpenAPI Spec Enhancement Guide

Quick reference for fixing the 68 warnings in `docs/openapi.yaml`.

## Issue #1: Missing operationId (47 warnings)

Add a unique identifier to each operation for better code generation.

### Pattern
```yaml
/api/auth/token:
  post:
    operationId: exchangeAuthToken  # ADD THIS LINE
    tags: [auth]
    summary: Exchange provider code or email magic link for JWT access.
    # ... rest of operation
```

### Naming Convention
- Use camelCase
- Include HTTP method context in name when helpful
- Be descriptive: `exchangeAuthToken` not just `token`

### Suggested operationId Values by Endpoint

| Endpoint | Method | Suggested operationId |
|----------|--------|----------------------|
| `/api/auth/token` | POST | `exchangeAuthToken` |
| `/api/auth/refresh` | POST | `refreshAuthToken` |
| `/api/users/me` | GET | `getCurrentUser` |
| `/api/users/me` | PATCH | `updateCurrentUser` |
| `/api/users/{id}` | GET | `getPublicUserProfile` |
| `/api/posts` | POST | `createPost` |
| `/api/posts/{id}` | GET | `getPost` |
| `/api/posts/{id}` | DELETE | `deletePost` |
| `/api/users/{userId}/posts` | GET | `getUserPosts` |
| `/api/feed/discover` | GET | `getDiscoverFeed` |
| `/api/feed/news` | GET | `getNewsFeed` |
| `/api/feed/user/{userId}` | GET | `getUserFeed` |
| `/api/custom-feeds` | GET | `listCustomFeeds` |
| `/api/custom-feeds` | POST | `createCustomFeed` |
| `/api/custom-feeds/{id}` | GET | `getCustomFeed` |
| `/api/custom-feeds/{id}` | PATCH | `updateCustomFeed` |
| `/api/custom-feeds/{id}` | DELETE | `deleteCustomFeed` |
| `/api/custom-feeds/{id}/items` | GET | `getCustomFeedItems` |
| `/api/moderation/queue` | GET | `getModerationQueue` |
| `/api/moderation/cases/{id}` | GET | `getModerationCase` |
| `/api/moderation/cases/{id}/decision` | POST | `recordModerationDecision` |
| `/api/appeals` | POST | `fileAppeal` |
| `/api/appeals/{id}` | GET | `getAppeal` |
| `/api/appeals/{id}/votes` | POST | `voteOnAppeal` |
| `/api/reputation/me` | GET | `getCurrentReputation` |
| `/api/reputation/history` | GET | `getReputationHistory` |
| `/api/reputation/events` | POST | `recordReputationEvent` |
| `/api/search` | GET | `searchContent` |
| `/api/trending/posts` | GET | `getTrendingPosts` |
| `/api/trending/topics` | GET | `getTrendingTopics` |
| `/api/integrations/feed/discover` | GET | `getPartnerDiscoverFeed` |
| `/api/integrations/feed/news` | GET | `getPartnerNewsFeed` |
| `/api/auth/onboarding/invite` | POST | `validateInviteCode` |
| `/api/auth/onboarding/journalist-application` | POST | `submitJournalistApplication` |

## Issue #2: Missing 4XX Response Codes (20 warnings)

Add client error documentation to every operation.

### Pattern for All Operations

```yaml
/api/endpoint:
  get:
    operationId: myOperation
    # ... existing definition ...
    responses:
      '200':
        description: Success
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MyResponse'
      '400':  # ADD THIS SECTION
        description: Bad request - invalid parameters
        content:
          application/json:
            schema:
              $ref: '#/components/responses/ErrorResponse'
      '401':  # ADD THIS SECTION
        description: Unauthorized - missing or invalid token
        content:
          application/json:
            schema:
              $ref: '#/components/responses/ErrorResponse'
      default:
        $ref: '#/components/responses/ErrorResponse'
```

### Standard Error Codes to Add

For **authenticated endpoints** (most of them):
- `400`: Invalid request parameters
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found (for endpoints with path params)
- `422`: Unprocessable entity (validation errors)

For **unauthenticated endpoints** (auth/onboarding):
- `400`: Invalid request parameters
- `429`: Too many requests (rate limit)

### Simplification Strategy

Since the spec already defines `ErrorResponse`, you can use template operations:

```yaml
components:
  responses:
    ErrorResponse:
      description: Standard error response
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorModel'
    
    CommonClientErrors:  # NEW - reuse this
      '400':
        description: Bad request
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorModel'
      '401':
        description: Unauthorized
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorModel'
      '404':
        description: Not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorModel'
```

## Issue #3: Missing License (1 warning)

### Current
```yaml
info:
  title: Asora Backend API Contract
  version: 1.0.0
  description: >
    Authenticity-first Asora backend contract...
```

### Fixed
```yaml
info:
  title: Asora Backend API Contract
  version: 1.0.0
  description: >
    Authenticity-first Asora backend contract...
  license:
    name: MIT
    url: https://github.com/AsoraKK/asora/blob/main/LICENSE
```

## Validation Workflow

After making changes:

```bash
# 1. Lint the spec
redocly lint docs/openapi.yaml

# 2. Check for syntax errors
redocly bundle docs/openapi.yaml

# 3. Preview documentation
redocly preview-docs docs/openapi.yaml

# 4. Generate code (once issues fixed)
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-axios \
  -o generated/typescript-client
```

## Timeline Estimate

| Task | Estimate | Priority |
|------|----------|----------|
| Add operationId to 34 endpoints | 45 min | HIGH |
| Add 4XX responses to 34 endpoints | 60 min | HIGH |
| Add license field | 2 min | LOW |
| Test with code generator | 15 min | HIGH |
| **Total** | **2 hours** | — |

## Files to Update

- `docs/openapi.yaml` - Main spec file

## Recommended Approach

1. **Start with operationId** (easier, more impactful)
   - Add one per operation systematically
   - Use provided naming guide
   
2. **Add 4XX responses** (more verbose)
   - Create reusable error response schema
   - Reference it in each operation
   - Or use a text replacement pattern

3. **Add license** (trivial)
   - Single line in info section

4. **Validate frequently**
   - Run `redocly lint` after each batch of changes
   - Verify zero errors before code generation

## See Also

- **Validation Report**: `OPENAPI_VALIDATION_REPORT.md`
- **OpenAPI Spec**: `docs/openapi.yaml`
- **Redocly Docs**: https://redocly.com/docs/cli/
