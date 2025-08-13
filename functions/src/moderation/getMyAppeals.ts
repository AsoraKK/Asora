/**
 * ASORA - GET MY APPEALS (PHASE 4 - COMMUNITY VOTING)
 * 
 * 📋 User Appeal History Dashboard
 * 
 * ✅ Requirements:
 * - Show user's own appeal history and status
 * - Include voting progress and outcomes
 * - Filter by status and content type
 * - Paginated results with sorting options
 * - Real-time status updates
 * - Privacy protection (only own appeals)
 * 
 * 🎯 Features:
 * - Personal appeal history tracking
 * - Voting progress indicators
 * - Appeal outcome explanations
 * - Status filters and sorting
 * - Content metadata display
 * - Appeal expiry warnings
 * 
 * 🔐 Privacy Rules:
 * - Users can only see their own appeals
 * - Vote details are anonymized
 * - Moderator notes are not exposed
 * - Admin review details filtered
 * 
 * 📊 Response Data:
 * - Appeal basic information
 * - Current voting progress
 * - Community decision status
 * - Timeline of events
 * - Next steps or outcomes
 */

import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { getContainer } from '../shared/cosmosClient';
import { getUserContext } from '../shared/auth';
import { 
    generateVotingSummary, 
    checkQuorum, 
    isAppealExpired,
    VoteRecord 
} from '../shared/moderationUtils';

interface AppealHistoryItem {
    appealId: string;
    contentId: string;
    contentType: string;
    contentTitle?: string;
    appealType: string;
    status: 'pending' | 'under_review' | 'resolved' | 'expired';
    reviewQueue: 'admin' | 'community';
    outcome?: 'approved' | 'rejected' | 'timeout' | 'expired';
    
    // Timestamps
    submittedAt: string;
    resolvedAt?: string;
    expiresAt: string;
    
    // User submission details
    appealReason: string;
    userStatement: string;
    
    // Community voting progress (if applicable)
    votingProgress?: {
        totalVotes: number;
        approveVotes: number;
        rejectVotes: number;
        approvalRate: number;
        quorumMet: boolean;
        timeRemaining?: string;
        estimatedResolution?: string;
    };
    
    // Resolution details
    resolutionDetails?: {
        outcome: string;
        reason: string;
        communityDecision?: boolean;
        finalStats?: any;
    };
    
    // Status indicators
    canAppeal: boolean;
    isExpired: boolean;
    isUrgent: boolean;
    nextSteps?: string[];
}

interface GetMyAppealsResponse {
    appeals: AppealHistoryItem[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    summary: {
        total: number;
        pending: number;
        resolved: number;
        approved: number;
        rejected: number;
        expired: number;
    };
    filters: {
        status?: string;
        contentType?: string;
        reviewQueue?: string;
    };
}

export async function getMyAppeals(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
    try {
        // 1. Authenticate user
        const userContext = getUserContext(request);
        if (!userContext) {
            return new HttpResponse({
                status: 401,
                jsonBody: { error: 'Authentication required' }
            });
        }

        // 2. Parse query parameters
        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));
        const statusFilter = url.searchParams.get('status');
        const contentTypeFilter = url.searchParams.get('contentType');
        const reviewQueueFilter = url.searchParams.get('reviewQueue');
        const sortBy = url.searchParams.get('sortBy') || 'submittedAt';
        const sortOrder = url.searchParams.get('sortOrder') || 'desc';

        // 3. Build query for user's appeals
        let whereClause = 'c.userId = @userId';
        const parameters = [{ name: '@userId', value: userContext.userId }];

        if (statusFilter) {
            whereClause += ' AND c.status = @status';
            parameters.push({ name: '@status', value: statusFilter });
        }

        if (contentTypeFilter) {
            whereClause += ' AND c.contentType = @contentType';
            parameters.push({ name: '@contentType', value: contentTypeFilter });
        }

        if (reviewQueueFilter) {
            whereClause += ' AND c.reviewQueue = @reviewQueue';
            parameters.push({ name: '@reviewQueue', value: reviewQueueFilter });
        }

        // 4. Get total count
        const appealsContainer = getContainer('appeals');
        const countQuery = {
            query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
            parameters
        };
        const { resources: countResult } = await appealsContainer.items.query(countQuery).fetchAll();
        const totalAppeals = countResult[0] || 0;

