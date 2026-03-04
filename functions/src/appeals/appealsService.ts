import { v7 as uuidv7 } from 'uuid';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { HttpError } from '@shared/utils/errors';
import type {
  Appeal,
  AppealDetailsResponse,
  AppealVote,
  FileAppealRequest,
  VoteOnAppealRequest,
} from '@shared/types/openapi';

const appealsContainer = getTargetDatabase().appeals;
const votesContainer = getTargetDatabase().appealVotes;

export async function createAppeal(
  userId: string,
  payload: FileAppealRequest
): Promise<Appeal> {
  const now = new Date().toISOString();
  const appealId = uuidv7();

  const document: {
    id: string;
    caseId: string;
    contentId: string;
    partitionKey: string;
    authorId: string;
    statement: string;
    evidenceUrls: string[];
    status: 'pending' | 'upheld' | 'denied';
    createdAt: string;
    updatedAt: string;
  } = {
    id: appealId,
    caseId: payload.caseId,
    contentId: payload.caseId,
    partitionKey: appealId,
    authorId: userId,
    statement: payload.statement,
    evidenceUrls: payload.evidence ?? [],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await appealsContainer.items.create(document);

  return {
    id: document.id,
    caseId: document.caseId,
    authorId: document.authorId,
    statement: document.statement,
    evidence: document.evidenceUrls,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function getAppealById(appealId: string): Promise<AppealDetailsResponse | null> {
  try {
    const { resource } = await appealsContainer.item(appealId, appealId).read();
    if (!resource) {
      return null;
    }

    const votesResult = await votesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.appealId = @appealId',
        parameters: [{ name: '@appealId', value: appealId }],
      })
      .fetchAll();

    const votes: AppealVote[] = votesResult.resources.map((vote) => ({
      id: vote.id,
      appealId: vote.appealId,
      userId: vote.userId,
      vote: vote.vote,
      weight: vote.weight,
      createdAt: vote.createdAt,
    }));

    const totals = votes.reduce(
      (acc, current) => {
        if (current.vote === 'uphold') {
          acc.uphold += current.weight;
        } else {
          acc.deny += current.weight;
        }
        return acc;
      },
      { uphold: 0, deny: 0 }
    );

    return {
      appeal: {
        id: resource.id,
        caseId: resource.caseId,
        authorId: resource.authorId,
        statement: resource.statement,
        evidence: resource.evidenceUrls ?? [],
        status: resource.status,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      },
      votes,
      totalUpholdWeight: totals.uphold,
      totalDenyWeight: totals.deny,
    };
  } catch (error) {
    const typedErr = error as any;
    if (typedErr?.code === 404 || typedErr?.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function voteOnAppeal(
  userId: string,
  appealId: string,
  payload: VoteOnAppealRequest
): Promise<AppealVote> {
  const now = new Date().toISOString();

  const { resource: appeal } = await appealsContainer.item(appealId, appealId).read();
  if (!appeal) {
    throw new HttpError(404, 'Appeal not found');
  }

  if (appeal.status !== 'pending') {
    throw new HttpError(400, 'Appeal already resolved');
  }

  const existingVoteQuery = {
    query: 'SELECT TOP 1 c.id FROM c WHERE c.appealId = @appealId AND c.userId = @userId',
    parameters: [
      { name: '@appealId', value: appealId },
      { name: '@userId', value: userId },
    ],
  };
  const { resources: existingVotes } = await votesContainer.items.query(existingVoteQuery).fetchAll();
  if (existingVotes.length > 0) {
    throw new HttpError(400, 'User has already voted on this appeal');
  }

  const voteWeight = 1;
  const voteId = uuidv7();
  const document = {
    id: voteId,
    appealId,
    partitionKey: appealId,
    userId,
    vote: payload.vote,
    weight: voteWeight,
    createdAt: now,
  };

  await votesContainer.items.create(document);

  return {
    id: document.id,
    appealId: document.appealId,
    userId: document.userId,
    vote: document.vote,
    weight: document.weight,
    createdAt: document.createdAt,
  };
}
