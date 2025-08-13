/**
 * ASORA - MODERATION UTILITIES (PHASE 4 - COMMUNITY VOTING)
 *
 * 🗳️ Shared utilities for community voting system
 *
 * ✅ Features:
 * - Quorum calculation and validation
 * - Vote outcome determination
 * - Appeal expiration tracking
 * - Voting eligibility checks
 * - Community voting configuration
 *
 * 🎯 Voting Rules:
 * - Minimum 5 votes OR 5-minute timeout (configurable)
 * - Majority rule (>50% approval rate)
 * - Users cannot vote on their own content
 * - One vote per user per appeal
 * - Appeals expire after 30 days
 *
 * 🛡️ Anti-Gaming Measures:
 * - Account age requirements
 * - Reputation score minimums
 * - Rate limiting on votes
 * - Vote integrity validation
 */

import { getModerationConfig } from './moderationConfig';

// Voting configuration constants
export const VOTING_CONFIG = {
  MINIMUM_VOTES: 5,
  TIMEOUT_MINUTES: 5,
  APPROVAL_THRESHOLD: 0.5, // 50% approval rate
  MIN_ACCOUNT_AGE_DAYS: 7,
  MIN_REPUTATION_SCORE: 10,
  MAX_VOTES_PER_HOUR: 20,
  APPEAL_EXPIRY_DAYS: 30,
};

// Vote types and statuses
export type VoteType = 'approve' | 'reject';
export type AppealStatus = 'pending' | 'voting' | 'approved' | 'rejected' | 'expired' | 'timeout';

// Vote record interface
export interface VoteRecord {
  id: string;
  appealId: string;
  contentId: string;
  contentType: string;
  userId: string;
  userEmail: string;
  vote: VoteType;
  userReputation: number;
  userAccountAge: number;
  timestamp: string;
  metadata: {
    userAgent?: string;
    ipHash?: string;
    votingRound: number;
  };
}

// Appeal voting summary
export interface AppealVotingSummary {
  appealId: string;
  contentId: string;
  totalVotes: number;
  approveVotes: number;
  rejectVotes: number;
  approvalRate: number;
  quorumMet: boolean;
  timeoutReached: boolean;
  outcome: 'approved' | 'rejected' | 'pending' | 'timeout';
  expiresAt: string;
  createdAt: string;
}

/**
 * Calculate if quorum has been met for an appeal
 */
export function checkQuorum(
  votes: VoteRecord[],
  appealCreatedAt: string
): {
  quorumMet: boolean;
  timeoutReached: boolean;
  reason: string;
} {
  const totalVotes = votes.length;
  const minutesSinceCreated = (Date.now() - new Date(appealCreatedAt).getTime()) / (1000 * 60);

  // Check if minimum votes threshold met
  if (totalVotes >= VOTING_CONFIG.MINIMUM_VOTES) {
    return {
      quorumMet: true,
      timeoutReached: false,
      reason: `Minimum votes threshold reached (${totalVotes}/${VOTING_CONFIG.MINIMUM_VOTES})`,
    };
  }

  // Check if timeout reached
  if (minutesSinceCreated >= VOTING_CONFIG.TIMEOUT_MINUTES) {
    return {
      quorumMet: false,
      timeoutReached: true,
      reason: `Voting timeout reached (${Math.round(minutesSinceCreated)}/${VOTING_CONFIG.TIMEOUT_MINUTES} minutes)`,
    };
  }

  return {
    quorumMet: false,
    timeoutReached: false,
    reason: `Waiting for more votes (${totalVotes}/${VOTING_CONFIG.MINIMUM_VOTES}) or timeout (${Math.round(minutesSinceCreated)}/${VOTING_CONFIG.TIMEOUT_MINUTES} minutes)`,
  };
}

/**
 * Calculate the outcome of voting based on votes and rules
 */
export function calculateOutcome(
  votes: VoteRecord[],
  appealCreatedAt: string
): AppealVotingSummary['outcome'] {
  const { quorumMet, timeoutReached } = checkQuorum(votes, appealCreatedAt);

  if (!quorumMet && !timeoutReached) {
    return 'pending';
  }

  if (timeoutReached && votes.length === 0) {
    return 'timeout'; // No votes at all
  }

  // Calculate approval rate
  const approveVotes = votes.filter(v => v.vote === 'approve').length;
  const totalVotes = votes.length;
  const approvalRate = totalVotes > 0 ? approveVotes / totalVotes : 0;

  // Majority rule
  return approvalRate > VOTING_CONFIG.APPROVAL_THRESHOLD ? 'approved' : 'rejected';
}

/**
 * Generate voting summary for an appeal
 */
