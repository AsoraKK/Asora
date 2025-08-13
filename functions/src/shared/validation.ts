/**
 * Shared Validation Helper for Asora Azure Functions
 *
 * This module provides input validation utilities for API endpoints.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate comment content
 * @param text - Comment text
 * @param postId - Parent post ID
 * @returns ValidationResult
 */
export function validateComment(text?: string, postId?: string): ValidationResult {
  const errors: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push('Comment text is required');
  }

  if (text && text.length > 500) {
    errors.push('Comment cannot exceed 500 characters');
  }

  if (!postId || postId.trim().length === 0) {
    errors.push('Post ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns boolean indicating if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
