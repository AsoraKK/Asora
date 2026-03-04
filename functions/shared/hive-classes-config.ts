/**
 * Hive AI Classes Configuration
 * 
 * Complete listing of all classes across Hive AI v2 APIs with individual
 * weight configurations for fine-grained moderation control.
 * 
 * Live API data captured: 2026-01-18
 * Sources:
 * - Text API: Verified via live API call
 * - Image API: Hive API documentation (account not enabled for testing)
 * - Deepfake API: Hive API documentation (account not enabled for testing)
 */

/**
 * Configuration for a single Hive AI class
 * Each class can be individually weighted/adjusted in the Control Panel
 */
export interface HiveClassConfig {
  /** Unique identifier for this class */
  id: string;

  /** Display name (matches Hive API class name) */
  name: string;

  /** Human-readable description for Control Panel */
  description: string;

  /** Which API(s) this class belongs to */
  apiType: 'text' | 'image' | 'deepfake';

  /** Default weight/threshold (0-1) - 0.85 = block if score >= 85% */
  defaultWeight: number;

  /** Minimum allowed weight threshold */
  minWeight: number;

  /** Maximum allowed weight threshold */
  maxWeight: number;

  /** When should content with this class be blocked (for Control Panel info) */
  blockingGuidance: string;
}

/**
 * TEXT API Classes (19 total)
 * Live-tested via Hive AI v2 API on 2026-01-18
 */
export const TEXT_CLASSES: HiveClassConfig[] = [
  {
    id: 'text_bullying',
    name: 'bullying',
    description: 'Bullying, harassment, or threatening behavior targeting individuals',
    apiType: 'text',
    defaultWeight: 0.80,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 80% to prevent harassment campaigns',
  },
  {
    id: 'text_child_exploitation',
    name: 'child_exploitation',
    description: 'Sexual exploitation or abuse of minors',
    apiType: 'text',
    defaultWeight: 0.99,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block immediately (>=50%) - critical safety issue',
  },
  {
    id: 'text_child_safety',
    name: 'child_safety',
    description: 'Content that poses a threat to child safety',
    apiType: 'text',
    defaultWeight: 0.90,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 90% - protecting minors',
  },
  {
    id: 'text_drugs',
    name: 'drugs',
    description: 'Illegal drug use, trafficking, or promotion',
    apiType: 'text',
    defaultWeight: 0.75,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 75% - depends on jurisdiction',
  },
  {
    id: 'text_gibberish',
    name: 'gibberish',
    description: 'Spam-like gibberish or nonsensical text',
    apiType: 'text',
    defaultWeight: 0.85,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 85% to reduce spam',
  },
  {
    id: 'text_hate',
    name: 'hate',
    description: 'Hate speech or content promoting discrimination',
    apiType: 'text',
    defaultWeight: 0.85,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 85% - zero tolerance for hate',
  },
  {
    id: 'text_minor_explicitly_mentioned',
    name: 'minor_explicitly_mentioned',
    description: 'Content explicitly mentioning minors in inappropriate context',
    apiType: 'text',
    defaultWeight: 0.70,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 70% - flag for manual review',
  },
  {
    id: 'text_minor_implicitly_mentioned',
    name: 'minor_implicitly_mentioned',
    description: 'Content implicitly referencing minors in inappropriate way',
    apiType: 'text',
    defaultWeight: 0.60,
    minWeight: 0.2,
    maxWeight: 1.0,
    blockingGuidance: 'Warn if score >= 60% - may need context',
  },
  {
    id: 'text_phone_number',
    name: 'phone_number',
    description: 'Personal phone numbers (privacy/spam risk)',
    apiType: 'text',
    defaultWeight: 0.50,
    minWeight: 0.2,
    maxWeight: 1.0,
    blockingGuidance: 'Warn if score >= 50% - protect user privacy',
  },
  {
    id: 'text_promotions',
    name: 'promotions',
    description: 'Spam or suspicious promotional content',
    apiType: 'text',
    defaultWeight: 0.70,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 70% - reduce spam/scams',
  },
  {
    id: 'text_redirection',
    name: 'redirection',
    description: 'Attempts to redirect users to external sites (scam risk)',
    apiType: 'text',
    defaultWeight: 0.75,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 75% - prevent phishing/scams',
  },
  {
    id: 'text_self_harm',
    name: 'self_harm',
    description: 'Promotion or glorification of self-harm',
    apiType: 'text',
    defaultWeight: 0.90,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 90% - mental health crisis risk',
  },
  {
    id: 'text_self_harm_intent',
    name: 'self_harm_intent',
    description: 'Expressions of intent to cause self-harm',
    apiType: 'text',
    defaultWeight: 0.95,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 95% - immediate mental health concern',
  },
  {
    id: 'text_sexual',
    name: 'sexual',
    description: 'Sexual or erotic content',
    apiType: 'text',
    defaultWeight: 0.50,
    minWeight: 0.2,
    maxWeight: 1.0,
    blockingGuidance: 'Warn if score >= 50% - may need age verification',
  },
  {
    id: 'text_sexual_description',
    name: 'sexual_description',
    description: 'Explicit sexual descriptions or content',
    apiType: 'text',
    defaultWeight: 0.75,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 75% - explicit sexual content',
  },
  {
    id: 'text_spam',
    name: 'spam',
    description: 'Spam or low-quality repetitive content',
    apiType: 'text',
    defaultWeight: 0.80,
    minWeight: 0.4,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 80% - reduce noise',
  },
  {
    id: 'text_violence',
    name: 'violence',
    description: 'Depiction of violence or violent behavior',
    apiType: 'text',
    defaultWeight: 0.70,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Warn if score >= 70% - depends on context',
  },
  {
    id: 'text_violent_description',
    name: 'violent_description',
    description: 'Detailed or graphic descriptions of violence',
    apiType: 'text',
    defaultWeight: 0.85,
    minWeight: 0.4,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 85% - graphic violence',
  },
  {
    id: 'text_weapons',
    name: 'weapons',
    description: 'Illegal weapons, weapon trafficking, or violence',
    apiType: 'text',
    defaultWeight: 0.80,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 80% - illegal weapons',
  },
];

