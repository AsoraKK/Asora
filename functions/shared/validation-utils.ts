/// ASORA SHARED VALIDATION UTILITIES
///
/// 🎯 Purpose: Input validation helpers for Azure Functions
/// 🏗️ Architecture: Shared validation logic with type safety
/// 🔐 Security: Input sanitization and validation to prevent injection
/// 📊 Database: Query parameter validation for safe database operations

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: number,
  pageSize: number,
  maxPageSize: number = 50
): ValidationResult {
  if (!Number.isInteger(page) || page < 1) {
    return {
      valid: false,
      error: 'Page must be a positive integer starting from 1',
    };
  }

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return {
      valid: false,
      error: 'Page size must be a positive integer',
    };
  }

  if (pageSize > maxPageSize) {
    return {
      valid: false,
      error: `Page size cannot exceed ${maxPageSize}`,
    };
  }

  return { valid: true };
}

/**
 * Validate and sanitize text input
 */
export function validateText(
  text: string,
  minLength: number = 1,
  maxLength: number = 1000,
  fieldName: string = 'text'
): ValidationResult {
  if (typeof text !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmedText = text.trim();

  if (trimmedText.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters long`,
    };
  }

  if (trimmedText.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
    };
  }

  // Check for potentially harmful content
  if (containsSuspiciousPatterns(trimmedText)) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters or patterns`,
    };
  }

  return { valid: true };
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string, fieldName: string = 'id'): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return {
      valid: false,
      error: `${fieldName} must be a valid UUID`,
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  return { valid: true };
}

/**
 * Validate array of strings (like tags)
 */
export function validateStringArray(
  arr: any,
  maxItems: number = 10,
  maxItemLength: number = 50,
  fieldName: string = 'array'
): ValidationResult {
  if (!Array.isArray(arr)) {
    return {
      valid: false,
      error: `${fieldName} must be an array`,
    };
  }

  if (arr.length > maxItems) {
    return {
      valid: false,
      error: `${fieldName} cannot have more than ${maxItems} items`,
    };
  }

  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== 'string') {
      return {
        valid: false,
        error: `${fieldName} item ${i + 1} must be a string`,
      };
    }

    if (arr[i].length > maxItemLength) {
      return {
        valid: false,
        error: `${fieldName} item ${i + 1} cannot exceed ${maxItemLength} characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate location string
 */
export function validateLocation(location: string): ValidationResult {
  // Simple validation for location format
  // In production, you might want more sophisticated geo-validation
  const result = validateText(location, 2, 100, 'location');

  if (!result.valid) {
    return result;
  }

  // Check for basic location format (city, country or coordinates)
  if (!/^[a-zA-Z0-9\s,.-]+$/.test(location)) {
    return {
      valid: false,
      error: 'Location contains invalid characters',
    };
  }

  return { valid: true };
}

/**
 * Validate radius for location-based queries
 */
export function validateRadius(radius: number): ValidationResult {
  if (!Number.isFinite(radius) || radius < 0) {
    return {
      valid: false,
      error: 'Radius must be a non-negative number',
    };
  }

  if (radius > 1000) {
    return {
      valid: false,
      error: 'Radius cannot exceed 1000 km',
    };
  }

  return { valid: true };
}

/**
 * Validate feed type
 */
export function validateFeedType(type: string): ValidationResult {
  const validTypes = ['trending', 'newest', 'local', 'following', 'newCreators'];

  if (!validTypes.includes(type)) {
    return {
      valid: false,
      error: `Feed type must be one of: ${validTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate category
 */
export function validateCategory(category: string): ValidationResult {
  const validCategories = [
    'general',
    'technology',
    'entertainment',
    'sports',
    'news',
    'education',
    'health',
    'travel',
    'food',
    'art',
    'music',
  ];

  if (!validCategories.includes(category.toLowerCase())) {
    return {
      valid: false,
      error: `Category must be one of: ${validCategories.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize text input for database storage
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, '') // Remove potential HTML brackets
    .substring(0, 1000); // Truncate to max length
}

/**
 * Check for suspicious patterns that might indicate injection attempts
 */
function containsSuspiciousPatterns(text: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
    /onclick/i,
    /eval\(/i,
    /expression\(/i,
    /SELECT.*FROM/i,
    /INSERT.*INTO/i,
    /UPDATE.*SET/i,
    /DELETE.*FROM/i,
    /DROP.*TABLE/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Validate request body size
 */
export function validateRequestSize(
  body: any,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): ValidationResult {
  const bodyString = JSON.stringify(body);
  const sizeBytes = Buffer.byteLength(bodyString, 'utf8');

  if (sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `Request body size (${sizeBytes} bytes) exceeds maximum allowed size (${maxSizeBytes} bytes)`,
    };
  }

  return { valid: true };
}
