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
 * Validate email format
 * @param email - Email string to validate
 * @returns boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate post content
 * @param text - Post text content
 * @param mediaUrl - Optional media URL
 * @returns ValidationResult
 */
export function validatePost(text?: string, mediaUrl?: string): ValidationResult {
  const errors: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push('Post text is required');
  }

  if (text && text.length > 2000) {
    errors.push('Post text cannot exceed 2000 characters');
  }

  if (mediaUrl && !isValidUrl(mediaUrl)) {
    errors.push('Invalid media URL format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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
    errors
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
