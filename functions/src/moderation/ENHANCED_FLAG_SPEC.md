/**
 * ASORA – MODERATION FLAG FUNCTION (ENHANCED)
 *
 * ✅ Requirements:
 * - HTTP POST /moderation/flag
 * - JWT auth: validate token, extract userId
 * - Accept JSON body:
 *   {
 *     contentType: "post" | "comment" | "user",
 *     contentId: string,
 *     reason: "spam" | "hate" | "violence" | "nudity" | "harassment" | "misinformation" | "other",
 *     description?: string,
 *     severity?: "low" | "medium" | "high" | "urgent",
 *     reporterContext?: {
 *       userAgent?: string,
 *       location?: string,
 *       previousInteraction?: boolean
 *     }
 *   }
 * - Prevent duplicate flags by same user → return 409 Conflict
 * - Rate limiting: max 10 flags per user per hour
 *
 * ✅ Enhanced Moderation Pipeline:
 * 1. Validate input with Joi schema including reason enum validation
 * 2. Check rate limit: count flags by userId in last hour
 * 3. Fetch existing flag for (userId, contentType, contentId); if exists → 409
 * 4. Lookup target content (in `posts`, `comments`, or `users`) to get text/media
 * 5. Call Hive AI via `hiveClient.moderateText()` or `moderateImage()` with flag context
 * 6. Compare returned score & categories against dynamic thresholds from `moderationConfig`
 *    - If score ≥ config.thresholds.autoHide → auto-hide content immediately
 *    - If multiple flags on same content → escalate priority
 *    - Record which `triggeredRules` fired with confidence scores
 * 7. Update content visibility if auto-action triggered
 * 8. Insert new flag into `flags` collection and log into `moderationLogs`:
 *    {
 *      id: uuid,
 *      userId,
 *      userEmail,
 *      contentType,
 *      contentId,
 *      reason,
 *      description,
 *      severity,
 *      reporterContext,
 *      aiAnalysis: {
 *        score: number,
 *        decision: "hide" | "review" | "allow",
 *        categories: Record<string, number>,
 *        triggeredRules: string[],
 *        confidence: number
 *      },
 *      actionTaken?: {
 *        type: "auto_hide" | "escalate" | "none",
 *        reason: string,
 *        timestamp: string
 *      },
 *      flagCount: number,  // How many flags this content has received
 *      priority: "low" | "medium" | "high" | "urgent",
 *      status: "pending" | "reviewed" | "resolved" | "dismissed",
 *      createdAt: string,
 *      reviewedAt?: string,
 *      reviewedBy?: string
 *    }
 *
 * ✅ Enhanced Response:
 * - 201 Created with comprehensive flag record
 * - 409 Conflict if duplicate flag exists
 * - 429 Too Many Requests if rate limit exceeded
 * - 400 Bad Request for validation errors
 * - 401 Unauthorized if JWT invalid
 * - 404 Not Found if target content doesn't exist
 * - 500 Internal Server Error on unhandled exceptions
 *
 * ✅ Auto-Actions:
 * - Content with score ≥ autoHide threshold: immediately hidden
 * - Content with 3+ flags: escalated to human review
 * - Urgent severity flags: immediate admin notification
 * - Pattern detection: flag multiple posts from same user
 *
 * 🧠 Copilot Context:
 * - Use imports: getUserContext, getModerationConfig, moderateText, getContainer
 * - Implement rate limiting with Cosmos DB timestamp queries
 * - Handle content lookup across multiple collections
 * - Follow Azure Functions v4 TypeScript patterns with comprehensive error handling
 */
