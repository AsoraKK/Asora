export interface FlagContentInput {
  contentId: string;
  contentType: 'post' | 'comment' | 'user' | 'message';
  reason:
    | 'spam'
    | 'harassment'
    | 'hate_speech'
    | 'violence'
    | 'adult_content'
    | 'misinformation'
    | 'copyright'
    | 'privacy'
    | 'other';
  additionalDetails?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface SubmitAppealInput {
  contentId: string;
  contentType: 'post' | 'comment' | 'user';
  appealType: 'false_positive' | 'context_missing' | 'policy_disagreement' | 'technical_error' | 'other';
  appealReason: string;
  userStatement: string;
  evidenceUrls?: string[];
}

export type Vote = 'approve' | 'reject';

export interface VoteOnAppealInput {
  appealId: string;
  vote: Vote;
  reason: string;
  confidence: number;
  notes?: string;
}

export interface VoteInput {
  appealId: string;
  voterId: string;
  vote: Vote;
}
