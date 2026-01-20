/**
 * ASORA HIVE AI V2 INTEGRATION
 *
 * 🎯 Purpose: Content moderation using Hive AI v2 API
 * 🔐 Security: Automatic content scanning for policy violations
 * 🚨 Features: Text, image, and video analysis with confidence scores
 * 📊 Models: Violence, hate speech, adult content, spam detection
 */

import { getDefaultWeights, getClassByName } from './hive-classes-config';

// ─────────────────────────────────────────────────────────────
// Types and Enums
// ─────────────────────────────────────────────────────────────

/**
 * Internal moderation action enum - maps Hive responses to application actions
 */
export enum ModerationAction {
  /** Content is safe, allow to proceed */
  ALLOW = 'ALLOW',
  /** Content needs manual review (borderline) */
  WARN = 'WARN',
  /** Content violates policy, block immediately */
  BLOCK = 'BLOCK',
}

/**
 * Categories of content violations
 */
export enum ModerationCategory {
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  ADULT_CONTENT = 'adult_content',
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  SELF_HARM = 'self_harm',
  ILLEGAL = 'illegal',
  OTHER = 'other',
}

/**
 * Standardized moderation result returned by the client
 */
export interface ModerationResult {
  /** The recommended action: ALLOW, WARN, or BLOCK */
  action: ModerationAction;
  /** Confidence score 0-1 (higher = more confident in the decision) */
  confidence: number;
  /** List of violated categories */
  categories: ModerationCategory[];
  /** Human-readable reasons for the decision */
  reasons: string[];
  /** Raw Hive response for debugging/logging */
  raw?: HiveModerationResponse;
  /** Request tracking ID */
  requestId?: string;
}

/**
 * Input parameters for text moderation
 */
export interface ModerateTextParams {
  /** The text content to moderate */
  text: string;
  /** User ID for tracking and rate limiting */
  userId: string;
  /** Optional content ID for audit trail */
  contentId?: string;
  /** Optional custom models to use */
  models?: string[];
}

/**
 * Hive client configuration options
 */
export interface HiveClientConfig {
  /** API key for Hive AI */
  apiKey: string;
  /** Base URL for Hive API (default: https://api.thehive.ai/api/v2/task/sync) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Number of retry attempts (default: 2) */
  retries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** 
   * Dynamic threshold for BLOCK action (overrides default 0.85)
   * @deprecated Use classWeights for per-class control
   */
  blockThreshold?: number;
  /** 
   * Dynamic threshold for WARN action (overrides default 0.5)
   * @deprecated Use classWeights for per-class control
   */
  warnThreshold?: number;
  /**
   * Per-class weight overrides (e.g., { hate: 0.90, spam: 0.70 })
   * If provided, individual class scores are compared against their specific weights
   * Falls back to defaults from hive-classes-config.ts
   */
  classWeights?: Record<string, number>;
  
  // ─────────────────────────────────────────────────────────────
  // Test Mode Options - For cost tracking and monitoring separation
  // ─────────────────────────────────────────────────────────────
  /** Whether this is a test mode request (for monitoring separation) */
  isTestMode?: boolean;
  /** Test session ID for grouping (for monitoring separation) */
  testSessionId?: string;
}

/**
 * Error thrown when Hive API operations fail
 */
export class HiveAPIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'HiveAPIError';
  }
}

export interface HiveModerationRequest {
  text_data?: string;
  image_url?: string;
  models?: string[];
  user_id?: string;
}

