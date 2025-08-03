/**
 * Privacy and Security Utilities for PII Protection
 * 
 * This module provides hashing and anonymization utilities to protect
 * personally identifiable information (PII) in logs and storage.
 */

import { createHash } from 'crypto';

/**
 * Hash an email address for logging purposes while maintaining uniqueness
 * @param email - The email address to hash
 * @returns A deterministic hash of the email that can be used for correlation
 */
export function hashEmail(email: string): string {
    if (!email || typeof email !== 'string') {
        return 'unknown-user';
    }
    
    // Use SHA-256 with a salt for consistent hashing
    const salt = process.env.EMAIL_HASH_SALT || 'asora-default-salt-change-in-production';
    return createHash('sha256')
        .update(email + salt)
        .digest('hex')
        .substring(0, 16); // Use first 16 chars for shorter logs
}

/**
 * Create a privacy-safe user identifier from email
 * @param email - The user's email address
 * @returns A hashed identifier that can be used for logging and correlation
 */
export function createPrivacySafeUserId(email: string): string {
    return `user_${hashEmail(email)}`;
}

/**
 * Redact email from logs while preserving domain for debugging
 * @param email - The email address to redact
 * @returns A redacted version showing only domain
 */
export function redactEmail(email: string): string {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return '[invalid-email]';
    }
    
    const [, domain] = email.split('@');
    return `[redacted]@${domain}`;
}

/**
 * Privacy-safe logging utility that automatically redacts PII
 * @param message - Log message
 * @param userEmail - User email to hash/redact
 * @param additionalData - Additional data to log
 */
export function privacyLog(message: string, userEmail?: string, additionalData?: any) {
    const safeUserId = userEmail ? createPrivacySafeUserId(userEmail) : 'unknown';
    const redactedEmail = userEmail ? redactEmail(userEmail) : 'unknown';
    
    return {
        message,
        userId: safeUserId,
        userDisplay: redactedEmail,
        ...additionalData,
        timestamp: new Date().toISOString()
    };
}