        // 5. Get paginated appeals
        const offset = (page - 1) * pageSize;
        const orderDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        const appealsQuery = {
            query: `
                SELECT * FROM c 
                WHERE ${whereClause}
                ORDER BY c.${sortBy} ${orderDirection}
                OFFSET ${offset} LIMIT ${pageSize}
            `,
            parameters
        };

        const { resources: userAppeals } = await appealsContainer.items.query(appealsQuery).fetchAll();

        // 6. Process appeals and add voting progress
        const votesContainer = getContainer('votes');
        const appealsWithProgress: AppealHistoryItem[] = [];

        for (const appeal of userAppeals) {
            let votingProgress = undefined;

            // Get voting progress for community appeals
            if (appeal.reviewQueue === 'community' && appeal.status === 'pending') {
                const votesQuery = {
                    query: 'SELECT * FROM c WHERE c.appealId = @appealId',
                    parameters: [{ name: '@appealId', value: appeal.id }]
                };
                const { resources: appealVotes } = await votesContainer.items.query(votesQuery).fetchAll();

                const { quorumMet, timeoutReached } = checkQuorum(appealVotes, appeal.createdAt);
                const votingSummary = generateVotingSummary(appeal.id, appeal.contentId, appealVotes, appeal.createdAt);

                // Calculate time remaining
                const createdTime = new Date(appeal.createdAt).getTime();
                const timeoutTime = createdTime + (5 * 60 * 1000); // 5 minutes
                const now = Date.now();
                const timeRemaining = Math.max(0, timeoutTime - now);

                votingProgress = {
                    totalVotes: votingSummary.totalVotes,
                    approveVotes: votingSummary.approveVotes,
                    rejectVotes: votingSummary.rejectVotes,
                    approvalRate: votingSummary.approvalRate,
                    quorumMet,
                    timeRemaining: quorumMet ? 'Quorum reached' : formatTimeRemaining(timeRemaining),
                    estimatedResolution: quorumMet ? 'Processing...' : 
                        timeoutReached ? 'Processing...' : 
                        formatEstimatedResolution(timeRemaining)
                };
            }

            // Determine next steps
            const nextSteps = getNextSteps(appeal, votingProgress);

            // Get content title if available
            let contentTitle = undefined;
            try {
                if (appeal.contentType !== 'user') {
                    const contentContainer = getContainer(`${appeal.contentType}s`);
                    const contentItem = await contentContainer.item(appeal.contentId, appeal.contentId).read();
                    contentTitle = contentItem.resource?.title || contentItem.resource?.content?.substring(0, 50) + '...';
                }
            } catch {
                // Content may have been deleted
            }

            appealsWithProgress.push({
                appealId: appeal.id,
                contentId: appeal.contentId,
                contentType: appeal.contentType,
                contentTitle,
                appealType: appeal.appealType,
                status: appeal.status,
                reviewQueue: appeal.reviewQueue,
                outcome: appeal.outcome,
                
                submittedAt: appeal.createdAt,
                resolvedAt: appeal.resolvedAt,
                expiresAt: appeal.expiresAt,
                
                appealReason: appeal.appealReason,
                userStatement: appeal.userStatement,
                
                votingProgress,
                
                resolutionDetails: appeal.outcome ? {
                    outcome: appeal.outcome,
                    reason: getOutcomeReason(appeal.outcome, appeal.reviewQueue),
                    communityDecision: appeal.reviewQueue === 'community',
                    finalStats: appeal.finalVotingStats
                } : undefined,
                
                canAppeal: canAppealAgain(appeal),
                isExpired: isAppealExpired(appeal.createdAt),
                isUrgent: isUrgentAppeal(appeal, votingProgress),
                nextSteps
            });
        }

        // 7. Generate summary statistics
        const allUserAppealsQuery = {
            query: 'SELECT c.status, c.outcome FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: userContext.userId }]
        };
        const { resources: allAppeals } = await appealsContainer.items.query(allUserAppealsQuery).fetchAll();