/**
 * IMAGE API Classes (9 total)
 * Source: Hive AI documentation (account not configured for image testing)
 * Available when enabled in Hive AI project settings
 */
export const IMAGE_CLASSES: HiveClassConfig[] = [
  {
    id: 'image_general_classification',
    name: 'general_image_classification',
    description: 'General inappropriate content in images',
    apiType: 'image',
    defaultWeight: 0.70,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 70%',
  },
  {
    id: 'image_nudity',
    name: 'nudity',
    description: 'Nudity or partially nude persons',
    apiType: 'image',
    defaultWeight: 0.60,
    minWeight: 0.2,
    maxWeight: 1.0,
    blockingGuidance: 'Warn if score >= 60% - may need context/age verify',
  },
  {
    id: 'image_adult_content',
    name: 'adult_content',
    description: 'Sexually explicit adult content',
    apiType: 'image',
    defaultWeight: 0.75,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 75% - explicit adult content',
  },
  {
    id: 'image_violence',
    name: 'violence_image_detection',
    description: 'Depiction of violence, gore, or injuries in images',
    apiType: 'image',
    defaultWeight: 0.70,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 70% - graphic violence',
  },
  {
    id: 'image_gore',
    name: 'gore',
    description: 'Graphic gore or severe injury imagery',
    apiType: 'image',
    defaultWeight: 0.85,
    minWeight: 0.4,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 85% - graphic gore',
  },
  {
    id: 'image_illegal_activity',
    name: 'illegal_activity',
    description: 'Depiction of illegal activities',
    apiType: 'image',
    defaultWeight: 0.75,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 75%',
  },
  {
    id: 'image_hate_symbols',
    name: 'hate_symbols',
    description: 'Hate group symbols or extremist imagery',
    apiType: 'image',
    defaultWeight: 0.85,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 85% - zero tolerance',
  },
  {
    id: 'image_weapons',
    name: 'weapons_image',
    description: 'Weapons, explosives, or dangerous items',
    apiType: 'image',
    defaultWeight: 0.75,
    minWeight: 0.3,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 75%',
  },
  {
    id: 'image_self_harm',
    name: 'self_harm_image',
    description: 'Imagery depicting or promoting self-harm',
    apiType: 'image',
    defaultWeight: 0.95,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 95% - crisis risk',
  },
];

/**
 * DEEPFAKE API Classes (1 total)
 * Source: Hive AI documentation (account not configured for deepfake testing)
 * Detects synthetic/manipulated face swap content
 */
export const DEEPFAKE_CLASSES: HiveClassConfig[] = [
  {
    id: 'deepfake_face_swap',
    name: 'deepfake_detection',
    description: 'Deepfake or face-swapped synthetic media',
    apiType: 'deepfake',
    defaultWeight: 0.80,
    minWeight: 0.5,
    maxWeight: 1.0,
    blockingGuidance: 'Block if score >= 80% - prevent misinformation',
  },
];

/**
 * All classes combined for easy reference
 */
export const ALL_HIVE_CLASSES: HiveClassConfig[] = [
  ...TEXT_CLASSES,
  ...IMAGE_CLASSES,
  ...DEEPFAKE_CLASSES,
];

/**
 * Helper: Get classes by API type
 */
export function getClassesByApiType(apiType: 'text' | 'image' | 'deepfake'): HiveClassConfig[] {
  return ALL_HIVE_CLASSES.filter(cls => cls.apiType === apiType);
}

/**
 * Helper: Get all unique class names
 */
export function getAllClassNames(): string[] {
  return ALL_HIVE_CLASSES.map(cls => cls.name).sort();
}

/**
 * Helper: Find class config by name
 */
export function getClassByName(name: string): HiveClassConfig | undefined {
  return ALL_HIVE_CLASSES.find(cls => cls.name === name);
}

/**
 * Helper: Get default weights as lookup object
 * Useful for quick threshold checks: if (score >= defaultWeights[className]) { block(); }
 */
export function getDefaultWeights(): Record<string, number> {
  const weights: Record<string, number> = {};
  ALL_HIVE_CLASSES.forEach(cls => {
    weights[cls.name] = cls.defaultWeight;
  });
  return weights;
}

/**
 * Statistics about configured classes
 */
export const HIVE_CLASSES_STATS = {
  total: ALL_HIVE_CLASSES.length,
  text: TEXT_CLASSES.length,
  image: IMAGE_CLASSES.length,
  deepfake: DEEPFAKE_CLASSES.length,
  lastUpdated: '2026-01-18',
  liveVerified: ['text'],
  documentationBased: ['image', 'deepfake'],
} as const;