export interface HiveModerationResponse {
  id: string;
  code: number;
  project_id: number;
  user_id: number;
  created_on: string;
  status: Array<{
    status: {
      code: string;
      message: string;
    };
    response: {
      output: Array<{
        classes: Array<{
          class: string;
          score: number;
        }>;
      }>;
    };
  }>;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.thehive.ai/api/v2/task/sync';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;

/** Default confidence threshold for BLOCK action (>= 0.85) */
const DEFAULT_BLOCK_THRESHOLD = 0.85;
/** Default confidence threshold for WARN action (>= 0.5) */
const DEFAULT_WARN_THRESHOLD = 0.5;

/** Map Hive class names to internal categories */
const CLASS_TO_CATEGORY: Record<string, ModerationCategory> = {
  hate: ModerationCategory.HATE_SPEECH,
  hate_speech: ModerationCategory.HATE_SPEECH,
  violence: ModerationCategory.VIOLENCE,
  gore: ModerationCategory.VIOLENCE,
  adult: ModerationCategory.ADULT_CONTENT,
  sexual: ModerationCategory.ADULT_CONTENT,
  nudity: ModerationCategory.ADULT_CONTENT,
  harassment: ModerationCategory.HARASSMENT,
  bullying: ModerationCategory.HARASSMENT,
  spam: ModerationCategory.SPAM,
  scam: ModerationCategory.SPAM,
  self_harm: ModerationCategory.SELF_HARM,
  suicide: ModerationCategory.SELF_HARM,
  illegal: ModerationCategory.ILLEGAL,
  drugs: ModerationCategory.ILLEGAL,
  weapons: ModerationCategory.ILLEGAL,
};

// ─────────────────────────────────────────────────────────────
// Hive AI Client
// ─────────────────────────────────────────────────────────────

export class HiveAIClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly blockThreshold: number;
  private readonly warnThreshold: number;
  private readonly classWeights: Record<string, number>;
  private readonly isTestMode: boolean;
  private readonly testSessionId: string | null;
  private readonly defaultModels = [
    'general_text_classification',
    'hate_speech_detection_text',
    'violence_text_detection',
  ];

  constructor(config: string | HiveClientConfig) {
    if (typeof config === 'string') {
      // Legacy: just API key
      this.apiKey = config;
      this.baseUrl = DEFAULT_BASE_URL;
      this.timeoutMs = DEFAULT_TIMEOUT_MS;
      this.retries = DEFAULT_RETRIES;
      this.retryDelayMs = DEFAULT_RETRY_DELAY_MS;
      this.blockThreshold = DEFAULT_BLOCK_THRESHOLD;
      this.warnThreshold = DEFAULT_WARN_THRESHOLD;
      this.classWeights = getDefaultWeights();
      this.isTestMode = false;
      this.testSessionId = null;
    } else {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
      this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      this.retries = config.retries ?? DEFAULT_RETRIES;
      this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
      this.blockThreshold = config.blockThreshold ?? DEFAULT_BLOCK_THRESHOLD;
      this.warnThreshold = config.warnThreshold ?? DEFAULT_WARN_THRESHOLD;
      // Use custom weights if provided, otherwise load defaults
      this.classWeights = config.classWeights ?? getDefaultWeights();
      // Test mode tracking for monitoring separation
      this.isTestMode = config.isTestMode ?? false;
      this.testSessionId = config.testSessionId ?? null;
    }
  }

  /**
   * Moderate text content using Hive AI with structured input
   * 
   * @param params - Moderation parameters
   * @returns Standardized moderation result
   * @throws HiveAPIError on API failures
   */
  async moderateTextContent(params: ModerateTextParams): Promise<ModerationResult> {
    const { text, userId, contentId, models } = params;

    if (!text || text.trim().length === 0) {
      return {
        action: ModerationAction.ALLOW,
        confidence: 1.0,
        categories: [],
        reasons: ['Empty content'],
      };
    }

    const request: HiveModerationRequest = {
      text_data: text,
      models: models || this.defaultModels,
      user_id: userId,
    };

    const response = await this.executeRequest(request, contentId);
    return this.parseToModerationResult(response);
  }

  /**
   * Moderate text content using Hive AI (legacy signature for backwards compatibility)
   */
  async moderateText(
    userId: string,
    text: string,
    customModels?: string[]
  ): Promise<HiveModerationResponse> {
    const request: HiveModerationRequest = {
      text_data: text,
      models: customModels || this.defaultModels,
      user_id: userId,
    };

    return this.executeRequest(request);
  }

  /**
   * Moderate image content using Hive AI
   */
  async moderateImage(
    userId: string,
    imageUrl: string,
    customModels?: string[]
  ): Promise<HiveModerationResponse> {
    const imageModels = customModels || [
      'general_image_classification',
      'nudity_image_detection',
      'violence_image_detection',
    ];

    const request: HiveModerationRequest = {
      image_url: imageUrl,
      models: imageModels,
      user_id: userId,
    };

    return this.executeRequest(request);
  }