        const summary = {
            total: allAppeals.length,
            pending: allAppeals.filter(a => a.status === 'pending' || a.status === 'under_review').length,
            resolved: allAppeals.filter(a => a.status === 'resolved').length,
            approved: allAppeals.filter(a => a.outcome === 'approved').length,
            rejected: allAppeals.filter(a => a.outcome === 'rejected').length,
            expired: allAppeals.filter(a => a.status === 'expired').length
        };

        // 8. Return response
        const response: GetMyAppealsResponse = {
            appeals: appealsWithProgress,
            pagination: {
                total: totalAppeals,
                page,
                pageSize,
                hasMore: (page * pageSize) < totalAppeals
            },
            summary,
            filters: {
                status: statusFilter || undefined,
                contentType: contentTypeFilter || undefined,
                reviewQueue: reviewQueueFilter || undefined
            }
        };

        return new HttpResponse({
            status: 200,
            jsonBody: response
        });

    } catch (error: any) {
        context.error('Error fetching user appeals:', error);
        return new HttpResponse({
            status: 500,
            jsonBody: { 
                error: 'Internal server error',
                message: error.message
            }
        });
    }
}

/**
 * Helper functions
 */

function formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return 'Timed out';
    
    const minutes = Math.floor(milliseconds / (60 * 1000));
    const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);
    
    if (minutes > 0) {
        return `${minutes}m ${seconds}s remaining`;
    }
    return `${seconds}s remaining`;
}

function formatEstimatedResolution(timeRemaining: number): string {
    if (timeRemaining <= 0) {
        return 'Being processed now';
    }
    
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    if (minutes <= 1) {
        return 'Within 1 minute';
    }
    return `Within ${minutes} minutes`;
}

function getNextSteps(appeal: any, votingProgress?: any): string[] {
    const steps: string[] = [];
    
    if (appeal.status === 'pending') {
        if (appeal.reviewQueue === 'admin') {
            steps.push('Waiting for admin review');
            steps.push('Estimated review time: 24-48 hours');
        } else if (appeal.reviewQueue === 'community') {
            if (votingProgress) {
                if (!votingProgress.quorumMet) {
                    steps.push(`Need ${5 - votingProgress.totalVotes} more votes for quorum`);
                    steps.push('Community members are voting on your appeal');
                }
                if (votingProgress.timeRemaining && !votingProgress.quorumMet) {
                    steps.push(`Voting ends in ${votingProgress.timeRemaining}`);
                }
            }
        }
    } else if (appeal.status === 'resolved') {
        if (appeal.outcome === 'approved') {
            steps.push('✅ Appeal approved - content restored');
        } else if (appeal.outcome === 'rejected') {
            steps.push('❌ Appeal rejected - decision upheld');
            if (!canAppealAgain(appeal)) {
                steps.push('No further appeals allowed for this content');
            }
        }
    } else if (appeal.status === 'expired') {
        steps.push('⏰ Appeal expired without resolution');
    }
    
    return steps;
}

function getOutcomeReason(outcome: string, reviewQueue: string): string {
    const source = reviewQueue === 'community' ? 'community' : 'moderator';
    
    switch (outcome) {
        case 'approved':
            return `Content was restored after ${source} review`;
        case 'rejected':
            return `Appeal was denied after ${source} review`;
        case 'timeout':
            return `No decision reached within time limit`;
        case 'expired':
            return `Appeal expired without resolution`;
        default:
            return `Resolved by ${source}`;
    }
}

function canAppealAgain(appeal: any): boolean {
    // Generally no re-appeals allowed, but could be configurable
    return false;
}

function isUrgentAppeal(appeal: any, votingProgress?: any): boolean {
    if (appeal.status !== 'pending') return false;
    
    const hoursOld = (Date.now() - new Date(appeal.createdAt).getTime()) / (1000 * 60 * 60);
    
    // Admin appeals over 48 hours are urgent
    if (appeal.reviewQueue === 'admin' && hoursOld > 48) {
        return true;
    }
    
    // Community appeals with very few votes and time running out
    if (appeal.reviewQueue === 'community' && votingProgress) {
        if (votingProgress.totalVotes < 2 && votingProgress.timeRemaining?.includes('s remaining')) {
            return true;
        }
    }
    
    return false;
}

app.http('getMyAppeals', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getMyAppeals
});
