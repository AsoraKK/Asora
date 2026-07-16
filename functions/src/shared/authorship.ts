export type DeclaredAuthorship = 'human' | 'assisted' | 'generated';

export type AuthorshipLabel =
  | 'Human-authored'
  | 'AI-assisted'
  | 'AI-generated'
  | 'Under review';

export type ClassificationSource =
  | 'user_disclosure'
  | 'automated_classification'
  | 'human_review'
  | 'appeal_outcome';

export type ClassificationState =
  | 'confirmed'
  | 'conflict'
  | 'unavailable';

export type ReviewState = 'not_required' | 'pending' | 'in_review' | 'resolved';
export type AppealState = 'none' | 'eligible' | 'pending' | 'resolved';

export interface PublicAuthorship {
  authorshipLabel: AuthorshipLabel;
  declaredAuthorship: DeclaredAuthorship;
  classificationSource: ClassificationSource;
  classificationState: ClassificationState;
  reviewState: ReviewState;
  appealState: AppealState;
  labelVersion: string;
  classifiedAt?: string;
  reviewedAt?: string;
}

export interface InternalAuthorshipEvidence {
  provider: 'hive';
  detected: boolean;
  score?: number;
  thresholdVersion?: string;
  categories?: string[];
  providerError?: string;
}

export interface AuthorshipDisclosureEvent {
  declaredAuthorship: DeclaredAuthorship;
  declaredAt: string;
  actorId: string;
  version: number;
}

export interface ResolvedAuthorship {
  public: PublicAuthorship;
  internal: InternalAuthorshipEvidence;
  disclosureEvent: AuthorshipDisclosureEvent;
  publicationStatus: 'published' | 'pending_review';
  reputationEligible: boolean;
}

export const AUTHORSHIP_LABEL_VERSION = 'alpha-2026-07-v1';

export function normalizeDeclaredAuthorship(value: unknown): DeclaredAuthorship | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  switch (value.trim().toLowerCase()) {
    case 'human':
    case 'human_authored':
      return 'human';
    case 'assisted':
    case 'ai_assisted':
      return 'assisted';
    case 'generated':
    case 'ai_generated':
      return 'generated';
    default:
      return undefined;
  }
}

export function labelForDeclaration(declaration: DeclaredAuthorship): AuthorshipLabel {
  switch (declaration) {
    case 'human':
      return 'Human-authored';
    case 'assisted':
      return 'AI-assisted';
    case 'generated':
      return 'AI-generated';
  }
}

export function resolveAuthorship(input: {
  declaration: DeclaredAuthorship;
  actorId: string;
  aiDetected: boolean;
  classifierAvailable: boolean;
  classifiedAt: number;
  score?: number;
  thresholdVersion?: string;
  categories?: string[];
  providerError?: string;
  priorDisclosureCount?: number;
}): ResolvedAuthorship {
  const classifiedAt = new Date(input.classifiedAt).toISOString();
  const classifierConflict = input.declaration === 'human' && input.aiDetected;
  const requiresReview = classifierConflict || !input.classifierAvailable;

  return {
    public: {
      authorshipLabel: requiresReview
        ? 'Under review'
        : labelForDeclaration(input.declaration),
      declaredAuthorship: input.declaration,
      classificationSource: requiresReview
        ? 'automated_classification'
        : 'user_disclosure',
      classificationState: !input.classifierAvailable
        ? 'unavailable'
        : classifierConflict
          ? 'conflict'
          : 'confirmed',
      reviewState: requiresReview ? 'pending' : 'not_required',
      appealState: requiresReview ? 'eligible' : 'none',
      labelVersion: AUTHORSHIP_LABEL_VERSION,
      classifiedAt,
    },
    internal: {
      provider: 'hive',
      detected: input.aiDetected,
      score: input.score,
      thresholdVersion: input.thresholdVersion,
      categories: input.categories,
      providerError: input.providerError,
    },
    disclosureEvent: {
      declaredAuthorship: input.declaration,
      declaredAt: classifiedAt,
      actorId: input.actorId,
      version: (input.priorDisclosureCount ?? 0) + 1,
    },
    publicationStatus: requiresReview ? 'pending_review' : 'published',
    reputationEligible:
      !requiresReview && input.declaration !== 'generated',
  };
}

export function legacyPublicAuthorship(
  declaration: DeclaredAuthorship = 'human'
): PublicAuthorship {
  return {
    authorshipLabel: labelForDeclaration(declaration),
    declaredAuthorship: declaration,
    classificationSource: 'user_disclosure',
    classificationState: 'confirmed',
    reviewState: 'not_required',
    appealState: 'none',
    labelVersion: 'legacy-migrated-v1',
  };
}

export function applyAppealOutcomeToAuthorship(
  existing: PublicAuthorship | undefined,
  legacyDeclaration: unknown,
  finalLabel: Exclude<AuthorshipLabel, 'Under review'>,
  reviewedAt: string
): PublicAuthorship {
  const base =
    existing ??
    legacyPublicAuthorship(normalizeDeclaredAuthorship(legacyDeclaration) ?? 'human');
  return {
    ...base,
    authorshipLabel: finalLabel,
    classificationSource: 'appeal_outcome',
    classificationState: 'confirmed',
    reviewState: 'resolved',
    appealState: 'resolved',
    labelVersion: AUTHORSHIP_LABEL_VERSION,
    reviewedAt,
  };
}

export function sanitizePublicPostRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const {
    moderation: _moderation,
    aiDetected: _aiDetected,
    aiLabel: legacyLabel,
    authorshipInternal: _authorshipInternal,
    authorshipDisclosureHistory: _disclosureHistory,
    ...safe
  } = record;
  const declaration = normalizeDeclaredAuthorship(legacyLabel) ?? 'human';
  const authorship = isPublicAuthorship(record['authorship'])
    ? record['authorship']
    : legacyPublicAuthorship(declaration);
  return { ...safe, authorship };
}

function isPublicAuthorship(value: unknown): value is PublicAuthorship {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>)['authorshipLabel'] === 'string' &&
      typeof (value as Record<string, unknown>)['declaredAuthorship'] === 'string'
  );
}
