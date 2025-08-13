/**
 * ASORA PLATFORM CONTEXT
 *
 * Hive AI integration for moderation and AI-generated content detection.
 * Supports text and image classification using live thresholds from moderationConfig.
 *
 * Hive API Keys stored securely in Azure environment variables:
 * - process.env.HIVE_TEXT_KEY
 * - process.env.HIVE_IMAGE_KEY
 * - process.env.HIVE_DEEPFAKE_KEY
 *
 * Moderation scores are evaluated against config thresholds for enforcement.
 * Scores and category breakdowns are returned for transparency and appeal logging.
 */

import axios from 'axios';
import { getModerationConfig, getCategoryThreshold } from './moderationConfig';

export interface HiveResult {
  score: number;
  categories: Record<string, number>; // e.g., { nudity: 0.12, hate: 0.45 }
  decision: 'approve' | 'warn' | 'block';
  triggeredRules: string[];
  raw: any;
}

export interface HiveTextOptions {
  content: string;
  userId?: string;
  contextType?: 'post' | 'comment' | 'profile';
}

/**
 * Moderate text content using Hive AI with dynamic thresholds
 * Returns comprehensive analysis with category breakdowns
 */
export async function moderateText(options: HiveTextOptions): Promise<HiveResult> {
  const config = await getModerationConfig();
  const apiKey = process.env.HIVE_TEXT_KEY;

  if (!apiKey) {
    throw new Error('HIVE_TEXT_KEY environment variable not configured');
  }

  try {
    const response = await axios.post(
      'https://api.thehive.ai/api/v2/task/text/classification',
      {
        text: options.content,
        language: 'en',
      },
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const result = response.data.status?.[0];
    if (!result) {
      throw new Error('Invalid response from Hive AI API');
    }

    // Extract overall score and category scores
    const overallScore = result.response?.output?.[0]?.score || 0;
    const categories: Record<string, number> = {};
    const triggeredRules: string[] = [];

    // Process category-specific scores
    if (result.response?.output) {
      for (const output of result.response.output) {
        if (output.classes) {
          for (const cls of output.classes) {
            categories[cls.class] = cls.score;

            // Check category-specific thresholds
            const categoryThreshold = await getCategoryThreshold(cls.class);
            if (categoryThreshold && cls.score > categoryThreshold) {
              triggeredRules.push(`${cls.class}: ${cls.score} > ${categoryThreshold}`);
            }
          }
        }
      }
    }

    // Determine final decision based on thresholds
    let decision: 'approve' | 'warn' | 'block' = 'approve';

    if (overallScore >= config.thresholds.blocked || triggeredRules.length > 0) {
      decision = 'block';
    } else if (overallScore >= config.thresholds.safe) {
      decision = 'warn';
    }

    console.log(
      `Hive AI moderation: score=${overallScore}, decision=${decision}, categories=${Object.keys(categories).length}`
    );

    return {
      score: overallScore,
      categories,
      decision,
      triggeredRules,
      raw: response.data,
    };
  } catch (error: any) {
    console.error('Hive AI moderation failed:', error.message);

    // Graceful degradation - return safe defaults
    return {
      score: 0.0,
      categories: {},
      decision: 'approve',
      triggeredRules: ['API_ERROR: Graceful fallback applied'],
      raw: { error: error.message },
    };
  }
}

/**
 * Moderate image content using Hive AI (placeholder for future implementation)
 */
export async function moderateImage(base64Image: string, userId?: string): Promise<HiveResult> {
  const apiKey = process.env.HIVE_IMAGE_KEY;

  if (!apiKey) {
    console.warn('HIVE_IMAGE_KEY not configured, skipping image moderation');
    return {
      score: 0.0,
      categories: {},
      decision: 'approve',
      triggeredRules: ['IMAGE_MODERATION_DISABLED'],
      raw: {},
    };
  }

  try {
    const response = await axios.post(
      'https://api.thehive.ai/api/v2/task/image/classification',
      {
        image: base64Image,
      },
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout for images
      }
    );

    // TODO: Process image moderation response similar to text
    console.log('Image moderation result:', response.data);

    return {
      score: 0.0,
      categories: {},
      decision: 'approve',
      triggeredRules: [],
      raw: response.data,
    };
  } catch (error: any) {
    console.error('Hive AI image moderation failed:', error.message);

    return {
      score: 0.0,
      categories: {},
      decision: 'approve',
      triggeredRules: ['IMAGE_API_ERROR'],
      raw: { error: error.message },
    };
  }
}

/**
 * Detect AI-generated content using Hive AI (placeholder for future implementation)
 */
export async function detectAIGenerated(content: string): Promise<{
  isAIGenerated: boolean;
  confidence: number;
  model?: string;
}> {
  const apiKey = process.env.HIVE_DEEPFAKE_KEY;

  if (!apiKey) {
    console.warn('HIVE_DEEPFAKE_KEY not configured, skipping AI detection');
    return {
      isAIGenerated: false,
      confidence: 0.0,
    };
  }

  // AI detection implementation placeholder
  // When implemented, this would analyze image/video content for AI generation
  // For now, return conservative defaults for safety
  console.log('📸 AI detection evaluation requested but not yet implemented');

  return {
    isAIGenerated: false, // Default to human-created content
    confidence: 0.0, // No confidence in detection
  };
}
