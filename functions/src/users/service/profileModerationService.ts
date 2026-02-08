import type { InvocationContext } from '@azure/functions';
import {
  createHiveClient,
  ModerationAction,
  type ModerationResult,
} from '@shared/clients/hive';

type ProfileField = 'displayName' | 'username' | 'bio';

export interface ProfileModerationInput {
  displayName?: string;
  username?: string;
  bio?: string;
}

export interface ProfileModerationDecision {
  allowed: boolean;
  blockedFields: ProfileField[];
  categories: string[];
  warnings: string[];
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function collectCategories(result: ModerationResult): string[] {
  return result.categories.map((category) => String(category));
}

export async function moderateProfileUpdates(
  userId: string,
  input: ProfileModerationInput,
  context: InvocationContext
): Promise<ProfileModerationDecision> {
  const fields: Array<[ProfileField, string]> = [];
  const displayName = normalizeText(input.displayName);
  const username = normalizeText(input.username);
  const bio = normalizeText(input.bio);

  if (displayName) {
    fields.push(['displayName', displayName]);
  }
  if (username) {
    fields.push(['username', username]);
  }
  if (bio) {
    fields.push(['bio', bio]);
  }

  if (fields.length === 0 || !process.env.HIVE_API_KEY) {
    return {
      allowed: true,
      blockedFields: [],
      categories: [],
      warnings: [],
    };
  }

  const hiveClient = createHiveClient({ apiKey: process.env.HIVE_API_KEY });
  const blockedFields: ProfileField[] = [];
  const categories = new Set<string>();
  const warnings: string[] = [];

  for (const [field, text] of fields) {
    try {
      const moderation = await hiveClient.moderateTextContent({
        text,
        userId,
        contentId: `profile:${userId}:${field}`,
      });

      for (const category of collectCategories(moderation)) {
        categories.add(category);
      }

      if (moderation.action === ModerationAction.BLOCK) {
        blockedFields.push(field);
      }
    } catch (error) {
      const message = (error as Error).message || 'unknown moderation failure';
      warnings.push(`${field}:${message}`);
      context.warn('[users.profile.moderation_failed]', {
        userId,
        field,
        message,
      });
    }
  }

  return {
    allowed: blockedFields.length === 0,
    blockedFields,
    categories: [...categories],
    warnings,
  };
}
