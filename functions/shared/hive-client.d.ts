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
        url?: string;
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
export declare class HiveAIClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly defaultModels;
    constructor(apiKey: string);
    /**
     * Moderate text content using Hive AI
     */
    moderateText(userId: string, text: string, customModels?: string[]): Promise<HiveModerationResponse>;
    /**
     * Moderate image content using Hive AI
     */
    moderateImage(userId: string, imageUrl: string, customModels?: string[]): Promise<HiveModerationResponse>;
    /**
     * Parse Hive response to determine moderation decision
     */
    static parseModerationResult(response: HiveModerationResponse): {
        action: 'accept' | 'review' | 'reject';
        confidence: number;
        flaggedCategories: string[];
        details: any;
    };
}
/**
 * Create a Hive AI client instance using environment configuration
 */
export declare function createHiveClient(): HiveAIClient;
//# sourceMappingURL=hive-client.d.ts.map