export function generateVotingSummary(
  appealId: string,
  contentId: string,
  votes: VoteRecord[],
  appealCreatedAt: string
): AppealVotingSummary {
  const approveVotes = votes.filter(v => v.vote === 'approve').length;
  const rejectVotes = votes.filter(v => v.vote === 'reject').length;
  const totalVotes = votes.length;
  const approvalRate = totalVotes > 0 ? approveVotes / totalVotes : 0;

  const { quorumMet, timeoutReached } = checkQuorum(votes, appealCreatedAt);
  const outcome = calculateOutcome(votes, appealCreatedAt);

  const expiresAt = new Date(
    new Date(appealCreatedAt).getTime() + VOTING_CONFIG.APPEAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    appealId,
    contentId,
    totalVotes,
    approveVotes,
    rejectVotes,
    approvalRate,
    quorumMet,
    timeoutReached,
    outcome,
    expiresAt,
    createdAt: appealCreatedAt,
  };
}

/**
 * Check if a user is eligible to vote on an appeal
 */
export function isEligibleForVoting(
  userId: string,
  contentOwnerId: string,
  userCreatedAt: string,
  userReputation: number = 0
): { eligible: boolean; reason: string } {
  // Cannot vote on own content
  if (userId === contentOwnerId) {
    return {
      eligible: false,
      reason: 'Cannot vote on your own content',
    };
  }

  // Check account age
  const accountAgeInDays = (Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeInDays < VOTING_CONFIG.MIN_ACCOUNT_AGE_DAYS) {
    return {
      eligible: false,
      reason: `Account must be at least ${VOTING_CONFIG.MIN_ACCOUNT_AGE_DAYS} days old (current: ${Math.floor(accountAgeInDays)} days)`,
    };
  }

  // Check reputation score
  if (userReputation < VOTING_CONFIG.MIN_REPUTATION_SCORE) {
    return {
      eligible: false,
      reason: `Minimum reputation score required: ${VOTING_CONFIG.MIN_REPUTATION_SCORE} (current: ${userReputation})`,
    };
  }

  return {
    eligible: true,
    reason: 'User meets all voting requirements',
  };
}

/**
 * Get appeal expiration timestamp
 */
export function getAppealExpiration(appealCreatedAt: string): string {
  return new Date(
    new Date(appealCreatedAt).getTime() + VOTING_CONFIG.APPEAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

/**
 * Check if appeal has expired
 */
export function isAppealExpired(appealCreatedAt: string): boolean {
  const expirationTime = new Date(getAppealExpiration(appealCreatedAt)).getTime();
  return Date.now() > expirationTime;
}

/**
 * Calculate voting urgency score for sorting appeals
 * Higher score = more urgent
 */
export function calculateVotingUrgency(
  votes: VoteRecord[],
  appealCreatedAt: string,
  flagCount: number = 1
): number {
  const minutesSinceCreated = (Date.now() - new Date(appealCreatedAt).getTime()) / (1000 * 60);
  const hoursUntilExpiry =
    (new Date(getAppealExpiration(appealCreatedAt)).getTime() - Date.now()) / (1000 * 60 * 60);

  let urgencyScore = 0;

  // Time-based urgency (more urgent as timeout approaches)
  urgencyScore +=
    Math.max(
      0,
      (VOTING_CONFIG.TIMEOUT_MINUTES - minutesSinceCreated) / VOTING_CONFIG.TIMEOUT_MINUTES
    ) * 50;

  // Flag count urgency (more flags = more urgent)
  urgencyScore += Math.min(flagCount * 10, 30);

  // Vote count urgency (close to quorum = more urgent)
  const votesNeeded = Math.max(0, VOTING_CONFIG.MINIMUM_VOTES - votes.length);
  urgencyScore += (VOTING_CONFIG.MINIMUM_VOTES - votesNeeded) * 5;

  // Time until expiry urgency (closer to expiry = more urgent)
  if (hoursUntilExpiry < 24) {
    urgencyScore += (24 - hoursUntilExpiry) * 2;
  }

  return urgencyScore;
}

/**
 * Validate vote integrity (basic checks)
 */
export function validateVoteIntegrity(vote: VoteRecord): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check required fields
  if (!vote.appealId) issues.push('Missing appeal ID');
  if (!vote.userId) issues.push('Missing user ID');
  if (!['approve', 'reject'].includes(vote.vote)) issues.push('Invalid vote type');

  // Check timestamp is recent (within last hour)
  const voteAge = Date.now() - new Date(vote.timestamp).getTime();
  if (voteAge > 60 * 60 * 1000) {
    issues.push('Vote timestamp is too old');
  }

  // Check user reputation is valid
  if (vote.userReputation < 0) {
    issues.push('Invalid user reputation');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export default {
  VOTING_CONFIG,
  checkQuorum,
  calculateOutcome,
  generateVotingSummary,
  isEligibleForVoting,
  getAppealExpiration,
  isAppealExpired,
  calculateVotingUrgency,
  validateVoteIntegrity,
};
