/**
 * Azure Function - GET /feed/get
 * 
 * Description:
 * Returns a personalized content feed for authenticated users based on their
 * preferences, tier level, and engagement history.
 * 
 * Request Flow:
 * 1. Validates JWT token in Authorization header
 * 2. Extracts userId and user tier from token
 * 3. Applies tier-specific content filtering and limits
 * 4. Fetches posts based on user preferences and algorithm
 * 5. Includes moderation scores and user interaction data
 * 6. Returns paginated feed with metadata
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100 for premium/enterprise)
 * - type: "trending"|"recent"|"following" (default: "trending")
 * - filter: "all"|"safe"|"moderate" (content safety level)
 * 
 * Request:
 * GET /feed/get?page=1&limit=20&type=trending&filter=safe
 * Headers: Authorization: Bearer <JWT_TOKEN>
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "feed": {
 *     "posts": [
 *       {
 *         "id": "string",
 *         "text": "string",
 *         "mediaUrl": "string?",
 *         "author": {
 *           "id": "string",
 *           "displayName": "string",
 *           "tier": "string",
 *           "reputationScore": number
 *         },
 *         "createdAt": "ISO string",
 *         "stats": {
 *           "likesCount": number,
 *           "commentsCount": number,
 *           "sharesCount": number
 *         },
 *         "userInteraction": {
 *           "liked": boolean,
 *           "commented": boolean,
 *           "flagged": boolean
 *         },
 *         "aiScore": {
 *           "overall": "safe|warning|unsafe",
 *           "confidence": number
 *         }
 *       }
 *     ],
 *     "pagination": {
 *       "currentPage": number,
 *       "totalPages": number,
 *       "totalItems": number,
 *       "hasNext": boolean,
 *       "hasPrevious": boolean
 *     },
 *     "algorithm": {
 *       "type": "string",
 *       "userTier": "string",
 *       "appliedFilters": string[]
 *     }
 *   }
 * }
 * 
 * Tier-Based Features:
 * - Free: 20 posts max, basic trending algorithm
 * - Premium: 50 posts max, advanced personalization
 * - Enterprise: 100 posts max, custom algorithms, priority content
 * 
 * Error Responses:
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 429 Too Many Requests: Rate limit exceeded (tier-based)
 * - 500 Internal Server Error: Database/algorithm failures
 * 
 * Requirements:
 * - Use TypeScript with Azure Functions v4
 * - Validate JWT using shared auth helper
 * - Implement tier-based content limits and features
 * - Apply content moderation filters
 * - Include user interaction tracking
 * - Support multiple feed algorithms
 * - Implement efficient pagination
 */

// GitHub Copilot: Implement personalized feed endpoint with tier-based features
