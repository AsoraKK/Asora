/**
 * ASORA HIVE AI V2 INTEGRATION
 *
 * 🎯 Purpose: Content moderation using Hive AI v2 API
 * 🔐 Security: Automatic content scanning for policy violations
 * 🚨 Features: Text, image, and video analysis with confidence scores
 * 📊 Models: Violence, hate speech, adult content, spam detection
 */

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
  user_id: string;
  content: {
    text?: string;
    url?: string; // For images/videos
  };
  models?: string[];
}

export interface HiveModerationResponse {
  status: 'success' | 'error';
  response: {
    outputs: {
      [modelName: string]: {
        summary: {
          action: 'accept' | 'review' | 'reject';
          action_reason: string;
          score: number;
        };
        classes: {
          class: string;
          score: number;
        }[];
      };
    };
  };
  request_id: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.thehive.ai/api/v2/task/sync';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1000;

/** Confidence threshold for BLOCK action (>= 0.85) */
const BLOCK_THRESHOLD = 0.85;
/** Confidence threshold for WARN action (>= 0.5) */
const WARN_THRESHOLD = 0.5;

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
    } else {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
      this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      this.retries = config.retries ?? DEFAULT_RETRIES;
      this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
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
      user_id: userId,
      content: { text },
      models: models || this.defaultModels,
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
      user_id: userId,
      content: { text },
      models: customModels || this.defaultModels,
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
      user_id: userId,
      content: { url: imageUrl },
      models: imageModels,
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
          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
              ...(contentId && { 'X-Content-Id': contentId }),
            },
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

          // Validate response structure
          if (!data || data.status === 'error') {
            throw new HiveAPIError(
              'Hive API returned error status',
              'API_ERROR_STATUS',
              response.status,
              true
            );
          }

          if (!data.response?.outputs) {
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
    const outputs = response.response.outputs;
    let highestScore = 0;
    let worstAction: 'accept' | 'review' | 'reject' = 'accept';
    const categories = new Set<ModerationCategory>();
    const reasons: string[] = [];

    // Analyze each model's output
    for (const [modelName, output] of Object.entries(outputs)) {
      const { summary, classes } = output;

      // Track worst action and highest score
      if (summary.action === 'reject') {
        worstAction = 'reject';
        highestScore = Math.max(highestScore, summary.score);
        if (summary.action_reason) {
          reasons.push(`${modelName}: ${summary.action_reason}`);
        }
      } else if (summary.action === 'review' && worstAction !== 'reject') {
        worstAction = 'review';
        highestScore = Math.max(highestScore, summary.score);
        if (summary.action_reason) {
          reasons.push(`${modelName}: ${summary.action_reason}`);
        }
      }

      // Collect flagged categories
      for (const cls of classes) {
        if (cls.score > WARN_THRESHOLD) {
          const category = this.mapClassToCategory(cls.class);
          categories.add(category);
          if (cls.score > BLOCK_THRESHOLD) {
            reasons.push(`High ${cls.class} score: ${(cls.score * 100).toFixed(1)}%`);
          }
        }
      }
    }

    // Map Hive action to internal ModerationAction
    let action: ModerationAction;
    if (worstAction === 'reject' || highestScore >= BLOCK_THRESHOLD) {
      action = ModerationAction.BLOCK;
    } else if (worstAction === 'review' || highestScore >= WARN_THRESHOLD) {
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
      requestId: response.request_id,
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
    const outputs = response.response.outputs;
    let highestScore = 0;
    let finalAction: 'accept' | 'review' | 'reject' = 'accept';
    const flaggedCategories: string[] = [];
    const details: any = {};

    // Analyze each model's output
    for (const [modelName, output] of Object.entries(outputs)) {
      const { summary, classes } = output;
      details[modelName] = { summary, classes };

      // Track highest risk score
      if (summary.score > highestScore) {
        highestScore = summary.score;
        finalAction = summary.action;
      }

      // Collect flagged categories (score > 0.5 threshold)
      classes.forEach(cls => {
        if (cls.score > 0.5) {
          flaggedCategories.push(`${modelName}:${cls.class}`);
        }
      });
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
  });
}
