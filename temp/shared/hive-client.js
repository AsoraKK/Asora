"use strict";
/**
 * ASORA HIVE AI V2 INTEGRATION
 *
 * 🎯 Purpose: Content moderation using Hive AI v2 API
 * 🔐 Security: Automatic content scanning for policy violations
 * 🚨 Features: Text, image, and video analysis with confidence scores
 * 📊 Models: Violence, hate speech, adult content, spam detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiveAIClient = void 0;
exports.createHiveClient = createHiveClient;
class HiveAIClient {
    constructor(apiKey) {
        this.baseUrl = 'https://api.thehive.ai/api/v2/task/sync';
        this.defaultModels = [
            'general_text_classification',
            'hate_speech_detection_text',
            'violence_text_detection'
        ];
        this.apiKey = apiKey;
    }
    /**
     * Moderate text content using Hive AI
     */
    async moderateText(userId, text, customModels) {
        const request = {
            user_id: userId,
            content: { text },
            models: customModels || this.defaultModels
        };
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(request)
            });
            if (!response.ok) {
                throw new Error(`Hive API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Hive AI moderation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Content moderation failed: ${errorMessage}`);
        }
    }
    /**
     * Moderate image content using Hive AI
     */
    async moderateImage(userId, imageUrl, customModels) {
        const imageModels = customModels || [
            'general_image_classification',
            'nudity_image_detection',
            'violence_image_detection'
        ];
        const request = {
            user_id: userId,
            content: { url: imageUrl },
            models: imageModels
        };
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(request)
            });
            if (!response.ok) {
                throw new Error(`Hive API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Hive AI image moderation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Image moderation failed: ${errorMessage}`);
        }
    }
    /**
     * Parse Hive response to determine moderation decision
     */
    static parseModerationResult(response) {
        const outputs = response.response.outputs;
        let highestScore = 0;
        let finalAction = 'accept';
        const flaggedCategories = [];
        const details = {};
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
            details
        };
    }
}
exports.HiveAIClient = HiveAIClient;
/**
 * Create a Hive AI client instance using environment configuration
 */
function createHiveClient() {
    const apiKey = process.env.HIVE_API_KEY;
    if (!apiKey) {
        throw new Error('HIVE_API_KEY environment variable is required');
    }
    return new HiveAIClient(apiKey);
}
//# sourceMappingURL=hive-client.js.map