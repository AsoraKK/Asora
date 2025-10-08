/**
 * ASORA HIVE AI V2 INTEGRATION
 *
 * 🎯 Purpose: Content moderation using Hive AI v2 API
 * 🔐 Security: Automatic content scanning for policy violations
 * 🚨 Features: Text, image, and video analysis with confidence scores
 * 📊 Models: Violence, hate speech, adult content, spam detection
 */

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

export class HiveAIClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.thehive.ai/api/v2/task/sync';
  private readonly defaultModels = [
    'general_text_classification',
    'hate_speech_detection_text',
    'violence_text_detection',
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Moderate text content using Hive AI
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

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Hive API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as HiveModerationResponse;
    } catch (error) {
      console.error('Hive AI moderation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Content moderation failed: ${errorMessage}`);
    }
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

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Hive API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as HiveModerationResponse;
    } catch (error) {
      console.error('Hive AI image moderation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Image moderation failed: ${errorMessage}`);
    }
  }

  /**
   * Parse Hive response to determine moderation decision
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
export function createHiveClient(): HiveAIClient {
  const apiKey = process.env.HIVE_API_KEY;
  if (!apiKey) {
    throw new Error('HIVE_API_KEY environment variable is required');
  }
  return new HiveAIClient(apiKey);
}
