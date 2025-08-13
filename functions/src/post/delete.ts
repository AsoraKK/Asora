/**
 * Azure Function - DELETE /post/delete
 *
 * Description:
 * Deletes a post from the Asora platform with proper authorization checks.
 *
 * Request Flow:
 * 1. Validates JWT token in Authorization header
 * 2. Extracts userId from validated token
 * 3. Accepts postId from query parameters or request body
 * 4. Verifies user owns the post or has moderator privileges
 * 5. Soft deletes the post (marks as deleted, preserves for moderation)
 * 6. Updates related data (comments, likes, user reputation)
 * 7. Returns 200 OK with deletion confirmation
 *
 * Request:
 * DELETE /post/delete?postId=abc123
 * OR
 * DELETE /post/delete
 * Body: { "postId": "abc123" }
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Post deleted successfully",
 *   "postId": "abc123",
 *   "deletedAt": "ISO string"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Missing postId
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 403 Forbidden: User doesn't own post and isn't moderator
 * - 404 Not Found: Post doesn't exist
 * - 500 Internal Server Error: Database failures
 *
 * Requirements:
 * - Use TypeScript with Azure Functions v4
 * - Validate JWT using shared auth helper
 * - Check post ownership or moderator privileges
 * - Implement soft delete (preserve for audit trail)
 * - Update user reputation appropriately
 * - Handle cascade effects (comments, likes)
 */

// GitHub Copilot: Implement the post deletion function with proper authorization
