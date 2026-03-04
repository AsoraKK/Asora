import { getTargetDatabase } from '@shared/clients/cosmos';
import type { TrustPassportVisibility } from './profileService';

export type TransparencyStreakCategory = 'Consistent' | 'Occasional' | 'Rare';
export type JurorReliabilityTier = 'Bronze' | 'Silver' | 'Gold';

export interface TrustPassportSummary {
  userId: string;
  visibility?: TrustPassportVisibility;
  transparencyStreakCategory: TransparencyStreakCategory;
  appealsResolvedFairlyLabel: string;
  jurorReliabilityTier: JurorReliabilityTier;
  counts: {
    transparency: {
      totalPosts: number;
      postsWithSignals: number;
    };
    appeals: {
      resolved: number;
      approved: number;
      rejected: number;
    };
    juror: {
      votesCast: number;
      alignedVotes: number;
    };
  };
}

function toCount(result: unknown): number {
  const parsed = Number(result);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.floor(parsed));
}

function transparencyCategory(totalPosts: number, postsWithSignals: number): TransparencyStreakCategory {
  if (totalPosts <= 0) {
    return 'Rare';
  }
  const ratio = postsWithSignals / totalPosts;
  if (ratio >= 0.7) {
    return 'Consistent';
  }
  if (ratio >= 0.3) {
    return 'Occasional';
  }
  return 'Rare';
}

function jurorTier(votesCast: number, alignedVotes: number): JurorReliabilityTier {
  if (votesCast <= 0) {
    return 'Bronze';
  }
  const ratio = alignedVotes / votesCast;
  if (votesCast >= 20 && ratio >= 0.75) {
    return 'Gold';
  }
  if (votesCast >= 10 && ratio >= 0.6) {
    return 'Silver';
  }
  return 'Bronze';
}

function voteAligned(vote: string, finalDecision: string): boolean {
  const normalizedVote = vote.toLowerCase();
  const normalizedDecision = finalDecision.toLowerCase();
  const decisionAllows =
    normalizedDecision === 'approved' ||
    normalizedDecision === 'allow' ||
    normalizedDecision === 'upheld';
  const decisionBlocks =
    normalizedDecision === 'rejected' ||
    normalizedDecision === 'deny' ||
    normalizedDecision === 'denied' ||
    normalizedDecision === 'block';

  return (normalizedVote === 'approve' && decisionAllows) ||
    (normalizedVote === 'reject' && decisionBlocks);
}

class TrustPassportService {
  async getUserTrustPassport(userId: string): Promise<TrustPassportSummary> {
    const db = getTargetDatabase();

    const postsCountQuery = {
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.authorId = @userId AND c.status = "published"',
      parameters: [{ name: '@userId', value: userId }],
    };
    const postsWithSignalsQuery = {
      query:
        'SELECT VALUE COUNT(1) FROM c WHERE c.authorId = @userId AND c.status = "published" AND c.proofSignalsProvided = true',
      parameters: [{ name: '@userId', value: userId }],
    };
    const appealsResolvedQuery = {
      query:
        'SELECT VALUE COUNT(1) FROM c WHERE c.submitterId = @userId AND (c.status = "approved" OR c.status = "rejected" OR c.status = "overridden")',
      parameters: [{ name: '@userId', value: userId }],
    };
    const appealsApprovedQuery = {
      query:
        'SELECT VALUE COUNT(1) FROM c WHERE c.submitterId = @userId AND (c.status = "approved" OR c.finalDecision = "allow")',
      parameters: [{ name: '@userId', value: userId }],
    };
    const appealsRejectedQuery = {
      query:
        'SELECT VALUE COUNT(1) FROM c WHERE c.submitterId = @userId AND (c.status = "rejected" OR c.finalDecision = "block")',
      parameters: [{ name: '@userId', value: userId }],
    };

    const [
      totalPostsRes,
      postsWithSignalsRes,
      appealsResolvedRes,
      appealsApprovedRes,
      appealsRejectedRes,
    ] = await Promise.all([
      db.posts.items.query<number>(postsCountQuery).fetchAll(),
      db.posts.items.query<number>(postsWithSignalsQuery).fetchAll(),
      db.appeals.items.query<number>(appealsResolvedQuery).fetchAll(),
      db.appeals.items.query<number>(appealsApprovedQuery).fetchAll(),
      db.appeals.items.query<number>(appealsRejectedQuery).fetchAll(),
    ]);

    const totalPosts = toCount(totalPostsRes.resources[0]);
    const postsWithSignals = toCount(postsWithSignalsRes.resources[0]);
    const appealsResolved = toCount(appealsResolvedRes.resources[0]);
    const appealsApproved = toCount(appealsApprovedRes.resources[0]);
    const appealsRejected = toCount(appealsRejectedRes.resources[0]);

    const votesQuery = {
      query: 'SELECT * FROM c WHERE c.voterId = @userId ORDER BY c.createdAt DESC OFFSET 0 LIMIT 100',
      parameters: [{ name: '@userId', value: userId }],
    };
    const votes = (await db.appealVotes.items.query<Record<string, unknown>>(votesQuery).fetchAll())
      .resources;

    let alignedVotes = 0;
    for (const vote of votes) {
      const appealId = typeof vote.appealId === 'string' ? vote.appealId : null;
      const castVote = typeof vote.vote === 'string' ? vote.vote : null;
      if (!appealId || !castVote) {
        continue;
      }
      try {
        const appealResult = await db.appeals.items
          .query<Record<string, unknown>>(
            {
              query: 'SELECT TOP 1 c.finalDecision, c.status FROM c WHERE c.id = @appealId',
              parameters: [{ name: '@appealId', value: appealId }],
            },
            { maxItemCount: 1 }
          )
          .fetchAll();
        const appeal = appealResult.resources[0];
        if (!appeal) {
          continue;
        }
        const finalDecision = String(appeal.finalDecision ?? appeal.status ?? '');
        if (!finalDecision) {
          continue;
        }
        if (voteAligned(castVote, finalDecision)) {
          alignedVotes += 1;
        }
      } catch {
        // Ignore malformed historical records.
      }
    }

    return {
      userId,
      transparencyStreakCategory: transparencyCategory(totalPosts, postsWithSignals),
      appealsResolvedFairlyLabel: 'Appeals resolved fairly',
      jurorReliabilityTier: jurorTier(votes.length, alignedVotes),
      counts: {
        transparency: {
          totalPosts,
          postsWithSignals,
        },
        appeals: {
          resolved: appealsResolved,
          approved: appealsApproved,
          rejected: appealsRejected,
        },
        juror: {
          votesCast: votes.length,
          alignedVotes,
        },
      },
    };
  }
}

export const trustPassportService = new TrustPassportService();
