interface ValidationResult {
    valid: boolean;
    error?: string;
}
/**
 * Validate pagination parameters
 */
export declare function validatePagination(page: number, pageSize: number, maxPageSize?: number): ValidationResult;
/**
 * Validate and sanitize text input
 */
export declare function validateText(text: string, minLength?: number, maxLength?: number, fieldName?: string): ValidationResult;
/**
 * Validate UUID format
 */
export declare function validateUUID(id: string, fieldName?: string): ValidationResult;
/**
 * Validate email format
 */
export declare function validateEmail(email: string): ValidationResult;
/**
 * Validate array of strings (like tags)
 */
export declare function validateStringArray(arr: any, maxItems?: number, maxItemLength?: number, fieldName?: string): ValidationResult;
/**
 * Validate location string
 */
export declare function validateLocation(location: string): ValidationResult;
/**
 * Validate radius for location-based queries
 */
export declare function validateRadius(radius: number): ValidationResult;
/**
 * Validate feed type
 */
export declare function validateFeedType(type: string): ValidationResult;
/**
 * Validate category
 */
export declare function validateCategory(category: string): ValidationResult;
/**
 * Sanitize text input for database storage
 */
export declare function sanitizeText(text: string): string;
/**
 * Validate request body size
 */
export declare function validateRequestSize(body: any, maxSizeBytes?: number): ValidationResult;
export {};
//# sourceMappingURL=validation-utils.d.ts.map