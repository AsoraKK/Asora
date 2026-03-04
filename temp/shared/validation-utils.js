"use strict";
/// ASORA SHARED VALIDATION UTILITIES
///
/// 🎯 Purpose: Input validation helpers for Azure Functions
/// 🏗️ Architecture: Shared validation logic with type safety
/// 🔐 Security: Input sanitization and validation to prevent injection
/// 📊 Database: Query parameter validation for safe database operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePagination = validatePagination;
exports.validateText = validateText;
exports.validateUUID = validateUUID;
exports.validateEmail = validateEmail;
exports.validateStringArray = validateStringArray;
exports.validateLocation = validateLocation;
exports.validateRadius = validateRadius;
exports.validateFeedType = validateFeedType;
exports.validateCategory = validateCategory;
exports.sanitizeText = sanitizeText;
exports.validateRequestSize = validateRequestSize;
/**
 * Validate pagination parameters
 */
function validatePagination(page, pageSize, maxPageSize = 50) {
    if (!Number.isInteger(page) || page < 1) {
        return {
            valid: false,
            error: 'Page must be a positive integer starting from 1'
        };
    }
    if (!Number.isInteger(pageSize) || pageSize < 1) {
        return {
            valid: false,
            error: 'Page size must be a positive integer'
        };
    }
    if (pageSize > maxPageSize) {
        return {
            valid: false,
            error: `Page size cannot exceed ${maxPageSize}`
        };
    }
    return { valid: true };
}
/**
 * Validate and sanitize text input
 */
function validateText(text, minLength = 1, maxLength = 1000, fieldName = 'text') {
    if (typeof text !== 'string') {
        return {
            valid: false,
            error: `${fieldName} must be a string`
        };
    }
    const trimmedText = text.trim();
    if (trimmedText.length < minLength) {
        return {
            valid: false,
            error: `${fieldName} must be at least ${minLength} characters long`
        };
    }
    if (trimmedText.length > maxLength) {
        return {
            valid: false,
            error: `${fieldName} cannot exceed ${maxLength} characters`
        };
    }
    // Check for potentially harmful content
    if (containsSuspiciousPatterns(trimmedText)) {
        return {
            valid: false,
            error: `${fieldName} contains invalid characters or patterns`
        };
    }
    return { valid: true };
}
/**
 * Validate UUID format
 */
function validateUUID(id, fieldName = 'id') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return {
            valid: false,
            error: `${fieldName} must be a valid UUID`
        };
    }
    return { valid: true };
}
/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            valid: false,
            error: 'Invalid email format'
        };
    }
    return { valid: true };
}
/**
 * Validate array of strings (like tags)
 */
function validateStringArray(arr, maxItems = 10, maxItemLength = 50, fieldName = 'array') {
    if (!Array.isArray(arr)) {
        return {
            valid: false,
            error: `${fieldName} must be an array`
        };
    }
    if (arr.length > maxItems) {
        return {
            valid: false,
            error: `${fieldName} cannot have more than ${maxItems} items`
        };
    }
    for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] !== 'string') {
            return {
                valid: false,
                error: `${fieldName} item ${i + 1} must be a string`
            };
        }
        if (arr[i].length > maxItemLength) {
            return {
                valid: false,
                error: `${fieldName} item ${i + 1} cannot exceed ${maxItemLength} characters`
            };
        }
    }
    return { valid: true };
}
/**
 * Validate location string
 */
function validateLocation(location) {
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
            error: 'Location contains invalid characters'
        };
    }
    return { valid: true };
}
/**
 * Validate radius for location-based queries
 */
function validateRadius(radius) {
    if (!Number.isFinite(radius) || radius < 0) {
        return {
            valid: false,
            error: 'Radius must be a non-negative number'
        };
    }
    if (radius > 1000) {
        return {
            valid: false,
            error: 'Radius cannot exceed 1000 km'
        };
    }
    return { valid: true };
}
/**
 * Validate feed type
 */
function validateFeedType(type) {
    const validTypes = ['trending', 'newest', 'local', 'following', 'newCreators'];
    if (!validTypes.includes(type)) {
        return {
            valid: false,
            error: `Feed type must be one of: ${validTypes.join(', ')}`
        };
    }
    return { valid: true };
}
/**
 * Validate category
 */
function validateCategory(category) {
    const validCategories = [
        'general', 'technology', 'entertainment', 'sports', 'news',
        'education', 'health', 'travel', 'food', 'art', 'music'
    ];
    if (!validCategories.includes(category.toLowerCase())) {
        return {
            valid: false,
            error: `Category must be one of: ${validCategories.join(', ')}`
        };
    }
    return { valid: true };
}
/**
 * Sanitize text input for database storage
 */
function sanitizeText(text) {
    return text
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[<>]/g, '') // Remove potential HTML brackets
        .substring(0, 1000); // Truncate to max length
}
/**
 * Check for suspicious patterns that might indicate injection attempts
 */
function containsSuspiciousPatterns(text) {
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
        /DROP.*TABLE/i
    ];
    return suspiciousPatterns.some(pattern => pattern.test(text));
}
/**
 * Validate request body size
 */
function validateRequestSize(body, maxSizeBytes = 1024 * 1024 // 1MB default
) {
    const bodyString = JSON.stringify(body);
    const sizeBytes = Buffer.byteLength(bodyString, 'utf8');
    if (sizeBytes > maxSizeBytes) {
        return {
            valid: false,
            error: `Request body size (${sizeBytes} bytes) exceeds maximum allowed size (${maxSizeBytes} bytes)`
        };
    }
    return { valid: true };
}
//# sourceMappingURL=validation-utils.js.map