  /**
   * Execute HTTP request to Hive API with retries and timeout
   */
  private async executeRequest(
    request: HiveModerationRequest,
    contentId?: string
  ): Promise<HiveModerationResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          // Build headers with test mode tracking
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Token ${this.apiKey}`,
          };
          
          // Add content tracking header
          if (contentId) {
            headers['X-Content-Id'] = contentId;
          }
          
          // Add test mode headers for monitoring separation
          // NOTE: These are custom headers for our own tracking, not Hive-specific
          if (this.isTestMode) {
            headers['X-Test-Mode'] = 'true';
            if (this.testSessionId) {
              headers['X-Test-Session-Id'] = this.testSessionId;
            }
          }
          
          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const statusCode = response.status;
            const statusText = response.statusText;
            
            // Check if retryable (5xx or 429)
            const retryable = statusCode >= 500 || statusCode === 429;
            
            if (retryable && attempt < this.retries) {
              await this.delay(this.retryDelayMs * (attempt + 1));
              continue;
            }

            throw new HiveAPIError(
              `Hive API error: ${statusCode} ${statusText}`,
              'API_ERROR',
              statusCode,
              retryable
            );
          }

          // Parse response with error handling for invalid JSON
          let data: HiveModerationResponse;
          try {
            data = (await response.json()) as HiveModerationResponse;
          } catch (parseError) {
            throw new HiveAPIError(
              'Invalid JSON response from Hive API',
              'PARSE_ERROR',
              response.status,
              false
            );
          }

          // Validate response structure for v2 format
          if (!data || data.code !== 200) {
            throw new HiveAPIError(
              `Hive API returned code ${data?.code || 'unknown'}`,
              'API_ERROR_STATUS',
              response.status,
              true
            );
          }

          if (!data.status || !Array.isArray(data.status) || data.status.length === 0) {
            throw new HiveAPIError(
              'Invalid response structure from Hive API',
              'INVALID_RESPONSE',
              response.status,
              false
            );
          }

          return data;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error as Error;

        // Handle AbortError (timeout)
        // Note: DOMException may not pass instanceof Error in all environments
        const isAbortError = 
          (error instanceof Error && error.name === 'AbortError') ||
          (error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError');
        
        if (isAbortError) {
          if (attempt < this.retries) {
            await this.delay(this.retryDelayMs * (attempt + 1));
            continue;
          }
          throw new HiveAPIError(
            `Hive API request timed out after ${this.timeoutMs}ms`,
            'TIMEOUT',
            undefined,
            true
          );
        }

        // Don't retry non-retryable HiveAPIErrors
        if (error instanceof HiveAPIError && !error.retryable) {
          throw error;
        }

        // For other errors, retry if attempts remain
        if (attempt < this.retries) {
          await this.delay(this.retryDelayMs * (attempt + 1));
          continue;
        }
      }
    }

    // All retries exhausted
    if (lastError instanceof HiveAPIError) {
      throw lastError;
    }
    throw new HiveAPIError(
      `Content moderation failed: ${lastError?.message || 'Unknown error'}`,
      'UNKNOWN_ERROR',
      undefined,
      false
    );
  }

  /**
   * Parse Hive response to standardized ModerationResult
   */
  private parseToModerationResult(response: HiveModerationResponse): ModerationResult {
    let highestScore = 0;
    const categories = new Set<ModerationCategory>();
    const reasons: string[] = [];

    // Check API response status
    if (response.code !== 200 || !response.status || response.status.length === 0) {
      throw new HiveAPIError(
        `Hive API error: code ${response.code}`,
        'API_ERROR',
        response.code,
        false
      );
    }

    const firstStatus = response.status[0];
    if (!firstStatus || firstStatus.status.code !== '0') {
      throw new HiveAPIError(
        `Hive moderation error: ${firstStatus?.status.message || 'Unknown error'}`,
        'MODERATION_ERROR',
        response.code,
        false
      );
    }

    // Parse the response output
    const output = firstStatus.response?.output;
    if (!output || output.length === 0) {
      // No violations detected
      return {
        action: ModerationAction.ALLOW,
        confidence: 0,
        categories: [],
        reasons: ['Content appears safe'],
        raw: response,
        requestId: response.id,
      };
    }

    // Analyze classes from the output using per-class weights
    let shouldBlock = false;
    let shouldWarn = false;
    
    for (const item of output) {
      if (item.classes && Array.isArray(item.classes)) {
        for (const cls of item.classes) {
          // Get the weight for this specific class (or fall back to global thresholds)
          const classWeight = this.classWeights[cls.class] ?? this.blockThreshold;
          const warnWeight = classWeight * 0.6; // Warn at 60% of block threshold
          
          highestScore = Math.max(highestScore, cls.score);
          
          // Check if this class exceeds its individual weight threshold
          if (cls.score >= classWeight) {
            shouldBlock = true;
            const category = this.mapClassToCategory(cls.class);
            categories.add(category);
            reasons.push(`${cls.class}: ${(cls.score * 100).toFixed(1)}% (threshold: ${(classWeight * 100).toFixed(0)}%)`);
          } else if (cls.score >= warnWeight) {
            shouldWarn = true;
            const category = this.mapClassToCategory(cls.class);
            categories.add(category);
            reasons.push(`${cls.class}: ${(cls.score * 100).toFixed(1)}% (warn level)`);
          }
        }
      }
    }

    // Map to internal ModerationAction based on per-class decisions
    let action: ModerationAction;
    if (shouldBlock) {
      action = ModerationAction.BLOCK;
    } else if (shouldWarn) {
      action = ModerationAction.WARN;
    } else {
      action = ModerationAction.ALLOW;
    }

    return {
      action,
      confidence: highestScore,
      categories: Array.from(categories),
      reasons: reasons.length > 0 ? reasons : ['Content appears safe'],
      raw: response,
      requestId: response.id,
    };
  }

  /**
   * Map Hive class name to internal ModerationCategory
   */
  private mapClassToCategory(className: string): ModerationCategory {
    const normalized = className.toLowerCase().replace(/[^a-z_]/g, '_');
    
    // Check direct mapping
    if (CLASS_TO_CATEGORY[normalized]) {
      return CLASS_TO_CATEGORY[normalized];
    }

    // Check partial matches
    for (const [key, category] of Object.entries(CLASS_TO_CATEGORY)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return category;
      }
    }

    return ModerationCategory.OTHER;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse Hive response to determine moderation decision (legacy static method)
   */
  static parseModerationResult(response: HiveModerationResponse): {
    action: 'accept' | 'review' | 'reject';
    confidence: number;
    flaggedCategories: string[];
    details: any;
  } {
    let highestScore = 0;
    let finalAction: 'accept' | 'review' | 'reject' = 'accept';
    const flaggedCategories: string[] = [];
    const details: any = {};

    // Parse the new v2 response format
    if (response.code === 200 && response.status && response.status.length > 0) {
      const firstStatus = response.status[0];
      const output = firstStatus?.response?.output;

      if (output && output.length > 0) {
        const item = output[0];
        if (item) {
          details.output = item;

          if (item.classes && Array.isArray(item.classes)) {
            for (const cls of item.classes) {
              if (cls.score > highestScore) {
                highestScore = cls.score;
              }
              // Collect flagged categories (score > 0.5 threshold)
              if (cls.score > 0.5) {
                flaggedCategories.push(cls.class);
              }
            }
          }
        }
      }
    }

    // Map score to action
    if (highestScore >= 0.85) {
      finalAction = 'reject';
    } else if (highestScore >= 0.5) {
      finalAction = 'review';
    } else {
      finalAction = 'accept';
    }

    return {
      action: finalAction,
      confidence: highestScore,
      flaggedCategories,
      details,
    };
  }
}

/**
 * Create a Hive AI client instance using environment configuration
 */
export function createHiveClient(config?: Partial<HiveClientConfig>): HiveAIClient {
  const apiKey = config?.apiKey ?? process.env.HIVE_API_KEY;
  if (!apiKey) {
    throw new Error('HIVE_API_KEY environment variable is required');
  }
  
  return new HiveAIClient({
    apiKey,
    baseUrl: config?.baseUrl ?? process.env.HIVE_API_URL,
    timeoutMs: config?.timeoutMs,
    retries: config?.retries,
    retryDelayMs: config?.retryDelayMs,
    blockThreshold: config?.blockThreshold,
    warnThreshold: config?.warnThreshold,
  });
}
